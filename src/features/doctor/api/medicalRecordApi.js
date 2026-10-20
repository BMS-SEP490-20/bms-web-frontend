/**
 * @file medicalRecordApi.js
 * @description UC33 – Electronic Medical Records (EMR) API client.
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
  if (res.ok) {
    if (res.status === 204) return true;
    return res.json();
  }
  const body = await res.json().catch(() => null);
  const error = new Error(body?.message ?? `HTTP ${res.status}`);
  error.code = body?.code;
  error.status = res.status;
  error.errors = body?.errors;
  throw error;
}

export async function getPatientRecords(patientId, signal) {
  const res = await fetch(`${BASE_URL}/medical-records/patient/${patientId}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getRecordById(id, signal) {
  const res = await fetch(`${BASE_URL}/medical-records/${id}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function createRecord(payload, signal) {
  const res = await fetch(`${BASE_URL}/medical-records`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function updateRecord(id, payload, signal) {
  const res = await fetch(`${BASE_URL}/medical-records/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function deleteRecord(id, deleteReason, signal) {
  const res = await fetch(`${BASE_URL}/medical-records/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ deleteReason }),
    signal,
  });
  return handleResponse(res);
}

export const medicalRecordApi = {
  getPatientRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
};
