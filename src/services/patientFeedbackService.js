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
  }
};
