import { Router } from 'express';
import authRoutes from './auth.js';
import packerRoutes from './packer.js';
import deliveryRoutes from './delivery.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/packer', packerRoutes);
router.use('/delivery', deliveryRoutes);

export default router;
