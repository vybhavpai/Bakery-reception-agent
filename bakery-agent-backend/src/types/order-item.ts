export interface OrderItem {
  order_item_id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number; // Snapshot of price at time of order (from inventory)
  line_total: number;
  created_at?: string;
}

export interface OrderItemCreate {
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  // unit_price and line_total will be calculated from inventory
}

export interface OrderItemUpdate {
  quantity?: number;
  // unit_price and line_total will be recalculated if quantity changes
}
