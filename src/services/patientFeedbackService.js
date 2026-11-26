/**
 * Patient Feedback Service
 * 
 * Provides client operations for submitting, updating, deleting patient feedback,
 * and allowing Clinic Managers to review and reply.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from '../config/api';

export const patientFeedbackService = {
  /**
   * Retrieves feedback list with optional filters.
   * 
   * @param {Object} params - rating, category, status, searchTerm
   * @returns {Promise<Object>} Response object
   */
  getFeedbacks: async (params = {}) => {
    try {
      const response = await api.get('/gateway/testorder/feedback', { params });
      return {
        success: true,
        data: response.data?.data || [],
        count: response.data?.count || 0
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi tải đánh giá phản hồi',
        data: [],
        count: 0
      };
    }
  },

  /**
   * Retrieves feedbacks submitted by a specific patient.
   * 
   * @param {string} patientId - Patient identifier
   * @returns {Promise<Object>} Feedbacks list
   */
  getPatientFeedbacks: async (patientId) => {
    try {
      const response = await api.get(`/gateway/testorder/feedback/patient/${patientId}`);
      return {
        success: true,
        data: response.data?.data || [],
        count: response.data?.count || 0
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
        count: 0
      };
    }
  },

  /**
   * Retrieves statistical summary for feedbacks.
   * 
   * @returns {Promise<Object>} Statistics
   */
  getStatistics: async () => {
    try {
      const response = await api.get('/gateway/testorder/feedback/statistics');
      return {
        success: true,
        data: response.data?.data || {}
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: {}
      };
    }
  },

  /**
   * Submits a new patient feedback entry.
   * 
   * @param {Object} payload - Feedback data
   * @returns {Promise<Object>} Result
   */
  createFeedback: async (payload) => {
    try {
      const response = await api.post('/gateway/testorder/feedback', payload);
      return {
        success: true,
        data: response.data?.data,
        message: 'Gửi đánh giá và góp ý thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi gửi đánh giá'
      };
    }
  },

  /**
   * Updates an existing feedback (by patient).
   * 
   * @param {string} id - Feedback ID
   * @param {Object} payload - Updates
   * @returns {Promise<Object>} Result
   */
  updateFeedback: async (id, payload) => {
    try {
      const response = await api.put(`/gateway/testorder/feedback/${id}`, payload);
      return {
        success: true,
        data: response.data?.data,
        message: 'Cập nhật đánh giá thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi cập nhật đánh giá'
      };
    }
  },

  /**
   * Submits a response to a feedback entry (by Clinic Manager).
   * 
   * @param {string} id - Feedback ID
   * @param {Object} payload - { response, respondedBy, status }
   * @returns {Promise<Object>} Result
   */
  respondToFeedback: async (id, payload) => {
    try {
      const response = await api.put(`/gateway/testorder/feedback/${id}/respond`, payload);
      return {
        success: true,
        data: response.data?.data,
        message: 'Gửi phản hồi cho bệnh nhân thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi gửi phản hồi'
      };
    }
  },

  /**
   * Deletes a feedback entry.
   * 
   * @param {string} id - Feedback ID
   * @returns {Promise<Object>} Result
   */
  deleteFeedback: async (id) => {
    try {
      await api.delete(`/gateway/testorder/feedback/${id}`);
      return {
        success: true,
        message: 'Xóa đánh giá thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi xóa đánh giá'
      };
    }
  },

  checkEligibility: async () => {
    try {
      const response = await api.get('/gateway/testorder/feedback/eligibility');
      return {
        success: true,
        data: response.data?.data || { isEligible: false }
      };
    } catch (error) {
      return {
        success: false,
        data: { isEligible: false, reason: error.response?.data?.message || 'Không thể kiểm tra điều kiện đánh giá.' }
      };
    }
  },

  /**
   * Public summary of star ratings and review counts grouped by service package.
   */
  getPackageRatings: async () => {
    try {
      const response = await api.get('/gateway/testorder/feedback/package-ratings');
      return {
        success: true,
        data: Array.isArray(response.data?.data) ? response.data.data : []
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || error.message || 'Lỗi tải đánh giá gói dịch vụ'
      };
    }
  },

  requestAdminDelete: async (id, reason) => {
    try {
      const response = await api.post(`/gateway/testorder/feedback/${id}/request-delete`, { reason });
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Đã gửi yêu cầu xóa đến bệnh nhân.'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi gửi yêu cầu xóa'
      };
    }
  },

  /**
   * Public anonymized reviews and rating summary for one service package.
   */
  getPackageFeedback: async (packageIdOrCode) => {
    try {
      const response = await api.get(`/gateway/testorder/feedback/packages/${encodeURIComponent(packageIdOrCode)}`);
      return {
        success: true,
        data: response.data?.data || null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || 'Lỗi tải đánh giá gói dịch vụ'
      };
    }
  },

  respondDeleteConsent: async (id, approved) => {
    try {
      const response = await api.post(`/gateway/testorder/feedback/${id}/consent-delete`, { approved });
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Đã cập nhật xác nhận.'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi xác nhận'
      };
    }
  },

  /**
   * Used/completed service package appointments eligible for patient feedback.
   */
  getMyEligiblePackages: async () => {
    try {
      const response = await api.get('/gateway/testorder/feedback/my-eligible-packages');
      return {
        success: true,
        data: Array.isArray(response.data?.data) ? response.data.data : []
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || error.message || 'Lỗi tải danh sách gói đã sử dụng'
      };
    }
  }
};

export function buildPackageRatingsMap(items = []) {
  const map = Object.create(null);
  for (const item of Array.isArray(items) ? items : []) {
    const keys = [item.key, item.servicePackageId, item.servicePackageCode].filter(Boolean);
    for (const k of keys) {
      map[String(k).trim().toLowerCase()] = item;
    }
  }
  return map;
}

export function lookupPackageRating(ratingsMap, pkg) {
  if (!ratingsMap || !pkg) return null;
  const candidates = [pkg.id, pkg._id, pkg.packageId, pkg.packageCode, pkg.code].filter(Boolean);
  for (const c of candidates) {
    const hit = ratingsMap[String(c).trim().toLowerCase()];
    if (hit) return hit;
  }
  return null;
}
