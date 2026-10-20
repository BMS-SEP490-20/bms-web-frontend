/**
 * UC21 – Appointment API.
 * Reads JWT from localStorage (accessToken | token) – same as auth feature.
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

export async function bookAppointment(payload, signal) {
  const res = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function getAvailableSlots(doctorId, date, signal) {
  const params = new URLSearchParams({ doctorId, date });
  const res = await fetch(`${BASE_URL}/appointments/slots?${params}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getAvailableDoctors(date, specialty, signal) {
  const params = new URLSearchParams({ date });
  if (specialty) params.set('specialty', specialty);
  const res = await fetch(`${BASE_URL}/appointments/doctors?${params}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getAppointmentConfirmation(idOrCode, signal) {
  const res = await fetch(`${BASE_URL}/appointments/${encodeURIComponent(idOrCode)}/confirmation`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function sendAppointmentNotification(id, payload, signal) {
  const res = await fetch(`${BASE_URL}/appointments/${encodeURIComponent(id)}/notify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload ?? { channel: 1, type: 1 }),
    signal,
  });
  return handleResponse(res);
}

export const appointmentApi = {
  book: bookAppointment,
  getAvailableSlots,
  getAvailableDoctors,
  getAppointmentConfirmation,
  sendAppointmentNotification,
};

