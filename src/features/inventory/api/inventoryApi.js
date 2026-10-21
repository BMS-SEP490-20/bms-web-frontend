/** @file inventoryApi.js
 * @description UC56 inventory requests using the shared bearer-token client.
 */
import api from '../../../config/api';

/** Loads a bounded, filtered page of existing reagent lots. */
export async function getInventory(filters, signal) {
  return (await api.get('/inventory', { params: filters, signal })).data;
}

/** Loads a lot and reagent-level stock movement history. */
export async function getInventoryDetail(id, signal) {
  return (await api.get(`/inventory/${encodeURIComponent(id)}`, { signal })).data;
}

/** Creates a lot with its opening balance; actor identity is supplied only by the server session. */
export async function createInventory(payload) {
  return (await api.post('/inventory', payload)).data;
}

/** Updates the viewed revision; the server rejects stale stock values with HTTP 409. */
export async function updateInventory(id, payload) {
  return (await api.put(`/inventory/${encodeURIComponent(id)}`, payload)).data;
}

/** Archives an empty lot with the confirmation's expected revision and reason. */
export async function deleteInventory(id, payload) {
  await api.delete(`/inventory/${encodeURIComponent(id)}`, { data: payload });
}

export function inventoryError(error) {
  const data = error.response?.data;
  return data?.errors ? Object.values(data.errors).flat().join(' ')
    : data?.message || data?.title || 'Không thể tải dữ liệu kho. Vui lòng thử lại.';
}
