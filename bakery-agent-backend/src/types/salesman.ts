export interface Salesman {
  salesman_id: string;
  name: string;
  phone: string;
  created_at?: string;
}

export interface SalesmanCreate {
  name: string;
  phone: string;
}

export interface SalesmanUpdate {
  name?: string;
  phone?: string;
}
