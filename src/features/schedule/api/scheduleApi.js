import { getToken, API_URL } from '../../../config/api';

const BASE = `${API_URL}/schedules`;

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.Message || err.title || err.detail || `HTTP ${res.status}`);
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
  async getRooms() {
    const res = await handle(fetch(`${API_URL}/shifts/rooms`, { headers: authHeaders() }));
    return res?.data || res || [];
  },
};

export default scheduleApi;
