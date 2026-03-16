import { useState, useEffect } from 'react';
import { getInventory, updateInventory, type Inventory } from '../services/inventoryApi';
import './InventoryPanel.css';

export default function InventoryPanel() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      setLoading(true);
      const data = await getInventory();
      setInventory(data);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      alert('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(itemId: string, currentStock: number) {
    setEditing({ ...editing, [itemId]: currentStock });
  }

  function updateEdit(itemId: string, value: number) {
    setEditing({ ...editing, [itemId]: value });
  }

  async function saveStock(itemId: string) {
    const newStock = editing[itemId];
    if (newStock === undefined || newStock < 0) {
      alert('Invalid stock count');
      return;
    }

    try {
      setSaving(itemId);
      const updated = await updateInventory(itemId, { stock_count: newStock });
      setInventory(inventory.map(item => item.item_id === itemId ? updated : item));
      const newEditing = { ...editing };
      delete newEditing[itemId];
      setEditing(newEditing);
    } catch (error) {
      console.error('Failed to update inventory:', error);
      alert(error instanceof Error ? error.message : 'Failed to update inventory');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="panel">Loading inventory...</div>;
  }

  return (
    <div className="panel">
      <h2>Inventory</h2>
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Stock</th>
            <th>Unit</th>
            <th>Price</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => {
            const isEditing = editing[item.item_id] !== undefined;
            const editValue = editing[item.item_id] ?? item.stock_count;

            return (
              <tr key={item.item_id}>
                <td>{item.item_name}</td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => updateEdit(item.item_id, parseInt(e.target.value) || 0)}
                      className="stock-input"
                    />
                  ) : (
                    item.stock_count
                  )}
                </td>
                <td>{item.unit}</td>
                <td>₹{item.unit_price.toFixed(2)}</td>
                <td>
                  {isEditing ? (
                    <button
                      onClick={() => saveStock(item.item_id)}
                      disabled={saving === item.item_id}
                      className="btn-save"
                    >
                      {saving === item.item_id ? 'Saving...' : 'Save'}
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(item.item_id, item.stock_count)}
                      className="btn-edit"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
