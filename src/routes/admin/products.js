import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const { search, categoryId, status } = req.query;
  let sql = 'SELECT p.*, c.name AS category_name, b.name AS brand_name FROM products p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id WHERE 1=1';
  const params = [];
  if (search) { params.push(`%${search}%`); sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`; }
  if (categoryId) { params.push(categoryId); sql += ` AND p.category_id = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND p.status = $${params.length}`; }
  sql += ' ORDER BY p.name';
  const { rows } = await query(sql, params);
  ok(res, rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!rows.length) return fail(res, 'Not found', 404);
  ok(res, rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const p = req.body;
  const id = p.id || `p${Date.now()}`;
  await query(
    `INSERT INTO products (id,name,sku,barcode,category_id,subcategory,brand_id,mrp,sale_price,discount,tax,unit,weight,description,stock,low_stock_limit,status,rack,shelf,bin,emoji,rating,popular,deal)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
    [id, p.name, p.sku, p.barcode, p.categoryId, p.subcategory, p.brandId, p.mrp, p.salePrice, p.discount || 0, p.tax || 0, p.unit, p.weight, p.description, p.stock || 0, p.lowStockLimit || 10, p.status || 'active', p.rack, p.shelf, p.bin, p.emoji, p.rating || 4.5, p.popular || false, p.deal || false]
  );
  ok(res, { id }, 201);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const p = req.body;
  await query(
    `UPDATE products SET name=$1,sku=$2,barcode=$3,category_id=$4,subcategory=$5,brand_id=$6,mrp=$7,sale_price=$8,discount=$9,tax=$10,unit=$11,weight=$12,description=$13,stock=$14,low_stock_limit=$15,status=$16,rack=$17,shelf=$18,bin=$19,emoji=$20,popular=$21,deal=$22,updated_at=NOW() WHERE id=$23`,
    [p.name, p.sku, p.barcode, p.categoryId, p.subcategory, p.brandId, p.mrp, p.salePrice, p.discount, p.tax, p.unit, p.weight, p.description, p.stock, p.lowStockLimit, p.status, p.rack, p.shelf, p.bin, p.emoji, p.popular, p.deal, req.params.id]
  );
  ok(res, { updated: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  ok(res, { deleted: true });
}));

export default router;
