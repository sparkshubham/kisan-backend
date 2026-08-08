import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const isSupabase = env.databaseUrl.includes('supabase.co');

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: isSupabase || env.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
