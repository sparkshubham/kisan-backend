import pg from 'pg';
import { env } from './env.js';
import { getPgConfig } from './dbUrl.js';

const { Pool } = pg;

export const pool = new Pool({
  ...getPgConfig(env.databaseUrl),
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
