import { prisma } from '@repo/database';
import { env } from '../config/env.js';
import { z } from 'zod';
import type { AddToCartInput, PrintQualityStatus } from '@repo/api-client';

export const cartService = {
  /**
   * Fetch the current cart by session ID (and user ID if authenticated)
   */
  async getCart(sessionId: string, userId?: string) {
    let cart = await prisma.cart.findUnique({
      where: { session_id: sessionId },
      include: {
        items: {
          include: {
            product: true,
              selected_option_values: {
                include: { 
                  option_value: {
                    include: { option: true }
                  } 
                }
              },
            upload: true,
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          session_id: sessionId,
          user_id: userId || null,
        },
        include: {
          items: {
            include: {
              product: true,
              selected_option_values: {
                include: { 
                  option_value: {
                    include: { option: true }
                  } 
                }
              },
              upload: true,
            }
          }
        }
      });
    } else if (userId && cart.user_id !== userId) {
      // Merge logic could go here later if we merge anonymous cart with authenticated cart
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: { user_id: userId },
        include: {
          items: {
            include: {
              product: true,
              selected_option_values: {
                include: { 
                  option_value: {
                    include: { option: true }
                  } 
                }
              },
              upload: true,
            }
          }
        }
      });
    }

    return cart;
  },

  /**
   * Recalculates the price dynamically using the current option values
   * without storing the price on the line item.
   */
  calculateLineItemPrice(basePrice: number, optionValues: { modifier_type: string, price_modifier: any }[]): number {
    let finalPrice = basePrice;
    
    // First apply flat modifiers
    for (const val of optionValues) {
      if (val.modifier_type === 'FLAT') {
        finalPrice += Number(val.price_modifier);
      }
    }

    // Then apply percentage modifiers
    let percentageModifiers = 0;
    for (const val of optionValues) {
      if (val.modifier_type === 'PERCENTAGE') {
        percentageModifiers += Number(val.price_modifier);
      }
    }
    
    if (percentageModifiers > 0) {
      finalPrice = finalPrice * (1 + (percentageModifiers / 100));
    }

    return finalPrice;
  },

  /**
   * Add item to cart
   */
  async addToCart(input: AddToCartInput, sessionId: string, userId?: string) {
    // 1. Fetch current pricing version from StoreSettings
    let storeSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!storeSettings) {
      storeSettings = await prisma.storeSettings.create({ data: { id: 'default', pricing_version: 1 } });
    }
    const currentPricingVersion = storeSettings.pricing_version;
    
    // 2. Fetch the cart
    const cart = await this.getCart(sessionId, userId);

    // 3. Verify upload
    const upload = await prisma.userUpload.findUnique({
      where: { id: input.upload_id },
    });

    if (!upload) {
      throw { statusCode: 404, message: 'Upload not found' };
    }

    if (upload.session_id !== sessionId && upload.user_id !== userId) {
      throw { statusCode: 403, message: 'You do not have permission to use this upload' };
    }

    if (upload.status !== 'READY' && upload.status !== 'LINKED_TO_CART') {
      throw { statusCode: 400, message: `Upload is not ready (Status: ${upload.status})` };
    }

    // Update upload status
    if (upload.status === 'READY') {
      await prisma.userUpload.update({
        where: { id: upload.id },
        data: { status: 'LINKED_TO_CART' }
      });
    }

    // 4. Verify Product and Options
    const product = await prisma.product.findUnique({
      where: { id: input.product_id },
      include: {
        options: {
          include: { values: true }
        }
      }
    });

    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    // Ensure all selected options belong to this product
    const validOptionValueIds = new Set(
      product.options.flatMap(o => o.values.map(v => v.id))
    );

    for (const valId of input.selected_option_value_ids) {
      if (!validOptionValueIds.has(valId)) {
        throw { statusCode: 400, message: `Invalid option value ID: ${valId}` };
      }
    }

    // 5. Create Cart Line Item
    const lineItem = await prisma.cartLineItem.create({
      data: {
        cart_id: cart.id,
        product_id: product.id,
        quantity: input.quantity,
        status: 'VALIDATED', // Validated since we just checked it
        upload_id: input.upload_id,
        preview_url: input.preview_url, // URL generated by frontend or proxy
        crop_x: input.crop.x,
        crop_y: input.crop.y,
        crop_width: input.crop.width,
        crop_height: input.crop.height,
        crop_aspect_ratio: input.crop.aspect_ratio,
        rotation: input.rotation,
        zoom: input.zoom,
        effective_dpi: input.effective_dpi,
        print_quality_status: input.print_quality_status as any,
        dpi_acknowledged: input.dpi_acknowledged,
        pricing_version: currentPricingVersion,
        selected_option_values: {
          create: input.selected_option_value_ids.map(id => ({
            product_option_value_id: id
          }))
        }
      },
      include: {
        product: true,
        selected_option_values: {
          include: { 
            option_value: {
              include: { option: true }
            } 
          }
        },
        upload: true,
      }
    });

    return lineItem;
  },

  /**
   * Remove item from cart
   */
  async removeFromCart(lineItemId: string, sessionId: string, userId?: string) {
    const lineItem = await prisma.cartLineItem.findUnique({
      where: { id: lineItemId },
      include: { cart: true }
    });

    if (!lineItem) {
      throw { statusCode: 404, message: 'Line item not found' };
    }

    if (lineItem.cart.session_id !== sessionId && lineItem.cart.user_id !== userId) {
      throw { statusCode: 403, message: 'Not authorized' };
    }

    await prisma.cartLineItem.delete({
      where: { id: lineItemId }
    });
  },

  /**
   * Update quantity
   */
  async updateQuantity(lineItemId: string, quantity: number, sessionId: string, userId?: string) {
    const lineItem = await prisma.cartLineItem.findUnique({
      where: { id: lineItemId },
      include: { cart: true }
    });

    if (!lineItem) {
      throw { statusCode: 404, message: 'Line item not found' };
    }

    if (lineItem.cart.session_id !== sessionId && lineItem.cart.user_id !== userId) {
      throw { statusCode: 403, message: 'Not authorized' };
    }

    if (quantity <= 0) {
      await prisma.cartLineItem.delete({
        where: { id: lineItemId }
      });
      return null;
    }

    return await prisma.cartLineItem.update({
      where: { id: lineItemId },
      data: { quantity },
      include: {
        product: true,
        selected_option_values: {
          include: { 
            option_value: {
              include: { option: true }
            } 
          }
        },
        upload: true,
      }
    });
  }
};
