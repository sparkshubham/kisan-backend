import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authStaff, requireStaffRole } from '../../middleware/auth.js';
import { getOrderWithItems, mapDeliveryOrder, logOrderStatus } from '../../services/orderService.js';

const router = Router();
router.use(authStaff, requireStaffRole('delivery_boy'));

async function fetchDeliveryOrders(staffId, statusFilter) {
  let sql = `SELECT * FROM orders WHERE assigned_delivery_id = $1 AND delivery_status IS NOT NULL`;
  const params = [staffId];
  if (statusFilter) { params.push(statusFilter); sql += ` AND delivery_status = $${params.length}`; }
  sql += ' ORDER BY created_at ASC';
  const { rows } = await query(sql, params);
  return Promise.all(rows.map(async (o) => mapDeliveryOrder(await getOrderWithItems(o.id))));
}

router.get('/orders', asyncHandler(async (req, res) => {
  ok(res, await fetchDeliveryOrders(req.staff.id, req.query.status));
}));

router.get('/orders/counts', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT delivery_status, COUNT(*)::int AS count FROM orders WHERE assigned_delivery_id = $1 AND delivery_status IS NOT NULL GROUP BY delivery_status`,
    [req.staff.id]
  );
  const counts = { assigned: 0, picked: 0, delivered: 0 };
  for (const r of rows) {
    if (r.delivery_status === 'assigned') counts.assigned = r.count;
    else if (r.delivery_status === 'picked_up' || r.delivery_status === 'out_for_delivery') counts.picked += r.count;
    else if (r.delivery_status === 'delivered') counts.delivered = r.count;
  }
  ok(res, counts);
}));

router.get('/orders/:orderId', asyncHandler(async (req, res) => {
  const order = await getOrderWithItems(req.params.orderId);
  if (!order || order.assigned_delivery_id !== req.staff.id) return fail(res, 'Order not found', 404);
  ok(res, mapDeliveryOrder(order));
}));

router.post('/orders/:orderId/accept', asyncHandler(async (req, res) => {
  await query(`UPDATE orders SET delivery_status = 'picked_up', updated_at = NOW() WHERE id = $1 AND assigned_delivery_id = $2`,
    [req.params.orderId, req.staff.id]);
  ok(res, { status: 'picked_up' });
}));

router.post('/orders/:orderId/start', asyncHandler(async (req, res) => {
  await query(`UPDATE orders SET delivery_status = 'out_for_delivery', status = 'out_for_delivery', updated_at = NOW() WHERE id = $1`,
    [req.params.orderId]);
  await logOrderStatus(req.params.orderId, 'out_for_delivery', req.staff.id);
  ok(res, { status: 'out_for_delivery' });
}));

router.post('/orders/:orderId/verify-otp', asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const { rows } = await query('SELECT delivery_otp FROM orders WHERE id = $1 AND assigned_delivery_id = $2',
    [req.params.orderId, req.staff.id]);
  if (!rows.length) return fail(res, 'Order not found', 404);
  if (rows[0].delivery_otp && otp !== rows[0].delivery_otp) return fail(res, 'Invalid OTP', 400);
  ok(res, { verified: true });
}));

router.post('/orders/:orderId/complete', asyncHandler(async (req, res) => {
  const { codCollected } = req.body;
  const order = await getOrderWithItems(req.params.orderId);
  if (!order) return fail(res, 'Order not found', 404);

  await query(
    `UPDATE orders SET delivery_status = 'delivered', status = 'delivered', cod_collected = $1, updated_at = NOW() WHERE id = $2`,
    [!!codCollected || order.payment_method !== 'cod', req.params.orderId]
  );
  if (order.payment_method === 'cod') {
    await query(`UPDATE payments SET status = 'success' WHERE order_id = $1`, [req.params.orderId]);
  }
  await logOrderStatus(req.params.orderId, 'delivered', req.staff.id);
  ok(res, { delivered: true });
}));

router.patch('/profile/online', asyncHandler(async (req, res) => {
  await query('UPDATE staff_users SET is_online = $1, updated_at = NOW() WHERE id = $2', [!!req.body.isOnline, req.staff.id]);
  ok(res, { isOnline: !!req.body.isOnline });
}));

router.get('/earnings', asyncHandler(async (req, res) => {
  const { rows: todayRows } = await query(
    `SELECT COALESCE(SUM(total * 0.05), 0) AS earnings FROM orders
     WHERE assigned_delivery_id = $1 AND delivery_status = 'delivered' AND updated_at::date = CURRENT_DATE`,
    [req.staff.id]
  );
  const { rows: weekRows } = await query(
    `SELECT COALESCE(SUM(total * 0.05), 0) AS earnings FROM orders
     WHERE assigned_delivery_id = $1 AND delivery_status = 'delivered' AND updated_at >= CURRENT_DATE - INTERVAL '7 days'`,
    [req.staff.id]
  );
  const { rows: monthRows } = await query(
    `SELECT COALESCE(SUM(total * 0.05), 0) AS earnings FROM orders
     WHERE assigned_delivery_id = $1 AND delivery_status = 'delivered' AND updated_at >= CURRENT_DATE - INTERVAL '30 days'`,
    [req.staff.id]
  );
  ok(res, {
    today: Math.round(Number(todayRows[0].earnings)),
    week: Math.round(Number(weekRows[0].earnings)),
    month: Math.round(Number(monthRows[0].earnings)),
  });
}));

export default router;
