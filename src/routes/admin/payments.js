import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  let sql = 'SELECT * FROM payments WHERE 1=1';
  const params = [];
  if (search) { params.push(`%${search}%`); sql += ` AND (order_id ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
  ok(res, rows);
}));

export default router;
