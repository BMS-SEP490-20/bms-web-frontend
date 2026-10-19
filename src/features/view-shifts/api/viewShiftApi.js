/**
 * UC36 – View shifts (read-only).
 * Uses existing ShiftsController: GET /api/shifts
 */

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api') + '/shifts';

function authHeaders() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return {
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

function unwrapItems(data) {
  if (Array.isArray(data)) return data;
  return data?.items ?? data?.Items ?? [];
}

/**
 * @param {string} from YYYY-MM-DD
 * @param {string} to YYYY-MM-DD
 * @param {string} [specialty] mapped to department filter when supported
 */
async function list(from, to, specialty) {
  const q = new URLSearchParams();
  if (from) q.set('fromDate', from);
  if (to) q.set('toDate', to);
  if (specialty) q.set('department', specialty);
  q.set('page', '1');
  q.set('pageSize', '200');
  const data = await handle(fetch(`${BASE}?${q}`, { headers: authHeaders() }));
  return unwrapItems(data);
}

/** Shifts on one day */
async function byDay(date) {
  const q = new URLSearchParams();
  if (date) {
    q.set('fromDate', date);
    q.set('toDate', date);
  }
  q.set('page', '1');
  q.set('pageSize', '200');
  const data = await handle(fetch(`${BASE}?${q}`, { headers: authHeaders() }));
  return { date, shifts: unwrapItems(data) };
}

export const viewShiftApi = { list, byDay };
