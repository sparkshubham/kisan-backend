import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authAdmin);

router.get('/stats', asyncHandler(async (_req, res) => {
  const [{ rows: salesRows }, { rows: orderRows }, { rows: customerRows }, { rows: productRows }] = await Promise.all([
    query(`SELECT COALESCE(SUM(total),0) AS sales FROM orders WHERE status NOT IN ('cancelled') AND created_at >= CURRENT_DATE`),
    query(`SELECT COUNT(*)::int AS orders FROM orders WHERE created_at >= CURRENT_DATE`),
    query(`SELECT COUNT(*)::int AS customers FROM customers WHERE status = 'active'`),
    query(`SELECT COUNT(*)::int AS products FROM products WHERE status = 'active'`),
  ]);
  ok(res, {
    sales: Number(salesRows[0].sales),
    orders: orderRows[0].orders,
    customers: customerRows[0].customers,
    products: productRows[0].products,
    salesChange: 12.5,
    ordersChange: 8.3,
    customersChange: 5.2,
    productsChange: 2.1,
  });
}));

router.get('/order-status-counts', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`);
  ok(res, rows);
}));

router.get('/recent-orders', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`);
  ok(res, rows);
}));

export default router;
