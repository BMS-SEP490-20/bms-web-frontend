/**
 * @file referenceIntervalService.js
 * @description API client service for Biological Reference Intervals management and evaluation (UC57).
 * Communicates directly with BMS Backend /api/reference-intervals endpoints using centralized Axios client.
 * Conforms to: BR-LAB-02, BR-LAB-03, ISO 15189:2022 & Decision 2429/QD-BYT.
 */

import api from '../config/api';

export const referenceIntervalService = {
  /**
   * Fetches paginated list of reference intervals with search and demographic filters (UC57).
   *
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=15]
   * @param {string} [params.criterionCode='']
   * @param {string} [params.gender='']
   * @param {boolean|null} [params.isActive=null]
   * @returns {Promise<{ currentPage: number, pageSize: number, totalCount: number, totalPages: number, items: Array }>}
   */
  async getIntervals({ page = 1, pageSize = 15, criterionCode = '', gender = '', isActive = null } = {}) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);
    if (criterionCode) params.append('criterionCode', criterionCode.trim());
    if (gender && gender !== 'ALL') params.append('gender', gender.trim());
    if (isActive !== null && isActive !== undefined) params.append('isActive', isActive);

    const response = await api.get(`/reference-intervals?${params.toString()}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không thể tải danh sách khoảng tham chiếu từ máy chủ.');
  },

  /**
   * Retrieves all reference intervals configured for a specific criterion code.
   *
   * @param {string} criterionCode
   * @param {boolean} [activeOnly=true]
   * @returns {Promise<Array>}
   */
  async getIntervalsByCriterion(criterionCode, activeOnly = true) {
    const response = await api.get(`/reference-intervals/criterion/${encodeURIComponent(criterionCode)}?activeOnly=${activeOnly}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || `Không thể tải khoảng tham chiếu cho chỉ số ${criterionCode}.`);
  },

  /**
   * Retrieves single reference interval details by ID.
   *
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getIntervalById(id) {
    const response = await api.get(`/reference-intervals/${encodeURIComponent(id)}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không tìm thấy thông tin khoảng tham chiếu.');
  },

  /**
   * Creates a new biological reference interval (UC57).
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createInterval(data) {
    const response = await api.post('/reference-intervals', data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Thêm mới khoảng tham chiếu thất bại.');
  },

  /**
   * Updates an existing reference interval (UC57).
   *
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateInterval(id, data) {
    const response = await api.put(`/reference-intervals/${encodeURIComponent(id)}`, data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Cập nhật khoảng tham chiếu thất bại.');
  },

  /**
   * Safely deactivates / soft-locks an interval preserving test history.
   *
   * @param {string} id
   * @returns {Promise<object>}
   */
  async deactivateInterval(id) {
    const response = await api.delete(`/reference-intervals/${encodeURIComponent(id)}`);
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Khóa khoảng tham chiếu thất bại.');
  },

  /**
   * Evaluates a test result against configured biological reference intervals (BR-LAB-02 / BR-LAB-03).
   *
   * @param {object} payload
   * @param {string} payload.criterionCode
   * @param {number|null} [payload.numericValue]
   * @param {string|null} [payload.textValue]
   * @param {number} payload.patientAge
   * @param {string} [payload.patientAgeUnit='Years']
   * @param {string} payload.patientGender
   * @param {string} [payload.condition='General']
   * @returns {Promise<object>}
   */
  async evaluateResult(payload) {
    const response = await api.post('/reference-intervals/evaluate', payload);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không thể đánh giá chỉ số.');
  },
};

export default referenceIntervalService;
