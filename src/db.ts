import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const isProduction = !!process.env.DATABASE_URL;
let pool: pg.Pool | null = null;

const _AES_PASSWORD = process.env.AES_PASSWORD || "58Zk72Mf2Xo60Dh4Gi87Xs45Yu20Yn0Td48Bq98Ya20Rd28Si27Ie29Wj97Ly32Aq55De37Qd8Ul";
const CIPHER_KEY = crypto.createHash('sha256').update(_AES_PASSWORD).digest();

export function encryptString(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptString(text: string) {
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

// JSON Fallback
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

function loadJson(file: string, initData: any = {}) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) {
    saveJson(file, initData);
    return initData;
  }
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(':')) {
      const dec = decryptString(content);
      if (dec) return JSON.parse(dec);
    }
    const parsed = JSON.parse(content);
    saveJson(file, parsed);
    return parsed;
  } catch {
    return initData;
  }
}

function saveJson(file: string, data: any) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const json = JSON.stringify(data, null, 2);
  const encrypted = encryptString(json);
  fs.writeFileSync(file, encrypted, 'utf8');
}

export async function initDb() {
  if (isProduction) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        expiresAt BIGINT
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        acc_id VARCHAR(255),
        name VARCHAR(255),
        email VARCHAR(255),
        password VARCHAR(255),
        token TEXT,
        shared_by VARCHAR(255),
        type VARCHAR(50),
        parent_id VARCHAR(255)
      );
    `);
    console.log("PostgreSQL Database initialized.");
  } else {
    // Just ensure files exist
    loadJson(USERS_FILE, {});
    loadJson(ACCOUNTS_FILE, {});
    console.log("JSON Local Database initialized.");
  }
}

// Emulate Postgres query
export async function query(sql: string, params: any[] = []): Promise<any[]> {
  if (isProduction && pool) {
    let pgSql = sql;
    let index = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
    const res = await pool.query(pgSql, params);
    return res.rows;
  } else {
    // Very basic JSON emulation for the specific queries used in server.ts
    const users = loadJson(USERS_FILE, {});
    const accounts = loadJson(ACCOUNTS_FILE, {});
    
    if (sql.includes('FROM users')) {
      let rows = Object.values(users);
      if (sql.includes('WHERE username = ?')) {
        rows = rows.filter((u: any) => u.username === params[0]);
      } else if (sql.includes('WHERE id = ?')) {
        rows = rows.filter((u: any) => u.id === params[0]);
      } else if (sql.includes('COUNT(*)')) {
        return [{ count: rows.length }];
      }
      return rows;
    }
    
    if (sql.includes('FROM accounts')) {
      let rows: any[] = [];
      Object.keys(accounts).forEach(userId => {
        accounts[userId].forEach((acc: any, i: number) => {
          rows.push({
            _uid: userId,
            _idx: i,
            id: acc.local_id || (acc.local_id = uuidv4()), // auto generate a local ID for json
            user_id: userId,
            acc_id: acc.id,
            name: acc.name,
            email: encryptString(acc.email || ''),
            password: encryptString(acc.password || ''),
            token: encryptString(acc.token || ''),
            shared_by: acc.shared_by || null,
            type: acc.type || 'account',
            parent_id: acc.parentId || null
          });
        });
        saveJson(ACCOUNTS_FILE, accounts);
      });
      
      if (sql.includes('WHERE user_id = ? AND type = ?')) {
        rows = rows.filter(a => a.user_id === params[0] && a.type === params[1]);
      } else if (sql.includes('WHERE id = ? AND user_id = ?')) {
        rows = rows.filter(a => a.id === params[0] && a.user_id === params[1]);
      } else if (sql.includes('WHERE user_id = ?')) {
        rows = rows.filter(a => a.user_id === params[0]);
      }
      return rows;
    }
    return [];
  }
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  if (isProduction && pool) {
    let pgSql = sql;
    let index = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
    await pool.query(pgSql, params);
  } else {
    const users = loadJson(USERS_FILE, {});
    const accounts = loadJson(ACCOUNTS_FILE, {});
    
    if (sql.includes('INSERT INTO users')) {
      const [id, username, password, role, status, expiresAt] = params;
      users[id] = { id, username, password, role, status, expiresat: expiresAt };
      saveJson(USERS_FILE, users);
    } else if (sql.includes('UPDATE users SET status = ? WHERE id = ?')) {
      const [status, id] = params;
      if (users[id]) users[id].status = status;
      saveJson(USERS_FILE, users);
    } else if (sql.includes('UPDATE users SET expiresAt = ? WHERE id = ?')) {
      const [expiresAt, id] = params;
      if (users[id]) users[id].expiresat = expiresAt;
      saveJson(USERS_FILE, users);
    } else if (sql.includes('DELETE FROM users')) {
      const [id] = params;
      delete users[id];
      saveJson(USERS_FILE, users);
    } else if (sql.includes('INSERT INTO accounts')) {
      const isShared = sql.includes('shared_by');
      let userId, acc_id, name, email, password, token, shared_by, type, parent_id;
      if (isShared) {
        [userId, acc_id, name, email, password, token, shared_by, type] = params;
      } else if (sql.includes('parent_id')) {
        [userId, acc_id, name, token, type, parent_id] = params;
      } else {
        [userId, acc_id, name, email, password, token, type] = params;
      }
      
      if (!accounts[userId]) accounts[userId] = [];
      accounts[userId].push({
        local_id: uuidv4(),
        id: acc_id,
        name,
        email: email ? decryptString(email) : '',
        password: password ? decryptString(password) : '',
        token: token ? decryptString(token) : '',
        shared_by: shared_by || null,
        type: type || 'account',
        parentId: parent_id || null
      });
      saveJson(ACCOUNTS_FILE, accounts);
    } else if (sql.includes('DELETE FROM accounts WHERE id = ?')) {
      const [id] = params;
      for (const uid in accounts) {
        accounts[uid] = accounts[uid].filter((a: any) => a.local_id !== id);
      }
      saveJson(ACCOUNTS_FILE, accounts);
    } else if (sql.includes('DELETE FROM accounts WHERE user_id = ? AND shared_by IS NULL')) {
      const [uid] = params;
      if (accounts[uid]) {
        accounts[uid] = accounts[uid].filter((a: any) => a.shared_by !== null && a.shared_by !== undefined);
        saveJson(ACCOUNTS_FILE, accounts);
      }
    } else if (sql.includes('UPDATE accounts SET token = ?')) {
      const [token, acc_id, name, id] = params;
      for (const uid in accounts) {
        for (const a of accounts[uid]) {
          if (a.local_id === id) {
            a.token = decryptString(token);
            a.id = acc_id;
            a.name = name;
          }
        }
      }
      saveJson(ACCOUNTS_FILE, accounts);
    }
  }
}
