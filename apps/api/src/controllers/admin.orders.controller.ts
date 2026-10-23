import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { successResponse, errorResponse } from '../utils/response.js';
import { shiprocketService, AppError } from '../services/shiprocket.service.js';
import { storageService } from '../services/storage.service.js';
import { notificationService } from '../services/notification/notification.service.js';
import { logger } from '../utils/logger.js';

// In-flight concurrency lock to prevent double-click or simultaneous AWB generation for the same order
export const inFlightAwbGenerations = new Set<string>();

export const adminOrdersController = {
  /**
   * GET /api/v1/admin/orders
   * Lists orders for the Admin dashboard with pagination, status/payment filters, and search.
   */
  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const skip = (page - 1) * limit;

      const status = req.query.status as string | undefined;
      const paymentStatus = req.query.payment_status as string | undefined;
      const search = (req.query.search as string | undefined)?.trim();

      const where: any = {};

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (paymentStatus && paymentStatus !== 'ALL') {
        where.payments = {
          some: {
            status: paymentStatus
          }
        };
      }

      if (search) {
        where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { customer_email: { contains: search, mode: 'insensitive' } },
          { customer_phone: { contains: search } },
          { tracking_awb: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { phone_number: { contains: search } }
              ]
            }
          }
        ];
      }

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            user: { select: { first_name: true, last_name: true, phone_number: true } },
            payments: { select: { status: true, method: true, razorpay_payment_id: true } },
            _count: { select: { items: true } }
          }
        })
      ]);

      res.status(200).json(successResponse({
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
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
          payments: { orderBy: { created_at: 'desc' } },
          status_history: { orderBy: { created_at: 'asc' } },
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

      const shiprocketConfigured = !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
      const shiprocketDryRun = process.env.SHIPROCKET_DRY_RUN === 'true';

      res.status(200).json(successResponse({
        order: orderData,
        fulfillmentDataComplete,
        missingFields,
        shiprocketStatus: {
          isConfigured: shiprocketConfigured || shiprocketDryRun,
          isDryRun: shiprocketDryRun,
        }
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
        if (!item.product?.sku) valid = false;
        
        const customization = item.customization_data;
        if (
          !customization ||
          !customization.master_file_key ||
          typeof customization.master_file_key !== 'string' ||
          !customization.master_file_key.startsWith('customers/') ||
          customization.master_file_key.includes('..') ||
          customization.master_file_key.includes('\\')
        ) {
          valid = false;
        }
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
   * POST /api/v1/admin/orders/:id/complete-production
   * Transitions an order from PROCESSING -> READY_FOR_PICKUP
   * Decoupled from Shiprocket AWB generation.
   */
  async completeProduction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const order = await prisma.order.findUnique({ where: { id } });

      if (!order) {
        return res.status(404).json(errorResponse('Order not found', 404));
      }

      if (order.status !== 'PROCESSING') {
        return res.status(400).json(errorResponse(`Cannot complete production for order with status ${order.status}`, 400));
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id },
          data: { status: 'READY_FOR_PICKUP' }
        });

        await tx.orderStatusHistory.create({
          data: {
            order_id: id,
            previous_status: 'PROCESSING',
            new_status: 'READY_FOR_PICKUP',
            description: 'Order production completed by Admin',
          }
        });

        return updated;
      });

      // No new notifications are dispatched here to preserve existing behavior.

      res.status(200).json(successResponse(updatedOrder));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/orders/:id/shiprocket/awb
   * Generates a Shiprocket Order and AWB for an order in PROCESSING state.
   * Hardened with in-flight concurrency lock, idempotency checks, and pre-flight validation.
   */
  async generateAwb(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id as string;

    // Concurrency protection Tier 1: in-memory lock to prevent double-click or simultaneous AWB generation on this instance
    if (inFlightAwbGenerations.has(id)) {
      return res.status(409).json(errorResponse('Shipment creation is already in progress for this order. Please wait.', 409));
    }

    inFlightAwbGenerations.add(id);

    const lockToken = crypto.randomUUID();
    const lockEventId = `lock:awb:${id}`;
    let acquiredDbLock = false;

    try {
      // Concurrency protection Tier 2: database-backed distributed lock with fencing token via WebhookEvent table
      try {
        await prisma.webhookEvent.create({
          data: {
            provider: 'system',
            event_id: lockEventId,
            event_type: 'AWB_GENERATION_LOCK',
            payload: { lockToken, lockedAt: new Date().toISOString() },
            processing_status: 'PENDING',
          }
        });
        acquiredDbLock = true;
      } catch (lockErr: any) {
        if (lockErr.code === 'P2002') {
          // Check if the existing lock is stale (> 60 seconds old)
          const existingLock = await prisma.webhookEvent.findUnique({
            where: { event_id: lockEventId }
          });
          const isStale = existingLock && (Date.now() - new Date(existingLock.received_at).getTime() > 60_000);
          if (isStale && existingLock) {
            logger.warn(`[adminOrdersController] Recovering stale AWB generation lock for order ${id}`);
            await prisma.webhookEvent.delete({ where: { event_id: lockEventId } }).catch(() => {});
            try {
              await prisma.webhookEvent.create({
                data: {
                  provider: 'system',
                  event_id: lockEventId,
                  event_type: 'AWB_GENERATION_LOCK',
                  payload: { lockToken, lockedAt: new Date().toISOString(), recovered: true },
                  processing_status: 'PENDING',
                }
              });
              acquiredDbLock = true;
            } catch {
              return res.status(409).json(errorResponse('Shipment creation is already in progress for this order on another instance. Please wait.', 409));
            }
          } else {
            return res.status(409).json(errorResponse('Shipment creation is already in progress for this order. Please wait.', 409));
          }
        } else {
          throw lockErr;
        }
      }

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } }
        }
      });

      if (!order) {
        return res.status(404).json(errorResponse('Order not found', 404));
      }

      // Idempotency check: If order already has tracking AWB assigned, return cleanly
      if (order.tracking_awb && order.shiprocket_shipment_id) {
        return res.status(200).json(successResponse(order));
      }

      if (order.status !== 'PROCESSING') {
        return res.status(400).json(errorResponse(`Cannot generate AWB for order with status ${order.status}. Order must be in PROCESSING state.`, 400));
      }

      // Pre-flight Production & Fulfillment Readiness Validation
      const orderData = order as any;
      const address = orderData.shipping_address_snapshot;
      if (!address || !address.name || !address.line1 || !address.city || !address.state || !address.postal_code) {
        return res.status(400).json(errorResponse('Fulfillment data incomplete: Missing valid shipping address snapshot', 400));
      }

      if (!orderData.items || orderData.items.length === 0) {
        return res.status(400).json(errorResponse('Fulfillment data incomplete: Order contains no items', 400));
      }

      for (let idx = 0; idx < orderData.items.length; idx++) {
        const item = orderData.items[idx];
        if (!item.product?.sku) {
          return res.status(400).json(errorResponse(`Fulfillment data incomplete: Missing SKU on item ${idx + 1} (${item.product?.name || 'Unknown'})`, 400));
        }
        const customization = item.customization_data;
        if (!customization || (!customization.physical_width && !customization.packaging?.width)) {
          return res.status(400).json(errorResponse(`Fulfillment data incomplete: Missing dimensions or packaging for item ${idx + 1}`, 400));
        }
      }

      // 1. Dry run checks and duplicate channel order recovery are built into createCustomOrder
      // 2. Will throw PACKAGE_FULFILLMENT_METRICS_UNDEFINED if physical packaging rules are missing
      const { shiprocketOrderId, shipmentId, awbCode } = await shiprocketService.createCustomOrder(id);

      const updatedOrder = await prisma.$transaction(async (tx) => {
        // 1. Re-verify active lock ownership (fencing check) to prevent superseded workers from overwriting newer state
        const activeLock = await tx.webhookEvent.findUnique({
          where: { event_id: lockEventId }
        });

        if (!activeLock || (activeLock.payload as any)?.lockToken !== lockToken) {
          throw new AppError('Shipment creation lock expired or was superseded during provider latency', 409);
        }

        // 2. Atomic status verification within transaction
        const currentOrder = await tx.order.findUnique({
          where: { id },
          select: { status: true, tracking_awb: true }
        });

        if (!currentOrder || currentOrder.status !== 'PROCESSING') {
          throw new AppError(`Order status changed to ${currentOrder?.status || 'UNKNOWN'} during AWB generation`, 409);
        }

        const orderUpdated = await tx.order.update({
          where: { id },
          data: {
            shiprocket_order_id: shiprocketOrderId,
            shiprocket_shipment_id: shipmentId,
            tracking_awb: awbCode,
            status: 'READY_FOR_PICKUP'
          }
        });

        await tx.orderStatusHistory.create({
          data: {
            order_id: id,
            previous_status: 'PROCESSING',
            new_status: 'READY_FOR_PICKUP',
            description: `AWB generated (${awbCode}) via Shiprocket${process.env.SHIPROCKET_DRY_RUN === 'true' ? ' (dry run)' : ''}`,
          }
        });

        return orderUpdated;
      });

      res.status(200).json(successResponse(updatedOrder));
    } catch (error: any) {
      if (error.name === 'AppError') {
        return res.status(error.statusCode || 400).json(errorResponse(error.message, error.statusCode || 400));
      }
      next(error);
    } finally {
      inFlightAwbGenerations.delete(id);
      if (acquiredDbLock) {
        try {
          const currentLock = await prisma.webhookEvent.findUnique({
            where: { event_id: lockEventId }
          });
          if (currentLock && (currentLock.payload as any)?.lockToken === lockToken) {
            await prisma.webhookEvent.delete({ where: { event_id: lockEventId } }).catch(() => {});
          }
        } catch {
          // Ignore release errors
        }
      }
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
            preview_url: item.upload_id ? `/api/v1/storage/preview/${item.upload_id}` : null,
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

      const masterKey = customization.master_file_key;
      if (
        typeof masterKey !== 'string' ||
        !masterKey.startsWith('customers/') ||
        masterKey.includes('..') ||
        masterKey.includes('\\')
      ) {
        return res.status(400).json(errorResponse('Invalid master file key path. Master assets must reside within customers/ prefix', 400));
      }

      // Extract filename safely
      const ext = masterKey.split('.').pop() || 'png';
      const downloadFilename = `Order_${order.id.slice(0, 6)}_Item_${item.id.slice(0, 6)}.${ext}`;

      // Generate 5 minute expiry URL with Content-Disposition
      try {
        const url = await storageService.generateReadUrl(
          masterKey, 
          300, // 5 mins
          downloadFilename
        );

        res.status(200).json(successResponse({ url }));
      } catch (storageError: any) {
        logger.error(storageError, `Storage service error generating download URL for item ${itemId}`);
        return res.status(502).json(errorResponse('Storage provider error generating presigned download URL', 502));
      }
    } catch (error) {
      next(error);
    }
  }
};
