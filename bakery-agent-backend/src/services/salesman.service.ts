import { SalesmanRepository } from '../repositories/salesman.repository';
import { Salesman, SalesmanCreate, SalesmanUpdate } from '../types/salesman';

export class SalesmanService {
  private repository: SalesmanRepository;

  constructor(repository?: SalesmanRepository) {
    this.repository = repository || new SalesmanRepository();
  }

  /**
   * Get all salesmen
   */
  async getAllSalesmen(): Promise<Salesman[]> {
    return this.repository.findAll();
  }

  /**
   * Get salesman by ID
   */
  async getSalesmanById(salesmanId: string): Promise<Salesman | null> {
    return this.repository.findById(salesmanId);
  }

  /**
   * Get salesman by phone number
   */
  async getSalesmanByPhone(phone: string): Promise<Salesman | null> {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Phone number must be a non-empty string');
    }

    return this.repository.findByPhone(phone);
  }

  /**
   * Create a new salesman
   */
  async createSalesman(salesman: SalesmanCreate): Promise<Salesman> {
    if (!salesman.name || !salesman.phone) {
      throw new Error('Name and phone are required');
    }

    // Validate phone format (basic check)
    if (!/^\+?[1-9]\d{1,14}$/.test(salesman.phone)) {
      throw new Error('Invalid phone number format');
    }

    return this.repository.create(salesman);
  }

  /**
   * Update salesman
   */
  async updateSalesman(salesmanId: string, updates: SalesmanUpdate): Promise<Salesman> {
    const existingSalesman = await this.repository.findById(salesmanId);
    if (!existingSalesman) {
      throw new Error('Salesman not found');
    }

    if (updates.phone && !/^\+?[1-9]\d{1,14}$/.test(updates.phone)) {
      throw new Error('Invalid phone number format');
    }

    return this.repository.update(salesmanId, updates);
  }

  /**
   * Delete salesman
   */
  async deleteSalesman(salesmanId: string): Promise<void> {
    const existingSalesman = await this.repository.findById(salesmanId);
    if (!existingSalesman) {
      throw new Error('Salesman not found');
    }

    return this.repository.delete(salesmanId);
  }
}
