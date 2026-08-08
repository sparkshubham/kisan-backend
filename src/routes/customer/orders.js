import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authCustomer } from '../../middleware/auth.js';
import {
  generateOrderId, getCouponByCode, calculateCouponDiscount,
  logOrderStatus, getOrderWithItems, mapCustomerOrder, getDeliveryFee, generateDeliveryOtp,
} from '../../services/orderService.js';

const router = Router();
router.use(authCustomer);

const STATUS_TIMELINE = ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [req.user.id]);
  const orders = await Promise.all(rows.map(async (o) => {
    const full = await getOrderWithItems(o.id);
    return mapCustomerOrder(full);
  }));
  ok(res, orders);
}));

router.get('/:orderId', asyncHandler(async (req, res) => {
  const order = await getOrderWithItems(req.params.orderId);
  if (!order || order.customer_id !== req.user.id) return fail(res, 'Order not found', 404);
  ok(res, mapCustomerOrder(order));
}));

router.get('/:orderId/tracking', asyncHandler(async (req, res) => {
  const order = await getOrderWithItems(req.params.orderId);
  if (!order || order.customer_id !== req.user.id) return fail(res, 'Order not found', 404);
  const statusIndex = STATUS_TIMELINE.indexOf(order.status);
  ok(res, {
    status: order.status,
    statusIndex: statusIndex >= 0 ? statusIndex : 0,
    timeline: STATUS_TIMELINE.map((s, i) => ({
      status: s,
      label: s.replace(/_/g, ' '),
      completed: i <= statusIndex,
    })),
    deliveryOtp: order.status === 'out_for_delivery' ? order.delivery_otp : undefined,
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { items, addressId, slotId, paymentMethod, couponCode } = req.body;
  if (!items?.length || !addressId || !slotId || !paymentMethod) {
    return fail(res, 'items, addressId, slotId, and paymentMethod are required');
  }

  const orderId = await generateOrderId();
  const deliveryFee = await getDeliveryFee();

  const result = await withTransaction(async (client) => {
    const { rows: addrRows } = await client.query(
      'SELECT * FROM addresses WHERE id = $1 AND customer_id = $2', [addressId, req.user.id]
    );
    if (!addrRows.length) throw Object.assign(new Error('Address not found'), { status: 404 });
    const address = addrRows[0];

    const { rows: slotRows } = await client.query('SELECT * FROM delivery_slots WHERE id = $1', [slotId]);
    if (!slotRows.length) throw Object.assign(new Error('Invalid delivery slot'), { status: 400 });
    const slot = slotRows[0];

    const { rows: customerRows } = await client.query('SELECT * FROM customers WHERE id = $1', [req.user.id]);
    const customer = customerRows[0];

    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const { rows: prodRows } = await client.query('SELECT * FROM products WHERE id = $1 AND status = $2', [item.productId, 'active']);
      if (!prodRows.length) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
      const product = prodRows[0];
      if (product.stock < item.quantity) throw Object.assign(new Error(`${product.name} is out of stock`), { status: 400 });

      const price = Number(product.sale_price);
      subtotal += price * item.quantity;
      lineItems.push({ product, quantity: item.quantity, variantId: item.variantId, price });
    }

    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      appliedCoupon = await getCouponByCode(couponCode);
      if (appliedCoupon) discount = calculateCouponDiscount(appliedCoupon, subtotal);
    }

    const total = subtotal - discount + deliveryFee;
    const paymentStatus = paymentMethod === 'cod' ? 'pending' : 'success';
    const deliveryOtp = generateDeliveryOtp();

    await client.query(
      `INSERT INTO orders (id, customer_id, customer_name, customer_mobile, address_text, address_id, slot_id, slot_label,
        subtotal, discount, coupon_code, delivery_fee, total, payment_method, payment_status, status, packer_status, delivery_otp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'placed','new',$16)`,
      [
        orderId, req.user.id, customer.name, customer.mobile,
        `${address.house}, ${address.area}, ${address.city}, ${address.state} - ${address.pincode}`,
        addressId, slotId, slot.label, subtotal, discount, appliedCoupon?.code || null,
        deliveryFee, total, paymentMethod, paymentStatus, deliveryOtp,
      ]
    );

    for (const li of lineItems) {
      const p = li.product;
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, name, sku, barcode, emoji, qty, price, rack, shelf, bin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [orderId, p.id, li.variantId, p.name, p.sku, p.barcode, p.emoji, li.quantity, li.price, p.rack, p.shelf, p.bin]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [li.quantity, p.id]);
    }

    await client.query(
      `INSERT INTO payments (id, order_id, customer_name, amount, method, status, txn_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [`pay_${orderId}`, orderId, customer.name, total, paymentMethod.toUpperCase(), paymentStatus, paymentMethod === 'cod' ? '-' : `TXN${Date.now()}`]
    );

    if (appliedCoupon) {
      await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE code = $1', [appliedCoupon.code]);
    }

    await client.query('INSERT INTO order_status_log (order_id, status, changed_by) VALUES ($1, $2, $3)', [orderId, 'placed', 'Customer']);
    await client.query('INSERT INTO order_status_log (order_id, status, changed_by) VALUES ($1, $2, $3)', [orderId, 'confirmed', 'System']);

    await client.query(`UPDATE orders SET status = 'confirmed' WHERE id = $1`, [orderId]);

    return orderId;
  });

  const order = await getOrderWithItems(result);
  ok(res, mapCustomerOrder(order), 201);
}));

router.post('/:orderId/review', asyncHandler(async (req, res) => {
  const { orderRating, productRatings, comment } = req.body;
  const order = await getOrderWithItems(req.params.orderId);
  if (!order || order.customer_id !== req.user.id) return fail(res, 'Order not found', 404);
  if (order.status !== 'delivered') return fail(res, 'Order not delivered yet');
  if (order.reviewed) return fail(res, 'Already reviewed');

  await query(
    `INSERT INTO order_reviews (order_id, customer_id, order_rating, product_ratings, comment) VALUES ($1,$2,$3,$4,$5)`,
    [req.params.orderId, req.user.id, orderRating, JSON.stringify(productRatings || []), comment]
  );
  await query('UPDATE orders SET reviewed = true WHERE id = $1', [req.params.orderId]);

  if (productRatings?.length) {
    for (const pr of productRatings) {
      const item = order.items[pr.index];
      if (item) {
        await query(
          `INSERT INTO reviews (id, customer_id, customer_name, product_id, product_name, order_id, rating, comment, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
          [`rv_${Date.now()}_${pr.index}`, req.user.id, order.customer_name, item.product_id, item.name, req.params.orderId, pr.rating, comment]
        );
      }
    }
  }

  ok(res, { reviewed: true });
}));

export default router;
