import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { cartService } from '../services/cart.service.js';
import { successResponse } from '../utils/response.js';

import { getSessionId } from '../middlewares/session.middleware.js';

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
    }
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

      // In real life we'd validate the body using Zod
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
