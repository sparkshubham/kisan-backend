import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authAdmin);

router.get('/summary', asyncHandler(async (_req, res) => {
  const { rows: stockRows } = await query(`SELECT COALESCE(SUM(stock * sale_price),0) AS value, COALESCE(SUM(stock),0) AS total FROM products`);
  const { rows: lowRows } = await query(`SELECT COUNT(*)::int AS count FROM products WHERE stock > 0 AND stock <= low_stock_limit`);
  const { rows: outRows } = await query(`SELECT COUNT(*)::int AS count FROM products WHERE stock = 0`);
  ok(res, {
    totalStock: Number(stockRows[0].total),
    stockValue: Number(stockRows[0].value),
    lowStockCount: lowRows[0].count,
    outOfStockCount: outRows[0].count,
  });
}));

router.get('/stock', asyncHandler(async (req, res) => {
  const { lowStock, outOfStock } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  if (lowStock === 'true') sql += ' AND stock > 0 AND stock <= low_stock_limit';
  if (outOfStock === 'true') sql += ' AND stock = 0';
  sql += ' ORDER BY stock ASC';
  const { rows } = await query(sql);
  ok(res, rows);
}));

router.patch('/products/:productId/stock', asyncHandler(async (req, res) => {
  const { newStock, reason } = req.body;
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.productId]);
  if (!rows.length) return fail(res, 'Product not found', 404);
  const product = rows[0];
  await query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [newStock, req.params.productId]);
  await query(
    `INSERT INTO inventory_transactions (id, product_id, product_name, type, old_stock, new_stock, reason, changed_by)
     VALUES ($1,$2,$3,'adjustment',$4,$5,$6,$7)`,
    [`it${Date.now()}`, product.id, product.name, product.stock, newStock, reason || 'Manual adjustment', req.admin.email]
  );
  ok(res, { stock: newStock });
}));

router.patch('/products/:productId/rack', asyncHandler(async (req, res) => {
  const { rack, shelf, bin } = req.body;
  await query('UPDATE products SET rack=$1, shelf=$2, bin=$3, updated_at=NOW() WHERE id=$4', [rack, shelf, bin, req.params.productId]);
  ok(res, { updated: true });
}));

router.get('/transactions', asyncHandler(async (req, res) => {
  const { productId, type } = req.query;
  let sql = 'SELECT * FROM inventory_transactions WHERE 1=1';
  const params = [];
  if (productId) { params.push(productId); sql += ` AND product_id = $${params.length}`; }
  if (type) { params.push(type); sql += ` AND type = $${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { rows } = await query(sql, params);
  ok(res, rows);
}));

export default router;
