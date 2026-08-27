import { Pool } from 'pg';
async function test() {
  const dbUrl = process.env.DATABASE_URL;
  console.log("DB URL:", dbUrl);
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  console.log("Connecting...");
  const res = await pool.query('SELECT NOW()');
  console.log("Time:", res.rows[0]);
  process.exit(0);
}
test().catch(console.error);
