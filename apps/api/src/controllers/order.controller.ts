import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { orderService } from '../services/order.service.js';
import { successResponse } from '../utils/response.js';
import { getSessionId } from '../middlewares/session.middleware.js';

export const orderStatusSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const guestTrackSchema = {
  body: z.object({
    order_id: z.string().uuid(),
    phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  }),
};

export const orderController = {
  /**
   * GET /api/v1/orders/:id/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getSessionId(req);
      const userId = (req as any).user?.userId;
      const orderId = req.params.id as string;

      const result = await orderService.getOrderStatusSecurely(orderId, sessionId, userId);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orders/my-orders
   * Authenticated customers only
   */
  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await orderService.getCustomerOrders(userId, page, limit);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orders/:id
   * Authenticated customers only
   */
  async getOrderDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const orderId = req.params.id as string;

      const result = await orderService.getCustomerOrderDetail(orderId, userId);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orders/track
   * Guest order tracking by order_id + phone_number
   */
  async trackGuestOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { order_id, phone_number } = req.body;

      const result = await orderService.trackGuestOrder(order_id, phone_number);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
};
