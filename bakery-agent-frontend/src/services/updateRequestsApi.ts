import fetchAPI from './api';

export interface RequestedChange {
  item_id: string;
  item_name: string;
  delta: number;
}

export interface UpdateRequest {
  request_id: string;
  order_id: string;
  salesman_id: string;
  requested_changes: RequestedChange[];
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: 'inventory_insufficient' | 'admin_rejected';
  created_at: string;
}

export async function getUpdateRequests(): Promise<UpdateRequest[]> {
  return fetchAPI('/api/order-update-requests?status=pending');
}

export async function approveRequest(requestId: string): Promise<UpdateRequest> {
  return fetchAPI(`/api/order-update-requests/${requestId}/approve`, {
    method: 'PATCH',
  });
}

export async function rejectRequest(requestId: string): Promise<UpdateRequest> {
  return fetchAPI(`/api/order-update-requests/${requestId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason: 'admin_rejected' }),
  });
}
