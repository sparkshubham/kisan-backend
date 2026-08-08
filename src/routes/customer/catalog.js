import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';

const router = Router();

router.get('/categories', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, slug, image AS icon, subcategories FROM categories WHERE status = 'active' ORDER BY sort_order`
  );
  const categories = rows.map((c) => ({
    id: c.slug,
    name: c.name,
    icon: c.icon,
    subcategories: (c.subcategories || []).map((name, i) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name })),
  }));
  ok(res, categories);
}));

router.get('/categories/:slug', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM categories WHERE slug = $1', [req.params.slug]);
  if (!rows.length) return ok(res, null);
  const c = rows[0];
  ok(res, {
    id: c.slug,
    name: c.name,
    icon: c.image,
    subcategories: (c.subcategories || []).map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name })),
  });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const { category, subcategory, popular, deal, search, limit = 50 } = req.query;
  let sql = `SELECT p.*, b.name AS brand_name, c.slug AS category_slug
             FROM products p
             LEFT JOIN brands b ON b.id = p.brand_id
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.status = 'active'`;
  const params = [];

  if (category) {
    params.push(category);
    sql += ` AND c.slug = $${params.length}`;
  }
  if (subcategory) {
    params.push(subcategory);
    sql += ` AND LOWER(p.subcategory) LIKE $${params.length}`;
    params[params.length - 1] = `%${subcategory}%`;
  }
  if (popular === 'true') sql += ' AND p.popular = true';
  if (deal === 'true') sql += ' AND p.deal = true';
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR b.name ILIKE $${params.length})`;
  }
  params.push(Number(limit));
  sql += ` ORDER BY p.name LIMIT $${params.length}`;

  const { rows } = await query(sql, params);
  ok(res, rows.map(mapProduct));
}));

router.get('/products/search', asyncHandler(async (req, res) => {
  req.query.search = req.query.q || req.query.search;
  const { category, subcategory, popular, deal, search, limit = 50 } = req.query;
  let sql = `SELECT p.*, b.name AS brand_name, c.slug AS category_slug
             FROM products p
             LEFT JOIN brands b ON b.id = p.brand_id
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.status = 'active'`;
  const params = [];
  if (category) { params.push(category); sql += ` AND c.slug = $${params.length}`; }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR b.name ILIKE $${params.length})`;
  }
  params.push(Number(limit));
  sql += ` ORDER BY p.name LIMIT $${params.length}`;
  const { rows } = await query(sql, params);
  ok(res, rows.map(mapProduct));
}));

router.get('/products/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, b.name AS brand_name, c.slug AS category_slug FROM products p
     LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return ok(res, null);
  ok(res, mapProduct(rows[0]));
}));

router.get('/banners', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM banners WHERE status = 'active' ORDER BY start_date DESC`);
  ok(res, rows);
}));

router.get('/offers', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM offers WHERE status = 'active'`);
  ok(res, rows);
}));

router.get('/delivery-slots', asyncHandler(async (_req, res) => {
  const { rows: slots } = await query(`SELECT ds.*, COUNT(o.id)::int AS booked
    FROM delivery_slots ds
    LEFT JOIN orders o ON o.slot_id = ds.id AND o.created_at::date = CURRENT_DATE AND o.status NOT IN ('cancelled')
    WHERE ds.status IN ('active', 'full')
    GROUP BY ds.id ORDER BY ds.start_time`);
  ok(res, slots.map((s) => ({
    id: s.id,
    label: s.label,
    available: s.status === 'active' && s.booked < s.max_orders,
  })));
}));

router.get('/config/delivery-fee', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'store'`);
  ok(res, { fee: rows[0]?.value?.deliveryFee ?? 30 });
}));

router.get('/config/serviceable-pincodes', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT pincode FROM serviceable_pincodes WHERE active = true');
  ok(res, rows.map((r) => r.pincode));
}));

router.get('/locations/serviceable', asyncHandler(async (req, res) => {
  const { pincode } = req.query;
  const { rows } = await query('SELECT * FROM serviceable_pincodes WHERE pincode = $1 AND active = true', [pincode]);
  ok(res, { serviceable: rows.length > 0, pincode, city: rows[0]?.city });
}));

function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand_name,
    category: p.category_slug,
    subcategory: p.subcategory?.toLowerCase().replace(/\s+/g, '-') || '',
    sku: p.sku,
    barcode: p.barcode,
    mrp: Number(p.mrp),
    price: Number(p.sale_price),
    weight: p.weight,
    emoji: p.emoji,
    rating: Number(p.rating),
    description: p.description,
    variants: p.variants || [],
    popular: p.popular,
    deal: p.deal,
    stock: p.stock,
  };
}

export default router;
