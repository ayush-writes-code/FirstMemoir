import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './categories.routes.js';
import productRoutes from './products.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

export default router;
