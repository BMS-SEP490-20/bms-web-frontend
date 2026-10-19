/**
 * UC26 – Walk-in registration API.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api') + '/walk-in';

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
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const walkInApi = {
  register(body) {
    return handle(
      fetch(`${BASE}/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
    );
  },
  lookupByIdentity(identityNumber) {
    return handle(
      fetch(`${BASE}/lookup/identity/${encodeURIComponent(identityNumber)}`, {
        headers: authHeaders(),
      })
    );
  },
  lookupByPhone(phone) {
    return handle(
      fetch(`${BASE}/lookup/phone/${encodeURIComponent(phone)}`, {
        headers: authHeaders(),
      })
    );
  },
};
