import { OrderItemRepository } from '../repositories/order-item.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { OrderItem, OrderItemCreate, OrderItemUpdate } from '../types/order-item';

export class OrderItemService {
  private repository: OrderItemRepository;
  private inventoryRepository: InventoryRepository;

  constructor(
    repository?: OrderItemRepository,
    inventoryRepository?: InventoryRepository
  ) {
    this.repository = repository || new OrderItemRepository();
    this.inventoryRepository = inventoryRepository || new InventoryRepository();
  }

  /**
   * Get all order items for an order
   */
  async getItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    return this.repository.findByOrderId(orderId);
  }

  /**
   * Get order item by ID
   */
  async getItemById(orderItemId: string): Promise<OrderItem | null> {
    return this.repository.findById(orderItemId);
  }

  /**
   * Create a new order item
   * Unit price is fetched from inventory and stored as a snapshot
   */
  async createItem(orderItem: OrderItemCreate): Promise<OrderItem> {
    if (!orderItem.order_id || !orderItem.item_id) {
      throw new Error('Order ID and item ID are required');
    }

    if (orderItem.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Get unit price from inventory
    const inventoryItem = await this.inventoryRepository.findById(orderItem.item_id);
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    const unitPrice = inventoryItem.unit_price;
    const lineTotal = orderItem.quantity * unitPrice;

    return this.repository.create({
      ...orderItem,
      unit_price: unitPrice,
      line_total: lineTotal,
    });
  }

  /**
   * Create multiple order items
   * Unit prices are fetched from inventory for each item
   */
  async createItems(orderItems: OrderItemCreate[]): Promise<OrderItem[]> {
    if (orderItems.length === 0) {
      throw new Error('At least one order item is required');
    }

    // Validate all items and fetch prices from inventory
    const itemsWithPrices = await Promise.all(
      orderItems.map(async (item) => {
        if (item.quantity <= 0) {
          throw new Error('All quantities must be greater than 0');
        }

        // Get unit price from inventory
        const inventoryItem = await this.inventoryRepository.findById(item.item_id);
        if (!inventoryItem) {
          throw new Error(`Inventory item not found for item_id: ${item.item_id}`);
        }

        const unitPrice = inventoryItem.unit_price;
        const lineTotal = item.quantity * unitPrice;

        return {
          ...item,
          unit_price: unitPrice,
          line_total: lineTotal,
        };
      })
    );

    return this.repository.createMany(itemsWithPrices);
  }

  /**
   * Update order item
   * Unit price is not updated - it remains as a snapshot from when order was created
   * Only quantity can be updated, which recalculates line_total
   */
  async updateItem(orderItemId: string, updates: OrderItemUpdate): Promise<OrderItem> {
    const existingItem = await this.repository.findById(orderItemId);
    if (!existingItem) {
      throw new Error('Order item not found');
    }

    if (updates.quantity !== undefined && updates.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Recalculate line total if quantity changed (unit_price is a snapshot, don't update it)
    const updateData: any = { ...updates };
    if (updates.quantity !== undefined) {
      const quantity = updates.quantity;
      const unitPrice = existingItem.unit_price; // Use existing snapshot price
      updateData.line_total = quantity * unitPrice;
    }

    return this.repository.update(orderItemId, updateData);
  }

  /**
   * Delete order item
   */
  async deleteItem(orderItemId: string): Promise<void> {
    const existingItem = await this.repository.findById(orderItemId);
    if (!existingItem) {
      throw new Error('Order item not found');
    }

    return this.repository.delete(orderItemId);
  }
}
