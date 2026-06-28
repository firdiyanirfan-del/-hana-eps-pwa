import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let pool = null;
let initialized = false;

export async function init() {
  if (initialized) return;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('postgres')) {
    throw new Error('DATABASE_URL not set. Get a free PostgreSQL database at https://neon.tech');
  }

  pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('neon.tech') ? { rejectUnauthorized: process.env.NODE_ENV === 'development' } : false
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  initialized = true;
}

function getPool() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

export async function run(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result;
}

export async function get(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result.rows[0] || null;
}

export async function all(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result.rows;
}

export default { init, run, get, all };