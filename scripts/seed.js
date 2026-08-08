import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import { resolveDirectDatabaseUrl, getPgConfig } from '../src/config/dbUrl.js';

dotenv.config();

const connectionString = resolveDirectDatabaseUrl();
const pgConfig = getPgConfig(connectionString);

async function seed() {
  console.log('Using connection:', connectionString.replace(/:[^:@/]+@/, ':****@'));
  const client = new pg.Client(pgConfig);
  await client.connect();
  console.log('Seeding default configuration...');

  await client.query('DELETE FROM settings');

  await client.query(
    `INSERT INTO settings (key, value) VALUES
     ('store', $1::jsonb),
     ('payments', $2::jsonb)`,
    [
      JSON.stringify({
        storeName: 'Kisan Mall',
        storeEmail: 'support@kisanmall.com',
        storePhone: '',
        deliveryFee: 30,
        minOrder: 99,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      }),
      JSON.stringify({ enableCOD: true, enableUPI: true, enableNotifications: true }),
    ]
  );

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await client.query('SELECT id FROM admin_users WHERE email = $1', [adminEmail]);
    if (existing.rowCount === 0) {
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        `INSERT INTO admin_users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
        ['admin1', process.env.ADMIN_NAME || 'Admin', adminEmail, adminHash, 'super_admin']
      );
      console.log(`Created admin user: ${adminEmail}`);
    }
  } else {
    console.log('Skipping admin user (set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create one)');
  }

  console.log('Seed completed successfully');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
