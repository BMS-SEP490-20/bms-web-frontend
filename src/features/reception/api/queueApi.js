/**
 * API client for UC27 – Reception Queue Management & Ticket Issuance.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function authHeaders() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (res.ok) return res.json();
  const body = await res.json().catch(() => null);
  const error = new Error(body?.message ?? `HTTP ${res.status}`);
  error.code = body?.code;
  error.status = res.status;
  throw error;
}

export async function fetchLiveQueue(signal) {
  const res = await fetch(`${BASE_URL}/reception/queue`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function issueNextTicket(payload, signal) {
  const res = await fetch(`${BASE_URL}/reception/queue/issue`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload ?? { isWalkIn: true }),
    signal,
  });
  return handleResponse(res);
}

export async function callQueueTicket(id, counterName, signal) {
  const res = await fetch(`${BASE_URL}/reception/queue/${encodeURIComponent(id)}/call`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ counterName: counterName || '' }),
    signal,
  });
  return handleResponse(res);
}

export async function updateQueueTicketStatus(id, status, counterName, signal) {
  const res = await fetch(`${BASE_URL}/reception/queue/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status, counterName }),
    signal,
  });
  return handleResponse(res);
}

export const queueApi = {
  fetchLiveQueue,
  issueNextTicket,
  callQueueTicket,
  updateQueueTicketStatus,
};
