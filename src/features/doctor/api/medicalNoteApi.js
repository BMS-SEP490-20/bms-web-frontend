/**
 * @file medicalNoteApi.js
 * @description UC51 requests through the shared authenticated BMS client.
 */
import api from '../../../config/api';

/** Loads an existing EMR and its bounded note history. */
export async function getMedicalNotes(recordId, page = 1, signal) {
  const response = await api.get('/medical-notes', {
    params: { recordId, page, pageSize: 20 }, signal,
  });
  return response.data;
}

/** Appends a note using the same submissionId when retrying unchanged content. */
export async function addMedicalNote(payload) {
  const response = await api.post('/medical-notes', payload);
  return response.data;
}

/** Extracts validation and ProblemDetails messages without exposing raw server responses. */
export function medicalNoteError(error) {
  const body = error.response?.data;
  if (body?.errors) return Object.values(body.errors).flat().join(' ');
  return body?.message || body?.title || 'Không thể kết nối hoặc xử lý yêu cầu. Vui lòng thử lại.';
}
