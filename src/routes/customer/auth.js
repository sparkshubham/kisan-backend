import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';
import { authCustomer } from '../../middleware/auth.js';
import { env } from '../../config/env.js';

const router = Router();

function generateOtp() {
  return env.demoOtp || String(Math.floor(100000 + Math.random() * 900000));
}

router.post('/otp/send', asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) return fail(res, 'Valid 10-digit mobile required');

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);
  await query('INSERT INTO otp_codes (mobile, code, expires_at) VALUES ($1, $2, $3)', [mobile, code, expiresAt]);

  console.log(`[OTP] ${mobile} => ${code}`);
  ok(res, { message: 'OTP sent successfully', demoOtp: env.nodeEnv === 'development' ? code : undefined });
}));

router.post('/otp/verify', asyncHandler(async (req, res) => {
  const { mobile, otp, name } = req.body;
  if (!mobile || !otp) return fail(res, 'Mobile and OTP required');

  const { rows: otps } = await query(
    `SELECT * FROM otp_codes WHERE mobile = $1 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [mobile]
  );

  const valid = otps.length && (otps[0].code === otp || otp === env.demoOtp);
  if (!valid) return fail(res, 'Invalid or expired OTP', 401);

  await query('UPDATE otp_codes SET used = true WHERE id = $1', [otps[0].id]);

  let { rows: users } = await query('SELECT * FROM customers WHERE mobile = $1', [mobile]);
  if (!users.length) {
    const id = `c${Date.now()}`;
    await query('INSERT INTO customers (id, mobile, name) VALUES ($1, $2, $3)', [id, mobile, name || 'Customer']);
    users = [{ id, mobile, name: name || 'Customer', is_location_set: false }];
  } else if (name && !users[0].name) {
    await query('UPDATE customers SET name = $1 WHERE id = $2', [name, users[0].id]);
    users[0].name = name;
  }

  const user = users[0];
  const token = signToken('customer', { id: user.id, mobile: user.mobile, type: 'customer' });
  ok(res, {
    token,
    user: { id: user.id, mobile: user.mobile, name: user.name, isLocationSet: user.is_location_set },
  });
}));

router.get('/me', authCustomer, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, mobile, name, email, is_location_set FROM customers WHERE id = $1', [req.user.id]);
  if (!rows.length) return fail(res, 'User not found', 404);
  const u = rows[0];
  ok(res, { id: u.id, mobile: u.mobile, name: u.name, isLocationSet: u.is_location_set });
}));

router.post('/logout', (_req, res) => ok(res, { message: 'Logged out' }));

export default router;
