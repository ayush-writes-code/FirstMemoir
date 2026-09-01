import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import { successResponse, errorResponse } from '../utils/response.js';

export const adminMetricsController = {
  getMetrics: async (req: Request, res: Response) => {
    try {
      const [actionableOrdersCount, failedNotificationsCount, failedWebhooksCount] = await Promise.all([
        prisma.order.count({
          where: {
            status: { in: ['CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'] },
          },
        }),
        prisma.notificationLog.count({
          where: { status: 'FAILED' },
        }),
        prisma.webhookEvent.count({
          where: { processing_status: 'FAILED' },
        }),
      ]);

      return res.json(
        successResponse('Metrics retrieved successfully', {
          actionableOrdersCount,
          failedNotificationsCount,
          failedWebhooksCount,
        })
      );
    } catch (error) {
      console.error('Failed to get admin metrics:', error);
      return res.status(500).json(errorResponse('Failed to retrieve operational metrics'));
    }
  },

  getNotifications: async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [total, notifications] = await Promise.all([
        prisma.notificationLog.count(),
        prisma.notificationLog.findMany({
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: skip,
        }),
      ]);

      return res.json(
        successResponse('Notifications retrieved successfully', {
          notifications,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        })
      );
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return res.status(500).json(errorResponse('Failed to retrieve notifications'));
    }
  },
};
