import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authCustomer } from '../../middleware/auth.js';
import { getCouponByCode, calculateCouponDiscount } from '../../services/orderService.js';

const router = Router();

router.post('/validate', authCustomer, asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const coupon = await getCouponByCode(code);
  if (!coupon) return fail(res, 'Invalid coupon code');
  if (coupon.used_count >= coupon.usage_limit) return fail(res, 'Coupon usage limit reached');
  const discount = calculateCouponDiscount(coupon, Number(subtotal));
  if (discount <= 0) return fail(res, `Minimum order ₹${coupon.min_order} required`);
  ok(res, {
    code: coupon.code,
    description: coupon.description,
    type: coupon.discount_type,
    value: Number(coupon.discount_value),
    minOrder: Number(coupon.min_order),
    maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null,
    discount,
  });
}));

router.get('/available', authCustomer, asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT code, description, discount_type, discount_value, min_order, max_discount FROM coupons WHERE status = 'active'`);
  ok(res, rows.map((c) => ({
    code: c.code,
    description: c.description,
    type: c.discount_type,
    value: Number(c.discount_value),
    minOrder: Number(c.min_order),
    maxDiscount: c.max_discount ? Number(c.max_discount) : null,
  })));
}));

export default router;
