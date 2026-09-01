import { prisma } from '@repo/database';
import { orderMapper } from '../utils/order.mapper.js';

export const orderService = {
  /**
   * Securely fetches the status of an order.
   * Ensures the order belongs to the authenticated user or the guest's session.
   */
  async getOrderStatusSecurely(orderId: string, sessionId: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        user_id: true,
        session_id: true,
      },
    });

    if (!order) {
      throw { statusCode: 404, message: 'Order not found' };
    }

    // Security check: Must belong to the logged-in user OR the current guest session
    const isOwner = userId && order.user_id === userId;
    const isGuestSessionOwner = order.session_id === sessionId;

    if (!isOwner && !isGuestSessionOwner) {
      throw { statusCode: 404, message: 'Order not found' }; // Disguise 403 as 404 for security against enumeration
    }

    return {
      order_id: order.id,
      status: order.status,
    };
  },

  async getCustomerOrders(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { user_id: userId } }),
      prisma.order.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { items: true }
          }
        }
      })
    ]);

    return {
      orders: orders.map(orderMapper.toCustomerOrderSummary),
      pagination: { total, page, limit }
    };
  },

  async getCustomerOrderDetail(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            upload: { select: { preview_r2_key: true } }
          }
        },
        status_history: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!order || order.user_id !== userId) {
      throw { statusCode: 404, message: 'Order not found' };
    }

    return orderMapper.toCustomerOrderDetail(order);
  },

  async trackGuestOrder(orderId: string, phoneNumber: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            upload: { select: { preview_r2_key: true } }
          }
        },
        status_history: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    // We verify the phone number matches the one saved on the order for guest tracking
    if (!order || order.customer_phone !== phoneNumber) {
      throw { statusCode: 404, message: 'Order not found or invalid phone number' };
    }

    return orderMapper.toGuestTrackResponse(order);
  }
};
