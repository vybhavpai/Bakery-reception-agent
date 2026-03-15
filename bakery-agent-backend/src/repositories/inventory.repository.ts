import { supabase } from '../config/supabase';
import { Inventory, InventoryCreate, InventoryUpdate } from '../types/inventory';

export class InventoryRepository {
  /**
   * Get all inventory items
   */
  async findAll(): Promise<Inventory[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name');

    if (error) {
      throw new Error(`Failed to fetch inventory: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get inventory item by ID
   */
  async findById(itemId: string): Promise<Inventory | null> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('item_id', itemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch inventory item: ${error.message}`);
    }

    return data;
  }

  /**
   * Get inventory item by name (case-insensitive partial match)
   */
  async findByName(itemName: string): Promise<Inventory | null> {
    // Normalize search term to lowercase for case-insensitive comparison
    const normalizedName = itemName.toLowerCase();
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .ilike('item_name', `%${normalizedName}%`)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch inventory item by name: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Create a new inventory item
   */
  async create(inventory: InventoryCreate): Promise<Inventory> {
    const { data, error } = await supabase
      .from('inventory')
      .insert(inventory)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create inventory item: ${error.message}`);
    }

    return data;
  }

  /**
   * Update inventory item
   */
  async update(itemId: string, updates: InventoryUpdate): Promise<Inventory> {
    const { data, error } = await supabase
      .from('inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('item_id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update inventory item: ${error.message}`);
    }

    return data;
  }

  /**
   * Update stock count for an item
   */
  async updateStock(itemId: string, stockCount: number): Promise<Inventory> {
    return this.update(itemId, { stock_count: stockCount });
  }

  /**
   * Delete inventory item
   */
  async delete(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
  }
}
