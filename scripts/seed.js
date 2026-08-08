import dotenv from 'dotenv';
import pg from 'pg';
import { resolveDirectDatabaseUrl, getPgConfig } from '../src/config/dbUrl.js';
import { bootstrapSeed } from '../src/db/bootstrapSeed.js';

dotenv.config();

const connectionString = resolveDirectDatabaseUrl();
const pgConfig = getPgConfig(connectionString);

async function seed() {
  console.log('Using connection:', connectionString.replace(/:[^:@/]+@/, ':****@'));
  const client = new pg.Client(pgConfig);
  await client.connect();
  try {
    await bootstrapSeed(client);
    console.log('Seed completed successfully');
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
