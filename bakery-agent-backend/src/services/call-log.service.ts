import { CallLogRepository } from '../repositories/call-log.repository';
import { CallLog, CallLogCreate, CallLogUpdate } from '../types/call-log';

export class CallLogService {
  private repository: CallLogRepository;

  constructor(repository?: CallLogRepository) {
    this.repository = repository || new CallLogRepository();
  }

  /**
   * Get all call logs
   */
  async getAllCallLogs(): Promise<CallLog[]> {
    return this.repository.findAll();
  }

  /**
   * Get call log by ID
   */
  async getCallLogById(callLogId: string): Promise<CallLog | null> {
    return this.repository.findById(callLogId);
  }

  /**
   * Get call log by Bolna call ID
   */
  async getCallLogByBolnaCallId(bolnaCallId: string): Promise<CallLog | null> {
    return this.repository.findByBolnaCallId(bolnaCallId);
  }

  /**
   * Get call logs by salesman ID
   */
  async getCallLogsBySalesmanId(salesmanId: string): Promise<CallLog[]> {
    return this.repository.findBySalesmanId(salesmanId);
  }

  /**
   * Get call logs for an order
   */
  async getCallLogsByOrderId(orderId: string): Promise<CallLog[]> {
    return this.repository.findByOrderId(orderId);
  }

  /**
   * Create a new call log
   */
  async createCallLog(callLog: CallLogCreate): Promise<CallLog> {
    if (!callLog.salesman_id || !callLog.bolna_call_id) {
      throw new Error('Salesman ID and Bolna call ID are required');
    }

    // Check if call log with this Bolna call ID already exists
    const existing = await this.repository.findByBolnaCallId(callLog.bolna_call_id);
    if (existing) {
      throw new Error('Call log with this Bolna call ID already exists');
    }

    return this.repository.create(callLog);
  }

  /**
   * Create call log and link to orders
   */
  async createCallLogWithOrders(callLog: CallLogCreate, orderIds: string[]): Promise<CallLog> {
    const createdCallLog = await this.createCallLog(callLog);

    if (orderIds && orderIds.length > 0) {
      await this.repository.linkToOrders(createdCallLog.call_log_id, orderIds);
    }

    return createdCallLog;
  }

  /**
   * Update call log
   */
  async updateCallLog(callLogId: string, updates: CallLogUpdate): Promise<CallLog> {
    const existingCallLog = await this.repository.findById(callLogId);
    if (!existingCallLog) {
      throw new Error('Call log not found');
    }

    return this.repository.update(callLogId, updates);
  }

  /**
   * Link call log to order
   */
  async linkCallLogToOrder(callLogId: string, orderId: string): Promise<void> {
    const existingCallLog = await this.repository.findById(callLogId);
    if (!existingCallLog) {
      throw new Error('Call log not found');
    }

    return this.repository.linkToOrder(callLogId, orderId);
  }

  /**
   * Link call log to multiple orders
   */
  async linkCallLogToOrders(callLogId: string, orderIds: string[]): Promise<void> {
    const existingCallLog = await this.repository.findById(callLogId);
    if (!existingCallLog) {
      throw new Error('Call log not found');
    }

    return this.repository.linkToOrders(callLogId, orderIds);
  }

  /**
   * Delete call log
   */
  async deleteCallLog(callLogId: string): Promise<void> {
    const existingCallLog = await this.repository.findById(callLogId);
    if (!existingCallLog) {
      throw new Error('Call log not found');
    }

    return this.repository.delete(callLogId);
  }
}
