import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authStaff, requireStaffRole } from '../../middleware/auth.js';
import { getOrderWithItems, mapPackerOrder, logOrderStatus, assignOrderToDelivery } from '../../services/orderService.js';

const router = Router();
router.use(authStaff, requireStaffRole('packer'));

async function fetchPackerOrders(statusFilter) {
  let sql = `SELECT * FROM orders WHERE packer_status IS NOT NULL AND status NOT IN ('cancelled', 'delivered')`;
  const params = [];
  if (statusFilter) { params.push(statusFilter); sql += ` AND packer_status = $${params.length}`; }
  sql += ' ORDER BY created_at ASC';
  const { rows } = await query(sql, params);
  return Promise.all(rows.map(async (o) => mapPackerOrder(await getOrderWithItems(o.id))));
}

router.get('/orders', asyncHandler(async (req, res) => {
  ok(res, await fetchPackerOrders(req.query.status));
}));

router.get('/orders/counts', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT packer_status, COUNT(*)::int AS count FROM orders
     WHERE packer_status IS NOT NULL AND status NOT IN ('cancelled','delivered')
     GROUP BY packer_status`
  );
  const counts = { new: 0, picking: 0, packing: 0, ready: 0 };
  for (const r of rows) counts[r.packer_status] = r.count;
  ok(res, counts);
}));

router.get('/orders/:orderId', asyncHandler(async (req, res) => {
  const order = await getOrderWithItems(req.params.orderId);
  if (!order) return fail(res, 'Order not found', 404);
  ok(res, mapPackerOrder(order));
}));

router.patch('/orders/:orderId/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['new', 'picking', 'packing', 'ready'];
  if (!valid.includes(status)) return fail(res, 'Invalid packer status');

  const orderStatus = status === 'ready' ? 'ready' : 'preparing';
  await query(
    `UPDATE orders SET packer_status = $1, status = $2, updated_at = NOW() WHERE id = $3`,
    [status, orderStatus, req.params.orderId]
  );

  let assignment = null;
  if (status === 'ready') {
    await logOrderStatus(req.params.orderId, 'ready', req.staff.id, 'Packed and ready');
    // Auto-assign to an online delivery partner so it appears in their app
    assignment = await assignOrderToDelivery(req.params.orderId, null, req.staff.id);
  }

  ok(res, {
    packerStatus: status,
    status: orderStatus,
    deliveryAssigned: !!assignment?.assigned,
    deliveryStaffId: assignment?.staffId || null,
    message: assignment?.assigned
      ? 'Order ready and assigned to delivery partner'
      : status === 'ready'
        ? 'Order ready — waiting for a delivery partner (go online or claim from available list)'
        : undefined,
  });
}));

router.post('/orders/:orderId/items/:itemId/scan', asyncHandler(async (req, res) => {
  const { barcode } = req.body;
  const order = await getOrderWithItems(req.params.orderId);
  if (!order) return fail(res, 'Order not found', 404);

  const item = order.items.find((i) => String(i.id) === String(req.params.itemId));
  if (!item) return fail(res, 'Item not found', 404);
  if (barcode && item.barcode && barcode !== item.barcode) return fail(res, 'Barcode mismatch');

  await query('UPDATE order_items SET picked_qty = qty WHERE id = $1', [item.id]);

  const updated = await getOrderWithItems(req.params.orderId);
  const allPicked = updated.items.every((i) => i.picked_qty >= i.qty);
  if (order.packer_status === 'new') {
    await query(`UPDATE orders SET packer_status = 'picking', status = 'preparing' WHERE id = $1`, [req.params.orderId]);
  }

  ok(res, { picked: item.qty, allPicked, order: mapPackerOrder(updated) });
}));

router.patch('/orders/:orderId/items/:itemId', asyncHandler(async (req, res) => {
  const { picked } = req.body;
  await query('UPDATE order_items SET picked_qty = $1 WHERE id = $2 AND order_id = $3', [picked, req.params.itemId, req.params.orderId]);
  const updated = await getOrderWithItems(req.params.orderId);
  ok(res, mapPackerOrder(updated));
}));

export default router;
