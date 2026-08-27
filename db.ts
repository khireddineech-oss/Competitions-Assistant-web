import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import sqlite3 from 'sqlite3';

const { Pool } = pg;

export interface DBConfig {
  usePostgres: boolean;
}

export let pool: pg.Pool | null = null;
export let sqliteDb: sqlite3.Database | null = null;

const isProduction = !!process.env.DATABASE_URL;

export async function initDb() {
  if (isProduction) {
    pool = new Pool({
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
    const DATA_DIR = path.join(process.cwd(), 'data');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    
    sqliteDb = new sqlite3.Database(path.join(DATA_DIR, 'database.sqlite'));
    
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        expiresAt INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        acc_id TEXT,
        name TEXT,
        email TEXT,
        password TEXT,
        token TEXT,
        shared_by TEXT,
        type TEXT,
        parent_id TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("SQLite Database initialized.");
  }
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  if (isProduction && pool) {
    // Convert SQLite ? to Postgres $1, $2
    let pgSql = sql;
    let index = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
    const res = await pool.query(pgSql, params);
    return res.rows;
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  return [];
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  if (isProduction && pool) {
    let pgSql = sql;
    let index = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
    await pool.query(pgSql, params);
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb!.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
