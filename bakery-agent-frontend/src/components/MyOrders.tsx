import { useState, useEffect } from 'react';
import { getOrders, type Order } from '../services/ordersApi';
import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import OrderDetailsModal from './OrderDetailsModal';
import './MyOrders.css';

interface MyOrdersProps {
  salesmanId: string;
}

export default function MyOrders({ salesmanId }: MyOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (salesmanId) {
      loadOrders();
      
      // Set up Supabase real-time subscription for order status changes
      const ordersChannel = supabase
        .channel(`orders-${salesmanId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `salesman_id=eq.${salesmanId}`,
          },
          async (payload) => {
            console.log('Order status changed:', payload);
            const updatedOrder = payload.new as any;
            const orderIdShort = updatedOrder.order_id.slice(0, 8);
            
            // Show toast notification
            toast.success(`Order #${orderIdShort} is now ${updatedOrder.status}`, {
              duration: 4000,
            });
            
            // Reload orders
            await loadOrders();
          }
        )
        .subscribe();

      // Set up Supabase real-time subscription for update request status changes
      const requestsChannel = supabase
        .channel(`update-requests-${salesmanId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'order_update_requests',
            filter: `salesman_id=eq.${salesmanId}`,
          },
          async (payload) => {
            console.log('Update request status changed:', payload);
            const updatedRequest = payload.new as any;
            const orderIdShort = updatedRequest.order_id.slice(0, 8);
            
            if (updatedRequest.status === 'approved') {
              toast.success(`Your update on Order #${orderIdShort} was approved`, {
                duration: 4000,
              });
            } else if (updatedRequest.status === 'rejected') {
              const reason = updatedRequest.rejection_reason || 'unknown reason';
              toast.error(`Your update on Order #${orderIdShort} was rejected: ${reason}`, {
                duration: 5000,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(requestsChannel);
      };
    } else {
      setOrders([]);
      setLoading(false);
    }
  }, [salesmanId]);

  async function loadOrders() {
    try {
      setLoading(true);
      const response = await getOrders({ salesman_id: salesmanId });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  if (!salesmanId) {
    return <div className="panel">Please select a salesman to view orders</div>;
  }

  if (loading) {
    return <div className="panel">Loading orders...</div>;
  }

  return (
    <div className="panel">
      <h2>My Orders</h2>
      {orders.length === 0 ? (
        <div className="empty-state">No orders found</div>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.order_id}>
                <td>
                  <button
                    onClick={() => setSelectedOrderId(order.order_id)}
                    className="btn-view-details"
                  >
                    {order.order_id.slice(0, 8)}...
                  </button>
                </td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td>₹{order.total_amount.toFixed(2)}</td>
                <td>{formatDate(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
