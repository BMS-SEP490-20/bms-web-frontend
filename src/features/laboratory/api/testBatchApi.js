/**
 * UC38 – Laboratory Analyzer Test Batch API (ISO 15189 Quality Control).
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

export async function getBatches(params = {}, signal) {
  const query = new URLSearchParams();
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  if (params.analyzerId) query.set('analyzerId', params.analyzerId);
  if (params.status) query.set('status', params.status);

  const res = await fetch(`${BASE_URL}/test-batches?${query.toString()}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getPendingSamples(category, signal) {
  const query = new URLSearchParams();
  if (category) query.set('category', category);

  const res = await fetch(`${BASE_URL}/test-batches/pending-samples?${query.toString()}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getBatchById(id, signal) {
  const res = await fetch(`${BASE_URL}/test-batches/${id}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function createBatch(payload, signal) {
  const res = await fetch(`${BASE_URL}/test-batches`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function updateBatchStatus(id, payload, signal) {
  const res = await fetch(`${BASE_URL}/test-batches/${id}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function cancelBatch(id, reason, signal) {
  const query = new URLSearchParams();
  if (reason) query.set('reason', reason);

  const res = await fetch(`${BASE_URL}/test-batches/${id}?${query.toString()}`, {
    method: 'DELETE',
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export const testBatchApi = {
  getBatches,
  getPendingSamples,
  getBatchById,
  createBatch,
  updateBatchStatus,
  cancelBatch,
};
