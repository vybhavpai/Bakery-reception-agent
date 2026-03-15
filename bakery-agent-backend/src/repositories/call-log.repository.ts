import { supabase } from '../config/supabase';
import { CallLog, CallLogCreate, CallLogUpdate, CallLogOrder } from '../types/call-log';

export class CallLogRepository {
  /**
   * Get all call logs
   */
  async findAll(): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch call logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get call log by ID
   */
  async findById(callLogId: string): Promise<CallLog | null> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('call_log_id', callLogId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch call log: ${error.message}`);
    }

    return data;
  }

  /**
   * Get call log by Bolna call ID
   */
  async findByBolnaCallId(bolnaCallId: string): Promise<CallLog | null> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('bolna_call_id', bolnaCallId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch call log by Bolna ID: ${error.message}`);
    }

    return data;
  }

  /**
   * Get call logs by salesman ID
   */
  async findBySalesmanId(salesmanId: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('salesman_id', salesmanId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch call logs by salesman: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get call logs for an order (via join table)
   */
  async findByOrderId(orderId: string): Promise<CallLog[]> {
    // First get call_log_ids for this order
    const { data: links, error: linkError } = await supabase
      .from('call_log_orders')
      .select('call_log_id')
      .eq('order_id', orderId);

    if (linkError) {
      throw new Error(`Failed to fetch call log links: ${linkError.message}`);
    }

    if (!links || links.length === 0) {
      return [];
    }

    // Then fetch the actual call logs
    const callLogIds = links.map(link => link.call_log_id);
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .in('call_log_id', callLogIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch call logs for order: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new call log
   */
  async create(callLog: CallLogCreate): Promise<CallLog> {
    const { data, error } = await supabase
      .from('call_logs')
      .insert(callLog)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create call log: ${error.message}`);
    }

    return data;
  }

  /**
   * Update call log
   */
  async update(callLogId: string, updates: CallLogUpdate): Promise<CallLog> {
    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('call_log_id', callLogId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update call log: ${error.message}`);
    }

    return data;
  }

  /**
   * Link call log to order
   */
  async linkToOrder(callLogId: string, orderId: string): Promise<void> {
    const { error } = await supabase
      .from('call_log_orders')
      .insert({
        call_log_id: callLogId,
        order_id: orderId,
      });

    if (error) {
      throw new Error(`Failed to link call log to order: ${error.message}`);
    }
  }

  /**
   * Link call log to multiple orders
   */
  async linkToOrders(callLogId: string, orderIds: string[]): Promise<void> {
    const links: CallLogOrder[] = orderIds.map(orderId => ({
      call_log_id: callLogId,
      order_id: orderId,
    }));

    const { error } = await supabase
      .from('call_log_orders')
      .insert(links);

    if (error) {
      throw new Error(`Failed to link call log to orders: ${error.message}`);
    }
  }

  /**
   * Delete call log
   */
  async delete(callLogId: string): Promise<void> {
    const { error } = await supabase
      .from('call_logs')
      .delete()
      .eq('call_log_id', callLogId);

    if (error) {
      throw new Error(`Failed to delete call log: ${error.message}`);
    }
  }
}
