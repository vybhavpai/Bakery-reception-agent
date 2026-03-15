import { supabase } from '../config/supabase';
import { OrderItem, OrderItemCreate, OrderItemUpdate } from '../types/order-item';

export class OrderItemRepository {
  /**
   * Get all order items for an order
   */
  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at');

    if (error) {
      throw new Error(`Failed to fetch order items: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get order item by ID
   */
  async findById(orderItemId: string): Promise<OrderItem | null> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_item_id', orderItemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch order item: ${error.message}`);
    }

    return data;
  }

  /**
   * Get order items by item ID (across all orders)
   */
  async findByItemId(itemId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('item_id', itemId);

    if (error) {
      throw new Error(`Failed to fetch order items by item ID: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new order item
   * Accepts OrderItemCreate with calculated unit_price and line_total
   */
  async create(orderItem: OrderItemCreate & { unit_price: number; line_total: number }): Promise<OrderItem> {
    const { data, error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderItem.order_id,
        item_id: orderItem.item_id,
        item_name: orderItem.item_name,
        quantity: orderItem.quantity,
        unit_price: orderItem.unit_price,
        line_total: orderItem.line_total,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order item: ${error.message}`);
    }

    return data;
  }

  /**
   * Create multiple order items
   * Accepts OrderItemCreate[] with calculated unit_price and line_total
   */
  async createMany(orderItems: (OrderItemCreate & { unit_price: number; line_total: number })[]): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems.map(item => ({
        order_id: item.order_id,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      })))
      .select();

    if (error) {
      throw new Error(`Failed to create order items: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update order item
   */
  async update(orderItemId: string, updates: OrderItemUpdate & { line_total?: number }): Promise<OrderItem> {
    const { data, error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('order_item_id', orderItemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order item: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete order item
   */
  async delete(orderItemId: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('order_item_id', orderItemId);

    if (error) {
      throw new Error(`Failed to delete order item: ${error.message}`);
    }
  }

  /**
   * Delete all order items for an order
   */
  async deleteByOrderId(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (error) {
      throw new Error(`Failed to delete order items: ${error.message}`);
    }
  }
}
