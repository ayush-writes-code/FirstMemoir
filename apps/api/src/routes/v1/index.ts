import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './categories.routes.js';
import productRoutes from './products.routes.js';
import storageRoutes from './storage.routes.js';
import { cartRouter as cartRoutes } from './cart.routes.js';
import { checkoutRouter as checkoutRoutes } from './checkout.routes.js';
import { webhookRouter as webhookRoutes } from './webhook.routes.js';
import orderRoutes from './orders.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/storage', storageRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

export default router;
