import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authCustomer } from '../../middleware/auth.js';

const router = Router();
router.use(authCustomer);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT w.product_id, p.name, p.emoji, p.sale_price AS price, p.mrp, p.rating
     FROM wishlist w JOIN products p ON p.id = w.product_id WHERE w.customer_id = $1`,
    [req.user.id]
  );
  ok(res, { productIds: rows.map((r) => r.product_id), items: rows });
}));

router.post('/:productId', asyncHandler(async (req, res) => {
  await query(
    'INSERT INTO wishlist (customer_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.id, req.params.productId]
  );
  ok(res, { added: true });
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  await query('DELETE FROM wishlist WHERE customer_id = $1 AND product_id = $2', [req.user.id, req.params.productId]);
  ok(res, { removed: true });
}));

export default router;
