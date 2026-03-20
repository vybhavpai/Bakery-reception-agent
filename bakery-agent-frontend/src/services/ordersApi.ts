import fetchAPI from './api';

export interface Order {
  order_id: string;
  salesman_id: string;
  salesman_name?: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    count: number;
    total: number;
    total_pages: number;
  };
}

export async function getOrders(params?: {
  salesman_id?: string;
  page?: number;
  count?: number;
}): Promise<OrdersResponse> {
  const queryParams = new URLSearchParams();
  if (params?.salesman_id) queryParams.append('salesman_id', params.salesman_id);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.count) queryParams.append('count', params.count.toString());

  const query = queryParams.toString();
  return fetchAPI(`/api/orders${query ? `?${query}` : ''}`);
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order> {
  return fetchAPI(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface OrderItem {
  item_id: string;
  item_name: string;
  quantity: number;
  units: string;
}

export interface OrderDetails {
  order_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';
  updated_at: string;
  items: OrderItem[];
}

export interface OrderItemFull {
  order_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface OrderDetailsFull {
  order_id: string;
  salesman_name: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItemFull[];
}

export async function getOrderDetails(orderId: string): Promise<OrderDetails> {
  return fetchAPI(`/api/orders/${orderId}`);
}

export async function getOrderDetailsFull(orderId: string): Promise<OrderDetailsFull> {
  return fetchAPI(`/api/orders/details?order_id=${encodeURIComponent(orderId)}`);
}
