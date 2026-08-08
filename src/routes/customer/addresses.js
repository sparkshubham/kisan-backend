import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authCustomer } from '../../middleware/auth.js';

const router = Router();

router.use(authCustomer);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at', [req.user.id]);
  ok(res, rows.map(mapAddress));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { label, name, mobile, house, area, landmark, city, state, pincode, isDefault } = req.body;
  const id = `addr${Date.now()}`;
  if (isDefault) await query('UPDATE addresses SET is_default = false WHERE customer_id = $1', [req.user.id]);
  await query(
    `INSERT INTO addresses (id, customer_id, label, name, mobile, house, area, landmark, city, state, pincode, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, req.user.id, label, name, mobile, house, area, landmark, city, state, pincode, !!isDefault]
  );
  const { rows } = await query('SELECT * FROM addresses WHERE id = $1', [id]);
  ok(res, mapAddress(rows[0]), 201);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { label, name, mobile, house, area, landmark, city, state, pincode, isDefault } = req.body;
  const { rows: existing } = await query('SELECT * FROM addresses WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.id]);
  if (!existing.length) return fail(res, 'Address not found', 404);
  if (isDefault) await query('UPDATE addresses SET is_default = false WHERE customer_id = $1', [req.user.id]);
  await query(
    `UPDATE addresses SET label=$1,name=$2,mobile=$3,house=$4,area=$5,landmark=$6,city=$7,state=$8,pincode=$9,is_default=$10,updated_at=NOW()
     WHERE id=$11 AND customer_id=$12`,
    [label, name, mobile, house, area, landmark, city, state, pincode, !!isDefault, req.params.id, req.user.id]
  );
  const { rows } = await query('SELECT * FROM addresses WHERE id = $1', [req.params.id]);
  ok(res, mapAddress(rows[0]));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM addresses WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.id]);
  ok(res, { deleted: true });
}));

router.post('/location/set', asyncHandler(async (req, res) => {
  await query('UPDATE customers SET is_location_set = true WHERE id = $1', [req.user.id]);
  ok(res, { isLocationSet: true });
}));

function mapAddress(a) {
  return {
    id: a.id,
    label: a.label,
    name: a.name,
    mobile: a.mobile,
    house: a.house,
    area: a.area,
    landmark: a.landmark,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.is_default,
  };
}

export default router;
