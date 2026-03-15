export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';

export interface Order {
  order_id: string;
  salesman_id: string;
  status: OrderStatus;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderCreate {
  salesman_id: string;
  // status?: OrderStatus;
  // total_amount will be calculated from order items
}

export interface OrderUpdate {
  status?: OrderStatus;
  // total_amount will be recalculated from order items
}
