import { useState, useEffect } from 'react';
import { getSalesmen, type Salesman } from '../services/salesmanApi';
import './SalesmanSelector.css';

interface SalesmanSelectorProps {
  value: string;
  onChange: (salesmanId: string) => void;
}

export default function SalesmanSelector({ value, onChange }: SalesmanSelectorProps) {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSalesmen();
  }, []);

  async function loadSalesmen() {
    try {
      setLoading(true);
      const data = await getSalesmen();
      setSalesmen(data);
    } catch (error) {
      console.error('Failed to load salesmen:', error);
      alert('Failed to load salesmen');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading salesmen...</div>;
  }

  return (
    <div className="salesman-selector">
      <label htmlFor="salesman-select">Select Salesman:</label>
      <select
        id="salesman-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-input"
      >
        <option value="">-- Select --</option>
        {salesmen.map(salesman => (
          <option key={salesman.salesman_id} value={salesman.salesman_id}>
            {salesman.name}
          </option>
        ))}
      </select>
    </div>
  );
}
