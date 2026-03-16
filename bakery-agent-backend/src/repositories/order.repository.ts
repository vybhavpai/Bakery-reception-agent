import { supabase } from '../config/supabase';
import { Order, OrderCreate, OrderUpdate, OrderStatus } from '../types/order';

export class OrderRepository {
  validSortColumns: string[] = ['total_amount', 'created_at', 'updated_at'];
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
   * Find orders with filtering, sorting, and pagination
   * @param options Filtering, sorting, and pagination options
   */
  async findWithFilters(options: {
    salesmanIds?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    count?: number;
  }): Promise<{ data: Order[]; total: number; page: number; count: number }> {
    const {
      salesmanIds,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      count = 20,
    } = options;

    // Validate sortBy matches schema columns
    if (!this.validSortColumns.includes(sortBy)) {
      throw new Error(`Invalid sort column: ${sortBy}. Valid columns are: ${this.validSortColumns.join(', ')}`);
    }

    // Build query with join to salesmen table to get salesman_name
    let query = supabase
      .from('orders')
      .select('*, salesmen(name)', { count: 'exact' });

    // Apply salesman filter
    if (salesmanIds && salesmanIds.length > 0) {
      query = query.in('salesman_id', salesmanIds);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * count;
    const to = from + count - 1;
    query = query.range(from, to);

    const { data, error, count: totalCount } = await query;

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    // Transform data to flatten salesman name
    const transformedData = (data || []).map((order: any) => ({
      ...order,
      salesman_name: order.salesmen?.name || null,
      salesmen: undefined, // Remove nested salesmen object
    }));

    return {
      data: transformedData,
      total: totalCount || 0,
      page,
      count: transformedData.length,
    };
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
  async create(order: OrderCreate & { total_amount?: number; status?: OrderStatus }): Promise<Order> {
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
