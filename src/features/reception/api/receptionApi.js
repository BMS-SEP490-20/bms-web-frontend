/**
 * @file receptionApi.js
 * @description UC28 – Patient Reception & Smart Queue API client.
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

export async function callNextPatient(roomId, doctorId, signal) {
  const res = await fetch(`${BASE_URL}/reception/call-next`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ roomId, doctorId }),
    signal,
  });
  return handleResponse(res);
}

export async function recallPatient(appointmentId, roomId, signal) {
  const res = await fetch(`${BASE_URL}/reception/recall`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ appointmentId, roomId }),
    signal,
  });
  return handleResponse(res);
}

export async function skipPatient(appointmentId, reason, signal) {
  const res = await fetch(`${BASE_URL}/reception/skip`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ appointmentId, reason }),
    signal,
  });
  return handleResponse(res);
}

export async function completePatient(appointmentId, notes, signal) {
  const res = await fetch(`${BASE_URL}/reception/complete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ appointmentId, notes }),
    signal,
  });
  return handleResponse(res);
}

export async function getQueueStatus(roomId, doctorId, signal) {
  const query = new URLSearchParams();
  if (roomId) query.set('roomId', roomId);
  if (doctorId) query.set('doctorId', doctorId);

  const res = await fetch(`${BASE_URL}/reception/queue?${query.toString()}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export const receptionApi = {
  callNextPatient,
  recallPatient,
  skipPatient,
  completePatient,
  getQueueStatus,
};
