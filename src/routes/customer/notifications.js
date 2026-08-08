import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authCustomer } from '../../middleware/auth.js';

const router = Router();
router.use(authCustomer);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  ok(res, rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    time: n.created_at,
    read: n.is_read,
    type: n.type,
  })));
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.id]);
  ok(res, { read: true });
}));

export default router;
