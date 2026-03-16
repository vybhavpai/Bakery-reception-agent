import { OrderItemRepository } from '../repositories/order-item.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryService } from './inventory.service';
import { OrderItem, OrderItemCreate, OrderItemUpdate } from '../types/order-item';

export class OrderItemService {
  private repository: OrderItemRepository;
  private inventoryRepository: InventoryRepository;
  private inventoryService: InventoryService;

  constructor(
    repository?: OrderItemRepository,
    inventoryRepository?: InventoryRepository,
    inventoryService?: InventoryService
  ) {
    this.repository = repository || new OrderItemRepository();
    this.inventoryRepository = inventoryRepository || new InventoryRepository();
    this.inventoryService = inventoryService || new InventoryService();
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
   * Unit prices are fetched from inventory for each item.
   * Also validates and deducts inventory stock for each item.
   * Returns created items and the total amount.
   */
  async createItems(orderItems: OrderItemCreate[]): Promise<{ items: OrderItem[]; totalAmount: number }> {
    if (orderItems.length === 0) {
      throw new Error('At least one order item is required');
    }

    const insufficientItems: {
      item_id: string;
      requested: number;
      available: number;
    }[] = [];

    // Bulk fetch all inventory items at once
    const itemIds = orderItems.map(item => item.item_id);
    const inventoryItems = await this.inventoryRepository.findByMultipleIds(itemIds);

    // Create a map for quick lookup
    const inventoryMap = new Map(inventoryItems.map(item => [item.item_id, item]));

    // Validate all items, fetch prices, and compute new stock
    const itemsWithPrices = orderItems.map((item) => {
      if (item.quantity <= 0) {
        throw new Error('All quantities must be greater than 0');
      }

      const inventoryItem = inventoryMap.get(item.item_id);
      if (!inventoryItem) {
        throw new Error(`Inventory item not found for item_id: ${item.item_id}`);
      }

      if (inventoryItem.stock_count < item.quantity) {
        insufficientItems.push({
          item_id: item.item_id,
          requested: item.quantity,
          available: inventoryItem.stock_count,
        });
      }

      const unitPrice = inventoryItem.unit_price;
      const lineTotal = item.quantity * unitPrice;

      return {
        ...item,
        // Always use canonical item_name from inventory
        item_name: inventoryItem.item_name,
        unit_price: unitPrice,
        line_total: lineTotal,
        // We'll deduct stock separately after validation
      };
    });

    if (insufficientItems.length > 0) {
      // Throw a structured error the API layer can interpret
      throw new Error(
        JSON.stringify({
          type: 'INSUFFICIENT_STOCK',
          items: insufficientItems,
        })
      );
    }

    // Bulk update inventory stock for all items
    const stockUpdates = itemsWithPrices.map((item) => {
      const inventoryItem = inventoryMap.get(item.item_id);
      if (!inventoryItem) {
        throw new Error(`Inventory item not found while updating stock for item_id: ${item.item_id}`);
      }
      const newStock = inventoryItem.stock_count - item.quantity;
      return {
        item_id: item.item_id,
        stock_count: newStock,
      };
    });

    await this.inventoryService.bulkUpdateStock(stockUpdates);

    const createdItems = await this.repository.createMany(itemsWithPrices);
    
    // Calculate total amount from created items
    const totalAmount = createdItems.reduce((sum, item) => sum + item.line_total, 0);

    return {
      items: createdItems,
      totalAmount,
    };
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
