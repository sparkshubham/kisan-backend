import { query } from '../config/database.js';
import { env } from '../config/env.js';

export function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon || subtotal < Number(coupon.min_order)) return 0;
  if (coupon.discount_type === 'flat') return Number(coupon.discount_value);
  const pct = subtotal * (Number(coupon.discount_value) / 100);
  return Math.min(pct, Number(coupon.max_discount || pct));
}

export async function getCouponByCode(code) {
  const { rows } = await query(
    `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND status = 'active'
     AND (start_date IS NULL OR start_date <= CURRENT_DATE)
     AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
    [code]
  );
  return rows[0] || null;
}

export async function generateOrderId() {
  const { rows } = await query(`SELECT id FROM orders WHERE id LIKE 'KM%' ORDER BY id DESC LIMIT 1`);
  if (!rows.length) return 'KM10248';
  const num = parseInt(rows[0].id.replace('KM', ''), 10) + 1;
  return `KM${num}`;
}

export async function logOrderStatus(orderId, status, changedBy = 'System', note = null) {
  await query(
    'INSERT INTO order_status_log (order_id, status, changed_by, note) VALUES ($1, $2, $3, $4)',
    [orderId, status, changedBy, note]
  );
}

export async function getOrderWithItems(orderId) {
  const { rows: orders } = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!orders.length) return null;
  const order = orders[0];
  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId]);
  const { rows: statusLog } = await query(
    'SELECT status, changed_by, note, created_at FROM order_status_log WHERE order_id = $1 ORDER BY created_at',
    [orderId]
  );
  return { ...order, items, statusLog };
}

export function mapCustomerOrder(order) {
  const statusIndex = ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].indexOf(order.status);
  return {
    id: order.id,
    items: order.items?.map((i) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      quantity: i.qty,
      name: i.name,
      price: Number(i.price),
      emoji: i.emoji,
    })) || [],
    subtotal: Number(order.subtotal),
    couponDiscount: Number(order.discount),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    address: order.address_text,
    slot: order.slot_label,
    paymentMethod: order.payment_method,
    status: order.status,
    statusIndex: statusIndex >= 0 ? statusIndex : 0,
    createdAt: order.created_at,
    date: new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    reviewed: order.reviewed,
  };
}

export function mapPackerOrder(order) {
  return {
    id: order.id,
    customerName: order.customer_name,
    customerMobile: order.customer_mobile,
    address: order.address_text,
    amount: Number(order.total),
    paymentType: order.payment_method === 'cod' ? 'COD' : 'Paid',
    slot: order.slot_label,
    status: order.packer_status || 'new',
    items: order.items.map((i) => ({
      id: String(i.id),
      name: i.name,
      sku: i.sku,
      barcode: i.barcode,
      qty: i.qty,
      picked: i.picked_qty,
      emoji: i.emoji,
      rack: i.rack,
      shelf: i.shelf,
      bin: i.bin,
    })),
  };
}

export function mapDeliveryOrder(order) {
  return {
    id: order.id,
    customerName: order.customer_name,
    customerMobile: order.customer_mobile,
    address: order.address_text,
    amount: Number(order.total),
    paymentType: order.payment_method === 'cod' ? 'COD' : 'Paid',
    slot: order.slot_label,
    status: order.delivery_status || 'assigned',
    items: order.items.map((i) => ({ name: i.name, qty: i.qty, emoji: i.emoji })),
  };
}

export function generateDeliveryOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Pick an online delivery boy with the fewest active assigned orders. */
export async function findAvailableDeliveryBoy() {
  const { rows } = await query(
    `SELECT s.id, s.name,
            COUNT(o.id) FILTER (
              WHERE o.delivery_status IS NOT NULL
                AND o.delivery_status NOT IN ('delivered')
                AND o.status NOT IN ('cancelled', 'delivered')
            )::int AS active_orders
     FROM staff_users s
     LEFT JOIN orders o ON o.assigned_delivery_id = s.id
     WHERE s.role = 'delivery_boy' AND s.status = 'active' AND s.is_online = true
     GROUP BY s.id, s.name
     ORDER BY active_orders ASC, s.created_at ASC
     LIMIT 1`
  );
  return rows[0] || null;
}

/**
 * Assign order to a delivery partner (or auto-pick online one).
 * Sets delivery_status=assigned and ensures OTP exists.
 */
export async function assignOrderToDelivery(orderId, staffId = null, assignedBy = 'System') {
  let deliveryId = staffId;
  if (!deliveryId) {
    const available = await findAvailableDeliveryBoy();
    if (!available) return { assigned: false, reason: 'No online delivery partner' };
    deliveryId = available.id;
  }

  const { rows: existing } = await query('SELECT delivery_otp FROM orders WHERE id = $1', [orderId]);
  const otp = existing[0]?.delivery_otp || generateDeliveryOtp();

  await query(
    `UPDATE orders
     SET assigned_delivery_id = $1,
         delivery_status = 'assigned',
         delivery_otp = $2,
         status = 'ready',
         packer_status = 'ready',
         updated_at = NOW()
     WHERE id = $3`,
    [deliveryId, otp, orderId]
  );
  await logOrderStatus(orderId, 'ready', assignedBy, `Assigned to delivery ${deliveryId}`);
  return { assigned: true, staffId: deliveryId, deliveryOtp: otp };
}

export async function getDeliveryFee() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'store'`);
  return rows[0]?.value?.deliveryFee ?? env.deliveryFee;
}
