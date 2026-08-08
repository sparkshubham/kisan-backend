import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;
  let sql = `SELECT c.*,
    (SELECT COUNT(*)::int FROM orders WHERE customer_id = c.id) AS total_orders,
    (SELECT COALESCE(SUM(total),0) FROM orders WHERE customer_id = c.id AND status NOT IN ('cancelled')) AS total_spent
    FROM customers c WHERE 1=1`;
  const params = [];
  if (search) { params.push(`%${search}%`); sql += ` AND (c.name ILIKE $${params.length} OR c.mobile ILIKE $${params.length})`; }
  sql += ' ORDER BY c.created_at DESC';
  const { rows } = await query(sql, params);
  ok(res, rows.map((c) => ({
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    email: c.email,
    totalOrders: c.total_orders,
    totalSpent: Number(c.total_spent),
    status: c.status,
    blocked: c.status === 'blocked',
  })));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  if (!rows.length) return fail(res, 'Not found', 404);
  ok(res, rows[0]);
}));

router.get('/:id/orders', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.id]);
  ok(res, rows);
}));

router.patch('/:id/block', asyncHandler(async (req, res) => {
  await query(`UPDATE customers SET status = 'blocked' WHERE id = $1`, [req.params.id]);
  ok(res, { blocked: true });
}));

router.patch('/:id/unblock', asyncHandler(async (req, res) => {
  await query(`UPDATE customers SET status = 'active' WHERE id = $1`, [req.params.id]);
  ok(res, { unblocked: true });
}));

export default router;
