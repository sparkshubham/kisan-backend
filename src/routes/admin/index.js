import { Router } from 'express';
import authRoutes from './auth.js';
import dashboardRoutes from './dashboard.js';
import productRoutes from './products.js';
import orderRoutes from './orders.js';
import inventoryRoutes from './inventory.js';
import customerRoutes from './customers.js';
import paymentRoutes from './payments.js';
import { categoriesRouter, brandsRouter, couponsRouter, offersRouter, bannersRouter } from './crud.js';
import {
  refundsRouter, supportRouter, reviewsRouter, deliverySlotsRouter,
  notificationsRouter, reportsRouter, settingsRouter, usersRouter,
} from './misc.js';
import staffRoutes from './staff.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/coupons', couponsRouter);
router.use('/offers', offersRouter);
router.use('/banners', bannersRouter);
router.use('/delivery-slots', deliverySlotsRouter);
router.use('/payments', paymentRoutes);
router.use('/refunds', refundsRouter);
router.use('/support', supportRouter);
router.use('/reviews', reviewsRouter);
router.use('/notifications', notificationsRouter);
router.use('/reports', reportsRouter);
router.use('/settings', settingsRouter);
router.use('/users', usersRouter);
router.use('/staff', staffRoutes);

export default router;
