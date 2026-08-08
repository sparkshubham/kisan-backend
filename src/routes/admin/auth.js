import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';
import { authAdmin } from '../../middleware/auth.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query('SELECT * FROM admin_users WHERE email = $1 AND status = $2', [email, 'active']);
  if (!rows.length) return fail(res, 'Invalid credentials', 401);
  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return fail(res, 'Invalid credentials', 401);
  const token = signToken('admin', { id: admin.id, email: admin.email, role: admin.role, type: 'admin' });
  ok(res, { token, user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
}));

router.get('/me', authAdmin, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role FROM admin_users WHERE id = $1', [req.admin.id]);
  ok(res, rows[0]);
}));

router.post('/logout', (_req, res) => ok(res, { message: 'Logged out' }));

export default router;
