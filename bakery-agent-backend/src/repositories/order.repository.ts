import { supabase } from '../config/supabase';
import { Order, OrderCreate, OrderUpdate, OrderStatus } from '../types/order';

export class OrderRepository {
  /**
   * Get all orders
   */
  async findAll(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get orders by salesman ID
   */
  async findBySalesmanId(salesmanId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('salesman_id', salesmanId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders by salesman: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get order by ID
   */
  async findById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return data;
  }

  /**
   * Get orders by status
   */
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders by status: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new order
   */
  async create(order: OrderCreate & { total_amount?: number }): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        salesman_id: order.salesman_id,
        status: order.status || 'pending',
        total_amount: order.total_amount || 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return data;
  }

  /**
   * Update order
   */
  async update(orderId: string, updates: OrderUpdate & { total_amount?: number }): Promise<Order> {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.total_amount !== undefined) {
      updateData.total_amount = updates.total_amount;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return data;
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return this.update(orderId, { status });
  }

  /**
   * Delete order
   */
  async delete(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('order_id', orderId);

    if (error) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }
}
