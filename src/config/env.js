import dotenv from 'dotenv';
import { resolveDatabaseUrl, resolveDirectDatabaseUrl } from './dbUrl.js';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Pooled / runtime connection */
  databaseUrl: resolveDatabaseUrl(),
  /** Direct connection (migrations, long sessions) */
  databaseUrlDirect: resolveDirectDatabaseUrl(),

  postgres: {
    url: process.env.POSTGRES_URL || '',
    prismaUrl: process.env.POSTGRES_PRISMA_URL || '',
    urlNonPooling: process.env.POSTGRES_URL_NON_POOLING || '',
    user: process.env.POSTGRES_USER || '',
    host: process.env.POSTGRES_HOST || '',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'postgres',
  },

  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    publishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
  },

  jwt: {
    customerSecret: process.env.JWT_CUSTOMER_SECRET || 'dev-customer-secret',
    adminSecret: process.env.JWT_ADMIN_SECRET || 'dev-admin-secret',
    staffSecret: process.env.JWT_STAFF_SECRET || 'dev-staff-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 10,
  demoOtp: process.env.DEMO_OTP || '123456',
  deliveryFee: Number(process.env.DELIVERY_FEE) || 30,
  minOrder: Number(process.env.MIN_ORDER) || 99,
};
