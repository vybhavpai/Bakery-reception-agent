import { supabase } from '../config/supabase';
import { OrderUpdateRequest, OrderUpdateRequestCreate, OrderUpdateRequestUpdate } from '../types/order-update-request';

export class OrderUpdateRequestRepository {
  /**
   * Get all update requests
   */
  async findAll(): Promise<OrderUpdateRequest[]> {
    const { data, error } = await supabase
      .from('order_update_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch update requests: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get update request by ID
   */
  async findById(requestId: string): Promise<OrderUpdateRequest | null> {
    const { data, error } = await supabase
      .from('order_update_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch update request: ${error.message}`);
    }

    return data;
  }

  /**
   * Get update requests by order ID
   */
  async findByOrderId(orderId: string): Promise<OrderUpdateRequest[]> {
    const { data, error } = await supabase
      .from('order_update_requests')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch update requests by order: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get update requests by salesman ID
   */
  async findBySalesmanId(salesmanId: string): Promise<OrderUpdateRequest[]> {
    const { data, error } = await supabase
      .from('order_update_requests')
      .select('*')
      .eq('salesman_id', salesmanId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch update requests by salesman: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get pending update requests
   */
  async findPending(): Promise<OrderUpdateRequest[]> {
    const { data, error } = await supabase
      .from('order_update_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending update requests: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new update request
   */
  async create(request: OrderUpdateRequestCreate): Promise<OrderUpdateRequest> {
    const { data, error } = await supabase
      .from('order_update_requests')
      .insert({
        ...request,
        status: request.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error("error creating order update request:", error);
      throw new Error(`Failed to create update request: ${error.message}`);
    }

    return data;
  }

  /**
   * Update request
   */
  async update(requestId: string, updates: OrderUpdateRequestUpdate): Promise<OrderUpdateRequest> {
    const { data, error } = await supabase
      .from('order_update_requests')
      .update(updates)
      .eq('request_id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update request: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete request
   */
  async delete(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('order_update_requests')
      .delete()
      .eq('request_id', requestId);

    if (error) {
      throw new Error(`Failed to delete update request: ${error.message}`);
    }
  }
}
