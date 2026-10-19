const BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api') + '/samples';

function authHeaders() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const sampleApi = {
  checkIn(body) {
    return handle(fetch(`${BASE}/check-in`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }));
  },
  lookup(code) {
    return handle(fetch(`${BASE}/lookup/${encodeURIComponent(code)}`, { headers: authHeaders() }));
  },
  pending() {
    return handle(fetch(`${BASE}/pending-check-in`, { headers: authHeaders() }));
  },
};
