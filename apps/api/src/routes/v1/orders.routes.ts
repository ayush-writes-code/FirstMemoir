import { Router } from 'express';
import { orderController, orderStatusSchema } from '../../controllers/order.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

// optionalAuth populates req.user if a valid token is present, but doesn't block guests
router.get('/:id/status', optionalAuth, validate(orderStatusSchema), orderController.getStatus);

export default router;
