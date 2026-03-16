import fetchAPI from './api';

export interface Salesman {
  salesman_id: string;
  name: string;
  phone: string;
}

export async function getSalesmen(): Promise<Salesman[]> {
  return fetchAPI('/api/salesman');
}
