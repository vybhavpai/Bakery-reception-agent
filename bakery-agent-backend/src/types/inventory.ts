export interface Inventory {
  item_id: string;
  item_name: string;
  stock_count: number;
  unit: string;
  unit_price: number;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryCreate {
  item_name: string;
  stock_count: number;
  unit: string;
  unit_price: number;
}

export interface InventoryUpdate {
  stock_count?: number;
  unit?: string;
  unit_price?: number;
}
