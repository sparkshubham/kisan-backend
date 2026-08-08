import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';
import { authStaff } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { storeOtp, verifyStoredOtp } from '../../utils/otp.js';

const router = Router();

function mapStaff(u) {
  return {
    id: u.id,
    name: u.name,
    mobile: u.mobile,
    email: u.email || '',
    role: u.role,
    isOnline: u.is_online,
  };
}

router.post('/login', asyncHandler(async (req, res) => {
  const { mobile, pin } = req.body;
  const { rows } = await query('SELECT * FROM staff_users WHERE mobile = $1 AND status = $2', [mobile, 'active']);
  if (!rows.length) return fail(res, 'Invalid mobile or PIN', 401);
  const staff = rows[0];
  const valid = await bcrypt.compare(String(pin), staff.pin_hash);
  if (!valid) return fail(res, 'Invalid mobile or PIN', 401);
  const token = signToken('staff', { id: staff.id, mobile: staff.mobile, role: staff.role, type: 'staff' });
  ok(res, { token, user: mapStaff(staff) });
}));

router.get('/me', authStaff, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, mobile, email, role, is_online FROM staff_users WHERE id = $1',
    [req.staff.id]
  );
  if (!rows.length) return fail(res, 'User not found', 404);
  ok(res, mapStaff(rows[0]));
}));

router.put('/profile', authStaff, asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !String(name).trim()) return fail(res, 'Name is required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 'Valid email required');

  await query(
    'UPDATE staff_users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3',
    [String(name).trim(), email ? String(email).trim().toLowerCase() : null, req.staff.id]
  );
  const { rows } = await query(
    'SELECT id, name, mobile, email, role, is_online FROM staff_users WHERE id = $1',
    [req.staff.id]
  );
  ok(res, mapStaff(rows[0]));
}));

router.post('/pin/change', authStaff, asyncHandler(async (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin) return fail(res, 'Current PIN required');
  if (!newPin || !/^\d{4}$/.test(String(newPin))) return fail(res, 'New PIN must be 4 digits');

  const { rows } = await query('SELECT pin_hash FROM staff_users WHERE id = $1', [req.staff.id]);
  if (!rows.length) return fail(res, 'User not found', 404);

  const valid = await bcrypt.compare(String(currentPin), rows[0].pin_hash);
  if (!valid) return fail(res, 'Current PIN is incorrect', 401);

  const hash = await bcrypt.hash(String(newPin), 10);
  await query('UPDATE staff_users SET pin_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.staff.id]);
  ok(res, { message: 'PIN updated successfully' });
}));

router.post('/pin/forgot', asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) return fail(res, 'Valid 10-digit mobile required');

  const { rows } = await query('SELECT id FROM staff_users WHERE mobile = $1 AND status = $2', [mobile, 'active']);
  if (!rows.length) return fail(res, 'No account found with this mobile', 404);

  const code = await storeOtp(mobile, 'reset_pin');
  ok(res, { message: 'OTP sent to your mobile', demoOtp: env.nodeEnv === 'development' ? code : undefined });
}));

router.post('/pin/reset', asyncHandler(async (req, res) => {
  const { mobile, otp, newPin } = req.body;
  if (!mobile || !otp) return fail(res, 'Mobile and OTP required');
  if (!newPin || !/^\d{4}$/.test(String(newPin))) return fail(res, 'New PIN must be 4 digits');

  const valid = await verifyStoredOtp(mobile, otp, 'reset_pin');
  if (!valid) return fail(res, 'Invalid or expired OTP', 401);

  const { rows } = await query('SELECT id FROM staff_users WHERE mobile = $1', [mobile]);
  if (!rows.length) return fail(res, 'Account not found', 404);

  const hash = await bcrypt.hash(String(newPin), 10);
  await query('UPDATE staff_users SET pin_hash = $1, updated_at = NOW() WHERE id = $2', [hash, rows[0].id]);
  ok(res, { message: 'PIN reset successfully' });
}));

router.post('/logout', (_req, res) => ok(res, { message: 'Logged out' }));

export default router;
