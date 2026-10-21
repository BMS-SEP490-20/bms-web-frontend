/** @file labProfileApi.js
 * @description UC61 requests through the shared authenticated API client.
 */
import api from '../../../config/api';

export async function getLabProfiles(filters, signal) {
  return (await api.get('/lab-profiles', { params: filters, signal })).data;
}
export async function getLabProfile(id, signal) {
  return (await api.get(`/lab-profiles/${encodeURIComponent(id)}`, { signal })).data;
}
export async function getLabProfileRooms(signal) {
  return (await api.get('/lab-profiles/rooms', { signal })).data;
}
export function labProfileError(error) {
  const data = error.response?.data;
  return data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || data?.title || 'Không thể xử lý hồ sơ Lab. Vui lòng thử lại.';
}
export async function getLabProfileAccounts(filters, signal) {
  return (await api.get('/lab-profiles/accounts', { params: filters, signal })).data;
}
/** Creates professional details for an existing account; a reserved identity returns HTTP 409. */
export async function createLabProfile(input) {
  return (await api.post('/lab-profiles', input)).data;
}
/** Sends the viewed revision and reason so the server can reject stale edits. */
export async function updateLabProfile(id, input) {
  return (await api.put(`/lab-profiles/${encodeURIComponent(id)}`, input)).data;
}
/** Archives with the viewed revision and reason; active assignments can prevent deletion. */
export async function deleteLabProfile(id, input) {
  return (await api.delete(`/lab-profiles/${encodeURIComponent(id)}`, { data: input })).data;
}
