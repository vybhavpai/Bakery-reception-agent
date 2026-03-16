import { useState, useEffect, useRef } from 'react';
import { getUpdateRequests, approveRequest, rejectRequest, type UpdateRequest } from '../services/updateRequestsApi';
import { supabase } from '../config/supabase';
import { getSalesmen } from '../services/salesmanApi';
import toast from 'react-hot-toast';
import './UpdateRequestsPanel.css';

export default function UpdateRequestsPanel() {
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const salesmenMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Load salesmen only once on mount
    loadSalesmen();
    loadRequests();

    // Set up Supabase real-time subscription for new update requests (only once)
    console.log("setting up supabase real-time subscription for new update requests");
    const channel = supabase
      .channel('update-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_update_requests',
        },
        async (payload) => {
          console.log('New update request received:', payload);
          const newRequest = payload.new as UpdateRequest;
          
          // Only process if status is pending (filter in callback since INSERT filters don't work reliably)
          if (newRequest.status !== 'pending') {
            return;
          }
          
          // Get salesman name for toast using ref (always has latest value)
          const salesmanName = salesmenMapRef.current.get(newRequest.salesman_id) || 'Unknown';
          const orderIdShort = newRequest.order_id.slice(0, 8);
          
          // Show toast notification
          toast.success(`Update request on Order #${orderIdShort} from ${salesmanName}`, {
            duration: 4000,
          });
          
          // Reload requests
          await loadRequests();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to update requests changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to update requests changes');
        } else {
          console.log('Subscription status:', status);
        }
      });

    return () => {
      console.log('Removing update requests changes subscription');
      supabase.removeChannel(channel);
    };
  }, []); // Empty deps - only run once on mount

  async function loadSalesmen() {
    try {
      const salesmen = await getSalesmen();
      const map = new Map(salesmen.map(s => [s.salesman_id, s.name]));
      salesmenMapRef.current = map; // Store in ref for subscription callback
    } catch (error) {
      console.error('Failed to load salesmen:', error);
    }
  }

  async function loadRequests() {
    try {
      const data = await getUpdateRequests();
      setRequests(data.filter(r => r.status === 'pending'));
    } catch (error) {
      console.error('Failed to load update requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    try {
      setProcessing(requestId);
      await approveRequest(requestId);
      await loadRequests();
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(requestId: string) {
    try {
      setProcessing(requestId);
      await rejectRequest(requestId);
      await loadRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert(error instanceof Error ? error.message : 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return <div className="panel">Loading update requests...</div>;
  }

  return (
    <div className="panel">
      <h2>Update Requests</h2>
      {requests.length === 0 ? (
        <div className="empty-state">No pending update requests</div>
      ) : (
        <div className="requests-list">
          {requests.map(request => {
            const change = request.requested_changes[0]; // Single change per request
            const isProcessing = processing === request.request_id;

            return (
              <div key={request.request_id} className="request-card">
                <div className="request-header">
                  <span className="request-order">Order: {request.order_id.slice(0, 8)}...</span>
                </div>
                <div className="request-details">
                  <div className="request-item">
                    <strong>{change.item_name}</strong>
                    <span className={`delta ${change.delta > 0 ? 'positive' : 'negative'}`}>
                      {change.delta > 0 ? '+' : ''}{change.delta}
                    </span>
                  </div>
                </div>
                <div className="request-actions">
                  <button
                    onClick={() => handleApprove(request.request_id)}
                    disabled={isProcessing}
                    className="btn-approve"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.request_id)}
                    disabled={isProcessing}
                    className="btn-reject"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
