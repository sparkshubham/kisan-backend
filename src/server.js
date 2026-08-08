import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { ensureSchema } from './db/ensureSchema.js';

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    console.error('Check POSTGRES_URL / DATABASE_URL env vars');
    process.exit(1);
  }

  try {
    await ensureSchema();
  } catch (err) {
    console.error('Schema migration failed:', err.message);
    console.error('Tables may be missing until migration succeeds');
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Kisan Mall API running on http://localhost:${env.port}`);
    console.log(`Health:  http://localhost:${env.port}/api/health`);
    console.log(`Swagger: http://localhost:${env.port}/api/docs`);
  });
}

start();
