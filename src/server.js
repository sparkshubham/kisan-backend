import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    console.error('Run: npm run db:setup');
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Kisan Mall API running on http://localhost:${env.port}`);
    console.log(`Health: http://localhost:${env.port}/api/health`);
  });
}

start();
