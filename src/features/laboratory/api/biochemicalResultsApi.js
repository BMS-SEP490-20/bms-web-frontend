/**
 * @file biochemicalResultsApi.js
 * @description API client for Look Up Biochemical Results (UC75 / BR-227 / BR-228).
 * Interacts with backend endpoint /api/test-results backed by MongoDB.
 */

import api from '../../../config/api';

/**
 * Tra cứu kết quả xét nghiệm theo barcode, mã mẫu, mã bệnh nhân hoặc từ khóa tìm kiếm.
 * @param {Object} params - { barcode, sampleId, patientId, search }
 * @returns {Promise<Object>}
 */
export const lookupTestResults = async (params = {}) => {
  const res = await api.get('/test-results', { params });
  return res.data;
};

/**
 * Lấy chi tiết kết quả xét nghiệm theo Result ID.
 * @param {string} id - Result ID (e.g. RES-20261009-001)
 * @returns {Promise<Object>}
 */
export const getTestResultById = async (id) => {
  const res = await api.get(`/test-results/${encodeURIComponent(id)}`);
  return res.data;
};
