/**
 * @file viewShiftApi.js
 * @description API client for UC35 / UC36 – View Shifts & Manage Shifts.
 * Uses ShiftsController: GET /api/shifts & /api/v1/shifts
 */

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api') + '/shifts';

function authHeaders() {
  const token =
    localStorage.getItem('bms_access_token') ||
    sessionStorage.getItem('bms_access_token') ||
    localStorage.getItem('bms_token') ||
    sessionStorage.getItem('bms_token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token');

  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.Message || err.title || err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

function unwrapItems(data) {
  if (Array.isArray(data)) return data;
  return data?.items ?? data?.Items ?? data?.data ?? [];
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
  const res = await fetch(`${BASE}?${q}`, { headers: authHeaders() });
  const data = await handle(res);
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
  const res = await fetch(`${BASE}?${q}`, { headers: authHeaders() });
  const data = await handle(res);
  return unwrapItems(data);
}

export const viewShiftApi = {
  list,
  byDay,
};

export default viewShiftApi;
