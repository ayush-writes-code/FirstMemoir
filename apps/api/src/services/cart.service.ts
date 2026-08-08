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

    // Phase 6C: Validation and Recalculation
    const sizeOption = product.options.find(o => o.name === 'Size');
    let physicalWidth = 0;
    let physicalHeight = 0;
    if (sizeOption) {
      const sizeValue = sizeOption.values.find(v => input.selected_option_value_ids.includes(v.id));
      if (sizeValue) {
        if (sizeValue.metadata) {
          physicalWidth = Number((sizeValue.metadata as any).width || 0);
          physicalHeight = Number((sizeValue.metadata as any).height || 0);
        }

        // Fallback: parse from value string e.g. "8x10"
        if (physicalWidth === 0 || physicalHeight === 0) {
          const match = sizeValue.value.match(/^(\d+)\s*x\s*(\d+)$/i);
          if (match) {
            physicalWidth = Number(match[1]);
            physicalHeight = Number(match[2]);
          }
        }
      }
    }

    if (physicalWidth > 0 && physicalHeight > 0) {
      // 1. Orientation checks
      if (physicalWidth === physicalHeight && input.orientation !== 'SQUARE') {
        throw { statusCode: 400, message: "Square size requires SQUARE orientation" };
      }
      if (physicalWidth !== physicalHeight && input.orientation === 'SQUARE') {
        throw { statusCode: 400, message: "Non-square size cannot use SQUARE orientation" };
      }

      // 2. DPI Recalculation and Enforcement
      const canonical_W = upload.width || 0;
      const canonical_H = upload.height || 0;

      if (canonical_W > 0 && canonical_H > 0) {
        const canonical_crop_width_px = input.crop.width * canonical_W;
        const canonical_crop_height_px = input.crop.height * canonical_H;

        let final_pixel_width = canonical_crop_width_px;
        let final_pixel_height = canonical_crop_height_px;

        if (input.rotation === 90 || input.rotation === 270) {
            final_pixel_width = canonical_crop_height_px;
            final_pixel_height = canonical_crop_width_px;
        }

        let printWidthInches = physicalWidth;
        let printHeightInches = physicalHeight;

        if (input.orientation === 'LANDSCAPE' && physicalWidth < physicalHeight) {
           printWidthInches = physicalHeight;
           printHeightInches = physicalWidth;
        } else if (input.orientation === 'PORTRAIT' && physicalWidth > physicalHeight) {
           printWidthInches = physicalHeight;
           printHeightInches = physicalWidth;
        }

        const expectedAspectRatio = `${printWidthInches}:${printHeightInches}`;
        if (input.crop.aspect_ratio !== expectedAspectRatio) {
           throw { statusCode: 400, message: `Crop aspect ratio validation failed. Expected ${expectedAspectRatio}, got ${input.crop.aspect_ratio}` };
        }

        const dpi_x = final_pixel_width / printWidthInches;
        const dpi_y = final_pixel_height / printHeightInches;
        const calculated_dpi = Math.floor(Math.min(dpi_x, dpi_y));

        if (Math.abs(calculated_dpi - input.effective_dpi) > 5) {
           throw { statusCode: 400, message: `DPI validation failed. Backend calculated ${calculated_dpi}, payload claimed ${input.effective_dpi}` };
        }

        // Let's also validate the print_quality_status
        let expectedTier = 'NOT_RECOMMENDED';
        if (calculated_dpi >= 250) expectedTier = 'EXCELLENT';
        else if (calculated_dpi >= 150) expectedTier = 'GOOD';
        else if (calculated_dpi >= 100) expectedTier = 'ACCEPTABLE';
        else if (calculated_dpi >= 70) expectedTier = 'LOW_QUALITY';

        if (input.print_quality_status !== expectedTier) {
           throw { statusCode: 400, message: `Quality tier validation failed. Expected ${expectedTier}, got ${input.print_quality_status}` };
        }

        // 3. DPI Acknowledgment Enforcement
        if (expectedTier === 'LOW_QUALITY' || expectedTier === 'NOT_RECOMMENDED') {
           if (input.dpi_acknowledged !== true) {
             throw { statusCode: 400, message: `Explicit acknowledgment is required for ${expectedTier} print quality.` };
           }
        }
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
        orientation: input.orientation,
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
