import { query } from '../config/database.js';
import { env } from '../config/env.js';

export function generateOtp() {
  return env.demoOtp || String(Math.floor(100000 + Math.random() * 900000));
}

export async function storeOtp(identifier, purpose = 'login') {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);
  await query(
    'INSERT INTO otp_codes (mobile, code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [identifier, code, purpose, expiresAt]
  );
  console.log(`[OTP:${purpose}] ${identifier} => ${code}`);
  return code;
}

export async function verifyStoredOtp(identifier, otp, purpose = 'login') {
  const { rows } = await query(
    `SELECT * FROM otp_codes
     WHERE mobile = $1 AND purpose = $2 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [identifier, purpose]
  );
  const valid = rows.length && (rows[0].code === otp || otp === env.demoOtp);
  if (!valid) return false;
  await query('UPDATE otp_codes SET used = true WHERE id = $1', [rows[0].id]);
  return true;
}
