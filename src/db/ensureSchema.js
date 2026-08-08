import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import { bootstrapSeed } from './bootstrapSeed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let schemaPromise = null;

function loadSchemaSql() {
  const candidates = [
    join(__dirname, '../../sql/schema.sql'),
    join(process.cwd(), 'sql/schema.sql'),
    join(process.cwd(), 'backend/sql/schema.sql'),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      /* try next */
    }
  }
  throw new Error('schema.sql not found — ensure sql/schema.sql is deployed');
}

/**
 * Idempotent schema apply + bootstrap seed for empty tables.
 * Safe to call on every cold start / deploy.
 */
export async function ensureSchema() {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const sql = loadSchemaSql();

    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    } catch (err) {
      console.warn('[migrate] pgcrypto extension skipped:', err.message);
    }

    const withoutExtension = sql
      .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";?\s*/i, '')
      .trim();

    await pool.query(withoutExtension);

    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'otp_codes'
      ) AS ok
    `);
    if (!rows[0]?.ok) {
      throw new Error('Schema apply finished but otp_codes still missing');
    }

    console.log('[migrate] Database schema is ready');

    try {
      await bootstrapSeed(pool);
    } catch (err) {
      console.warn('[seed] bootstrap warning:', err.message);
    }

    return true;
  })().catch((err) => {
    schemaPromise = null;
    throw err;
  });

  return schemaPromise;
}

/** Express middleware — runs migrate+seed once before handling traffic */
export function ensureSchemaMiddleware(req, res, next) {
  ensureSchema()
    .then(() => next())
    .catch((err) => {
      console.error('[migrate] failed:', err.message);
      res.status(503).json({
        success: false,
        error: `Database not ready: ${err.message}. Schema migration failed.`,
      });
    });
}
