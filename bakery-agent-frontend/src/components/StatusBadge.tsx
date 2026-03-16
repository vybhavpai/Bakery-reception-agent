import './StatusBadge.css';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}
