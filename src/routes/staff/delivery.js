import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authStaff, requireStaffRole } from '../../middleware/auth.js';
import {
  getOrderWithItems,
  mapDeliveryOrder,
  logOrderStatus,
  assignOrderToDelivery,
} from '../../services/orderService.js';

const router = Router();
router.use(authStaff, requireStaffRole('delivery_boy'));

/**
 * Delivery partners see:
 * 1) Orders assigned to them
 * 2) Packed/ready orders not yet assigned (so they can claim)
 */
async function fetchDeliveryOrders(staffId, statusFilter) {
  let sql = `
    SELECT * FROM orders
    WHERE status NOT IN ('cancelled', 'delivered')
      AND (
        assigned_delivery_id = $1
        OR (
          assigned_delivery_id IS NULL
          AND packer_status = 'ready'
          AND status = 'ready'
        )
      )
  `;
  const params = [staffId];
  if (statusFilter) {
    params.push(statusFilter);
    sql += ` AND COALESCE(delivery_status, 'assigned') = $${params.length}`;
  }
  sql += ' ORDER BY created_at ASC';
  const { rows } = await query(sql, params);
  return Promise.all(
    rows.map(async (o) => {
      const mapped = mapDeliveryOrder(await getOrderWithItems(o.id));
      // Unassigned ready orders appear as available to claim
      if (!o.assigned_delivery_id) {
        mapped.status = 'assigned';
        mapped.unassigned = true;
      }
      return mapped;
    })
  );
}

router.get('/orders', asyncHandler(async (req, res) => {
  ok(res, await fetchDeliveryOrders(req.staff.id, req.query.status));
}));

router.get('/orders/counts', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (
         WHERE assigned_delivery_id = $1 AND delivery_status = 'assigned'
       )::int AS assigned,
       COUNT(*) FILTER (
         WHERE assigned_delivery_id IS NULL AND packer_status = 'ready' AND status = 'ready'
       )::int AS available,
       COUNT(*) FILTER (
         WHERE assigned_delivery_id = $1 AND delivery_status IN ('picked_up', 'out_for_delivery')
       )::int AS picked,
       COUNT(*) FILTER (
         WHERE assigned_delivery_id = $1 AND delivery_status = 'delivered'
       )::int AS delivered
     FROM orders
     WHERE status NOT IN ('cancelled')
       AND (
         assigned_delivery_id = $1
         OR (assigned_delivery_id IS NULL AND packer_status = 'ready' AND status = 'ready')
       )`,
    [req.staff.id]
  );
  ok(res, {
    assigned: (rows[0]?.assigned || 0) + (rows[0]?.available || 0),
    picked: rows[0]?.picked || 0,
    delivered: rows[0]?.delivered || 0,
  });
}));

router.get('/orders/:orderId', asyncHandler(async (req, res) => {
  const order = await getOrderWithItems(req.params.orderId);
  if (!order) return fail(res, 'Order not found', 404);
  const mine = order.assigned_delivery_id === req.staff.id;
  const claimable = !order.assigned_delivery_id && order.packer_status === 'ready';
  if (!mine && !claimable) return fail(res, 'Order not found', 404);
  const mapped = mapDeliveryOrder(order);
  if (claimable) mapped.unassigned = true;
  ok(res, mapped);
}));

router.post('/orders/:orderId/accept', asyncHandler(async (req, res) => {
  const order = await getOrderWithItems(req.params.orderId);
  if (!order) return fail(res, 'Order not found', 404);

  // Claim unassigned ready order
  if (!order.assigned_delivery_id) {
    if (order.packer_status !== 'ready') return fail(res, 'Order is not ready for delivery');
    const result = await assignOrderToDelivery(req.params.orderId, req.staff.id, req.staff.id);
    if (!result.assigned) return fail(res, result.reason || 'Could not claim order');
  } else if (order.assigned_delivery_id !== req.staff.id) {
    return fail(res, 'Order assigned to another delivery partner', 403);
  }

  await query(
    `UPDATE orders SET delivery_status = 'picked_up', updated_at = NOW()
     WHERE id = $1 AND assigned_delivery_id = $2`,
    [req.params.orderId, req.staff.id]
  );
  ok(res, { status: 'picked_up' });
}));

router.post('/orders/:orderId/start', asyncHandler(async (req, res) => {
  await query(
    `UPDATE orders SET delivery_status = 'out_for_delivery', status = 'out_for_delivery', updated_at = NOW()
     WHERE id = $1 AND assigned_delivery_id = $2`,
    [req.params.orderId, req.staff.id]
  );
  await logOrderStatus(req.params.orderId, 'out_for_delivery', req.staff.id);
  ok(res, { status: 'out_for_delivery' });
}));

router.post('/orders/:orderId/verify-otp', asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const { rows } = await query(
    'SELECT delivery_otp FROM orders WHERE id = $1 AND assigned_delivery_id = $2',
    [req.params.orderId, req.staff.id]
  );
  if (!rows.length) return fail(res, 'Order not found', 404);
  if (rows[0].delivery_otp && otp !== rows[0].delivery_otp) return fail(res, 'Invalid OTP', 400);
  ok(res, { verified: true });
}));

router.post('/orders/:orderId/complete', asyncHandler(async (req, res) => {
  const { codCollected } = req.body;
  const order = await getOrderWithItems(req.params.orderId);
  if (!order || order.assigned_delivery_id !== req.staff.id) return fail(res, 'Order not found', 404);

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
  await query('UPDATE staff_users SET is_online = $1, updated_at = NOW() WHERE id = $2', [
    !!req.body.isOnline,
    req.staff.id,
  ]);
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
