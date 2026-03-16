import { useState } from 'react';
import { initiateCall } from '../services/callsApi';
import './CallAgentButton.css';

interface CallAgentButtonProps {
  salesmanId: string;
}

export default function CallAgentButton({ salesmanId }: CallAgentButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleCall() {
    if (!salesmanId) {
      alert('Please select a salesman first');
      return;
    }

    try {
      setLoading(true);
      const result = await initiateCall(salesmanId);
      if (result.success) {
        alert(`Call initiated! ${result.message}`);
      } else {
        alert(`Failed to initiate call: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to initiate call:', error);
      alert(error instanceof Error ? error.message : 'Failed to initiate call');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCall}
      disabled={!salesmanId || loading}
      className="call-button"
    >
      {loading ? 'Initiating Call...' : 'Call Agent'}
    </button>
  );
}
