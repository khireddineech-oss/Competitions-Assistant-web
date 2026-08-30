const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');

// 1. Update extractId function
serverTs = serverTs.replace(
  /function extractId\(url: string\) \{[\s\S]*?\n\}/,
  `function extractId(url: string, targetType: 'post' | 'comment' = 'post') {
  if (!url) return null;
  if (/^\\d+(_\\d+)?$/.test(url.trim())) return url.trim();

  if (targetType === 'comment') {
    const commentMatch = url.match(/(?:comment_id=|reply_comment_id=)([0-9]+)/);
    if (commentMatch) return commentMatch[1];
    
    // Sometimes comment IDs are in the path: /comments/{comment_id}
    const pathMatch = url.match(/\\/comments\\/([0-9]+)/);
    if (pathMatch) return pathMatch[1];
  }

  const match = url.match(/(?:fbid=|posts\\/|videos\\/|v=|story_fbid=|id=|groups\\/[^\\/]+\\/permalink\\/|pfbid)([0-9a-zA-Z]+)/);
  return match ? match[1] : null;
}`
);

// 2. Add targetType extraction in /action/react
serverTs = serverTs.replace(
  /const \{ url, reactions, targetAccounts, count \} = req.body;\n\s*const target = extractId\(url\);/,
  `const { url, reactions, targetAccounts, count, targetType } = req.body;
    const target = extractId(url, targetType);`
);

// 3. Add targetType extraction in /action/unreact
serverTs = serverTs.replace(
  /const \{ url, targetAccounts \} = req.body;\n\s*const target = extractId\(url\);/,
  `const { url, targetAccounts, targetType } = req.body;
    const target = extractId(url, targetType);`
);

// 4. Add targetType extraction in /action/comment
serverTs = serverTs.replace(
  /const \{ url, words, count, isRandom, targetAccounts \} = req.body;\n\s*const target = extractId\(url\);/,
  `const { url, words, count, isRandom, targetAccounts, targetType } = req.body;
    const target = extractId(url, targetType);`
);

// 5. Add /action/confirm and /action/follow routes
const newRoutes = `
apiRouter.post('/action/confirm', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetAccounts, count } = req.body;
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1 AND type = $2', [req.user!.id, 'account']);
    if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

    let ok = 0, fail = 0;
    const results = [];
    
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      
      // Usually confirming friend requests involves fetching pending requests then accepting them
      // Or if a target URL is provided, accepting that specific user.
      // But for bulk confirmations, it's typically fetching requests.
      // Since we don't have a specific target in confirm tab (as per ActionsPanel UI type !== 'confirm'),
      // we assume bulk confirm friend requests.
      const r = await makeFbReq(\`https://graph.facebook.com/v19.0/me/friendrequests\`, "GET", {}, accToken);
      if (r && r.data && Array.isArray(r.data)) {
        let accepted = 0;
        for (const req of r.data) {
           const acceptRes = await makeFbReq(\`https://graph.facebook.com/v19.0/me/friends/\${req.from.id}\`, "POST", {}, accToken);
           if (acceptRes && !acceptRes.error) accepted++;
        }
        ok++; results.push({ name: a.name, success: true, message: \`تم تأكيد \${accepted} طلب\` });
      } else {
        fail++; results.push({ name: a.name, success: false });
      }
      await pause();
    }
    res.json({ success: true, ok, fail, results });
  } catch (err) {
    res.status(500).json({ error: 'Action failed' });
  }
});

apiRouter.post('/action/follow', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { url, targetAccounts, count } = req.body;
    const target = extractId(url, 'post'); // Usually following a page/user ID
    if (!target) return res.status(400).json({ error: 'Invalid URL or ID' });
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');
    if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

    let ok = 0, fail = 0;
    const results = [];
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      // For following, often it's POST /{target}/subscribers or POST /me/likes?page_id={target}
      // We will try subscribers first (works for users), then fallback to likes (works for pages)
      let r = await makeFbReq(\`https://graph.facebook.com/v19.0/\${target}/subscribers\`, "POST", {}, accToken);
      if (r && r.error) {
         r = await makeFbReq(\`https://graph.facebook.com/v19.0/me/likes\`, "POST", { page_id: target }, accToken);
      }
      
      if (r && !r.error) {
        ok++; results.push({ name: a.name, success: true });
      } else {
        fail++; results.push({ name: a.name, success: false });
      }
      await pause();
    }
    res.json({ success: true, ok, fail, results });
  } catch (err) {
    res.status(500).json({ error: 'Action failed' });
  }
});
`;

// Insert the new routes before apiRouter.get('/settings'
serverTs = serverTs.replace("apiRouter.get('/settings'", newRoutes + "\napiRouter.get('/settings'");

fs.writeFileSync('server.ts', serverTs);
console.log('patched server.ts');
