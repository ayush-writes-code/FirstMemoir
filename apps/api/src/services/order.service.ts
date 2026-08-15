import { prisma } from '@repo/database';

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
};
