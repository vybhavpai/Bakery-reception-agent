export type UpdateRequestStatus = 'pending' | 'approved' | 'rejected';
export type RejectionReason = 'inventory_insufficient' | 'admin_rejected';

export interface RequestedChange {
  item_id: string;
  item_name: string;
  delta: number; // positive = add, negative = deduct
}

export interface OrderUpdateRequest {
  request_id: string;
  order_id: string;
  salesman_id: string;
  requested_changes: RequestedChange[];
  status: UpdateRequestStatus;
  rejection_reason?: RejectionReason;
  created_at?: string;
}

export interface OrderUpdateRequestCreate {
  order_id: string;
  salesman_id: string;
  requested_changes: RequestedChange[];
  status?: UpdateRequestStatus;
}

export interface OrderUpdateRequestUpdate {
  status?: UpdateRequestStatus;
  rejection_reason?: RejectionReason;
}
