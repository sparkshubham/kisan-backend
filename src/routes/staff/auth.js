import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';
import { authStaff } from '../../middleware/auth.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { mobile, pin } = req.body;
  const { rows } = await query('SELECT * FROM staff_users WHERE mobile = $1 AND status = $2', [mobile, 'active']);
  if (!rows.length) return fail(res, 'Invalid mobile or PIN', 401);
  const staff = rows[0];
  const valid = await bcrypt.compare(String(pin), staff.pin_hash);
  if (!valid) return fail(res, 'Invalid mobile or PIN', 401);
  const token = signToken('staff', { id: staff.id, mobile: staff.mobile, role: staff.role, type: 'staff' });
  ok(res, {
    token,
    user: { id: staff.id, mobile: staff.mobile, name: staff.name, role: staff.role },
  });
}));

router.get('/me', authStaff, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, name, mobile, role, is_online FROM staff_users WHERE id = $1', [req.staff.id]);
  ok(res, rows[0]);
}));

router.post('/logout', (_req, res) => ok(res, { message: 'Logged out' }));

export default router;
