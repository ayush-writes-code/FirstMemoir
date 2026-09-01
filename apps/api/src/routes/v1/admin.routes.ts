import { Router } from 'express';
import { adminOrdersController } from '../../controllers/admin.orders.controller.js';
import { requireAdmin, authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Apply auth and admin check to all admin routes
router.use(authenticate, requireAdmin);

router.get('/orders', adminOrdersController.listOrders);
router.get('/orders/:id', adminOrdersController.getOrderDetail);
router.post('/orders/:id/process', adminOrdersController.processOrder);
router.post('/orders/:id/shiprocket/awb', adminOrdersController.generateAwb);
router.get('/manufacturing/items', adminOrdersController.getManufacturingQueue);
router.get('/orders/:id/items/:itemId/download-asset', adminOrdersController.downloadMasterAsset);

export default router;
