/** @file testHistoryApi.js
 * @description UC76 authenticated, read-only history. Values come only from the guarded detail endpoint.
 */
import api from '../../../config/api';
export async function getTestHistory(filters, signal) { return (await api.get('/test-history', { params: filters, signal })).data; }
export async function getTestHistoryDetail(id, signal) { return (await api.get(`/test-history/${encodeURIComponent(id)}`, { signal })).data; }
export function testHistoryError(error) {
  const data = error.response?.data;
  return data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || data?.title || 'Không thể tải lịch sử xét nghiệm. Vui lòng thử lại.';
}
