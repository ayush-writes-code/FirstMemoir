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

export const orderController = {
  /**
   * GET /api/v1/orders/:id/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getSessionId(req);
      const userId = (req as any).user?.id;
      const orderId = req.params.id as string;

      const result = await orderService.getOrderStatusSecurely(orderId, sessionId, userId);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },
};
