import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authAdmin);

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, mobile, role, is_online FROM staff_users WHERE status = 'active' ORDER BY name`
  );
  ok(res, rows);
}));

export default router;
