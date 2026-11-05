/**
 * UC21 & UC23 – Appointment API Client.
 * Connects directly to BMS Backend AppointmentsController using the unified Axios instance.
 * Automatically injects JWT Bearer tokens and handles token refreshes.
 */

import api from '../../../config/api';

export async function bookAppointment(payload) {
  const res = await api.post('/appointments', payload);
  return res.data;
}

export async function getAvailableSlots(doctorId, date) {
  const res = await api.get('/appointments/slots', { params: { doctorId, date } });
  return res.data;
}

export async function getAvailableDoctors(date, specialty) {
  const params = { date };
  if (specialty) params.specialty = specialty;
  const res = await api.get('/appointments/doctors', { params });
  return res.data;
}

export async function getAppointments(params = {}) {
  const res = await api.get('/appointments', { params });
  return res.data;
}

export async function getAppointmentConfirmation(idOrCode) {
  const res = await api.get(`/appointments/${encodeURIComponent(idOrCode)}/confirmation`);
  return res.data;
}

export async function getAppointmentDetail(id) {
  const res = await api.get(`/appointments/${id}/detail`);
  return res.data;
}

export async function getPatientAppointments(patientId, params = {}) {
  const res = await api.get(`/appointments/patient/${patientId}`, { params });
  return res.data;
}

export async function sendAppointmentNotification(id, payload) {
  const res = await api.post(`/appointments/${encodeURIComponent(id)}/notify`, payload ?? { channel: 1, type: 1 });
  return res.data;
}

export async function updateAppointment(id, payload) {
  const res = await api.put(`/appointments/${encodeURIComponent(id)}`, payload);
  return res.data;
}

export async function cancelAppointment(id, notes = 'Hết hạn giữ chỗ 15 phút') {
  const res = await api.put(`/appointments/${encodeURIComponent(id)}`, {
    status: 'Cancelled',
    notes
  });
  return res.data;
}

export const appointmentApi = {
  book: bookAppointment,
  getAvailableSlots,
  getAvailableDoctors,
  getAppointments,
  getAppointmentDetail,
  getPatientAppointments,
  getAppointmentConfirmation,
  sendAppointmentNotification,
  updateAppointment,
  cancelAppointment,
};

export default appointmentApi;
