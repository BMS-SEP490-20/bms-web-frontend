/**
 * @fileoverview API client for UC16 – View Doctor Schedule.
 */

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