import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

function crudRouter(table, idField = 'id', mapIn = (b) => b, mapOut = (r) => r) {
  const router = Router();
  router.use(authAdmin);

  router.get('/', asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} ORDER BY created_at DESC NULLS LAST`);
    ok(res, rows.map(mapOut));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} WHERE ${idField} = $1`, [req.params.id]);
    if (!rows.length) return fail(res, 'Not found', 404);
    ok(res, mapOut(rows[0]));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const data = mapIn(req.body);
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    await query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`, vals);
    ok(res, data, 201);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const data = mapIn({ ...req.body, id: req.params.id });
    const cols = Object.keys(data).filter((c) => c !== idField);
    const vals = cols.map((c) => data[c]);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    vals.push(req.params.id);
    await query(`UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE ${idField} = $${vals.length}`, vals);
    ok(res, { updated: true });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    await query(`DELETE FROM ${table} WHERE ${idField} = $1`, [req.params.id]);
    ok(res, { deleted: true });
  }));

  return router;
}

export const categoriesRouter = crudRouter('categories', 'id', (b) => ({
  id: b.id || `cat${Date.now()}`,
  name: b.name,
  slug: b.slug || b.name?.toLowerCase().replace(/\s+/g, '-'),
  image: b.image,
  sort_order: b.sortOrder ?? b.sort_order ?? 1,
  status: b.status || 'active',
  subcategories: JSON.stringify(b.subcategories || []),
}), (r) => ({
  ...r,
  sortOrder: r.sort_order,
  subcategories: typeof r.subcategories === 'string' ? JSON.parse(r.subcategories) : (r.subcategories || []),
}));

export const brandsRouter = crudRouter('brands', 'id', (b) => ({
  id: b.id || `b${Date.now()}`,
  name: b.name,
  logo: b.logo,
  description: b.description,
  status: b.status || 'active',
}));

export const couponsRouter = crudRouter('coupons', 'id', (b) => ({
  id: b.id || `cp${Date.now()}`,
  code: b.code,
  description: b.description,
  discount_type: b.discountType || b.discount_type,
  discount_value: b.discountValue || b.discount_value,
  min_order: b.minOrder || b.min_order,
  max_discount: b.maxDiscount || b.max_discount,
  start_date: b.startDate || b.start_date,
  end_date: b.endDate || b.end_date,
  usage_limit: b.usageLimit || b.usage_limit,
  status: b.status || 'active',
}));

export const offersRouter = crudRouter('offers', 'id', (b) => ({
  id: b.id || `o${Date.now()}`,
  title: b.title,
  type: b.type,
  value: b.value,
  target: b.target,
  target_id: b.targetId || b.target_id,
  start_date: b.startDate || b.start_date,
  end_date: b.endDate || b.end_date,
  status: b.status || 'active',
}));

export const bannersRouter = crudRouter('banners', 'id', (b) => ({
  id: b.id || `bn${Date.now()}`,
  title: b.title,
  description: b.description,
  image: b.image,
  link_type: b.linkType || b.link_type,
  link_id: b.linkId || b.link_id,
  start_date: b.startDate || b.start_date,
  end_date: b.endDate || b.end_date,
  status: b.status || 'active',
}));

export default crudRouter;
