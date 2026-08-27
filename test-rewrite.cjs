const fs = require('fs');

const code = `
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { initDb, query, execute } from './src/db.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use(cookieParser());

// --- AES Encryption at Rest ---
const _AES_PASSWORD = process.env.AES_PASSWORD || "58Zk72Mf2Xo60Dh4Gi87Xs45Yu20Yn0Td48Bq98Ya20Rd28Si27Ie29Wj97Ly32Aq55De37Qd8Ul";
const CIPHER_KEY = crypto.createHash('sha256').update(_AES_PASSWORD).digest();
const JWT_SECRET = process.env.JWT_SECRET || "secure_jwt_secret_key_2026";

function encryptString(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptString(text: string) {
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

// Authentication & Session Middleware
const getToken = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return req.cookies?.token;
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    
    const user = users[0];
    if (decryptString(user.password) !== password) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    if (user.status === 'blocked') return res.status(403).json({ error: 'عفواً، الحساب موقوف.' });
    if (user.role !== 'admin' && user.expiresat !== null && Date.now() > Number(user.expiresat)) {
      return res.status(403).json({ error: 'عفواً، الاشتراك غير فعال.' });
    }
    
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, userId: user.id, username: user.username, role: user.role, expiresAt: user.expiresat ? Number(user.expiresat) : null });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'اسم المستخدم غير متاح' });
    
    const allUsers = await query('SELECT COUNT(*) as count FROM users');
    const isFirstUser = parseInt(allUsers[0].count) === 0 || username === 'admin';
    const id = uuidv4();
    const role = isFirstUser ? 'admin' : 'user';
    const expiresAt = isFirstUser ? null : 0;
    
    await execute('INSERT INTO users (id, username, password, role, status, expiresAt) VALUES (?, ?, ?, ?, ?, ?)', [
      id, username, encryptString(password), role, 'active', expiresAt
    ]);
    
    const token = jwt.sign({ userId: id, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, userId: id, username, role, expiresAt });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في التسجيل' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.json({ authenticated: false });
    
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const users = await query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) return res.json({ authenticated: false });
    
    const user = users[0];
    if (user.status === 'blocked' || (user.role !== 'admin' && user.expiresat !== null && Date.now() > Number(user.expiresat))) {
      return res.json({ authenticated: false });
    }
    
    res.json({ authenticated: true, token, userId: user.id, username: user.username, role: user.role, expiresAt: user.expiresat ? Number(user.expiresat) : null });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'غير مصرح' });
    
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const users = await query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) return res.status(401).json({ error: 'غير مصرح' });
    
    const user = users[0];
    if (user.status === 'blocked') return res.status(403).json({ error: 'الحساب موقوف' });
    if (user.role !== 'admin' && user.expiresat !== null && Date.now() > Number(user.expiresat)) {
      return res.status(403).json({ error: 'الاشتراك غير فعال' });
    }
    
    (req as any).userId = user.id;
    (req as any).userRole = user.role;
    next();
  } catch (err) {
    res.status(401).json({ error: 'غير مصرح' });
  }
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((req as any).userRole !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  next();
};

// Admin Routes
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await query('SELECT id, username, role, status, expiresAt FROM users');
  res.json(users.map(u => ({ userId: u.id, username: u.username, role: u.role, status: u.status, expiresAt: u.expiresat ? Number(u.expiresat) : null })));
});

app.post('/api/admin/users/:id/action', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action, days } = req.body;
  
  const users = await query('SELECT * FROM users WHERE id = ?', [id]);
  if (users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
  
  if (action === 'block') await execute('UPDATE users SET status = ? WHERE id = ?', ['blocked', id]);
  if (action === 'unblock') await execute('UPDATE users SET status = ? WHERE id = ?', ['active', id]);
  if (action === 'add_time' && days) {
    const user = users[0];
    const currentExpiry = user.expiresat && Number(user.expiresat) > Date.now() ? Number(user.expiresat) : Date.now();
    const newExpiry = currentExpiry + (days * 24 * 60 * 60 * 1000);
    await execute('UPDATE users SET expiresAt = ? WHERE id = ?', [newExpiry, id]);
  }
  
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const users = await query('SELECT * FROM users WHERE id = ?', [id]);
  if (users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (users[0].role === 'admin') return res.status(400).json({ error: 'لا يمكن حذف مدير' });
  
  await execute('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true });
});

// Facebook Graph API Helpers
function getRandomUserAgent() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function makeFacebookRequest(url: string, method: string = "GET", params: any = {}, data: any = null, token: string | null = null) {
  const headers = {
    "User-Agent": getRandomUserAgent(),
    "x-fb-connection-bandwidth": Math.floor(Math.random() * 10000000 + 20000000).toString(),
    "x-fb-sim-hni": Math.floor(Math.random() * 9999 + 310000).toString(),
    "x-fb-net-hni": Math.floor(Math.random() * 9999 + 310000).toString(),
    "x-fb-connection-quality": ["EXCELLENT", "GOOD", "FAIR"][Math.floor(Math.random() * 3)],
    "x-forwarded-for": Array.from({length: 4}, () => Math.floor(Math.random() * 255) + 1).join('.'),
    "Accept-Language": "ar,en-US;q=0.7,en;q=0.3",
    "Connection": "keep-alive"
  };
  if (token) params["access_token"] = token;
  try {
    const config: any = { method, url, headers, params, timeout: 15000 };
    if (data) config.data = data;
    const response = await axios(config);
    return response.data;
  } catch (error: any) {
    return error.response ? error.response.data : null;
  }
}

async function loginFacebook(email: string, password: string) {
  const params = {
    email, password,
    access_token: "350685531728|62f8ce9f74b12f84c123cc23437a4a32",
    format: "json", generate_session_cookies: "1", sig: "3f555f99fb61fcd7aa0c44f58f522ef6"
  };
  return await makeFacebookRequest("https://b-api.facebook.com/method/auth.login", "GET", params);
}

async function getProfile(token: string) {
  try {
    const data = await makeFacebookRequest("https://graph.facebook.com/me", "GET", { fields: "id,name" }, null, token);
    return data && data.id ? data : { id: "unknown", name: "unknown" };
  } catch (e) {
    return { id: "unknown", name: "unknown" };
  }
}

function extractPostId(url: string) {
  try {
    if (!url.includes("facebook.com")) return null;
    const patterns = [ /facebook\.com\/(\d+)\/posts\/(\d+)/, /story_fbid=(\d+)&id=(\d+)/, /posts\/(\d+)/, /photo.php\?fbid=(\d+)/ ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match.length === 3 ? \`\${match[1]}_\${match[2]}\` : match[1];
    }
    return null;
  } catch { return null; }
}

function extractCommentId(url: string) {
  try {
    if (!url.includes("facebook.com")) return null;
    if (url.includes("comment_id=")) return url.split("comment_id=")[1].split("&")[0];
    const parts = url.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1].split("?")[0];
    if (/^\d+$/.test(lastPart)) return lastPart;
    return null;
  } catch { return null; }
}

const pause = () => new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 900));

// Accounts API
app.get('/api/accounts', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const accounts = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
  res.json(accounts.map(a => ({
    id: a.id,
    acc_id: a.acc_id,
    name: a.name,
    email: decryptString(a.email),
    password: decryptString(a.password),
    token: decryptString(a.token),
    shared_by: a.shared_by,
    type: a.type,
    parentId: a.parent_id
  })));
});

app.post('/api/accounts/add', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { email, password } = req.body;
  const r = await loginFacebook(email, password);
  if (r && r.access_token) {
    const p = await getProfile(r.access_token);
    await execute('INSERT INTO accounts (user_id, acc_id, name, email, password, token, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      userId, p.id, p.name, encryptString(email), encryptString(password), encryptString(r.access_token), 'account'
    ]);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'فشل تسجيل الدخول' });
  }
});

app.post('/api/accounts/add_token', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const token = req.body.token;
  if (!token) return res.status(400).json({ error: 'توكن غير صالح' });
  const p = await getProfile(token);
  if (p.id && p.id !== "unknown") {
    await execute('INSERT INTO accounts (user_id, acc_id, name, email, password, token, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      userId, p.id, p.name, encryptString(''), encryptString(''), encryptString(token), 'account'
    ]);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'توكن غير صالح أو حساب معطل' });
  }
});

app.post('/api/accounts/bulk_add', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const results = [];
  for (const item of req.body.lines) {
    const r = await loginFacebook(item.email, item.password);
    if (r && r.access_token) {
      const p = await getProfile(r.access_token);
      await execute('INSERT INTO accounts (user_id, acc_id, name, email, password, token, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        userId, p.id, p.name, encryptString(item.email), encryptString(item.password), encryptString(r.access_token), 'account'
      ]);
      results.push({ success: true, name: p.name, email: item.email });
    } else {
      results.push({ success: false, email: item.email });
    }
    await pause();
  }
  res.json({ success: true, results });
});

app.post('/api/accounts/bulk_tokens', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const results = [];
  for (const token of req.body.tokens) {
    if (token) {
      const p = await getProfile(token);
      if (p.id && p.id !== "unknown") {
        await execute('INSERT INTO accounts (user_id, acc_id, name, email, password, token, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          userId, p.id, p.name, encryptString(''), encryptString(''), encryptString(token), 'account'
        ]);
        results.push({ success: true, name: p.name });
      } else {
        results.push({ success: false });
      }
    } else {
      results.push({ success: false });
    }
    await pause();
  }
  res.json({ success: true, results });
});

app.delete('/api/accounts/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const accs = await query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [id, userId]);
  if (accs.length === 0) return res.status(404).json({ error: 'غير موجود' });
  if (accs[0].shared_by) return res.status(400).json({ error: 'لا يمكن حذف حساب مشترك' });
  
  await execute('DELETE FROM accounts WHERE id = ?', [id]);
  res.json({ success: true });
});

app.post('/api/accounts/clear', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  await execute('DELETE FROM accounts WHERE user_id = ? AND shared_by IS NULL', [userId]);
  res.json({ success: true });
});

app.post('/api/accounts/renew', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const accs = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
  for (const acc of accs) {
    if (acc.shared_by || acc.type === 'page') continue;
    const email = decryptString(acc.email);
    const pass = decryptString(acc.password);
    if (email && pass) {
      const r = await loginFacebook(email, pass);
      if (r && r.access_token) {
        const p = await getProfile(r.access_token);
        await execute('UPDATE accounts SET token = ?, acc_id = ?, name = ? WHERE id = ?', [
          encryptString(r.access_token), p.id || "unknown", p.name || "unknown", acc.id
        ]);
      }
      await pause();
    }
  }
  res.json({ success: true });
});

app.post('/api/accounts/:id/pages', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const accs = await query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [id, userId]);
  
  if (accs.length === 0) return res.status(400).json({ error: 'حساب غير صالح' });
  const acc = accs[0];
  const token = decryptString(acc.token);
  
  const r = await makeFacebookRequest("https://graph.facebook.com/v19.0/me/accounts", "GET", { fields: "id,name,access_token" }, null, token);
  if (r && r.data) {
    const existing = await query('SELECT acc_id FROM accounts WHERE user_id = ? AND type = ?', [userId, 'page']);
    const existingIds = new Set(existing.map((a: any) => a.acc_id));
    let added = 0;
    for (const page of r.data) {
      if (!existingIds.has(page.id)) {
        await execute('INSERT INTO accounts (user_id, acc_id, name, token, type, parent_id) VALUES (?, ?, ?, ?, ?, ?)', [
          userId, page.id, page.name, encryptString(page.access_token), 'page', acc.acc_id
        ]);
        added++;
      }
    }
    res.json({ success: true, count: added });
  } else {
    res.status(400).json({ error: 'فشل استخراج الصفحات' });
  }
});

app.post('/api/share', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { targetUsername } = req.body;
  const targets = await query('SELECT * FROM users WHERE username = ?', [targetUsername]);
  if (targets.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
  
  const targetUser = targets[0];
  if (targetUser.id === userId) return res.status(400).json({ error: 'لا يمكنك المشاركة مع نفسك' });

  const accs = await query('SELECT * FROM accounts WHERE user_id = ? AND type = ?', [userId, 'account']);
  if (accs.length === 0) return res.status(400).json({ error: 'لا يوجد حسابات للمشاركة' });

  let count = 0;
  for (const acc of accs) {
    await execute('INSERT INTO accounts (user_id, acc_id, name, email, password, token, shared_by, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      targetUser.id, acc.acc_id, acc.name, acc.email, acc.password, acc.token, userId, 'account'
    ]);
    count++;
  }
  res.json({ success: true, count });
});

// Actions
app.post('/api/action/react', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { url, type, count, reactions, targetAccounts } = req.body;
  const target = type === 'post' ? extractPostId(url) : extractCommentId(url);
  if (!target) return res.status(400).json({ error: 'رابط غير صالح' });

  let accs = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

  let ok = 0, fail = 0;
  const results = [];
  for (const a of accs) {
    const accToken = decryptString(a.token);
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    const r = await makeFacebookRequest(\`https://graph.facebook.com/v19.0/\${target}/reactions\`, "POST", { type: reaction }, null, accToken);
    if (r && !r.error) {
      ok++; results.push({ name: a.name, id: a.acc_id, reaction, success: true });
    } else {
      fail++; results.push({ name: a.name, id: a.acc_id, success: false });
    }
    await pause();
  }
  res.json({ success: true, ok, fail, results });
});

app.post('/api/action/confirm', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { mainUrl, confirmUrl, type, targetAccounts } = req.body;
  const mainTarget = type === 'post' ? extractPostId(mainUrl) : extractCommentId(mainUrl);
  const confirmTarget = extractCommentId(confirmUrl);
  if (!mainTarget || !confirmTarget) return res.status(400).json({ error: 'روابط غير صالحة' });

  let accs = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  let ok = 0, fail = 0;
  const results = [];
  for (const a of accs) {
    const accToken = decryptString(a.token);
    const r1 = await makeFacebookRequest(\`https://graph.facebook.com/v19.0/\${mainTarget}/reactions\`, "POST", { type: "LIKE" }, null, accToken);
    const r2 = await makeFacebookRequest(\`https://graph.facebook.com/v19.0/\${confirmTarget}/reactions\`, "POST", { type: "LIKE" }, null, accToken);
    if (r1 && !r1.error && r2 && !r2.error) {
      ok++; results.push({ name: a.name, success: true });
    } else {
      fail++; results.push({ name: a.name, success: false });
    }
    await pause();
  }
  res.json({ success: true, ok, fail, results });
});

app.post('/api/action/unreact', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { url, type, toRemoveIds, targetAccounts } = req.body;
  const targetId = type === 'post' ? extractPostId(url) : extractCommentId(url);
  if (!targetId) return res.status(400).json({ error: 'رابط غير صالح' });

  let accs = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  let ok = 0, fail = 0;
  const results = [];
  for (const a of accs) {
    if (toRemoveIds.length === 0 || toRemoveIds.includes(a.acc_id)) {
      try {
        const accToken = decryptString(a.token);
        const response = await axios.delete(\`https://graph.facebook.com/v19.0/\${targetId}/likes\`, { params: { access_token: accToken }, timeout: 15000 });
        if (response.status === 200) {
          ok++; results.push({ name: a.name, success: true });
        } else {
          fail++; results.push({ name: a.name, success: false });
        }
      } catch (e) {
        fail++; results.push({ name: a.name, success: false });
      }
      await pause();
    }
  }
  res.json({ success: true, ok, fail, results });
});

app.post('/api/action/follow', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { pageId, count, targetAccounts } = req.body;
  
  let accs = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

  let ok = 0, fail = 0;
  const results = [];
  for (const a of accs) {
    const accToken = decryptString(a.token);
    const r = await makeFacebookRequest(\`https://graph.facebook.com/v19.0/\${pageId}/likes\`, "POST", {}, null, accToken);
    if (r && !r.error) {
      ok++; results.push({ name: a.name, success: true });
    } else {
      fail++; results.push({ name: a.name, success: false });
    }
    await pause();
  }
  res.json({ success: true, ok, fail, results });
});

app.post('/api/action/comment', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { url, type, count, words, isRandom, targetAccounts } = req.body;
  const targetId = type === 'post' ? extractPostId(url) : extractCommentId(url);
  if (!targetId) return res.status(400).json({ error: 'رابط غير صالح' });

  let accs = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  if (accs.length === 0) return res.status(400).json({ error: 'لا يوجد حسابات' });

  const commentWords = isRandom ? Array.from({length: parseInt(count, 10)}, () => {
    const len = Math.floor(Math.random() * 8) + 5;
    return Array.from({length: len}, () => "ضصثقفغعهخحجدشسيبلاتنمكطئءؤرلاىةوزظ".charAt(Math.floor(Math.random() * 34))).join('');
  }) : words;

  let ok = 0, fail = 0;
  const results = [];
  const loopCount = parseInt(count, 10);
  for (let i = 0; i < loopCount; i++) {
    const a = accs[i % accs.length];
    const accToken = decryptString(a.token);
    const message = commentWords[Math.floor(Math.random() * commentWords.length)];
    const r = await makeFacebookRequest(\`https://graph.facebook.com/v19.0/\${targetId}/comments\`, "POST", { message }, null, accToken);
    if (r && !r.error) {
      ok++; results.push({ name: a.name, success: true, message });
    } else {
      fail++; results.push({ name: a.name, success: false, message });
    }
    await pause();
  }
  res.json({ success: true, ok, fail, results });
});

async function startServer() {
  await initDb();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(\`Server running on http://localhost:\${PORT}\`));
}

startServer();
`

fs.writeFileSync('server.ts', code);
