const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const loginExtractRoute = `
apiRouter.post('/accounts/login-extract', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  
  const { credentials } = req.body;
  if (!Array.isArray(credentials)) return res.end();

  for (const cred of credentials) {
    try {
      // 1. Attempt login via legacy FB API
      const loginRes = await axios.get(\`https://b-api.facebook.com/method/auth.login\`, {
        params: {
          access_token: '350685531728|62f8ce9f74b12f84c123cc23437a4a32', // Standard Android Token
          email: cred.email,
          password: cred.password,
          format: 'json',
          generate_machine_id: '1',
          generate_session_cookies: '1',
          locale: 'en_US'
        }
      });

      if (loginRes.data && loginRes.data.access_token) {
        const t = loginRes.data.access_token;
        // 2. Fetch personal profile
        try {
          const meRes = await axios.get(\`https://graph.facebook.com/me?access_token=\${t}\`);
          const personalId = meRes.data.id;
          res.write(JSON.stringify({ 
            type: 'account', 
            data: { id: personalId, name: meRes.data.name, token: t, type: 'account', parentId: personalId, email: cred.email, password: cred.password } 
          }) + '\\n');
          
          // 3. Fetch pages
          try {
            const pagesRes = await axios.get(\`https://graph.facebook.com/me/accounts?access_token=\${t}\`);
            if (pagesRes.data && pagesRes.data.data) {
              for (const p of pagesRes.data.data) {
                res.write(JSON.stringify({ 
                  type: 'account', 
                  data: { id: p.id, name: p.name, token: p.access_token, type: 'page', parentId: personalId, email: cred.email, password: cred.password } 
                }) + '\\n');
              }
            }
          } catch(e) {}
        } catch(err) {
          res.write(JSON.stringify({ type: 'error', message: \`فشل جلب الحساب بعد تسجيل الدخول: \${cred.email}\` }) + '\\n');
        }
      } else {
        const errorMsg = loginRes.data?.error_msg || 'تأكد من صحة البيانات';
        res.write(JSON.stringify({ type: 'error', message: \`فشل تسجيل الدخول (\${cred.email}): \${errorMsg}\` }) + '\\n');
      }
    } catch(err: any) {
      res.write(JSON.stringify({ type: 'error', message: \`خطأ في الاتصال (\${cred.email})\` }) + '\\n');
    }
  }
  res.write(JSON.stringify({ type: 'done' }) + '\\n');
  res.end();
});
`;

content = content.replace("apiRouter.post('/action/react'", loginExtractRoute + "\n// --- REALTIME ACTION ROUTES ---\napiRouter.post('/action/react'");

fs.writeFileSync('server.ts', content);
console.log('Server login-extract route patched');
