import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use(cookieParser());

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DATA_FILE = path.join(DATA_DIR, 'accounts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// --- AES Encryption at Rest ---
const _AES_PASSWORD = "58Zk72Mf2Xo60Dh4Gi87Xs45Yu20Yn0Td48Bq98Ya20Rd28Si27Ie29Wj97Ly32Aq55De37Qd8Ul";
const CIPHER_KEY = crypto.createHash('sha256').update(_AES_PASSWORD).digest();

function encryptString(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptString(text: string) {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}

function loadJson(file: string, initData: any = {}) {
  if (!fs.existsSync(file)) {
    saveJson(file, initData);
    return initData;
  }
  try {
    const content = fs.readFileSync(file, 'utf8');
    // Check if it's encrypted
    if (content.includes(':')) {
      const dec = decryptString(content);
      if (dec) return JSON.parse(dec);
    }
    // Fallback for plain-text migration: read it, then save it encrypted.
    const parsed = JSON.parse(content);
    saveJson(file, parsed);
    return parsed;
  } catch {
    return initData;
  }
}

function saveJson(file: string, data: any) {
  const json = JSON.stringify(data, null, 2);
  const encrypted = encryptString(json);
  fs.writeFileSync(file, encrypted, 'utf8');
}
// ------------------------------

// Authentication & Session Middleware
const SESSIONS: Record<string, string> = {}; 

const getToken = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return req.cookies?.sessionId;
};

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadJson(USERS_FILE, {});
  const user = Object.values(users).find((u: any) => u.username === username && u.password === password) as any;
  
  if (user) {
    if (user.status === 'blocked') return res.status(403).json({ error: 'عفواً، الحساب موقوف.' });
    if (user.role !== 'admin' && user.expiresAt !== null && Date.now() > user.expiresAt) {
      return res.status(403).json({ error: 'عفواً، الاشتراك غير فعال.' });
    }
    
    const sessionId = uuidv4();
    SESSIONS[sessionId] = user.id;
    res.json({ success: true, token: sessionId, userId: user.id, username: user.username, role: user.role, expiresAt: user.expiresAt });
  } else {
    res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  const users = loadJson(USERS_FILE, {});
  
  if (Object.values(users).find((u: any) => u.username === username)) {
    return res.status(400).json({ error: 'اسم المستخدم غير متاح' });
  }
  
  const isFirstUser = Object.keys(users).length === 0 || username === 'admin';
  const id = uuidv4();
  
  users[id] = { 
    id, 
    username, 
    password,
    role: isFirstUser ? 'admin' : 'user',
    status: 'active',
    expiresAt: isFirstUser ? null : 0 // 0 means expired instantly (no free trial)
  };
  saveJson(USERS_FILE, users);
  
  const sessionId = uuidv4();
  SESSIONS[sessionId] = id;
  res.json({ success: true, token: sessionId, userId: id, username, role: users[id].role, expiresAt: users[id].expiresAt });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = getToken(req);
  if (sessionId) delete SESSIONS[sessionId];
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const sessionId = getToken(req);
  if (!sessionId || !SESSIONS[sessionId]) {
    return res.json({ authenticated: false });
  }
  
  const userId = SESSIONS[sessionId];
  const users = loadJson(USERS_FILE, {});
  const user = users[userId];
  
  if (!user) return res.json({ authenticated: false });
  
  if (user.status === 'blocked' || (user.role !== 'admin' && user.expiresAt !== null && Date.now() > user.expiresAt)) {
    delete SESSIONS[sessionId];
    return res.json({ authenticated: false });
  }
  
  res.json({ authenticated: true, token: sessionId, userId: user.id, username: user.username, role: user.role, expiresAt: user.expiresAt });
});

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sessionId = getToken(req);
  if (!sessionId || !SESSIONS[sessionId]) return res.status(401).json({ error: 'غير مصرح' });
  
  const userId = SESSIONS[sessionId];
  const users = loadJson(USERS_FILE, {});
  const user = users[userId];
  
  if (!user || user.status === 'blocked') {
    return res.status(403).json({ error: 'الحساب موقوف' });
  }
  if (user.role !== 'admin' && user.expiresAt !== null && Date.now() > user.expiresAt) {
    return res.status(403).json({ error: 'الاشتراك غير فعال' });
  }
  
  (req as any).userId = userId;
  (req as any).userRole = user.role;
  next();
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((req as any).userRole !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  next();
};

// Admin Routes
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const users = loadJson(USERS_FILE, {});
  // Exclude passwords
  const usersList = Object.values(users).map((u: any) => ({
    userId: u.id, username: u.username, role: u.role, status: u.status, expiresAt: u.expiresAt
  }));
  res.json(usersList);
});

app.post('/api/admin/users/:id/action', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, days } = req.body;
  const users = loadJson(USERS_FILE, {});
  
  if (!users[id]) return res.status(404).json({ error: 'المستخدم غير موجود' });
  
  if (action === 'block') users[id].status = 'blocked';
  if (action === 'unblock') users[id].status = 'active';
  if (action === 'add_time' && days) {
    const currentExpiry = users[id].expiresAt && users[id].expiresAt > Date.now() ? users[id].expiresAt : Date.now();
    users[id].expiresAt = currentExpiry + (days * 24 * 60 * 60 * 1000);
  }
  
  saveJson(USERS_FILE, users);
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const users = loadJson(USERS_FILE, {});
  
  if (!users[id]) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (users[id].role === 'admin') return res.status(400).json({ error: 'لا يمكن حذف مدير' });
  
  delete users[id];
  saveJson(USERS_FILE, users);
  
  // Clean up user data
  const data = loadJson(DATA_FILE, {});
  delete data[id];
  saveJson(DATA_FILE, data);
  
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
      if (match) return match.length === 3 ? `${match[1]}_${match[2]}` : match[1];
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
app.get('/api/accounts', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const data = loadJson(DATA_FILE, {});
  res.json(data[userId] || []);
});

app.post('/api/accounts/add', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { email, password } = req.body;
  const r = await loginFacebook(email, password);
  if (r && r.access_token) {
    const p = await getProfile(r.access_token);
    const acc = { email, password, token: r.access_token, name: p.name, id: p.id, type: 'account' };
    const data = loadJson(DATA_FILE, {});
    data[userId] = data[userId] || [];
    data[userId].push(acc);
    saveJson(DATA_FILE, data);
    res.json({ success: true, account: acc });
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
    const acc = { email: "", password: "", token, name: p.name, id: p.id, type: 'account' };
    const data = loadJson(DATA_FILE, {});
    data[userId] = data[userId] || [];
    data[userId].push(acc);
    saveJson(DATA_FILE, data);
    res.json({ success: true, account: acc });
  } else {
    res.status(400).json({ error: 'توكن غير صالح أو حساب معطل' });
  }
});

app.post('/api/accounts/bulk_add', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const data = loadJson(DATA_FILE, {});
  data[userId] = data[userId] || [];
  const results = [];
  for (const item of req.body.lines) {
    const r = await loginFacebook(item.email, item.password);
    if (r && r.access_token) {
      const p = await getProfile(r.access_token);
      data[userId].push({ email: item.email, password: item.password, token: r.access_token, name: p.name, id: p.id, type: 'account' });
      results.push({ success: true, name: p.name, email: item.email });
    } else {
      results.push({ success: false, email: item.email });
    }
    await pause();
  }
  saveJson(DATA_FILE, data);
  res.json({ success: true, results });
});

app.post('/api/accounts/bulk_tokens', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const data = loadJson(DATA_FILE, {});
  data[userId] = data[userId] || [];
  const results = [];
  for (const token of req.body.tokens) {
    if (token) {
      const p = await getProfile(token);
      if (p.id && p.id !== "unknown") {
        data[userId].push({ email: "", password: "", token, name: p.name, id: p.id, type: 'account' });
        results.push({ success: true, name: p.name });
      } else {
        results.push({ success: false });
      }
    } else {
      results.push({ success: false });
    }
    await pause();
  }
  saveJson(DATA_FILE, data);
  res.json({ success: true, results });
});

app.delete('/api/accounts/:index', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const index = parseInt(req.params.index as string, 10);
  const data = loadJson(DATA_FILE, {});
  if (!data[userId] || !data[userId][index]) return res.status(404).json({ error: 'غير موجود' });
  if (data[userId][index].shared_by) return res.status(400).json({ error: 'لا يمكن حذف حساب مشترك' });
  
  data[userId].splice(index, 1);
  saveJson(DATA_FILE, data);
  res.json({ success: true });
});

app.post('/api/accounts/clear', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const data = loadJson(DATA_FILE, {});
  if (data[userId]) {
    data[userId] = data[userId].filter((acc: any) => acc.shared_by);
    saveJson(DATA_FILE, data);
  }
  res.json({ success: true });
});

app.post('/api/accounts/renew', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const data = loadJson(DATA_FILE, {});
  const accs = data[userId] || [];
  const newList = [];
  for (const acc of accs) {
    if (acc.shared_by || acc.type === 'page') {
      newList.push(acc);
      continue;
    }
    if (acc.email && acc.password) {
      const r = await loginFacebook(acc.email, acc.password);
      if (r && r.access_token) {
        acc.token = r.access_token;
        const p = await getProfile(acc.token);
        acc.name = p.name || "unknown";
        acc.id = p.id || "unknown";
      }
      newList.push(acc);
      await pause();
    } else {
      newList.push(acc);
    }
  }
  data[userId] = newList;
  saveJson(DATA_FILE, data);
  res.json({ success: true });
});

app.post('/api/accounts/:index/pages', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const index = parseInt(req.params.index as string, 10);
  const data = loadJson(DATA_FILE, {});
  const acc = data[userId]?.[index];
  
  if (!acc || !acc.token) return res.status(400).json({ error: 'حساب غير صالح' });
  
  const r = await makeFacebookRequest("https://graph.facebook.com/v19.0/me/accounts", "GET", { fields: "id,name,access_token" }, null, acc.token);
  if (r && r.data) {
    const existingIds = new Set(data[userId].map((a: any) => a.id));
    let added = 0;
    r.data.forEach((page: any) => {
      if (!existingIds.has(page.id)) {
        data[userId].push({ id: page.id, name: page.name, token: page.access_token, type: 'page', parentId: acc.id });
        added++;
      }
    });
    saveJson(DATA_FILE, data);
    res.json({ success: true, count: added });
  } else {
    res.status(400).json({ error: 'فشل استخراج الصفحات' });
  }
});

app.post('/api/share', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { targetUsername } = req.body;
  const users = loadJson(USERS_FILE, {});
  const targetUser = Object.values(users).find((u: any) => u.username === targetUsername) as any;
  if (!targetUser) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (targetUser.id === userId) return res.status(400).json({ error: 'لا يمكنك المشاركة مع نفسك' });

  const data = loadJson(DATA_FILE, {});
  const accs = data[userId] || [];
  if (accs.length === 0) return res.status(400).json({ error: 'لا يوجد حسابات للمشاركة' });

  const sharedAccs = accs.map((acc: any) => ({ ...acc, shared_by: userId }));
  data[targetUser.id] = data[targetUser.id] || [];
  data[targetUser.id].push(...sharedAccs);
  saveJson(DATA_FILE, data);
  res.json({ success: true, count: sharedAccs.length });
});

// Actions
app.post('/api/action/react', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { url, type, count, reactions, targetAccounts } = req.body;
  const target = type === 'post' ? extractPostId(url) : extractCommentId(url);
  if (!target) return res.status(400).json({ error: 'رابط غير صالح' });

  const data = loadJson(DATA_FILE, {});
  let accs = data[userId] || [];
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

  let ok = 0, fail = 0;
  const results = [];
  for (const acc of accs) {
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    const r = await makeFacebookRequest(`https://graph.facebook.com/v19.0/${target}/reactions`, "POST", { type: reaction }, null, acc.token);
    if (r && !r.error) {
      ok++; results.push({ name: acc.name, id: acc.id, reaction, success: true });
    } else {
      fail++; results.push({ name: acc.name, id: acc.id, success: false });
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

  const data = loadJson(DATA_FILE, {});
  let accs = data[userId] || [];
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  let ok = 0, fail = 0;
  const results = [];
  for (const acc of accs) {
    const r1 = await makeFacebookRequest(`https://graph.facebook.com/v19.0/${mainTarget}/reactions`, "POST", { type: "LIKE" }, null, acc.token);
    const r2 = await makeFacebookRequest(`https://graph.facebook.com/v19.0/${confirmTarget}/reactions`, "POST", { type: "LIKE" }, null, acc.token);
    if (r1 && !r1.error && r2 && !r2.error) {
      ok++; results.push({ name: acc.name, success: true });
    } else {
      fail++; results.push({ name: acc.name, success: false });
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

  const data = loadJson(DATA_FILE, {});
  let accs = data[userId] || [];
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  let ok = 0, fail = 0;
  const results = [];
  for (const acc of accs) {
    if (toRemoveIds.length === 0 || toRemoveIds.includes(acc.id)) {
      try {
        const response = await axios.delete(`https://graph.facebook.com/v19.0/${targetId}/likes`, { params: { access_token: acc.token }, timeout: 15000 });
        if (response.status === 200) {
          ok++; results.push({ name: acc.name, success: true });
        } else {
          fail++; results.push({ name: acc.name, success: false });
        }
      } catch (e) {
        fail++; results.push({ name: acc.name, success: false });
      }
      await pause();
    }
  }
  res.json({ success: true, ok, fail, results });
});

app.post('/api/action/follow', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { pageId, count, targetAccounts } = req.body;
  const data = loadJson(DATA_FILE, {});
  let accs = data[userId] || [];
  if (targetAccounts === 'personal') accs = accs.filter((a: any) => a.type !== 'page');
  else if (targetAccounts === 'pages') accs = accs.filter((a: any) => a.type === 'page');

  if (count && count !== 'all') accs = accs.slice(0, parseInt(count, 10));

  let ok = 0, fail = 0;
  const results = [];
  for (const acc of accs) {
    const r = await makeFacebookRequest(`https://graph.facebook.com/v19.0/${pageId}/likes`, "POST", {}, null, acc.token);
    if (r && !r.error) {
      ok++; results.push({ name: acc.name, success: true });
    } else {
      fail++; results.push({ name: acc.name, success: false });
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

  const data = loadJson(DATA_FILE, {});
  let accs = data[userId] || [];
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
    const acc = accs[i % accs.length];
    const message = commentWords[Math.floor(Math.random() * commentWords.length)];
    const r = await makeFacebookRequest(`https://graph.facebook.com/v19.0/${targetId}/comments`, "POST", { message }, null, acc.token);
    if (r && !r.error) {
      ok++; results.push({ name: acc.name, success: true, message });
    } else {
      fail++; results.push({ name: acc.name, success: false, message });
    }
    await pause();
  }
  res.json({ success: true, ok, fail, results });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
