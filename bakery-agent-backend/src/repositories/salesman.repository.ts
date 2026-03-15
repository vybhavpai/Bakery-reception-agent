import { supabase } from '../config/supabase';
import { Salesman, SalesmanCreate, SalesmanUpdate } from '../types/salesman';

export class SalesmanRepository {
  /**
   * Get all salesmen
   */
  async findAll(): Promise<Salesman[]> {
    const { data, error } = await supabase
      .from('salesmen')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch salesmen: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get salesman by ID
   */
  async findById(salesmanId: string): Promise<Salesman | null> {
    const { data, error } = await supabase
      .from('salesmen')
      .select('*')
      .eq('salesman_id', salesmanId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch salesman: ${error.message}`);
    }

    return data;
  }

  /**
   * Get salesman by phone number
   */
  async findByPhone(phone: string): Promise<Salesman | null> {
    const { data, error } = await supabase
      .from('salesmen')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch salesman by phone: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new salesman
   */
  async create(salesman: SalesmanCreate): Promise<Salesman> {
    const { data, error } = await supabase
      .from('salesmen')
      .insert(salesman)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create salesman: ${error.message}`);
    }

    return data;
  }

  /**
   * Update salesman
   */
  async update(salesmanId: string, updates: SalesmanUpdate): Promise<Salesman> {
    const { data, error } = await supabase
      .from('salesmen')
      .update(updates)
      .eq('salesman_id', salesmanId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update salesman: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete salesman
   */
  async delete(salesmanId: string): Promise<void> {
    const { error } = await supabase
      .from('salesmen')
      .delete()
      .eq('salesman_id', salesmanId);

    if (error) {
      throw new Error(`Failed to delete salesman: ${error.message}`);
    }
  }
}
