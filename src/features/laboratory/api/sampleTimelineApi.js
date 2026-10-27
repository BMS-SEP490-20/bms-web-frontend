/** @file sampleTimelineApi.js
 * @description Read-only UC71 requests using the existing authenticated HTTP client.
 */
import api from '../../../config/api';

export async function getTimelineSamples(filters, signal) {
  return (await api.get('/sample-timelines', { params: filters, signal })).data;
}
/** Exact sample ID/barcode; shared RFID tags are deliberately not sample identifiers. */
export async function getSampleTimeline(code, filters, signal) {
  return (await api.get(`/sample-timelines/${encodeURIComponent(code)}`, { params: filters, signal })).data;
}
/** Staff-only scan evidence. Tag-only readings do not establish this sample's custody. */
export async function getSampleTimelineRfid(code, filters, signal) {
  return (await api.get(`/sample-timelines/${encodeURIComponent(code)}/rfid`, { params: filters, signal })).data;
}
export function timelineError(error) {
  const data = error.response?.data;
  return data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || data?.title || 'Không thể tải hành trình mẫu. Vui lòng thử lại.';
}
