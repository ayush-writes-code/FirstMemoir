/**
 * Data Transfer Objects for the Orders Domain
 */

export interface OrderStatusHistoryDTO {
  id: string;
  previous_status: string | null;
  new_status: string;
  description: string | null;
  created_at: string;
}

export interface CustomerOrderSummaryDTO {
  id: string;
  status: string;
  total_amount: string; // Decimal is stringified in JSON
  created_at: string;
  item_count: number;
}

export interface CustomerOrderItemDTO {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  print_asset_url: string | null;
  preview_url: string; // Fallback to upload preview if print_asset is null
  customization_summary: any;
}

export interface CustomerOrderDetailDTO {
  id: string;
  status: string;
  total_amount: string;
  subtotal_amount: string | null;
  shipping_fee: string | null;
  tax_amount: string | null;
  discount_amount: string | null;
  created_at: string;
  notes: string | null;
  tracking_awb: string | null;
  shipping_address: any;
  items: CustomerOrderItemDTO[];
  status_history: OrderStatusHistoryDTO[];
}

export interface GuestTrackOrderInput {
  order_id: string;
  phone_number: string;
}

export interface GuestTrackOrderResponseDTO {
  id: string;
  status: string;
  total_amount: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
  }>;
  status_history: OrderStatusHistoryDTO[];
}
