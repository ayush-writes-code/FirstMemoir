import { prisma, Prisma } from '@repo/database';

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
  }
}

export const shiprocketService = {
  token: null as string | null,
  tokenExpiresAt: null as Date | null,
  
  async authenticate(): Promise<string> {
    if (process.env.SHIPROCKET_DRY_RUN === 'true') {
      return 'mock_token';
    }

    if (this.token && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.token;
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      throw new AppError('Shiprocket credentials not configured', 500);
    }

    const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new AppError('Shiprocket authentication failed', 502);
    }

    const data = await response.json();
    if (!data.token) {
      throw new AppError('Malformed Shiprocket authentication response', 502);
    }

    this.token = data.token;
    this.tokenExpiresAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    return this.token as string;
  },

  calculateFulfillmentMetrics(orderItem: any): { length: number; width: number; height: number; weight_kg: number } {
    const customization = orderItem.customization_data as any;
    if (!customization) {
      throw new AppError('Fulfillment data incomplete: Missing customization_data', 400);
    }

    if (customization.packaging) {
      const length = Number(customization.packaging.length);
      const width = Number(customization.packaging.width);
      const height = Number(customization.packaging.height);
      const weight_kg = Number(customization.packaging.weight);

      if (
        !isNaN(length) && length > 0 &&
        !isNaN(width) && width > 0 &&
        !isNaN(height) && height > 0 &&
        !isNaN(weight_kg) && weight_kg > 0
      ) {
        return { length, width, height, weight_kg };
      }
      throw new AppError('Fulfillment data incomplete: Invalid packaging metrics in snapshot', 400);
    }


    const pWidth = Number(customization.physical_width);
    const pHeight = Number(customization.physical_height);
    
    if (isNaN(pWidth) || pWidth <= 0 || isNaN(pHeight) || pHeight <= 0) {
      throw new AppError('Fulfillment data incomplete: Invalid physical dimensions', 400);
    }

    // A business rule is required to convert final product physical dimensions into courier package dimensions.
    throw new AppError('PACKAGE_FULFILLMENT_METRICS_UNDEFINED', 500);
  },


  async assignAwb(shipmentId: string, token: string): Promise<string> {
    if (process.env.SHIPROCKET_DRY_RUN === 'true') {
      return `MOCK-AWB-${shipmentId.replace('mock_ship_', '')}`;
    }

    const response = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ shipment_id: shipmentId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(`Shiprocket AWB assignment failure: ${errorData.message || response.statusText}`, 502);
    }

    const data = await response.json();
    const awbCode = data?.response?.data?.awb_code;
    
    if (!awbCode) {
      throw new AppError('Malformed Shiprocket AWB response', 502);
    }
    return String(awbCode);
  },

  async recoverExistingShipment(orderId: string, token: string): Promise<{ shiprocketOrderId: string; shipmentId: string }> {
    if (process.env.SHIPROCKET_DRY_RUN === 'true') {
      return {
        shiprocketOrderId: `mock_ord_${orderId}`,
        shipmentId: `mock_ship_${orderId}`
      };
    }

    const response = await fetch(`https://apiv2.shiprocket.in/v1/external/orders/show?channel_order_id=${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new AppError('Shiprocket duplicate order recovery failed', 502);
    }

    const data = await response.json();
    const result = data?.data?.[0] || data?.data; // Depending on API response shape

    if (!result || !result.id || !result.shipments?.[0]?.id) {
      throw new AppError('Failed to extract order identifiers from recovery endpoint', 502);
    }

    return {
      shiprocketOrderId: String(result.id),
      shipmentId: String(result.shipments[0].id)
    };
  },

  async createCustomOrder(orderId: string): Promise<{ shiprocketOrderId: string; shipmentId: string; awbCode: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true }
        },
        user: true,
      }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const token = await this.authenticate();

    // Idempotency check Phase 1: Already fully processed
    if (order.shiprocket_order_id && order.shiprocket_shipment_id && order.tracking_awb) {
      return {
        shiprocketOrderId: order.shiprocket_order_id,
        shipmentId: order.shiprocket_shipment_id,
        awbCode: order.tracking_awb,
      };
    }

    // Idempotency check Phase 2: Shipment created, but AWB assignment failed/missing
    if (order.shiprocket_order_id && order.shiprocket_shipment_id && !order.tracking_awb) {
      const awbCode = await this.assignAwb(order.shiprocket_shipment_id, token);
      return {
        shiprocketOrderId: order.shiprocket_order_id,
        shipmentId: order.shiprocket_shipment_id,
        awbCode
      };
    }

    const address = order.shipping_address_snapshot as any;
    if (!address || !address.name || !address.line1 || !address.city || !address.state || !address.postal_code) {
      throw new AppError('Fulfillment data incomplete: Missing shipping address', 400);
    }

    let totalWeight = 0;
    let maxLength = 0;
    let maxBreadth = 0;
    let totalHeight = 0;

    const orderItems = order.items.map(item => {
      if (!item.product.sku) {
        throw new AppError('Fulfillment data incomplete: Missing product SKU', 400);
      }

      const metrics = this.calculateFulfillmentMetrics(item);
      totalWeight += metrics.weight_kg * item.quantity;
      totalHeight += metrics.height * item.quantity;
      maxLength = Math.max(maxLength, metrics.length);
      maxBreadth = Math.max(maxBreadth, metrics.width);

      return {
        name: item.product.name,
        sku: item.product.sku,
        units: item.quantity,
        selling_price: Number(item.unit_price),
        discount: 0,
        tax: 0
      };
    });

    const billingEmail = order.customer_email || (order.user as any)?.email;
    if (!billingEmail) {
      throw new AppError('Fulfillment data incomplete: Missing customer email', 400);
    }

    const billingPhone = order.customer_phone || (order.user as any)?.phone_number || address.phone;
    if (!billingPhone) {
      throw new AppError('Fulfillment data incomplete: Missing customer phone', 400);
    }

    const payload = {
      order_id: order.id,
      order_date: order.created_at.toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: address.name,
      billing_last_name: "", // Usually acceptable to pass empty string
      billing_address: address.line1,
      billing_address_2: address.line2 || "",
      billing_city: address.city,
      billing_pincode: address.postal_code,
      billing_state: address.state,
      billing_country: address.country || "India",
      billing_email: billingEmail,
      billing_phone: billingPhone,
      shipping_is_billing: true, // Data model implies identical addresses
      order_items: orderItems,
      payment_method: "Prepaid",
      sub_total: Number(order.total_amount),
      length: Math.ceil(maxLength),
      breadth: Math.ceil(maxBreadth),
      height: Math.ceil(totalHeight),
      weight: totalWeight
    };

    let shiprocketOrderId: string;
    let shipmentId: string;

    if (process.env.SHIPROCKET_DRY_RUN === 'true') {
      shiprocketOrderId = `mock_ord_${order.id}`;
      shipmentId = `mock_ship_${order.id}`;
    } else {
      const response = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        
        // Idempotency check Phase 3: DB write failed previously, but Shiprocket already has the order
        if (response.status === 400 && errorMessage.toLowerCase().includes('already exists')) {
          const recovered = await this.recoverExistingShipment(order.id, token);
          shiprocketOrderId = recovered.shiprocketOrderId;
          shipmentId = recovered.shipmentId;
        } else {
          throw new AppError(`Shiprocket API failure: ${errorMessage}`, 502);
        }
      } else {
        const data = await response.json();
        if (!data || !data.order_id || !data.shipment_id) {
          throw new AppError('Malformed Shiprocket order creation response', 502);
        }
        shiprocketOrderId = String(data.order_id);
        shipmentId = String(data.shipment_id);
      }
    }

    // Explicit AWB Generation step
    const awbCode = await this.assignAwb(shipmentId, token);

    return {
      shiprocketOrderId,
      shipmentId,
      awbCode
    };
  }
};
