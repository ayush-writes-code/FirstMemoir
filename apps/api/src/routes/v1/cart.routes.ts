import { Router } from 'express';
import { cartController, addToCartSchema } from '../../controllers/cart.controller.js';
import { ensureCartSession } from '../../middlewares/session.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

export const cartRouter = Router();

// GET /api/v1/cart
cartRouter.get('/', ensureCartSession, cartController.getCart);

// POST /api/v1/cart/items
cartRouter.post('/items', ensureCartSession, validate(addToCartSchema), cartController.addToCart);

// PATCH /api/v1/cart/items/:lineItemId
cartRouter.patch('/items/:lineItemId', ensureCartSession, cartController.updateQuantity);

// DELETE /api/v1/cart/items/:lineItemId
cartRouter.delete('/items/:lineItemId', ensureCartSession, cartController.removeFromCart);
