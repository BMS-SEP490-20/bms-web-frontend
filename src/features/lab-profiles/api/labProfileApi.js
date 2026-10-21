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
  return data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || data?.title || 'Không thể tải hồ sơ Lab. Vui lòng thử lại.';
}
