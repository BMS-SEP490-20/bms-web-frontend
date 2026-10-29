/**
 * QC Flag Service
 * 
 * Provides client operations for inspecting, creating, updating, and deleting Quality Control (QC) flags.
 * Handled by Laboratory Users and Clinic Managers.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from '../config/api';

export const qcFlagService = {
  /**
   * Retrieves list of QC flags with optional filtering.
   * 
   * @param {Object} params - Filter options (status, severity, analyzerId, parameter)
   * @returns {Promise<Object>} Response object
   */
  getFlags: async (params = {}) => {
    try {
      const response = await api.get('/gateway/testorder/qcflag', { params });
      return {
        success: true,
        data: response.data?.data || [],
        count: response.data?.count || 0
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi tải danh sách cờ QC',
        data: [],
        count: 0
      };
    }
  },

  /**
   * Retrieves QC flag statistics summary.
   * 
   * @returns {Promise<Object>} Statistics
   */
  getStatistics: async () => {
    try {
      const response = await api.get('/gateway/testorder/qcflag/statistics');
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
   * Retrieves a single QC flag by ID.
   * 
   * @param {string} id - Flag ID
   * @returns {Promise<Object>} Flag detail
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/qcflag/${id}`);
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Creates a new QC flag record.
   * 
   * @param {Object} payload - Flag creation data
   * @returns {Promise<Object>} Created flag
   */
  createFlag: async (payload) => {
    try {
      const response = await api.post('/gateway/testorder/qcflag', payload);
      return {
        success: true,
        data: response.data?.data,
        message: 'Tạo cờ kiểm chuẩn QC thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi tạo cờ QC'
      };
    }
  },

  /**
   * Updates an existing QC flag (status, notes, resolution).
   * 
   * @param {string} id - Flag ID
   * @param {Object} payload - Update payload
   * @returns {Promise<Object>} Updated flag
   */
  updateFlag: async (id, payload) => {
    try {
      const response = await api.put(`/gateway/testorder/qcflag/${id}`, payload);
      return {
        success: true,
        data: response.data?.data,
        message: 'Cập nhật cờ kiểm chuẩn QC thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi cập nhật cờ QC'
      };
    }
  },

  /**
   * Deletes a QC flag record.
   * 
   * @param {string} id - Flag ID
   * @returns {Promise<Object>} Result status
   */
  deleteFlag: async (id) => {
    try {
      await api.delete(`/gateway/testorder/qcflag/${id}`);
      return {
        success: true,
        message: 'Xóa cờ kiểm chuẩn QC thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi xóa cờ QC'
      };
    }
  }
};
