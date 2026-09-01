import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { successResponse, errorResponse } from '../utils/response.js';
import { shiprocketService } from '../services/shiprocket.service.js';
import { storageService } from '../services/storage.service.js';
import { notificationService } from '../services/notification/notification.service.js';
import { logger } from '../utils/logger.js';

export const adminOrdersController = {
  /**
   * GET /api/v1/admin/orders
   * Lists orders for the Admin dashboard.
   */
  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [total, orders] = await Promise.all([
        prisma.order.count(),
        prisma.order.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            user: { select: { first_name: true, last_name: true, phone_number: true } },
            payments: { select: { status: true, method: true } },
          }
        })
      ]);

      res.status(200).json(successResponse({
        orders,
        pagination: { total, page, limit }
      }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/admin/orders/:id
   * Fetch detailed view of an order including shipping and fulfillment snapshot.
   */
  async getOrderDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { first_name: true, last_name: true, phone_number: true } },
          payments: true,
          items: {
            include: {
              product: { select: { name: true, slug: true, sku: true } },
              upload: true,
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json(errorResponse('Order not found', 404));
      }

      // ─── FULFILLMENT VALIDATION ──────────────────────────────────────────
      // Calculate fulfillment completeness based on backend authority.
      
      const orderData = order as any;
      let fulfillmentDataComplete = true;
      const missingFields: string[] = [];

      const address = orderData.shipping_address_snapshot;
      if (!address || !address.name || !address.line1 || !address.city || !address.state || !address.postal_code) {
        fulfillmentDataComplete = false;
        missingFields.push('shipping_address_snapshot');
      }

      orderData.items.forEach((item: any, idx: number) => {
        if (!item.product.sku) {
          fulfillmentDataComplete = false;
          missingFields.push(`items[${idx}].product.sku`);
        }
        const customization = item.customization_data;
        if (!customization || !customization.master_file_key) {
          fulfillmentDataComplete = false;
          missingFields.push(`items[${idx}].customization_data.master_file_key`);
        }
        if (!customization || !customization.physical_width || !customization.physical_height) {
          fulfillmentDataComplete = false;
          missingFields.push(`items[${idx}].customization_data.physical_dimensions`);
        }
      });

      res.status(200).json(successResponse({
        order: orderData,
        fulfillmentDataComplete,
        missingFields
      }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/orders/:id/process
   * Transitions an order from CONFIRMED -> PROCESSING
   */
  async processOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });

      if (!order) {
        return res.status(404).json(errorResponse('Order not found', 404));
      }

      if (order.status !== 'CONFIRMED') {
        return res.status(400).json(errorResponse(`Cannot process order with status ${order.status}`, 400));
      }

      const orderData = order as any;

      // Rerun manufacturing validation (NOT courier validation)
      const address = orderData.shipping_address_snapshot;
      let valid = true;
      if (!address || !address.name || !address.line1 || !address.city || !address.state || !address.postal_code) {
        valid = false;
      }
      orderData.items.forEach((item: any) => {
        if (!item.product.sku) valid = false;
        
        const customization = item.customization_data;
        if (!customization || !customization.master_file_key) valid = false;
        if (!customization || !customization.physical_width || !customization.physical_height || !customization.physical_dimension_unit) valid = false;
      });

      if (!valid) {
        return res.status(400).json(errorResponse('Manufacturing data incomplete (missing address, SKU, or physical dimensions)', 400));
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id },
          data: { status: 'PROCESSING' }
        });

        await tx.orderStatusHistory.create({
          data: {
            order_id: id,
            previous_status: 'CONFIRMED',
            new_status: 'PROCESSING',
            description: 'Order marked as processing by Admin',
          }
        });

        return updated;
      });

      // Fire async notification post-transaction
      notificationService.dispatchOrderProcessing(id).catch((err) => {
        logger.error(err, `Failed to dispatch order processing notification for order ${id}`);
      });

      res.status(200).json(successResponse(updatedOrder));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/orders/:id/shiprocket/awb
   * Generates a Shiprocket Order and AWB for an order in PROCESSING state.
   */
  async generateAwb(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const order = await prisma.order.findUnique({ where: { id } });

      if (!order) {
        return res.status(404).json(errorResponse('Order not found', 404));
      }

      if (order.status !== 'PROCESSING') {
        return res.status(400).json(errorResponse(`Cannot generate AWB for order with status ${order.status}`, 400));
      }

      // 1. Dry run checks are built into createCustomOrder
      // 2. Will throw PACKAGE_FULFILLMENT_METRICS_UNDEFINED if business rule is missing
      const { shiprocketOrderId, shipmentId, awbCode } = await shiprocketService.createCustomOrder(id);

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          shiprocket_order_id: shiprocketOrderId,
          shiprocket_shipment_id: shipmentId,
          tracking_awb: awbCode,
          status: 'READY_FOR_PICKUP'
        }
      });

      res.status(200).json(successResponse(updatedOrder));
    } catch (error: any) {
      if (error.name === 'AppError') {
        return res.status(error.statusCode || 400).json(errorResponse(error.message, error.statusCode || 400));
      }
      next(error);
    }
  },

  /**
   * GET /api/v1/admin/manufacturing/items
   * Returns a flattened list of items from CONFIRMED or PROCESSING orders.
   */
  async getManufacturingQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await prisma.order.findMany({
        where: {
          status: {
            in: ['CONFIRMED', 'PROCESSING']
          }
        },
        orderBy: { created_at: 'asc' },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              upload: { select: { preview_r2_key: true } }
            }
          },
          user: { select: { first_name: true, last_name: true, phone_number: true } }
        }
      });

      const items: any[] = [];
      for (const order of orders) {
        for (const item of order.items) {
          const customization = item.customization_data as any;
          items.push({
            order: {
              id: order.id,
              status: order.status,
              customer_name: (order.shipping_address_snapshot as any)?.name 
                || (order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() : null)
                || order.customer_email || 'Guest',
              created_at: order.created_at
            },
            id: item.id,
            product_name: item.product.name,
            quantity: item.quantity,
            preview_url: item.upload.preview_r2_key ? `/api/v1/uploads/preview/${item.upload.preview_r2_key}` : null,
            snapshot: {
              options: customization?.selected_product_options || customization?.selected_options || [],
              physical_width: customization?.physical_width,
              physical_height: customization?.physical_height,
              physical_dimension_unit: customization?.physical_dimension_unit,
              orientation: customization?.orientation,
              crop_x: customization?.crop_x,
              crop_y: customization?.crop_y,
              crop_width: customization?.crop_width,
              crop_height: customization?.crop_height,
              rotation: customization?.rotation,
              effective_dpi: customization?.effective_dpi,
              print_quality_status: customization?.print_quality_status,
              has_master_file: !!customization?.master_file_key
            }
          });
        }
      }

      res.status(200).json(successResponse(items));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/admin/orders/:id/items/:itemId/download-asset
   * Generates a temporary presigned R2 URL for downloading the master print file.
   */
  async downloadMasterAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const itemId = req.params.itemId as string;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        return res.status(404).json(errorResponse('Order not found', 404));
      }

      // Check if order status allows production access (e.g. not pending or expired)
      if (['PENDING', 'EXPIRED', 'CANCELLED'].includes(order.status)) {
        return res.status(403).json(errorResponse(`Cannot download files for order in ${order.status} state`, 403));
      }

      const item = (order as any).items.find((i: any) => i.id === itemId);
      if (!item) {
        return res.status(404).json(errorResponse('Order item not found in this order', 404));
      }

      const customization = item.customization_data as any;
      if (!customization || !customization.master_file_key) {
        return res.status(400).json(errorResponse('No master file key found for this item', 400));
      }

      // Extract filename safely
      const ext = customization.master_file_key.split('.').pop() || 'png';
      const downloadFilename = `Order_${order.id.slice(0, 6)}_Item_${item.id.slice(0, 6)}.${ext}`;

      // Generate 5 minute expiry URL with Content-Disposition
      const url = await storageService.generateReadUrl(
        customization.master_file_key, 
        300, // 5 mins
        downloadFilename
      );

      res.status(200).json(successResponse({ url }));
    } catch (error) {
      next(error);
    }
  }
};
