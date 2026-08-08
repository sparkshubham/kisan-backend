import { Router } from 'express';
import authRoutes from './auth.js';
import catalogRoutes from './catalog.js';
import addressRoutes from './addresses.js';
import couponRoutes from './coupons.js';
import orderRoutes from './orders.js';
import wishlistRoutes from './wishlist.js';
import notificationRoutes from './notifications.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/addresses', addressRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/notifications', notificationRoutes);

// Convenience aliases matching frontend expectations
router.use('/', catalogRoutes);

export default router;
