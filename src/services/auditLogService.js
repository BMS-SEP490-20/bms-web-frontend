/**
 * Audit Log Service
 * 
 * Provides API access for viewing and querying security, access, and operational audit trails.
 * Accessible by Admin and Officer (Manager) roles.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from '../config/api';

export const auditLogService = {
  /**
   * Retrieves paginated list of audit logs with optional filters.
   * 
   * @param {Object} filter - Filter parameters
   * @returns {Promise<Object>} Response object
   */
  getAuditLogs: async (filter = {}) => {
    try {
      const response = await api.get('/gateway/testorder/auditlog', {
        params: {
          pageNumber: filter.pageNumber || filter.PageNumber || 1,
          pageSize: filter.pageSize || filter.PageSize || 100,
          category: filter.category && filter.category !== 'ALL' ? filter.category : undefined,
          severity: filter.severity && filter.severity !== 'ALL' ? filter.severity : undefined,
          status: filter.status && filter.status !== 'ALL' ? filter.status : undefined,
          searchTerm: filter.searchTerm || undefined,
        }
      });
      let rawData = response.data?.data;
      if (!Array.isArray(rawData)) {
        if (Array.isArray(rawData?.items)) rawData = rawData.items;
        else if (Array.isArray(response.data?.items)) rawData = response.data.items;
        else if (Array.isArray(response.data)) rawData = response.data;
        else rawData = [];
      }
      return {
        success: true,
        data: rawData,
        totalCount: response.data?.totalCount ?? rawData.length,
        pageNumber: response.data?.pageNumber || 1,
        pageSize: response.data?.pageSize || 100
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi tải nhật ký kiểm toán.',
        data: [],
        totalCount: 0
      };
    }
  },

  /**
   * Retrieves audit log statistical summary.
   * 
   * @returns {Promise<Object>} Statistics data
   */
  getStatistics: async () => {
    try {
      const response = await api.get('/gateway/testorder/auditlog/statistics');
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
   * Retrieves a single audit log entry by ID.
   * 
   * @param {string} id - Audit log identifier
   * @returns {Promise<Object>} Audit log details
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/auditlog/${id}`);
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
   * Dispatches a new audit log event.
   * 
   * @param {Object} payload - Audit payload
   * @returns {Promise<Object>} Created audit log
   */
  createAuditLog: async (payload) => {
    try {
      const response = await api.post('/gateway/testorder/auditlog', payload);
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }
};
