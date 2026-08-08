import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';
import { getOrderWithItems, logOrderStatus, assignOrderToDelivery } from '../../services/orderService.js';

const router = Router();
router.use(authAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const { search, status, paymentMethod } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (search) { params.push(`%${search}%`); sql += ` AND (id ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR customer_mobile ILIKE $${params.length})`; }
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  if (paymentMethod) { params.push(paymentMethod); sql += ` AND payment_method = $${params.length}`; }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);

  const orders = await Promise.all(rows.map(async (o) => {
    const full = await getOrderWithItems(o.id);
    return {
      id: full.id,
      customerId: full.customer_id,
      customerName: full.customer_name,
      customerMobile: full.customer_mobile,
      amount: Number(full.total),
      payment: full.payment_status === 'success' ? 'Paid' : 'COD',
      paymentMethod: full.payment_method,
      status: full.status,
      items: full.items.map((i) => ({ name: i.name, qty: i.qty, price: Number(i.price) })),
      subtotal: Number(full.subtotal),
      discount: Number(full.discount),
      delivery: Number(full.delivery_fee),
      address: full.address_text,
      slot: full.slot_label,
      date: new Date(full.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      statusLog: full.statusLog.map((l) => ({ status: l.status, time: l.created_at })),
    };
  }));
  ok(res, orders);
}));

router.get('/:orderId', asyncHandler(async (req, res) => {
  const order = await getOrderWithItems(req.params.orderId);
  if (!order) return fail(res, 'Not found', 404);
  ok(res, order);
}));

router.patch('/:orderId/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refund_requested', 'refunded'];
  if (!valid.includes(status)) return fail(res, 'Invalid status');

  const updates = { status };
  if (status === 'preparing') updates.packer_status = 'picking';
  if (status === 'ready') updates.packer_status = 'ready';
  if (status === 'out_for_delivery') updates.delivery_status = 'out_for_delivery';

  await query(
    `UPDATE orders SET status=$1, packer_status=COALESCE($2, packer_status), delivery_status=COALESCE($3, delivery_status), updated_at=NOW() WHERE id=$4`,
    [status, updates.packer_status || null, updates.delivery_status || null, req.params.orderId]
  );
  await logOrderStatus(req.params.orderId, status, req.admin.email);
  ok(res, { status });
}));

router.post('/:orderId/cancel', asyncHandler(async (req, res) => {
  await query(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [req.params.orderId]);
  await logOrderStatus(req.params.orderId, 'cancelled', req.admin.email);
  ok(res, { cancelled: true });
}));

router.post('/:orderId/assign-delivery', asyncHandler(async (req, res) => {
  const { staffId } = req.body;
  if (!staffId) return fail(res, 'staffId required');
  const result = await assignOrderToDelivery(req.params.orderId, staffId, req.admin.email);
  ok(res, { assigned: result.assigned, deliveryOtp: result.deliveryOtp });
}));

export default router;
