import { getToken, API_URL } from '../../../config/api';

const BASE = `${API_URL}/test-results`;

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const resultApi = {
  async enter(body) {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.Message || err.title || err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async lookup(keyword) {
    const res = await fetch(`${BASE}/lookup?keyword=${encodeURIComponent(keyword || '')}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.Message || err.title || err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },
};

export default resultApi;
