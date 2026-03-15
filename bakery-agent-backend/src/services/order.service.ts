import { OrderRepository } from '../repositories/order.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderItemService } from './order-item.service';
import { InventoryService } from './inventory.service';
import { Order, OrderCreate, OrderUpdate, OrderStatus } from '../types/order';
import { OrderItemCreate } from '../types/order-item';

export class OrderService {
  private repository: OrderRepository;
  private orderItemRepository: OrderItemRepository;
  private orderItemService: OrderItemService;

  constructor(
    repository?: OrderRepository,
    orderItemRepository?: OrderItemRepository,
    orderItemService?: OrderItemService,
    inventoryService?: InventoryService
  ) {
    this.repository = repository || new OrderRepository();
    this.orderItemRepository = orderItemRepository || new OrderItemRepository();
    this.orderItemService = orderItemService || new OrderItemService();
  }

  /**
   * Get all orders
   */
  async getAllOrders(): Promise<Order[]> {
    return this.repository.findAll();
  }

  /**
   * Get orders with filtering, sorting, and pagination
   */
  async getOrdersWithFilters(options: {
    salesmanIds?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    count?: number;
  }): Promise<{ data: Order[]; total: number; page: number; count: number }> {
    return this.repository.findWithFilters(options);
  }

  /**
   * Get orders by salesman ID
   */
  async getOrdersBySalesmanId(salesmanId: string): Promise<Order[]> {
    return this.repository.findBySalesmanId(salesmanId);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    return this.repository.findById(orderId);
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return this.repository.findByStatus(status);
  }

  /**
   * Create a new order with items
   * Order is created with status 'pending' and total_amount 0
   * If item creation succeeds, order is updated to 'confirmed' with calculated total
   * If item creation fails, order is updated to 'cancelled'
   */
  async createOrder(order: OrderCreate, items: OrderItemCreate[]): Promise<Order> {
    if (!order.salesman_id) {
      throw new Error('Salesman ID is required');
    }

    if (!items || items.length === 0) {
      throw new Error('At least one order item is required');
    }

    // Create order with initial status 'pending' and total_amount 0
    const createdOrder = await this.repository.create({
      salesman_id: order.salesman_id,
      status: 'pending',
      total_amount: 0,
    });

    // Create order items (unit_price will be fetched from inventory by service)
    const orderItems = items.map(item => ({
      ...item,
      order_id: createdOrder.order_id,
    }));

    try {
      // Create items - this will validate stock and deduct inventory
      const result = await this.orderItemService.createItems(orderItems);

      // If successful, update order to 'confirmed' with calculated total
      return this.repository.update(createdOrder.order_id, {
        status: 'confirmed',
        total_amount: result.totalAmount,
      });
    } catch (error) {
      // If item creation fails, update order to 'cancelled'
      await this.repository.update(createdOrder.order_id, {
        status: 'cancelled',
      });
      // Re-throw the error so caller knows what went wrong
      throw error;
    }
  }

  /**
   * Update order
   * Total amount is recalculated from order items if items changed
   */
  async updateOrder(orderId: string, updates: OrderUpdate): Promise<Order> {
    const existingOrder = await this.repository.findById(orderId);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Recalculate total_amount from order items
    const items = await this.orderItemRepository.findByOrderId(orderId);
    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

    // Update with status if provided, and always update total_amount
    const updateData: any = { total_amount: totalAmount };
    if (updates.status) {
      updateData.status = updates.status;
    }

    return this.repository.update(orderId, updateData);
  }

  /**
   * Recalculate order total from order items
   */
  async recalculateOrderTotal(orderId: string): Promise<Order> {
    const existingOrder = await this.repository.findById(orderId);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    const items = await this.orderItemRepository.findByOrderId(orderId);
    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

    return this.repository.update(orderId, { total_amount: totalAmount });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const existingOrder = await this.repository.findById(orderId);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['delivered', 'cancelled'],
      delivered: ['paid', 'cancelled'],
      paid: [], // Cannot transition from paid
      cancelled: [], // Cannot transition from cancelled
    };

    const allowedStatuses = validTransitions[existingOrder.status];
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Invalid status transition from ${existingOrder.status} to ${status}`);
    }

    return this.repository.updateStatus(orderId, status);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId: string): Promise<void> {
    const existingOrder = await this.repository.findById(orderId);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Delete order items first (cascade should handle this, but explicit is better)
    await this.orderItemRepository.deleteByOrderId(orderId);
    return this.repository.delete(orderId);
  }

  /**
   * Get order with items
   */
  async getOrderWithItems(orderId: string): Promise<{ order: Order; items: any[] } | null> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      return null;
    }

    const items = await this.orderItemRepository.findByOrderId(orderId);

    return { order, items };
  }
}
