import { Router } from 'express';
import customerRoutes from './customer/index.js';
import adminRoutes from './admin/index.js';
import staffRoutes from './staff/index.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'Kisan Mall API', timestamp: new Date().toISOString() });
});

router.use('/customer', customerRoutes);
router.use('/admin', adminRoutes);
router.use('/staff', staffRoutes);

export default router;
