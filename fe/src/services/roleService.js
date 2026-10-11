/**
 * Role Service
 * 
 * This service handles all role and permission-related operations including
 * role management, permission assignment, and access control.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';
import { ROLE_MAPPING, getRoleById, getRoleByKey, getRoleIdFromKey, getRoleKeyFromId } from '../features/users/utils/roleUtils';

/**
 * Role Service Object
 * 
 * Contains methods for role and permission management.
 * All methods return a standardized response object with success status and data/message.
 */
export const roleService = {
  /**
   * Get All Roles
   * 
   * Retrieves all roles from the database.
   * 
   * @returns {Promise<Object>} Response object with success status and roles
   */
  getAllRoles: async () => {
    try {
      const response = await api.get('/roles');
      // Ensure response.data is an array
      const data = Array.isArray(response.data) ? response.data : [];
      return { success: true, data };
    } catch (error) {
      // If 404 (not found), return default roles from roleUtils
      if (error.response && error.response.status === 404) {
        return { success: true, data: Object.values(ROLE_MAPPING) };
      }
      return { success: false, data: [], message: 'Lỗi lấy danh sách vai trò' };
    }
  },

  /**
   * Get Role by ID
   * 
   * @param {number} roleId - Role ID
   * @returns {Promise<Object>} Response object with success status and role data
   */
  getRoleById: async (roleId) => {
    try {
      const response = await api.get(`/roles/${roleId}`);
      return { success: true, data: response.data };
    } catch (error) {
      // If 404, try to get from roleUtils
      if (error.response && error.response.status === 404) {
        const role = getRoleById(roleId);
        return role ? { success: true, data: role } : { success: false, message: 'Không tìm thấy vai trò' };
      }
      return { success: false, message: 'Lỗi lấy thông tin vai trò' };
    }
  },
  /**
   * Get All Role Permissions
   * 
   * Retrieves all role permission configurations from the database.
   * 
   * @returns {Promise<Object>} Response object with success status and role permissions
   */
  getRolePermissions: async () => {
    try {
      const response = await api.get('/rolePermissions');
      // Ensure response.data is an array
      const data = Array.isArray(response.data) ? response.data : [];
      return { success: true, data };
    } catch (error) {
      // If 404 (not found), return empty array instead of error
      if (error.response && error.response.status === 404) {
        return { success: true, data: [] };
      }
      return { success: false, data: [], message: 'Lỗi lấy danh sách quyền hạn' };
    }
  },

  // Lấy quyền hạn của một role cụ thể
  getPermissionsByRole: async (role) => {
    try {
      const response = await api.get('/rolePermissions');
      const rolePermission = response.data.find(rp => rp.role === role);
      return { success: true, data: rolePermission };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy quyền hạn theo role' };
    }
  },

  // Cập nhật quyền hạn của role
  updateRolePermissions: async (role, permissions) => {
    try {
      const response = await api.put(`/rolePermissions/${role}`, { permissions });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật quyền hạn' };
    }
  },

  // Lấy tất cả users
  // Note: /users endpoint not available - use /gateway/admin/accounts (requires JWT)
  getAllUsers: async (options = {}) => {
    try {
      // Use admin accounts endpoint (requires authentication)
      const response = await api.get('/gateway/admin/accounts', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/admin/accounts', { params: { page, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
        }
      }

      return { success: true, data: data };
    } catch (error) {
      // Nếu là 404 hoặc 401 (không tìm thấy hoặc không có quyền), trả về mảng rỗng
      if (error.response && (error.response.status === 404 || error.response.status === 401)) {
        return { success: true, data: [] };
      }
      return { success: false, message: 'Lỗi lấy danh sách users: ' + (error.message || error), data: [] };
    }
  },

  // Lấy users theo role
  getUsersByRole: async (role) => {
    try {
      // Use admin accounts endpoint (requires authentication)
      const response = await api.get('/gateway/admin/accounts');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const users = (data || []).filter(user => {
        const userRole = user.role || user.roleId;
        return userRole === role || String(userRole) === String(role);
      });
      return { success: true, data: users };
    } catch (error) {
      // Nếu là 404 hoặc 401 (không tìm thấy hoặc không có quyền), trả về mảng rỗng
      if (error.response && (error.response.status === 404 || error.response.status === 401)) {
        return { success: true, data: [] };
      }
      return { success: false, message: 'Lỗi lấy users theo role: ' + (error.message || error) };
    }
  },

  // Cập nhật role của user
  updateUserRole: async (userId, newRole) => {
    try {
      const response = await api.patch(`/users/${userId}`, { role: newRole });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật role user' };
    }
  },

  // Tạo user mới
  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo user mới' };
    }
  },

  // Cập nhật user
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật user' };
    }
  },

  // Xóa user
  deleteUser: async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa user' };
    }
  }
};
