/** @file inventoryApi.js
 * @description UC56 read-only requests using the shared bearer-token client.
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

export function inventoryError(error) {
  const data = error.response?.data;
  return data?.errors ? Object.values(data.errors).flat().join(' ')
    : data?.message || data?.title || 'Không thể tải dữ liệu kho. Vui lòng thử lại.';
}
