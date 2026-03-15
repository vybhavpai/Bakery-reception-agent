import { InventoryRepository } from '../repositories/inventory.repository';
import { Inventory, InventoryCreate, InventoryUpdate } from '../types/inventory';

export class InventoryService {
  private repository: InventoryRepository;

  constructor(repository?: InventoryRepository) {
    this.repository = repository || new InventoryRepository();
  }

  /**
   * Get all inventory items
   */
  async getAllItems(): Promise<Inventory[]> {
    return this.repository.findAll();
  }

  /**
   * Get inventory item by ID
   */
  async getItemById(itemId: string): Promise<Inventory | null> {
    return this.repository.findById(itemId);
  }

  /**
   * Get inventory item by name (case-insensitive search)
   */
  async getItemByName(itemName: string): Promise<Inventory | null> {
    if (!itemName || typeof itemName !== 'string') {
      throw new Error('Item name must be a non-empty string');
    }

    return this.repository.findByName(itemName);
  }

  /**
   * Create a new inventory item
   */
  async createItem(inventory: InventoryCreate): Promise<Inventory> {
    // Validate required fields
    if (!inventory.item_name || !inventory.unit) {
      throw new Error('Item name and unit are required');
    }

    if (inventory.stock_count < 0) {
      throw new Error('Stock count cannot be negative');
    }

    if (inventory.unit_price < 0) {
      throw new Error('Unit price cannot be negative');
    }

    return this.repository.create(inventory);
  }

  /**
   * Update inventory item
   */
  async updateItem(itemId: string, updates: InventoryUpdate): Promise<Inventory> {
    const existingItem = await this.repository.findById(itemId);
    if (!existingItem) {
      throw new Error('Inventory item not found');
    }

    if (updates.stock_count !== undefined && updates.stock_count < 0) {
      throw new Error('Stock count cannot be negative');
    }

    if (updates.unit_price !== undefined && updates.unit_price < 0) {
      throw new Error('Unit price cannot be negative');
    }

    return this.repository.update(itemId, updates);
  }

  /**
   * Update stock count for an item
   */
  async updateStock(itemId: string, stockCount: number): Promise<Inventory> {
    if (stockCount < 0) {
      throw new Error('Stock count cannot be negative');
    }

    return this.repository.updateStock(itemId, stockCount);
  }

  /**
   * Check if item has sufficient stock
   */
  async checkStock(itemId: string, requestedQuantity: number): Promise<boolean> {
    const item = await this.repository.findById(itemId);
    if (!item) {
      return false;
    }

    return item.stock_count >= requestedQuantity;
  }

  /**
   * Get available stock for an item
   */
  async getAvailableStock(itemId: string): Promise<number> {
    const item = await this.repository.findById(itemId);
    if (!item) {
      return 0;
    }

    return item.stock_count;
  }
}
