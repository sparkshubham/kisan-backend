import pg from 'pg';
import { env } from './env.js';
import { needsSsl } from './dbUrl.js';

const { Pool } = pg;

const connectionString = env.databaseUrl;
const useSsl = needsSsl(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  // Vercel / serverless: keep pool small
  max: env.nodeEnv === 'production' ? 5 : 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 15_000,
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
