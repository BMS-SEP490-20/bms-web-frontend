/**
 * UC26 – Walk-in registration API.
 */
const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE = (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`) + '/walk-in';

function authHeaders() {
  const token = localStorage.getItem('bms_access_token') || localStorage.getItem('bms_token') || sessionStorage.getItem('bms_access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  res = await res;
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    let errMsg = err?.message || err?.Message || err?.title || err?.detail;
    if (!errMsg && err?.errors) {
      errMsg = Object.values(err.errors).flat().join(', ');
    }
    const error = new Error(errMsg || `HTTP ${res.status}`);
    error.status = res.status;
    error.code = err?.code;
    throw error;
  }
  if (res.status === 204) return null;
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
