import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import {
  resolveDirectDatabaseUrl,
  isManagedPostgres,
  getPgConfig,
} from '../src/config/dbUrl.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, '../sql/schema.sql'), 'utf8');

const connectionString = resolveDirectDatabaseUrl();
const pgConfig = getPgConfig(connectionString);
const managed = isManagedPostgres(connectionString);

function parseDbUrl(url) {
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, '').split('?')[0];
  u.pathname = '/postgres';
  u.search = '';
  return { dbName, adminUrl: u.toString() };
}

async function ensureDatabase() {
  if (managed) {
    console.log('Skipping CREATE DATABASE (managed Supabase/Postgres)');
    return;
  }
  const { dbName, adminUrl } = parseDbUrl(connectionString);
  const admin = new pg.Client(getPgConfig(adminUrl));
  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rows.length) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database: ${dbName}`);
  }
  await admin.end();
}

async function migrate() {
  console.log('Using connection:', connectionString.replace(/:[^:@/]+@/, ':****@'));
  await ensureDatabase();
  const client = new pg.Client(pgConfig);
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    await client.query(schema);
    console.log('Schema applied successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
