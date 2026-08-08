import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, fail } from '../../utils/response.js';
import { authAdmin } from '../../middleware/auth.js';

function listRouter(table, filters = []) {
  const router = Router();
  router.use(authAdmin);
  router.get('/', asyncHandler(async (req, res) => {
    let sql = `SELECT * FROM ${table} WHERE 1=1`;
    const params = [];
    for (const f of filters) {
      if (req.query[f]) { params.push(req.query[f]); sql += ` AND ${f} = $${params.length}`; }
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await query(sql, params);
    ok(res, rows);
  }));
  return router;
}

export const refundsRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.get('/', asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM refunds ORDER BY created_at DESC');
    ok(res, rows);
  }));
  r.post('/:id/approve', asyncHandler(async (req, res) => {
    await query(`UPDATE refunds SET status = 'approved', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    ok(res, { approved: true });
  }));
  r.post('/:id/reject', asyncHandler(async (req, res) => {
    await query(`UPDATE refunds SET status = 'rejected', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    ok(res, { rejected: true });
  }));
  r.post('/:id/process', asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM refunds WHERE id = $1', [req.params.id]);
    if (!rows.length) return fail(res, 'Not found', 404);
    await query(`UPDATE refunds SET status = 'refunded', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    await query(`UPDATE orders SET status = 'refunded' WHERE id = $1`, [rows[0].order_id]);
    ok(res, { processed: true });
  }));
  return r;
})();

export const supportRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.get('/tickets', asyncHandler(async (req, res) => {
    const { status, priority } = req.query;
    let sql = 'SELECT * FROM support_tickets WHERE 1=1';
    const params = [];
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (priority) { params.push(priority); sql += ` AND priority = $${params.length}`; }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await query(sql, params);
    ok(res, rows);
  }));
  r.patch('/tickets/:id/status', asyncHandler(async (req, res) => {
    await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [req.body.status, req.params.id]);
    ok(res, { updated: true });
  }));
  return r;
})();

export const reviewsRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.get('/', asyncHandler(async (req, res) => {
    const { status } = req.query;
    let sql = 'SELECT * FROM reviews WHERE 1=1';
    const params = [];
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await query(sql, params);
    ok(res, rows);
  }));
  r.patch('/:id/approve', asyncHandler(async (req, res) => {
    await query(`UPDATE reviews SET status = 'approved' WHERE id = $1`, [req.params.id]);
    ok(res, { approved: true });
  }));
  r.patch('/:id/hide', asyncHandler(async (req, res) => {
    await query(`UPDATE reviews SET status = 'hidden' WHERE id = $1`, [req.params.id]);
    ok(res, { hidden: true });
  }));
  r.delete('/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    ok(res, { deleted: true });
  }));
  return r;
})();

export const deliverySlotsRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.get('/', asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT ds.*, COUNT(o.id)::int AS booked FROM delivery_slots ds
      LEFT JOIN orders o ON o.slot_id = ds.id AND o.created_at::date = CURRENT_DATE AND o.status NOT IN ('cancelled')
      GROUP BY ds.id ORDER BY ds.start_time`);
    ok(res, rows);
  }));
  r.post('/', asyncHandler(async (req, res) => {
    const { id, label, startTime, endTime, maxOrders, status } = req.body;
    await query('INSERT INTO delivery_slots (id, label, start_time, end_time, max_orders, status) VALUES ($1,$2,$3,$4,$5,$6)',
      [id || `s${Date.now()}`, label, startTime, endTime, maxOrders || 30, status || 'active']);
    ok(res, { created: true }, 201);
  }));
  r.put('/:id', asyncHandler(async (req, res) => {
    const { label, startTime, endTime, maxOrders, status } = req.body;
    await query('UPDATE delivery_slots SET label=$1,start_time=$2,end_time=$3,max_orders=$4,status=$5,updated_at=NOW() WHERE id=$6',
      [label, startTime, endTime, maxOrders, status, req.params.id]);
    ok(res, { updated: true });
  }));
  return r;
})();

export const notificationsRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.post('/send', asyncHandler(async (req, res) => {
    const { title, message, type, audience, customerId } = req.body;
    if (audience === 'specific' && customerId) {
      await query('INSERT INTO notifications (id, customer_id, title, message, type) VALUES ($1,$2,$3,$4,$5)',
        [`n${Date.now()}`, customerId, title, message, type || 'info']);
    } else {
      const { rows: customers } = await query('SELECT id FROM customers WHERE status = $1', ['active']);
      for (const c of customers) {
        await query('INSERT INTO notifications (id, customer_id, title, message, type) VALUES ($1,$2,$3,$4,$5)',
          [`n${Date.now()}_${c.id}`, c.id, title, message, type || 'info']);
      }
    }
    ok(res, { sent: true });
  }));
  return r;
})();

export const reportsRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.get('/sales', asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT TO_CHAR(created_at, 'DD Mon') AS date, COUNT(*)::int AS orders, COALESCE(SUM(total),0) AS sales
      FROM orders WHERE status NOT IN ('cancelled') AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY created_at::date, TO_CHAR(created_at, 'DD Mon') ORDER BY created_at::date`);
    ok(res, rows.map((row) => ({ date: row.date, orders: row.orders, sales: Number(row.sales) })));
  }));
  return r;
})();

export const settingsRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.get('/', asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT key, value FROM settings');
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    ok(res, settings);
  }));
  r.put('/', asyncHandler(async (req, res) => {
    for (const [key, value] of Object.entries(req.body)) {
      await query(`INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
        [key, JSON.stringify(value)]);
    }
    ok(res, { updated: true });
  }));
  return r;
})();

export const usersRouter = (() => {
  const r = Router();
  r.use(authAdmin);
  r.get('/', asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT id, name, email, role, status, created_at FROM admin_users ORDER BY created_at');
    ok(res, rows);
  }));
  r.post('/', asyncHandler(async (req, res) => {
    const bcrypt = await import('bcryptjs');
    if (!req.body.password || String(req.body.password).length < 6) {
      return fail(res, 'Password must be at least 6 characters');
    }
    const hash = await bcrypt.default.hash(req.body.password, 10);
    const id = `admin${Date.now()}`;
    await query('INSERT INTO admin_users (id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)',
      [id, req.body.name, req.body.email, hash, req.body.role || 'store_manager']);
    ok(res, { id }, 201);
  }));
  r.put('/:id', asyncHandler(async (req, res) => {
    await query('UPDATE admin_users SET name=$1, role=$2, status=$3, updated_at=NOW() WHERE id=$4',
      [req.body.name, req.body.role, req.body.status, req.params.id]);
    ok(res, { updated: true });
  }));
  r.delete('/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM admin_users WHERE id = $1', [req.params.id]);
    ok(res, { deleted: true });
  }));
  return r;
})();

export default listRouter;
