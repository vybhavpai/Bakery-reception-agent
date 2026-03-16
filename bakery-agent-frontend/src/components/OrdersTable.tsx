import { useState, useEffect } from 'react';
import { getOrders, updateOrderStatus, type Order } from '../services/ordersApi';
import { supabase } from '../config/supabase';
import { getSalesmen } from '../services/salesmanApi';
import toast from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import OrderDetailsModal from './OrderDetailsModal';
import './OrdersTable.css';

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [salesmenMap, setSalesmenMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadSalesmen();
    loadOrders();
  }, []);

  useEffect(() => {
    // Set up Supabase real-time subscription for new orders
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('New order received:', payload);
          const newOrder = payload.new as any;
          
          // Get salesman name for toast
          const salesmanName = salesmenMap.get(newOrder.salesman_id) || 'Unknown';
          const orderIdShort = newOrder.order_id.slice(0, 8);
          
          // Show toast notification
          toast.success(`New order #${orderIdShort} from ${salesmanName}`, {
            duration: 4000,
          });
          
          // Reload orders
          await loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salesmenMap]);

  async function loadSalesmen() {
    try {
      const salesmen = await getSalesmen();
      const map = new Map(salesmen.map(s => [s.salesman_id, s.name]));
      setSalesmenMap(map);
    } catch (error) {
      console.error('Failed to load salesmen:', error);
    }
  }

  async function loadOrders() {
    try {
      setLoading(true);
      const response = await getOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  function getNextStatuses(currentStatus: Order['status']): Order['status'][] {
    const transitions: Record<Order['status'], Order['status'][]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['delivered', 'cancelled'],
      delivered: ['paid', 'cancelled'],
      paid: [],
      cancelled: [],
    };
    return transitions[currentStatus] || [];
  }

  async function handleStatusChange(orderId: string, newStatus: Order['status']) {
    try {
      setUpdating(orderId);
      await updateOrderStatus(orderId, newStatus);
      await loadOrders(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update order status');
    } finally {
      setUpdating(null);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  if (loading) {
    return <div className="panel">Loading orders...</div>;
  }

  return (
    <div className="panel">
      <h2>Orders</h2>
      <table className="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Salesman</th>
            <th>Status</th>
            <th>Total</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                No orders found
              </td>
            </tr>
          ) : (
            orders.map(order => {
              const nextStatuses = getNextStatuses(order.status);
              const isUpdating = updating === order.order_id;

              return (
                <tr key={order.order_id}>
                  <td>
                    <button
                      onClick={() => setSelectedOrderId(order.order_id)}
                      className="btn-view-details"
                    >
                      {order.order_id.slice(0, 8)}...
                    </button>
                  </td>
                  <td>{order.salesman_name || 'Unknown'}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>₹{order.total_amount.toFixed(2)}</td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>
                    {nextStatuses.length > 0 ? (
                      <div className="action-buttons">
                        {nextStatuses.map(status => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(order.order_id, status)}
                            disabled={isUpdating}
                            className={`btn-action btn-${status}`}
                          >
                            {status === 'cancelled' ? 'Cancel' : status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="no-actions">No actions</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
