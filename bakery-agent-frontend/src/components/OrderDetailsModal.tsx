import { useEffect, useState } from 'react';
import { getOrderDetailsFull, type OrderDetailsFull } from '../services/ordersApi';
import StatusBadge from './StatusBadge';
import './OrderDetailsModal.css';

interface OrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
}

export default function OrderDetailsModal({ orderId, onClose }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<OrderDetailsFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  async function loadOrderDetails() {
    try {
      setLoading(true);
      const data = await getOrderDetailsFull(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order details:', error);
      alert('Failed to load order details');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Order Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">Loading order details...</div>
          ) : order ? (
            <>
              <div className="order-info">
                <div className="info-row">
                  <span className="info-label">Order ID:</span>
                  <span className="info-value">{order.order_id}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Salesman:</span>
                  <span className="info-value">{order.salesman_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="info-row">
                  <span className="info-label">Total Amount:</span>
                  <span className="info-value">₹{order.total_amount.toFixed(2)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Created:</span>
                  <span className="info-value">{formatDate(order.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Modified:</span>
                  <span className="info-value">{formatDate(order.updated_at)}</span>
                </div>
              </div>

              <div className="order-items-section">
                <h3>Order Items</h3>
                {order.items && order.items.length > 0 ? (
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Unit Price</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map(item => (
                        <tr key={item.order_item_id}>
                          <td>{item.item_name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>₹{item.unit_price.toFixed(2)}</td>
                          <td>₹{item.line_total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-items">No items found</div>
                )}
              </div>
            </>
          ) : (
            <div className="error">Failed to load order details</div>
          )}
        </div>
      </div>
    </div>
  );
}
