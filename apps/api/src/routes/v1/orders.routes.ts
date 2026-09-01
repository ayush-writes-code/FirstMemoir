import { Router } from 'express';
import { orderController, orderStatusSchema, guestTrackSchema } from '../../controllers/order.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalAuth, authenticate } from '../../middlewares/auth.middleware.js';
import { orderTrackLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

// optionalAuth populates req.user if a valid token is present, but doesn't block guests
router.get('/:id/status', optionalAuth, validate(orderStatusSchema), orderController.getStatus);

// Authenticated endpoints
router.get('/my-orders', authenticate, orderController.getMyOrders);
router.get('/:id', authenticate, validate(orderStatusSchema), orderController.getOrderDetail);

// Guest endpoints
router.post('/track', orderTrackLimiter, validate(guestTrackSchema), orderController.trackGuestOrder);

export default router;
