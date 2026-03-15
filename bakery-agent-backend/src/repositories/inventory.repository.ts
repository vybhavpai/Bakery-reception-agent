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

  async findByMultipleIds(itemIds: string[]): Promise<Inventory[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .in('item_id', itemIds);

    if (error) {
      throw new Error(`Failed to fetch inventory items by multiple IDs: ${error.message}`);
    }

    return data || [];
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
   * Get inventory items by multiple names (case-insensitive partial match)
   * Uses database-level OR filtering with ILIKE for better performance
   * @param itemNames Array of item names to search for
   */
  async findByMultipleNames(itemNames: string[]): Promise<Inventory[]> {
    if (itemNames.length === 0) {
      return [];
    }

    // Normalize all names to lowercase
    const normalizedNames = itemNames.map(name => name.toLowerCase().trim()).filter(name => name.length > 0);

    if (normalizedNames.length === 0) {
      return [];
    }

    // Build OR filter string for Supabase PostgREST
    // Format: "column.ilike.value1,column.ilike.value2"
    const orConditions = normalizedNames
      .map(name => `item_name.ilike.%${name}%`)
      .join(',');

    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .or(orConditions);

    if (error) {
      throw new Error(`Failed to fetch inventory items by names: ${error.message}`);
    }

    return data || [];
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
   * Bulk update stock counts for multiple items
   * @param updates Array of { item_id, stock_count } objects
   */
  async bulkUpdateStock(updates: Array<{ item_id: string; stock_count: number }>): Promise<Inventory[]> {
    if (updates.length === 0) {
      return [];
    }

    // Use Supabase RPC or individual updates in a transaction-like manner
    // Since Supabase doesn't have native bulk update, we'll use Promise.all
    // but this is still more efficient than sequential calls
    const results = await Promise.all(
      updates.map(({ item_id, stock_count }) =>
        this.update(item_id, { stock_count })
      )
    );

    return results;
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
