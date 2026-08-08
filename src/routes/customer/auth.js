import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';
import { authCustomer } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { storeOtp, verifyStoredOtp } from '../../utils/otp.js';

const router = Router();

function mapCustomer(u) {
  return {
    id: u.id,
    mobile: u.mobile,
    name: u.name,
    email: u.email || '',
    isLocationSet: u.is_location_set,
    hasPassword: !!u.password_hash,
  };
}

router.post('/otp/send', asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) return fail(res, 'Valid 10-digit mobile required');

  const code = await storeOtp(mobile, 'login');
  ok(res, { message: 'OTP sent successfully', demoOtp: env.nodeEnv === 'development' ? code : undefined });
}));

router.post('/otp/verify', asyncHandler(async (req, res) => {
  const { mobile, otp, name } = req.body;
  if (!mobile || !otp) return fail(res, 'Mobile and OTP required');

  const valid = await verifyStoredOtp(mobile, otp, 'login');
  if (!valid) return fail(res, 'Invalid or expired OTP', 401);

  let { rows: users } = await query('SELECT * FROM customers WHERE mobile = $1', [mobile]);
  if (!users.length) {
    const id = `c${Date.now()}`;
    await query('INSERT INTO customers (id, mobile, name) VALUES ($1, $2, $3)', [id, mobile, name || 'Customer']);
    users = [{ id, mobile, name: name || 'Customer', email: null, password_hash: null, is_location_set: false }];
  } else if (name && !users[0].name) {
    await query('UPDATE customers SET name = $1, updated_at = NOW() WHERE id = $2', [name, users[0].id]);
    users[0].name = name;
  }

  const user = users[0];
  const token = signToken('customer', { id: user.id, mobile: user.mobile, type: 'customer' });
  ok(res, { token, user: mapCustomer(user) });
}));

router.get('/me', authCustomer, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, mobile, name, email, password_hash, is_location_set FROM customers WHERE id = $1',
    [req.user.id]
  );
  if (!rows.length) return fail(res, 'User not found', 404);
  ok(res, mapCustomer(rows[0]));
}));

router.put('/profile', authCustomer, asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !String(name).trim()) return fail(res, 'Name is required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 'Valid email required');

  await query(
    'UPDATE customers SET name = $1, email = $2, updated_at = NOW() WHERE id = $3',
    [String(name).trim(), email ? String(email).trim().toLowerCase() : null, req.user.id]
  );
  const { rows } = await query(
    'SELECT id, mobile, name, email, password_hash, is_location_set FROM customers WHERE id = $1',
    [req.user.id]
  );
  ok(res, mapCustomer(rows[0]));
}));

router.post('/password/change', authCustomer, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) return fail(res, 'New password must be at least 6 characters');

  const { rows } = await query('SELECT password_hash FROM customers WHERE id = $1', [req.user.id]);
  if (!rows.length) return fail(res, 'User not found', 404);

  if (rows[0].password_hash) {
    if (!currentPassword) return fail(res, 'Current password required');
    const valid = await bcrypt.compare(String(currentPassword), rows[0].password_hash);
    if (!valid) return fail(res, 'Current password is incorrect', 401);
  }

  const hash = await bcrypt.hash(String(newPassword), 10);
  await query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
  ok(res, { message: 'Password updated successfully' });
}));

router.post('/password/forgot', asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) return fail(res, 'Valid 10-digit mobile required');

  const { rows } = await query('SELECT id FROM customers WHERE mobile = $1', [mobile]);
  if (!rows.length) return fail(res, 'No account found with this mobile', 404);

  const code = await storeOtp(mobile, 'reset_password');
  ok(res, { message: 'OTP sent to your mobile', demoOtp: env.nodeEnv === 'development' ? code : undefined });
}));

router.post('/password/reset', asyncHandler(async (req, res) => {
  const { mobile, otp, newPassword } = req.body;
  if (!mobile || !otp) return fail(res, 'Mobile and OTP required');
  if (!newPassword || String(newPassword).length < 6) return fail(res, 'New password must be at least 6 characters');

  const valid = await verifyStoredOtp(mobile, otp, 'reset_password');
  if (!valid) return fail(res, 'Invalid or expired OTP', 401);

  const { rows } = await query('SELECT id FROM customers WHERE mobile = $1', [mobile]);
  if (!rows.length) return fail(res, 'Account not found', 404);

  const hash = await bcrypt.hash(String(newPassword), 10);
  await query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, rows[0].id]);
  ok(res, { message: 'Password reset successfully' });
}));

router.post('/logout', (_req, res) => ok(res, { message: 'Logged out' }));

export default router;
