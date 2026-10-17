/**
 * @file testCriterionService.js
 * @description API client service for laboratory test criteria lifecycle management (UC18).
 * Communicates directly with BMS Backend /api/v1/laboratory/criteria (and /api/laboratory/criteria).
 * Fetches and persists 100% real test parameters from MongoDB without dummy/mock fallbacks.
 * Conforms to: ISO 15189:2022, Decision 2429/QD-BYT & ADA Reference Standards.
 */

import api from '../config/api';

export const testCriterionService = {
  /**
   * Fetches paginated list of test criteria with search, category and status filters (UC18).
   *
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=10]
   * @param {string} [params.search='']
   * @param {string} [params.category='']
   * @param {boolean|null} [params.isActive=null]
   * @returns {Promise<{ currentPage: number, pageSize: number, totalCount: number, totalPages: number, items: Array }>}
   */
  async getCriteria({ page = 1, pageSize = 10, search = '', category = '', isActive = null } = {}) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (isActive !== null && isActive !== undefined) params.append('isActive', isActive);

    const response = await api.get(`/laboratory/criteria?${params.toString()}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không thể tải danh sách tiêu chí xét nghiệm từ máy chủ.');
  },

  /**
   * Retrieves single criterion details by identifier.
   *
   * @param {string} id - Criterion ID
   * @returns {Promise<object>} Criterion record
   */
  async getCriterionById(id) {
    const response = await api.get(`/laboratory/criteria/${id}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không tìm thấy thông tin tiêu chí xét nghiệm.');
  },

  /**
   * Creates a new clinical test parameter / criterion (UC18).
   *
   * @param {object} data - Payload
   * @returns {Promise<object>} Created record
   */
  async createCriterion(data) {
    const response = await api.post('/laboratory/criteria', data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Thêm mới tiêu chí xét nghiệm thất bại.');
  },

  /**
   * Updates an existing test parameter (UC18).
   *
   * @param {string} id - Criterion ID
   * @param {object} data - Update payload
   * @returns {Promise<object>} Updated record
   */
  async updateCriterion(id, data) {
    const response = await api.put(`/laboratory/criteria/${id}`, data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Cập nhật tiêu chí xét nghiệm thất bại.');
  },

  /**
   * Safely deactivates / soft-deletes an existing criterion (UC18).
   *
   * @param {string} id - Criterion ID
   * @returns {Promise<object>} Result
   */
  async deactivateCriterion(id) {
    const response = await api.delete(`/laboratory/criteria/${id}`);
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Hủy kích hoạt tiêu chí xét nghiệm thất bại.');
  },
};

export default testCriterionService;
