import { prisma, Prisma } from '@repo/database';
import { pricingService } from './pricing.service.js';
import { razorpayService } from './razorpay.service.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CheckoutAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface InitializeCheckoutInput {
  customer_email?: string;
  customer_phone?: string;
  shipping_address: CheckoutAddress;
}

/** Fields that can come from a ProductOptionValue's metadata for physical dimensions */
interface PhysicalDimensions {
  width: number;
  height: number;
  unit: string; // e.g. "in" or "mm"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves physical print dimensions from the selected Size option value.
 * Priority: metadata.width/height → parse from "WxH" value string.
 * Returns null if dimensions cannot be determined.
 */
function resolvePhysicalDimensions(
  productOptions: any[],
  selectedOptionValueIds: string[]
): PhysicalDimensions | null {
  const sizeOption = productOptions.find((o: any) => o.name === 'Size');
  if (!sizeOption) return null;

  const sizeValue = sizeOption.values.find((v: any) =>
    selectedOptionValueIds.includes(v.id)
  );
  if (!sizeValue) return null;

  const meta = sizeValue.metadata as any;
  if (meta?.width && meta?.height) {
    return {
      width: Number(meta.width),
      height: Number(meta.height),
      unit: meta.unit || 'in',
    };
  }

  // Fallback: parse "8x10" or "8 x 10" format
  const match = String(sizeValue.value).match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/i);
  if (match) {
    return {
      width: Number(match[1]),
      height: Number(match[2]),
      unit: 'in',
    };
  }

  return null;
}

// ─── Cart validation helper ───────────────────────────────────────────────────

/**
 * Checks whether a cart is in the same state as an existing Order's items.
 * Used to determine whether to REUSE vs EXPIRE an existing PENDING checkout.
 */
async function isCartStateIdenticalToOrder(
  tx: any,
  cartItems: any[],
  orderId: string
): Promise<boolean> {
  const orderItems = await tx.orderItem.findMany({
    where: { order_id: orderId },
  });

  if (cartItems.length !== orderItems.length) return false;

  // For each cart item, verify a corresponding order item exists with matching
  // upload_id and selected option value IDs embedded in the snapshot
  for (const cartItem of cartItems) {
    const cartOptionIds: string[] = cartItem.selected_option_values.map(
      (sov: any) => sov.product_option_value_id
    );
    const match = orderItems.find((oi: any) => {
      const snap = oi.customization_data as any;
      if (!snap) return false;
      const snapOptionIds: string[] = (snap.selected_product_options ?? []).map(
        (so: any) => so.option_value_id
      );
      return (
        oi.upload_id === cartItem.upload_id &&
        cartItem.quantity === oi.quantity &&
        cartOptionIds.length === snapOptionIds.length &&
        cartOptionIds.every((id: string) => snapOptionIds.includes(id))
      );
    });
    if (!match) return false;
  }

  return true;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const checkoutService = {
  /**
   * Initialise a checkout for the cart associated with the given session.
   *
   * Transaction boundary:
   *   1. Validate cart (non-empty, no stale items, ownership).
   *   2. Recalculate authoritative prices via pricingService.
   *   3. Validate DPI acknowledgment from authoritative CartLineItem state.
   *   4. Resolve master_file_key from UserUpload (server-side only).
   *   5. Idempotency: reuse PENDING order if state is identical, otherwise
   *      EXPIRE the old one.
   *   6. Create immutable Order + OrderItem snapshots.
   *   7. Transition all referenced uploads CART_ATTACHED → CHECKOUT_LOCKED.
   *   8. Transition Cart ACTIVE → CHECKOUT_STARTED.
   *   9. Commit the transaction.
   *  10. OUTSIDE the transaction: call Razorpay, persist razorpay_order_id.
   *  11. On Razorpay failure: EXPIRE the local order, return cart to ACTIVE.
   */
  async initializeCheckout(
    sessionId: string,
    userId: string | undefined,
    input: InitializeCheckoutInput
  ): Promise<{ orderId: string; razorpayOrderId: string; amount: number; currency: string }> {
    // ── 1. Load the cart ─────────────────────────────────────────────────────
    const cart = await prisma.cart.findUnique({
      where: { session_id: sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                options: { include: { values: true } }
              }
            },
            selected_option_values: {
              include: {
                option_value: { include: { option: true } }
              }
            },
            upload: true, // Full upload record needed server-side for master_file_key
          }
        }
      }
    });

    if (!cart) {
      throw { statusCode: 400, message: 'Cart not found. Start a session first.' };
    }

    // Ownership check
    if (cart.session_id !== sessionId && cart.user_id !== userId) {
      throw { statusCode: 403, message: 'Not authorized to checkout this cart.' };
    }

    // Non-empty check
    if (cart.items.length === 0) {
      throw { statusCode: 400, message: 'Cannot checkout an empty cart.' };
    }

    // Stale check — any item with status STALE blocks checkout
    const staleItems = cart.items.filter((item: any) => item.status === 'STALE');
    if (staleItems.length > 0) {
      throw {
        statusCode: 409,
        message: `Cart contains ${staleItems.length} stale item(s). Resolve stale items before checkout.`,
        stale_item_ids: staleItems.map((i: any) => i.id),
      };
    }

    // Guest identity validation (must exist before any DB writes)
    if (!userId) {
      if (!input.customer_email) {
        throw { statusCode: 400, message: 'customer_email is required for guest checkout.' };
      }
      if (!input.customer_phone) {
        throw { statusCode: 400, message: 'customer_phone is required for guest checkout.' };
      }
    }

    // Shipping address validation
    if (!input.shipping_address?.line1 || !input.shipping_address?.city ||
        !input.shipping_address?.state || !input.shipping_address?.postal_code ||
        !input.shipping_address?.country) {
      throw { statusCode: 400, message: 'Incomplete shipping address.' };
    }

    // ── 2. Validate items & recalculate authoritative prices ─────────────────
    let orderSubtotalDecimal = new Prisma.Decimal(0);

    interface LineItemData {
      cartItem: any;
      pricing: Awaited<ReturnType<typeof pricingService.calculatePrice>>;
      physicalDimensions: PhysicalDimensions;
      masterFileKey: string;
      selectedOptionValueIds: string[];
    }

    const lineItemData: LineItemData[] = [];

    for (const cartItem of cart.items) {
      const selectedOptionValueIds: string[] = cartItem.selected_option_values.map(
        (sov: any) => sov.product_option_value_id
      );

      // DPI acknowledgment validation from authoritative CartLineItem state
      // (ignore any value supplied in the request payload)
      const authoritativeQuality = cartItem.print_quality_status;
      if (
        (authoritativeQuality === 'LOW_QUALITY' || authoritativeQuality === 'NOT_RECOMMENDED') &&
        !cartItem.dpi_acknowledged
      ) {
        throw {
          statusCode: 400,
          message: `Item "${cartItem.product.name}" has print quality "${authoritativeQuality}" but was not acknowledged by the customer. Resolve before checkout.`,
        };
      }

      // Authoritative price recalculation via pricingService
      const pricing = await pricingService.calculatePrice(
        cartItem.product_id,
        selectedOptionValueIds
      );

      orderSubtotalDecimal = orderSubtotalDecimal.add(
        new Prisma.Decimal(pricing.finalPrice).mul(new Prisma.Decimal(cartItem.quantity))
      );

      // Resolve physical dimensions from product option metadata
      const physicalDimensions = resolvePhysicalDimensions(
        cartItem.product.options,
        selectedOptionValueIds
      );
      if (!physicalDimensions) {
        throw {
          statusCode: 400,
          message: `Cannot determine physical print dimensions for item "${cartItem.product.name}". Ensure a Size option is selected.`,
        };
      }

      // Resolve master_file_key server-side from the UserUpload record
      // NEVER expose this to the browser — it is only used in the DB snapshot
      const masterFileKey = cartItem.upload?.r2_key;
      if (!masterFileKey) {
        throw {
          statusCode: 400,
          message: `Upload asset is missing for cart item "${cartItem.product.name}".`,
        };
      }

      lineItemData.push({
        cartItem,
        pricing,
        physicalDimensions,
        masterFileKey,
        selectedOptionValueIds,
      });
    }

    const orderSubtotal = orderSubtotalDecimal.toNumber();
    const shippingFee = 0; // Phase 6E: Shiprocket integration
    const taxAmount = 0;   // Phase 6F: GST integration
    const discountAmount = 0;
    const totalAmount = orderSubtotal + shippingFee + taxAmount - discountAmount;

    // ── 2b. Idempotency Check: Reuse existing PENDING order if cart is identical and Razorpay order is valid & unpaid ──
    const existingPendingOrder = await prisma.order.findFirst({
      where: { cart_id: cart.id, status: 'PENDING' },
      include: { items: true }
    });

    if (existingPendingOrder) {
      const isIdentical = await isCartStateIdenticalToOrder(
        prisma,
        cart.items,
        existingPendingOrder.id
      );

      if (isIdentical && existingPendingOrder.razorpay_order_id) {
        // Fetch Razorpay order status to verify it's still unpaid and valid
        const rzpOrder = await razorpayService.fetchOrder(existingPendingOrder.razorpay_order_id);
        const isReusable = rzpOrder && rzpOrder.status === 'created' && (rzpOrder.attempts ?? 0) === 0;

        if (rzpOrder && (rzpOrder.status === 'paid')) {
          throw { statusCode: 409, message: 'Payment already received for this cart. We are confirming your order. Please check your account shortly.' };
        }

        if (isReusable) {
          // Reusable: return existing order without creating a new one
          return {
            orderId: existingPendingOrder.id,
            razorpayOrderId: existingPendingOrder.razorpay_order_id,
            amount: Math.round(existingPendingOrder.total_amount.toNumber() * 100),
            currency: 'INR'
          };
        }

        // Razorpay order is attempted, expired, or fetch failed:
        // Mark the stale local order as EXPIRED
        await prisma.order.update({
          where: { id: existingPendingOrder.id },
          data: { status: 'EXPIRED' }
        });
      } else {
        // Cart changed or missing razorpay_order_id: expire old PENDING order
        await prisma.order.update({
          where: { id: existingPendingOrder.id },
          data: { status: 'EXPIRED' }
        });
      }
    }

    // ── 3. Transaction: order creation + retention lock ─────────
    const order = await prisma.$transaction(async (tx) => {
      // Ensure any lingering PENDING orders for this cart are expired before creating replacement
      await tx.order.updateMany({
        where: { cart_id: cart.id, status: 'PENDING' },
        data: { status: 'EXPIRED' }
      });

      // Build the immutable manufacturing snapshot for each line item
      const orderItemsCreate = lineItemData.map(({ cartItem, pricing, physicalDimensions, masterFileKey, selectedOptionValueIds }) => {
        const customizationData = {
          schema_version: '1.0',
          // master_file_key is ONLY stored in the DB, never sent to the browser
          master_file_key: masterFileKey,
          // canonical pixel dimensions of the source image
          canonical_dimensions: {
            width: cartItem.upload?.width ?? 0,
            height: cartItem.upload?.height ?? 0,
          },
          // explicit physical print target — immutable against future option renames
          physical_width: physicalDimensions.width,
          physical_height: physicalDimensions.height,
          physical_dimension_unit: physicalDimensions.unit,
          orientation: cartItem.orientation,
          rotation: cartItem.rotation,
          crop: {
            x: cartItem.crop_x,
            y: cartItem.crop_y,
            width: cartItem.crop_width,
            height: cartItem.crop_height,
          },
          crop_aspect_ratio: cartItem.crop_aspect_ratio,
          effective_dpi: cartItem.effective_dpi,
          print_quality_status: cartItem.print_quality_status,
          // Copied from authoritative CartLineItem state — NOT from request payload
          dpi_acknowledged: cartItem.dpi_acknowledged,
          manufacturing_profile_version: '1.0',
          // Immutable pricing snapshot
          unit_price: pricing.finalPrice,
          base_price: pricing.basePrice,
          selected_product_options: pricing.modifiers.map((mod, idx) => ({
            option_value_id: selectedOptionValueIds[idx] ?? '',
            option_name: mod.optionName,
            value_name: mod.value,
            price_modifier: mod.amount,
            modifier_type: mod.type,
          })),
        };

        return {
          product_id: cartItem.product_id,
          upload_id: cartItem.upload_id,
          quantity: cartItem.quantity,
          unit_price: new Prisma.Decimal(pricing.finalPrice),
          customization_data: customizationData,
        };
      });

      // Create the Order with guest identity pre-persisted (satisfies DB CHECK constraint)
      const newOrder = await tx.order.create({
        data: {
          cart_id: cart.id,
          user_id: userId ?? null,
          session_id: sessionId ?? null,
          status: 'PENDING',
          // Guest identity persisted BEFORE any external Razorpay call
          customer_email: userId ? null : (input.customer_email ?? null),
          customer_phone: userId ? null : (input.customer_phone ?? null),
          shipping_address_snapshot: input.shipping_address as any,
          subtotal_amount: new Prisma.Decimal(orderSubtotal),
          shipping_fee: new Prisma.Decimal(shippingFee),
          tax_amount: new Prisma.Decimal(taxAmount),
          discount_amount: new Prisma.Decimal(discountAmount),
          total_amount: new Prisma.Decimal(totalAmount),
          items: {
            create: orderItemsCreate,
          }
        }
      });

      // Atomic retention lock: CART_ATTACHED → CHECKOUT_LOCKED for all uploads
      // This MUST be in the same transaction as order creation (see architecture invariant)
      const uploadIds = lineItemData.map(d => d.cartItem.upload_id);
      await tx.userUpload.updateMany({
        where: {
          id: { in: uploadIds },
          retention_status: 'CART_ATTACHED',
        },
        data: { retention_status: 'CHECKOUT_LOCKED' }
      });

      // Cart status: ACTIVE → CHECKOUT_STARTED
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CHECKOUT_STARTED' }
      });

      return newOrder;
    });

    // ── 4. OUTSIDE the transaction: Razorpay order creation ─────────────────
    // NOTE: The DB transaction has already committed. We now call Razorpay.
    // If this fails, we expire the local order and return the cart to ACTIVE
    // so the user can retry.

    let razorpayOrderId = order.razorpay_order_id;

    if (!razorpayOrderId) {
      try {
        const rzpOrder = await razorpayService.createOrder(
          order.total_amount.toNumber(),
          order.id
        );
        razorpayOrderId = rzpOrder.id;
        
        const updated = await prisma.order.updateMany({
          where: { id: order.id, status: 'PENDING' },
          data: { razorpay_order_id: razorpayOrderId }
        });
        
        if (updated.count === 0) {
          throw { statusCode: 409, message: 'Checkout was interrupted by a concurrent request. Please try again.' };
        }
      } catch (error: any) {
        if (error.statusCode === 409) throw error;
        // Razorpay creation failed: expire the local order, return cart to ACTIVE,
        // and unlock the uploads back to CART_ATTACHED so they can be reused.
        await prisma.$transaction(async (tx) => {
          await tx.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
          await tx.cart.update({ where: { id: cart.id }, data: { status: 'ACTIVE' } });
          
          const orderItems = await tx.orderItem.findMany({ where: { order_id: order.id } });
          const uploadIds = orderItems.map(item => item.upload_id).filter(Boolean) as string[];
          if (uploadIds.length > 0) {
            await tx.userUpload.updateMany({
              where: { id: { in: uploadIds } },
              data: { retention_status: 'CART_ATTACHED' }
            });
          }
        });
        throw { statusCode: 502, message: 'Payment gateway unavailable. Your cart is safe. Please try again.' };
      }
    }

    return { 
      orderId: order.id, 
      razorpayOrderId,
      amount: Math.round(order.total_amount.toNumber() * 100),
      currency: 'INR'
    };
  },
};
