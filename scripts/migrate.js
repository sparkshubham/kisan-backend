import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, '../sql/schema.sql'), 'utf8');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kisanmall';

function parseDbUrl(url) {
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, '');
  u.pathname = '/postgres';
  return { dbName, adminUrl: u.toString() };
}

async function ensureDatabase() {
  const { dbName, adminUrl } = parseDbUrl(connectionString);
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rows.length) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database: ${dbName}`);
  }
  await admin.end();
}

async function migrate() {
  await ensureDatabase();
  const client = new pg.Client({ connectionString });
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
