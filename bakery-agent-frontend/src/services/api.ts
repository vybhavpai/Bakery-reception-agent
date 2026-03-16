const API_BASE_URL = 'http://localhost:4000';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check if response is HTML (error page)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error(`Backend returned non-JSON response. Is the backend running on ${API_BASE_URL}?`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.details || 'Request failed');
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to backend at ${API_BASE_URL}. Is the backend running?`);
    }
    throw error;
  }
}

export default fetchAPI;
