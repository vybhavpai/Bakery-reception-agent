import fetchAPI from './api';

export interface CallInitiateResponse {
  success: boolean;
  message: string;
  status: string;
  execution_id: string;
  salesman: {
    id: string;
    name: string;
    phone: string;
  };
}

export async function initiateCall(salesmanId: string): Promise<CallInitiateResponse> {
  return fetchAPI('/api/calls/initiate', {
    method: 'POST',
    body: JSON.stringify({ salesman_id: salesmanId }),
  });
}
