import type { Order, OrderItem, OrderStatusHistory, UserUpload, Product } from '@repo/database';
import type { 
  CustomerOrderSummaryDTO, 
  CustomerOrderDetailDTO, 
  CustomerOrderItemDTO,
  OrderStatusHistoryDTO,
  GuestTrackOrderResponseDTO
} from '@repo/shared';

type FullOrderItem = OrderItem & { 
  product: Pick<Product, 'name'>; 
  upload: Pick<UserUpload, 'preview_r2_key'>;
};

type FullOrder = Order & {
  items: FullOrderItem[];
  status_history: OrderStatusHistory[];
};

export const orderMapper = {
  toStatusHistoryDTO(history: OrderStatusHistory): OrderStatusHistoryDTO {
    return {
      id: history.id,
      previous_status: history.previous_status,
      new_status: history.new_status,
      description: history.description,
      created_at: history.created_at.toISOString(),
    };
  },

  toOrderItemDTO(item: FullOrderItem): CustomerOrderItemDTO {
    return {
      id: item.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      print_asset_url: item.print_asset_url,
      // For preview, construct a proxy URL or just return the key for now.
      // Assuming frontend knows how to build the full URL if given the key, or we give the path.
      // In a real app we might sign a URL here. For now, returning the key or path.
      preview_url: item.upload.preview_r2_key ? `/api/v1/uploads/preview/${item.upload.preview_r2_key}` : '',
      customization_summary: item.customization_data,
    };
  },

  toCustomerOrderSummary(order: Order & { _count: { items: number } }): CustomerOrderSummaryDTO {
    return {
      id: order.id,
      status: order.status,
      total_amount: order.total_amount.toString(),
      created_at: order.created_at.toISOString(),
      item_count: order._count.items,
    };
  },

  toCustomerOrderDetail(order: FullOrder): CustomerOrderDetailDTO {
    return {
      id: order.id,
      status: order.status,
      total_amount: order.total_amount.toString(),
      subtotal_amount: order.subtotal_amount?.toString() || null,
      shipping_fee: order.shipping_fee?.toString() || null,
      tax_amount: order.tax_amount?.toString() || null,
      discount_amount: order.discount_amount?.toString() || null,
      created_at: order.created_at.toISOString(),
      notes: order.notes,
      tracking_awb: order.tracking_awb,
      shipping_address: order.shipping_address_snapshot,
      items: order.items.map(this.toOrderItemDTO),
      status_history: order.status_history.map(this.toStatusHistoryDTO),
    };
  },

  toGuestTrackResponse(order: FullOrder): GuestTrackOrderResponseDTO {
    return {
      id: order.id,
      status: order.status,
      total_amount: order.total_amount.toString(),
      created_at: order.created_at.toISOString(),
      items: order.items.map(item => ({
        product_name: item.product.name,
        quantity: item.quantity,
      })),
      status_history: order.status_history.map(this.toStatusHistoryDTO),
    };
  }
};
