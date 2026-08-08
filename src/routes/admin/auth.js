import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';
import { authAdmin } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { storeOtp, verifyStoredOtp } from '../../utils/otp.js';

const router = Router();

function mapAdmin(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query('SELECT * FROM admin_users WHERE email = $1 AND status = $2', [email, 'active']);
  if (!rows.length) return fail(res, 'Invalid credentials', 401);
  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return fail(res, 'Invalid credentials', 401);
  const token = signToken('admin', { id: admin.id, email: admin.email, role: admin.role, type: 'admin' });
  ok(res, { token, user: mapAdmin(admin) });
}));

router.get('/me', authAdmin, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role FROM admin_users WHERE id = $1', [req.admin.id]);
  if (!rows.length) return fail(res, 'User not found', 404);
  ok(res, mapAdmin(rows[0]));
}));

router.put('/profile', authAdmin, asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !String(name).trim()) return fail(res, 'Name is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 'Valid email required');

  const emailNorm = String(email).trim().toLowerCase();
  const { rows: existing } = await query(
    'SELECT id FROM admin_users WHERE email = $1 AND id <> $2',
    [emailNorm, req.admin.id]
  );
  if (existing.length) return fail(res, 'Email already in use');

  await query(
    'UPDATE admin_users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3',
    [String(name).trim(), emailNorm, req.admin.id]
  );
  const { rows } = await query('SELECT id, name, email, role FROM admin_users WHERE id = $1', [req.admin.id]);
  ok(res, mapAdmin(rows[0]));
}));

router.post('/password/change', authAdmin, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword) return fail(res, 'Current password required');
  if (!newPassword || String(newPassword).length < 6) return fail(res, 'New password must be at least 6 characters');

  const { rows } = await query('SELECT password_hash FROM admin_users WHERE id = $1', [req.admin.id]);
  if (!rows.length) return fail(res, 'User not found', 404);

  const valid = await bcrypt.compare(String(currentPassword), rows[0].password_hash);
  if (!valid) return fail(res, 'Current password is incorrect', 401);

  const hash = await bcrypt.hash(String(newPassword), 10);
  await query('UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.admin.id]);
  ok(res, { message: 'Password updated successfully' });
}));

router.post('/password/forgot', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 'Valid email required');

  const emailNorm = String(email).trim().toLowerCase();
  const { rows } = await query('SELECT id FROM admin_users WHERE email = $1 AND status = $2', [emailNorm, 'active']);
  if (!rows.length) return fail(res, 'No account found with this email', 404);

  const code = await storeOtp(emailNorm, 'admin_reset');
  ok(res, { message: 'OTP sent to your email', demoOtp: env.nodeEnv === 'development' ? code : undefined });
}));

router.post('/password/reset', asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp) return fail(res, 'Email and OTP required');
  if (!newPassword || String(newPassword).length < 6) return fail(res, 'New password must be at least 6 characters');

  const emailNorm = String(email).trim().toLowerCase();
  const valid = await verifyStoredOtp(emailNorm, otp, 'admin_reset');
  if (!valid) return fail(res, 'Invalid or expired OTP', 401);

  const { rows } = await query('SELECT id FROM admin_users WHERE email = $1', [emailNorm]);
  if (!rows.length) return fail(res, 'Account not found', 404);

  const hash = await bcrypt.hash(String(newPassword), 10);
  await query('UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, rows[0].id]);
  ok(res, { message: 'Password reset successfully' });
}));

router.post('/logout', (_req, res) => ok(res, { message: 'Logged out' }));

export default router;
