import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kisanmall',
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
