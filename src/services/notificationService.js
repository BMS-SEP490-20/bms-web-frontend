/**
 * Notification Service
 * 
 * Provides client-side operations for fetching past system notifications,
 * tracking unread counts, and updating read statuses for Patients, Doctors, and Staff.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from '../config/api';

export const notificationService = {
  /**
   * Retrieves past notifications history for a specific user.
   * 
   * @param {string} userId - Recipient user identifier
   * @param {string} [role] - Optional user role (Patient, Doctor, Staff)
   * @returns {Promise<Object>} Response object containing notifications list
   */
  getUserNotifications: async (userId, role = '') => {
    try {
      const response = await api.get(`/gateway/testorder/notification/user/${userId}`, {
        params: { role }
      });
      const data = response.data?.data || response.data || [];
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi tải lịch sử thông báo',
        data: []
      };
    }
  },

  /**
   * Retrieves notifications by audience role.
   * 
   * @param {string} role - Audience role name
   * @returns {Promise<Object>} Response object containing notifications list
   */
  getNotificationsByRole: async (role) => {
    try {
      const response = await api.get(`/gateway/testorder/notification/role/${role}`);
      const data = response.data?.data || response.data || [];
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi tải thông báo theo vai trò',
        data: []
      };
    }
  },

  /**
   * Marks a specific notification as read.
   * 
   * @param {string} notificationId - Notification identifier
   * @returns {Promise<Object>} Success status
   */
  markAsRead: async (notificationId) => {
    try {
      await api.put(`/gateway/testorder/notification/${notificationId}/read`);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Marks all notifications for a specific user as read.
   * 
   * @param {string} userId - Recipient user identifier
   * @returns {Promise<Object>} Success status
   */
  markAllAsRead: async (userId) => {
    try {
      await api.put(`/gateway/testorder/notification/user/${userId}/read-all`);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};
