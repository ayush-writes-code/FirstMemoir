import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { cartService } from '../services/cart.service.js';
import { successResponse } from '../utils/response.js';

import { getSessionId } from '../middlewares/session.middleware.js';

const FLOAT_TOLERANCE = 1e-7;

const normalizeCoordinate = (val: unknown, min: number, max: number) => {
  if (typeof val !== 'number' || !Number.isFinite(val)) return val;
  if (val < min && Math.abs(val - min) <= FLOAT_TOLERANCE) return min;
  if (val > max && Math.abs(val - max) <= FLOAT_TOLERANCE) return max;
  return val;
};

export const addToCartSchema = {
  body: z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).default(1),
    selected_option_value_ids: z.array(z.string().uuid()),
    upload_id: z.string().uuid(),
    preview_url: z.string().url(),
    orientation: z.enum(['PORTRAIT', 'LANDSCAPE', 'SQUARE']),
    crop: z.object({
      x: z.preprocess(v => normalizeCoordinate(v, 0, 1), z.number().min(0).max(1)),
      y: z.preprocess(v => normalizeCoordinate(v, 0, 1), z.number().min(0).max(1)),
      width: z.preprocess(v => normalizeCoordinate(v, 0, 1), z.number().gt(0).max(1)),
      height: z.preprocess(v => normalizeCoordinate(v, 0, 1), z.number().gt(0).max(1)),
      aspect_ratio: z.string()
    }).transform(data => {
      // Normalize sum artifacts slightly above 1 due to floating point noise
      if (data.x + data.width > 1 && data.x + data.width <= 1 + FLOAT_TOLERANCE) {
        data.width = Number((1 - data.x).toFixed(7)); // Avoid introducing further float noise
      }
      if (data.y + data.height > 1 && data.y + data.height <= 1 + FLOAT_TOLERANCE) {
        data.height = Number((1 - data.y).toFixed(7));
      }
      return data;
    }).refine(data => data.x + data.width <= 1 && data.y + data.height <= 1, {
      message: "Crop coordinates exceed image boundaries"
    }),
    rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    zoom: z.number().min(1),
    effective_dpi: z.number().int().positive(),
    print_quality_status: z.enum(['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'LOW_QUALITY', 'NOT_RECOMMENDED']),
    dpi_acknowledged: z.boolean().default(false)
  })
};

export const updateQuantitySchema = {
  body: z.object({
    quantity: z.number().int().min(1).max(999)
  })
};

// Helper function to map a database line item to the DTO expected by the client
function mapLineItemToDto(item: any) {
  const basePrice = Number(item.product.base_price);
  const optionValues = item.selected_option_values.map((sov: any) => sov.option_value);
  const unit_price = cartService.calculateLineItemPrice(basePrice, optionValues);

  return {
    id: item.id,
    cart_id: item.cart_id,
    product_id: item.product_id,
    quantity: item.quantity,
    status: item.status,
    upload_id: item.upload_id,
    preview_url: item.preview_url,
    rotation: item.rotation,
    zoom: item.zoom,
    effective_dpi: item.effective_dpi,
    print_quality_status: item.print_quality_status,
    dpi_acknowledged: item.dpi_acknowledged,
    pricing_version: item.pricing_version,
    created_at: item.created_at,
    updated_at: item.updated_at,
    
    product_name: item.product.name,
    unit_price: unit_price,
    selected_options: optionValues.map((val: any) => ({
      option_id: val.option_id,
      option_name: val.option?.name || 'Option',
      value_name: val.value,
      price_modifier: Number(val.price_modifier)
    })),
    crop: {
      x: item.crop_x,
      y: item.crop_y,
      width: item.crop_width,
      height: item.crop_height,
      aspect_ratio: item.crop_aspect_ratio,
    },
    orientation: item.orientation
  };
}

export const cartController = {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getSessionId(req);
      const userId = (req as any).user?.id; // Optional authenticated user

      const cart = await cartService.getCart(sessionId, userId);

      // Map cart to DTO
      const cartDto = {
        ...cart,
        items: cart.items.map(mapLineItemToDto)
      };

      res.status(200).json(successResponse(cartDto));
    } catch (error) {
      next(error);
    }
  },

  async addToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getSessionId(req);
      const userId = (req as any).user?.id;

      // The body is already validated and typed by Zod middleware
      const input = req.body;

      const lineItem = await cartService.addToCart(input, sessionId, userId);

      res.status(201).json(successResponse(mapLineItemToDto(lineItem)));
    } catch (error) {
      next(error);
    }
  },

  async removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getSessionId(req);
      const userId = (req as any).user?.id;
      const lineItemId = req.params.lineItemId as string;

      await cartService.removeFromCart(lineItemId, sessionId, userId);

      res.status(200).json(successResponse(null));
    } catch (error) {
      next(error);
    }
  },

  async updateQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getSessionId(req);
      const userId = (req as any).user?.id;
      const lineItemId = req.params.lineItemId as string;
      const { quantity } = req.body;

      const lineItem = await cartService.updateQuantity(lineItemId, quantity, sessionId, userId);

      if (!lineItem) {
        return res.status(200).json(successResponse(null));
      }

      res.status(200).json(successResponse(mapLineItemToDto(lineItem)));
    } catch (error) {
      next(error);
    }
  }
};
