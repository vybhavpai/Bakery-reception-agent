import InventoryPanel from '../components/InventoryPanel';
import OrdersTable from '../components/OrdersTable';
import UpdateRequestsPanel from '../components/UpdateRequestsPanel';
import './AdminView.css';

export default function AdminView() {
  return (
    <div className="admin-view">
      <h1>Admin Dashboard</h1>
      <div className="admin-layout">
        <div className="admin-left">
          <InventoryPanel />
        </div>
        <div className="admin-right">
          <OrdersTable />
          <UpdateRequestsPanel />
        </div>
      </div>
    </div>
  );
}
