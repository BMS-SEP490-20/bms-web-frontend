/**
 * @fileoverview API client for UC16 – View Doctor Schedule & Shifts CRUD (View, Create, Update, Delete Shifts).
 */
import api from '../../../config/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Fetches the doctor schedule day-view grid.
 *
 * @param {Object} [params]
 * @param {string} [params.date] - yyyy-MM-dd
 * @param {string} [params.doctorId]
 * @param {string} [params.search]
 * @returns {Promise<Object>} DoctorScheduleResponseDto
 */
export async function fetchDoctorSchedule({ date, doctorId, search } = {}) {
  const query = new URLSearchParams();
  if (date) query.set('date', date);
  if (doctorId) query.set('doctorId', doctorId);
  if (search) query.set('search', search);

  const url = `${API_BASE}/api/v1/schedules/doctors${query.toString() ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to load doctor schedule (${response.status}): ${body || response.statusText}`);
  }

  return response.json();
}

/**
 * View Shifts - Query paginated list of shifts with filters.
 * GET /api/shifts
 */
export async function fetchShifts(params = {}) {
  const cleanParams = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  });
  const res = await api.get('/shifts', { params: cleanParams });
  return res.data;
}

/**
 * View Shift Detail by ID.
 * GET /api/shifts/{id}
 */
export async function fetchShiftById(id) {
  const res = await api.get(`/shifts/${encodeURIComponent(id)}`);
  return res.data;
}

/**
 * Create Shift.
 * POST /api/shifts
 */
export async function createShift(payload) {
  const res = await api.post('/shifts', payload);
  return res.data;
}

/**
 * Update Shift.
 * PUT /api/shifts/{id}
 */
export async function updateShift(id, payload) {
  const res = await api.put(`/shifts/${encodeURIComponent(id)}`, payload);
  return res.data;
}

/**
 * Delete Shift.
 * DELETE /api/shifts/{id}
 */
export async function deleteShift(id) {
  const res = await api.delete(`/shifts/${encodeURIComponent(id)}`);
  return res.data;
}