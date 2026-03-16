import { OrderUpdateRequestRepository } from '../repositories/order-update-request.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryService } from './inventory.service';
import { OrderService } from './order.service';
import { OrderUpdateRequest, OrderUpdateRequestCreate, UpdateRequestStatus, RejectionReason, RequestedChange } from '../types/order-update-request';

export class OrderUpdateRequestService {
  private repository: OrderUpdateRequestRepository;
  private orderItemRepository: OrderItemRepository;
  private inventoryRepository: InventoryRepository;
  private inventoryService: InventoryService;
  private orderService: OrderService;

  constructor(
    repository?: OrderUpdateRequestRepository,
    orderItemRepository?: OrderItemRepository,
    inventoryRepository?: InventoryRepository,
    inventoryService?: InventoryService,
    orderService?: OrderService
  ) {
    this.repository = repository || new OrderUpdateRequestRepository();
    this.orderItemRepository = orderItemRepository || new OrderItemRepository();
    this.inventoryRepository = inventoryRepository || new InventoryRepository();
    this.inventoryService = inventoryService || new InventoryService();
    this.orderService = orderService || new OrderService();
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
   * Re-checks inventory for addition deltas (positive deltas)
   * If sufficient: apply delta to order_items, adjust inventory, mark approved
   * If insufficient: mark rejected with inventory_insufficient
   */
  async approveRequest(requestId: string): Promise<OrderUpdateRequest> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new Error('Update request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot approve request with status: ${request.status}`);
    }

    // Get the order to verify it exists
    const order = await this.orderService.getOrderById(request.order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Get current order items
    const currentOrderItems = await this.orderItemRepository.findByOrderId(request.order_id);
    const orderItemsMap = new Map(currentOrderItems.map(item => [item.item_id, item]));

    // Separate positive deltas (additions) and negative deltas (removals)
    const additions: RequestedChange[] = [];
    const removals: RequestedChange[] = [];
    
    for (const change of request.requested_changes) {
      if (change.delta > 0) {
        additions.push(change);
      } else if (change.delta < 0) {
        removals.push(change);
      }
    }

    // Get all inventory items we need (for both additions and removals)
    const allItemIds = [...new Set([...additions.map(c => c.item_id), ...removals.map(c => c.item_id)])];
    let allInventoryMap = new Map();
    
    if (allItemIds.length > 0) {
      const allInventoryItems = await this.inventoryRepository.findByMultipleIds(allItemIds);
      allInventoryMap = new Map(allInventoryItems.map(item => [item.item_id, item]));
    }

    // Check inventory for additions (positive deltas)
    if (additions.length > 0) {
      const insufficientItems: Array<{ item_id: string; requested: number; available: number }> = [];

      for (const change of additions) {
        const inventoryItem = allInventoryMap.get(change.item_id);
        if (!inventoryItem) {
          throw new Error(`Inventory item not found for item_id: ${change.item_id}`);
        }

        // Check if we have enough stock for the addition
        if (inventoryItem.stock_count < change.delta) {
          insufficientItems.push({
            item_id: change.item_id,
            requested: change.delta,
            available: inventoryItem.stock_count,
          });
        }
      }

      // If insufficient inventory, reject the request
      if (insufficientItems.length > 0) {
        return this.repository.update(requestId, {
          status: 'rejected',
          rejection_reason: 'inventory_insufficient',
        });
      }
    }

    // Apply changes to order items
    const stockUpdates: Array<{ item_id: string; stock_count: number }> = [];

    // Process additions
    for (const change of additions) {
      const existingItem = orderItemsMap.get(change.item_id);
      const inventoryItem = allInventoryMap.get(change.item_id);
      if (!inventoryItem) {
        throw new Error(`Inventory item not found for item_id: ${change.item_id}`);
      }

      if (existingItem) {
        // Update existing order item
        const newQuantity = existingItem.quantity + change.delta;
        const newLineTotal = newQuantity * existingItem.unit_price; // Use snapshot price

        await this.orderItemRepository.update(existingItem.order_item_id, {
          quantity: newQuantity,
          line_total: newLineTotal,
        });

        // Deduct from inventory
        const newStock = inventoryItem.stock_count - change.delta;
        stockUpdates.push({
          item_id: change.item_id,
          stock_count: newStock,
        });
      } else {
        // Add new order item
        const unitPrice = inventoryItem.unit_price;
        const lineTotal = change.delta * unitPrice;

        await this.orderItemRepository.create({
          order_id: request.order_id,
          item_id: change.item_id,
          item_name: change.item_name,
          quantity: change.delta,
          unit_price: unitPrice,
          line_total: lineTotal,
        });

        // Deduct from inventory
        const newStock = inventoryItem.stock_count - change.delta;
        stockUpdates.push({
          item_id: change.item_id,
          stock_count: newStock,
        });
      }
    }

    // Process removals
    for (const change of removals) {
      const existingItem = orderItemsMap.get(change.item_id);
      if (!existingItem) {
        // Item doesn't exist in order, skip
        continue;
      }

      const delta = Math.abs(change.delta);
      const newQuantity = existingItem.quantity - delta;

      if (newQuantity <= 0) {
        // Remove the item completely
        await this.orderItemRepository.delete(existingItem.order_item_id);

        // Restore inventory
        const inventoryItem = allInventoryMap.get(change.item_id);
        if (inventoryItem) {
          const newStock = inventoryItem.stock_count + existingItem.quantity;
          stockUpdates.push({
            item_id: change.item_id,
            stock_count: newStock,
          });
        }
      } else {
        // Update quantity
        const newLineTotal = newQuantity * existingItem.unit_price; // Use snapshot price

        await this.orderItemRepository.update(existingItem.order_item_id, {
          quantity: newQuantity,
          line_total: newLineTotal,
        });

        // Restore inventory
        const inventoryItem = allInventoryMap.get(change.item_id);
        if (inventoryItem) {
          const newStock = inventoryItem.stock_count + delta;
          stockUpdates.push({
            item_id: change.item_id,
            stock_count: newStock,
          });
        }
      }
    }

    // Bulk update inventory
    if (stockUpdates.length > 0) {
      await this.inventoryService.bulkUpdateStock(stockUpdates);
    }

    // Recalculate order total
    await this.orderService.recalculateOrderTotal(request.order_id);

    // Mark request as approved
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
