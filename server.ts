import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Ensure DATABASE_URL is checked early, but do not crash on import if it's missing,
// instead we will crash gracefully during initDb if we can't connect.
const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_only';

app.use(express.json());

// --- Initialization & Server Start ---

let dbInitialized = false;
let dbInitPromise: Promise<void> | null = null;

// Ensure database is initialized before any request is processed
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    if (!dbInitPromise) {
      dbInitPromise = initDb().then(() => {
        dbInitialized = true;
      }).catch(err => {
        console.error("Critical DB Init Error:", err);
        dbInitPromise = null;
      });
    }
    try {
      await dbInitPromise;
    } catch (err) {
      return res.status(500).json({ error: 'Database initialization failed' });
    }
  }
  next();
});

// AES Encryption for Facebook tokens
const _AES_PASSWORD = process.env.AES_PASSWORD || "default_aes_password_replace_in_production_123456";
const CIPHER_KEY = crypto.createHash('sha256').update(_AES_PASSWORD).digest();

function encryptToken(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(text: string) {
  if (!text || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

// Database Setup
let pool: pg.Pool;

async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('FATAL ERROR: DATABASE_URL environment variable is missing.');
    console.error('Please configure your production PostgreSQL connection string.');
    process.exit(1);
  }

  pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Create clean schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        acc_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        password VARCHAR(255),
        token TEXT,
        shared_by UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'account',
        parent_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    console.log("PostgreSQL schema validated successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exit(1);
  }
}

// Auth Middleware
interface AuthRequest extends Request {
  user?: { id: string, username: string, role: string, status: string, expires_at: Date | null };
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const { rows } = await pool.query('SELECT id, username, role, status, expires_at FROM users WHERE id = $1', [decoded.id]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const user = rows[0];
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Forbidden: Account is blocked' });
    }

    if (user.role !== 'admin' && user.expires_at && new Date() > new Date(user.expires_at)) {
      return res.status(403).json({ error: 'Forbidden: Subscription expired' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  next();
}

// API Routes
const apiRouter = express.Router();

// --- Auth Routes ---
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Invalid username or password format' });
    }

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(countRows[0].count) === 0;
    const role = isFirstUser ? 'admin' : 'user';
    const status = 'active';

    const hash = await bcrypt.hash(password, 10);
    const { rows: newUsers } = await pool.query(
      'INSERT INTO users (username, password_hash, role, status) VALUES ($1, $2, $3, $4) RETURNING id, username, role, status, expires_at',
      [username, hash, role, status]
    );

    const user = newUsers[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '365d' });

    res.json({ success: true, token, user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    if (user.role !== 'admin' && user.expires_at && new Date() > new Date(user.expires_at)) {
      return res.status(403).json({ error: 'Subscription expired' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '365d' });
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiRouter.get('/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ authenticated: true, user: req.user });
});

apiRouter.post('/auth/logout', (req, res) => {
  res.json({ success: true });
});

// --- Account Management Routes ---
apiRouter.get('/accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    res.json(rows.map(r => ({ ...r, token: r.token ? '***' : null }))); // Don't expose tokens
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

apiRouter.post('/accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { accounts } = req.body;
    if (!Array.isArray(accounts)) return res.status(400).json({ error: 'Invalid payload' });

    let count = 0;
    for (const acc of accounts) {
      if (!acc.id || !acc.name) continue;
      const encryptedToken = encryptToken(acc.token);
      const encryptedPassword = encryptToken(acc.password);
      
      await pool.query(
        'INSERT INTO accounts (user_id, acc_id, name, email, password, token, type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [req.user!.id, acc.id, acc.name, acc.email || '', encryptedPassword, encryptedToken, acc.type || 'account']
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add accounts' });
  }
});

apiRouter.delete('/accounts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

apiRouter.delete('/accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM accounts WHERE user_id = $1 AND shared_by IS NULL', [req.user!.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear accounts' });
  }
});


apiRouter.post('/accounts/extract', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  
  const { tokens } = req.body;
  if (!Array.isArray(tokens)) return res.end();

  for (const t of tokens) {
    try {
      const meRes = await axios.get(`https://graph.facebook.com/me?access_token=${t}`);
      const personalId = meRes.data.id;
      res.write(JSON.stringify({ type: 'account', data: { id: personalId, name: meRes.data.name, token: t, type: 'account', parentId: personalId } }) + '\n');
      
      try {
        const pagesRes = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${t}`);
        if (pagesRes.data && pagesRes.data.data) {
          for (const p of pagesRes.data.data) {
            res.write(JSON.stringify({ type: 'account', data: { id: p.id, name: p.name, token: p.access_token, type: 'page', parentId: personalId } }) + '\n');
          }
        }
      } catch(e) {}
    } catch(err) {
      res.write(JSON.stringify({ type: 'error', message: `فشل الاتصال بالمفتاح: ${t.substring(0, 15)}...` }) + '\n');
    }
  }
  res.write(JSON.stringify({ type: 'done' }) + '\n');
  res.end();
});

apiRouter.post('/accounts/share', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetUsername } = req.body;
    const { rows: targets } = await pool.query('SELECT id FROM users WHERE username = $1', [targetUsername]);
    
    if (targets.length === 0) return res.status(404).json({ error: 'User not found' });
    const targetUserId = targets[0].id;
    
    if (targetUserId === req.user!.id) return res.status(400).json({ error: 'Cannot share with yourself' });
    
    const { rows: myAccounts } = await pool.query("SELECT * FROM accounts WHERE user_id = $1 AND type = 'account'", [req.user!.id]);
    
    let count = 0;
    for (const acc of myAccounts) {
      await pool.query(
        'INSERT INTO accounts (user_id, acc_id, name, email, password, token, shared_by, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [targetUserId, acc.acc_id, acc.name, acc.email, acc.password, acc.token, req.user!.id, 'account']
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to share accounts' });
  }
});

// --- Admin Routes ---
apiRouter.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, role, status, expires_at, created_at FROM users');
    // Also get counts
    const { rows: counts } = await pool.query('SELECT user_id, COUNT(*) as count FROM accounts GROUP BY user_id');
    
    const usersWithCounts = rows.map(u => {
      const c = counts.find(x => x.user_id === u.id);
      return { ...u, accountsCount: c ? parseInt(c.count) : 0 };
    });
    
    res.json(usersWithCounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

apiRouter.post('/admin/users/:id/action', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { action, days } = req.body;
    const userId = req.params.id;
    
    if (action === 'block') {
      await pool.query("UPDATE users SET status = 'blocked' WHERE id = $1", [userId]);
    } else if (action === 'unblock') {
      await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [userId]);
    } else if (action === 'pause') {
      await pool.query("UPDATE users SET status = 'paused' WHERE id = $1", [userId]);
    } else if (action === 'extend' && days) {
      const ms = parseInt(days) * 24 * 60 * 60 * 1000;
      await pool.query("UPDATE users SET expires_at = COALESCE(expires_at, NOW()) + $1 * interval '1 millisecond' WHERE id = $2", [ms, userId]);
    } else if (action === 'reduce' && days) {
      const ms = parseInt(days) * 24 * 60 * 60 * 1000;
      await pool.query("UPDATE users SET expires_at = COALESCE(expires_at, NOW()) - $1 * interval '1 millisecond' WHERE id = $2", [ms, userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

apiRouter.delete('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Facebook Action Automation Routes ---
const pause = () => new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
function extractId(url: string, targetType: 'post' | 'comment' = 'post') {
  if (!url) return null;
  if (/^\d+(_\d+)?$/.test(url.trim())) return url.trim();

  if (targetType === 'comment') {
    const commentMatch = url.match(/(?:comment_id=|reply_comment_id=)([0-9]+)/);
    if (commentMatch) return commentMatch[1];
    
    // Sometimes comment IDs are in the path: /comments/{comment_id}
    const pathMatch = url.match(/\/comments\/([0-9]+)/);
    if (pathMatch) return pathMatch[1];
  }

  const match = url.match(/(?:fbid=|posts\/|videos\/|v=|story_fbid=|id=|groups\/[^\/]+\/permalink\/|pfbid)([0-9a-zA-Z]+)/);
  return match ? match[1] : null;
}

async function makeFbReq(url: string, method: string, data: any, token: string) {
  try {
    const res = await axios({
      method, url, data,
      params: { access_token: token },
      timeout: 10000
    });
    return res.data;
  } catch (e: any) {
    return { error: true, details: e.response?.data || e.message };
  }
}


// --- REALTIME ACTION ROUTES ---

apiRouter.post('/accounts/login-extract', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  
  const { credentials } = req.body;
  if (!Array.isArray(credentials)) return res.end();

  for (const cred of credentials) {
    try {
      // 1. Attempt login via legacy FB API
      const loginRes = await axios.get(`https://b-api.facebook.com/method/auth.login`, {
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
          const meRes = await axios.get(`https://graph.facebook.com/me?access_token=${t}`);
          const personalId = meRes.data.id;
          res.write(JSON.stringify({ 
            type: 'account', 
            data: { id: personalId, name: meRes.data.name, token: t, type: 'account', parentId: personalId, email: cred.email, password: cred.password } 
          }) + '\n');
          
          // 3. Fetch pages
          try {
            const pagesRes = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${t}`);
            if (pagesRes.data && pagesRes.data.data) {
              for (const p of pagesRes.data.data) {
                res.write(JSON.stringify({ 
                  type: 'account', 
                  data: { id: p.id, name: p.name, token: p.access_token, type: 'page', parentId: personalId, email: cred.email, password: cred.password } 
                }) + '\n');
              }
            }
          } catch(e) {}
        } catch(err) {
          res.write(JSON.stringify({ type: 'error', message: `فشل جلب الحساب بعد تسجيل الدخول: ${cred.email}` }) + '\n');
        }
      } else {
        const errorMsg = loginRes.data?.error_msg || 'تأكد من صحة البيانات';
        res.write(JSON.stringify({ type: 'error', message: `فشل تسجيل الدخول (${cred.email}): ${errorMsg}` }) + '\n');
      }
    } catch(err: any) {
      res.write(JSON.stringify({ type: 'error', message: `خطأ في الاتصال (${cred.email})` }) + '\n');
    }
  }
  res.write(JSON.stringify({ type: 'done' }) + '\n');
  res.end();
});

// --- REALTIME ACTION ROUTES ---
apiRouter.post('/action/react', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, reactions, targetAccounts, count, targetType } = req.body;
    const target = extractId(url, targetType || 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');
    if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

    let ok = 0, fail = 0;
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      const r = await makeFbReq(`https://graph.facebook.com/v19.0/${target}/reactions`, "POST", { type: reaction }, accToken);
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, reaction, success: true, message: 'تم التفاعل' } }) + '\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\n');
  }
  res.end();
});

apiRouter.post('/action/unreact', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, targetAccounts, targetType } = req.body;
    const target = extractId(url, targetType || 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');

    let ok = 0, fail = 0;
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      const r = await makeFbReq(`https://graph.facebook.com/v19.0/${target}/likes`, "DELETE", {}, accToken);
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message: 'تم الإزالة' } }) + '\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\n');
  }
  res.end();
});

apiRouter.post('/action/comment', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, words, count, isRandom, targetAccounts, targetType } = req.body;
    const target = extractId(url, targetType || 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');

    if (accs.length === 0) { res.write(JSON.stringify({ type: 'error', message: 'No accounts' }) + '\n'); return res.end(); }

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
      
      const r = await makeFbReq(`https://graph.facebook.com/v19.0/${target}/comments`, "POST", { message }, accToken);
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message } }) + '\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\n');
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
      const r = await makeFbReq(`https://graph.facebook.com/v19.0/me/friendrequests`, "GET", {}, accToken);
      if (r && r.data && Array.isArray(r.data)) {
        let accepted = 0;
        for (const req of r.data) {
           const acceptRes = await makeFbReq(`https://graph.facebook.com/v19.0/me/friends/${req.from.id}`, "POST", {}, accToken);
           if (acceptRes && !acceptRes.error) accepted++;
        }
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message: `تم تأكيد ${accepted} طلب` } }) + '\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: 'لا توجد طلبات' } }) + '\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\n');
  }
  res.end();
});

apiRouter.post('/action/follow', requireAuth, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'application/jsonl');
  try {
    const { url, targetAccounts, count } = req.body;
    const target = extractId(url, 'post');
    if (!target) { res.write(JSON.stringify({ type: 'error', message: 'Invalid URL' }) + '\n'); return res.end(); }
    
    let { rows: accs } = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.user!.id]);
    if (targetAccounts === 'personal') accs = accs.filter(a => a.type !== 'page');
    if (targetAccounts === 'pages') accs = accs.filter(a => a.type === 'page');
    if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

    let ok = 0, fail = 0;
    for (const a of accs) {
      if (!a.token) continue;
      const accToken = decryptToken(a.token);
      let r = await makeFbReq(`https://graph.facebook.com/v19.0/${target}/subscribers`, "POST", {}, accToken);
      if (r && r.error) {
         r = await makeFbReq(`https://graph.facebook.com/v19.0/me/likes`, "POST", { page_id: target }, accToken);
      }
      if (r && !r.error) {
        ok++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: true, message: 'تمت المتابعة' } }) + '\n');
      } else {
        fail++; res.write(JSON.stringify({ type: 'progress', data: { name: a.name, success: false, message: r.details?.error?.message } }) + '\n');
      }
      await pause();
    }
    res.write(JSON.stringify({ type: 'done', summary: { ok, fail } }) + '\n');
  } catch (err) {
    res.write(JSON.stringify({ type: 'error' }) + '\n');
  }
  res.end();
});
apiRouter.get('/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings');
    const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

apiRouter.post('/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.use('/api', apiRouter);





async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the server locally (Vercel would use export default app, but we are standardizing Node.js)
startServer();

export default app;
