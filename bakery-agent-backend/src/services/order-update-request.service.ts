import { OrderUpdateRequestRepository } from '../repositories/order-update-request.repository';
import { OrderUpdateRequest, OrderUpdateRequestCreate, UpdateRequestStatus, RejectionReason } from '../types/order-update-request';

export class OrderUpdateRequestService {
  private repository: OrderUpdateRequestRepository;

  constructor(repository?: OrderUpdateRequestRepository) {
    this.repository = repository || new OrderUpdateRequestRepository();
  }

  /**
   * Get all update requests
   */
  async getAllRequests(): Promise<OrderUpdateRequest[]> {
    return this.repository.findAll();
  }

  /**
   * Get update request by ID
   */
  async getRequestById(requestId: string): Promise<OrderUpdateRequest | null> {
    return this.repository.findById(requestId);
  }

  /**
   * Get update requests by order ID
   */
  async getRequestsByOrderId(orderId: string): Promise<OrderUpdateRequest[]> {
    return this.repository.findByOrderId(orderId);
  }

  /**
   * Get update requests by salesman ID
   */
  async getRequestsBySalesmanId(salesmanId: string): Promise<OrderUpdateRequest[]> {
    return this.repository.findBySalesmanId(salesmanId);
  }

  /**
   * Get pending update requests
   */
  async getPendingRequests(): Promise<OrderUpdateRequest[]> {
    return this.repository.findPending();
  }

  /**
   * Create a new update request
   */
  async createRequest(request: OrderUpdateRequestCreate): Promise<OrderUpdateRequest> {
    if (!request.order_id || !request.salesman_id) {
      throw new Error('Order ID and salesman ID are required');
    }

    if (!request.requested_changes || request.requested_changes.length === 0) {
      throw new Error('At least one requested change is required');
    }

    // Validate requested changes
    for (const change of request.requested_changes) {
      if (!change.item_id || !change.item_name) {
        throw new Error('Each change must have item_id and item_name');
      }
      if (change.delta === 0) {
        throw new Error('Delta cannot be zero');
      }
    }

    return this.repository.create(request);
  }

  /**
   * Approve update request
   */
  async approveRequest(requestId: string): Promise<OrderUpdateRequest> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new Error('Update request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot approve request with status: ${request.status}`);
    }

    return this.repository.update(requestId, {
      status: 'approved',
    });
  }

  /**
   * Reject update request
   */
  async rejectRequest(requestId: string, reason: RejectionReason): Promise<OrderUpdateRequest> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new Error('Update request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot reject request with status: ${request.status}`);
    }

    return this.repository.update(requestId, {
      status: 'rejected',
      rejection_reason: reason,
    });
  }

  /**
   * Update request status
   */
  async updateRequestStatus(requestId: string, status: UpdateRequestStatus, rejectionReason?: RejectionReason): Promise<OrderUpdateRequest> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new Error('Update request not found');
    }

    const updates: any = { status };
    if (status === 'rejected' && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }

    return this.repository.update(requestId, updates);
  }
}
