import fetchAPI from './api';

export interface Inventory {
  item_id: string;
  item_name: string;
  stock_count: number;
  unit: string;
  unit_price: number;
}

export async function getInventory(): Promise<Inventory[]> {
  return fetchAPI('/api/inventory');
}

export async function updateInventory(
  itemId: string,
  updates: { stock_count?: number; unit_price?: number; unit?: string }
): Promise<Inventory> {
  return fetchAPI(`/api/inventory/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}
