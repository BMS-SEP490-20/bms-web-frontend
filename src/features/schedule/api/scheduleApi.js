const BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api') + '/schedules';

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
  if (res.status === 204) return undefined;
  return res.json();
}

export const scheduleApi = {
  list(doctorId, from, to) {
    const q = new URLSearchParams({ doctorId });
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    return handle(fetch(`${BASE}?${q}`, { headers: authHeaders() }));
  },
  create(body) {
    return handle(fetch(BASE, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }));
  },
  update(id, body) {
    return handle(fetch(`${BASE}/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }));
  },
  remove(id) {
    return handle(fetch(`${BASE}/${id}`, { method: 'DELETE', headers: authHeaders() }));
  },
};
