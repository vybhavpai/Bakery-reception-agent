import { useState } from 'react';
import SalesmanSelector from '../components/SalesmanSelector';
import MyOrders from '../components/MyOrders';
import CallAgentButton from '../components/CallAgentButton';
import './SalesmanView.css';

export default function SalesmanView() {
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');

  return (
    <div className="salesman-view">
      <h1>Salesman Dashboard</h1>
      <SalesmanSelector value={selectedSalesmanId} onChange={setSelectedSalesmanId} />
      <MyOrders salesmanId={selectedSalesmanId} />
      <div className="call-section">
        <CallAgentButton salesmanId={selectedSalesmanId} />
      </div>
    </div>
  );
}
