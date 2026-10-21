/**
 * @file medicalAssessmentApi.js
 * @description UC50 – Medical Assessment API Client (Iteration 3).
 * Interacts with backend /api/medical-assessments endpoints.
 * Conforms to: Production Standards & AGENTS-CODE.md.
 */

import api from '../../../config/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function authHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
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
  const error = new Error(body?.message ?? `Lỗi hệ thống (HTTP ${res.status})`);
  error.code = body?.code;
  error.status = res.status;
  error.errors = body?.errors;
  throw error;
}

export async function getAssessments(params = {}, signal) {
  const query = new URLSearchParams();
  if (params.patientId) query.append('patientId', params.patientId);
  if (params.doctorId) query.append('doctorId', params.doctorId);
  if (params.status) query.append('status', params.status);
  if (params.keyword) query.append('keyword', params.keyword);
  if (params.pageNumber) query.append('pageNumber', params.pageNumber);
  if (params.pageSize) query.append('pageSize', params.pageSize);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);

  const res = await fetch(`${BASE_URL}/medical-assessments?${query.toString()}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getAssessmentById(id, signal) {
  const res = await fetch(`${BASE_URL}/medical-assessments/${id}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getPatientAssessments(patientId, signal) {
  const res = await fetch(`${BASE_URL}/medical-assessments/patient/${patientId}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getPatientEncounters(patientId, signal) {
  const res = await fetch(`${BASE_URL}/medical-assessments/patient/${patientId}/encounters`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function createAssessment(payload, signal) {
  const res = await fetch(`${BASE_URL}/medical-assessments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function updateAssessment(id, payload, signal) {
  const res = await fetch(`${BASE_URL}/medical-assessments/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function finalizeAssessment(id, finalNotes = '', signal) {
  const res = await fetch(`${BASE_URL}/medical-assessments/${id}/finalize`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ finalNotes }),
    signal,
  });
  return handleResponse(res);
}

export async function deleteAssessment(id, deleteReason, signal) {
  const res = await fetch(`${BASE_URL}/medical-assessments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ deleteReason }),
    signal,
  });
  return handleResponse(res);
}

export const medicalAssessmentApi = {
  getAssessments,
  getAssessmentById,
  getPatientAssessments,
  getPatientEncounters,
  createAssessment,
  updateAssessment,
  finalizeAssessment,
  deleteAssessment,
};

export default medicalAssessmentApi;
