export interface CallLog {
  call_log_id: string;
  salesman_id: string;
  bolna_call_id: string;
  transcript?: string;
  summary?: string;
  created_at?: string;
}

export interface CallLogCreate {
  salesman_id: string;
  bolna_call_id: string;
  transcript?: string;
  summary?: string;
}

export interface CallLogUpdate {
  transcript?: string;
  summary?: string;
}

export interface CallLogOrder {
  call_log_id: string;
  order_id: string;
}
