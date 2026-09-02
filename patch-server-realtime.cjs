const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const extractRoute = `
apiRouter.post('/accounts/extract', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  
  const { tokens } = req.body;
  if (!Array.isArray(tokens)) return res.end();

  for (const t of tokens) {
    try {
      const meRes = await axios.get(\`https://graph.facebook.com/me?access_token=\${t}\`);
      const personalId = meRes.data.id;
      res.write(JSON.stringify({ type: 'account', data: { id: personalId, name: meRes.data.name, token: t, type: 'account', parentId: personalId } }) + '\\n');
      
      try {
        const pagesRes = await axios.get(\`https://graph.facebook.com/me/accounts?access_token=\${t}\`);
        if (pagesRes.data && pagesRes.data.data) {
          for (const p of pagesRes.data.data) {
            res.write(JSON.stringify({ type: 'account', data: { id: p.id, name: p.name, token: p.access_token, type: 'page', parentId: personalId } }) + '\\n');
          }
        }
      } catch(e) {}
    } catch(err) {
      res.write(JSON.stringify({ type: 'error', message: \`فشل الاتصال بالمفتاح: \${t.substring(0, 15)}...\` }) + '\\n');
    }
  }
  res.write(JSON.stringify({ type: 'done' }) + '\\n');
  res.end();
});
`;
content = content.replace("apiRouter.post('/accounts/share'", extractRoute + "\napiRouter.post('/accounts/share'");

const actionRoutesStart = content.indexOf("apiRouter.post('/action/react'");
const actionRoutesEnd = content.indexOf("apiRouter.get('/settings'");

const newActionRoutes = `
// --- REALTIME ACTION ROUTES ---
apiRouter.post('/action/react', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, reactions, targetAccounts, count, targetType } = req.body;
    const target = extractId(url, targetType || 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');
    if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

    let ok = 0, fail = 0;
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      const r = await makeFbReq(\`https://graph.facebook.com/v19.0/\${target}/reactions\`, "POST", { type: reaction }, accToken);
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, reaction, success: true, message: 'تم التفاعل' } }) + '\\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\\n');
  }
  res.end();
});

apiRouter.post('/action/unreact', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, targetAccounts, targetType } = req.body;
    const target = extractId(url, targetType || 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');

    let ok = 0, fail = 0;
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      const r = await makeFbReq(\`https://graph.facebook.com/v19.0/\${target}/likes\`, "DELETE", {}, accToken);
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message: 'تم الإزالة' } }) + '\\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\\n');
  }
  res.end();
});

apiRouter.post('/action/comment', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, words, count, isRandom, targetAccounts, targetType } = req.body;
    const target = extractId(url, targetType || 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');

    if (accs.length === 0) { res.write(JSON.stringify({ type: 'error', message: 'No accounts' }) + '\\n'); return res.end(); }

    let ok = 0, fail = 0;
    const loopCount = count === 'all' ? accs.length : parseInt(count, 10);
    
    const commentWords = isRandom ? Array.from({length: loopCount}, () => 
      Array.from({length: 8}, () => "ضصثقفغعهخحجدشسيبلاتنمكطئءؤرلاىةوزظ".charAt(Math.floor(Math.random() * 34))).join('')
    ) : words;

    for (let i = 0; i < loopCount; i++) {
      const a = accs[i % accs.length];
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      const message = commentWords[Math.floor(Math.random() * commentWords.length)];
      
      const r = await makeFbReq(\`https://graph.facebook.com/v19.0/\${target}/comments\`, "POST", { message }, accToken);
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message } }) + '\\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\\n');
  }
  res.end();
});

apiRouter.post('/action/confirm', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { targetAccounts, count } = req.body;
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1 AND type = $2', [req.user!.id, 'account']);
    if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

    let ok = 0, fail = 0;
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      const r = await makeFbReq(\`https://graph.facebook.com/v19.0/me/friendrequests\`, "GET", {}, accToken);
      if (r && r.data && Array.isArray(r.data)) {
        let accepted = 0;
        for (const req of r.data) {
           const acceptRes = await makeFbReq(\`https://graph.facebook.com/v19.0/me/friends/\${req.from.id}\`, "POST", {}, accToken);
           if (acceptRes && !acceptRes.error) accepted++;
        }
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message: \`تم تأكيد \${accepted} طلب\` } }) + '\\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: 'لا توجد طلبات' } }) + '\\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\\n');
  }
  res.end();
});

apiRouter.post('/action/follow', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, targetAccounts, count } = req.body;
    const target = extractId(url, 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');
    if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

    let ok = 0, fail = 0;
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      let r = await makeFbReq(\`https://graph.facebook.com/v19.0/\${target}/subscribers\`, "POST", {}, accToken);
      if (r && r.error) {
         r = await makeFbReq(\`https://graph.facebook.com/v19.0/me/likes\`, "POST", { page_id: target }, accToken);
      }
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message: 'تمت المتابعة' } }) + '\\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\\n');
  }
  res.end();
});
`;

content = content.substring(0, actionRoutesStart) + newActionRoutes + content.substring(actionRoutesEnd);
fs.writeFileSync('server.ts', content);
console.log('Backend real-time updated.');
