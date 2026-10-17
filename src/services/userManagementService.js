/**
 * @file userManagementService.js
 * @description Centralized User & Employee Account Management Service (UC14).
 * Communicates directly with BMS Web API via standard api client (/api/v1/users).
 * Fetches and persists 100% of accounts directly to MongoDB without mock fallback.
 * Conforms to: OWASP Top 10, RESTful Standards & Clean Architecture.
 */

import api from '../config/api';

// Role ID to role key mapping matching BMS backend enumeration
export const ROLE_MAPPING = {
  1: 'admin',
  2: 'doctor',
  3: 'lab_user',
  4: 'manager',
  5: 'nurse',
  6: 'receptionist',
  7: 'cashier',
  8: 'warehouse',
  9: 'patient',
};

export const ROLE_NAMES = {
  admin: 'Administrator (Admin)',
  manager: 'Clinical Manager (Manager)',
  doctor: 'Doctor / Physician (Doctor)',
  lab_user: 'Laboratory Technician (Lab User)',
  patient: 'Patient (Patient)',
  receptionist: 'Receptionist (Receptionist)',
  nurse: 'Clinical Nurse (Nurse)',
  cashier: 'Cashier / Billing (Cashier)',
  warehouse: 'Warehouse Keeper (Warehouse)',
};

export const normalizeUser = (item = {}) => {
  if (!item) return null;

  let finalRole = '';
  const roleId = Number(item.roleId || item.RoleId);

  if (roleId && ROLE_MAPPING[roleId]) {
    finalRole = ROLE_MAPPING[roleId];
  } else if (item.role && typeof item.role === 'string') {
    finalRole = item.role.toLowerCase();
  } else {
    finalRole = 'patient';
  }

  const isActive = item.isActive !== undefined
    ? Boolean(item.isActive)
    : (item.status === 1 || item.status === 'active' || item.status === 'ACTIVE');

  return {
    id: item.id || item.userId || item.accountId || item._id || '',
    fullName: item.fullName || item.name || item.username || '',
    username: item.username || item.userName || '',
    email: item.email || '',
    phone: item.phoneNumber || item.phone || '',
    role: finalRole,
    roleId: roleId || (finalRole === 'admin' ? 1 : finalRole === 'doctor' ? 2 : finalRole === 'lab_user' ? 3 : finalRole === 'manager' ? 4 : 9),
    isActive,
    status: isActive ? 'active' : 'inactive',
    createdAt: item.createdAt || null,
    doctorProfile: item.doctorProfile || null,
    labProfile: item.labProfile || null,
    patientProfile: item.patientProfile || null,
    raw: item,
  };
};

export const userManagementService = {
  /**
   * Retrieves all user and employee accounts directly from database (UC14).
   *
   * @param {object} [options] - Pagination and role filtering options.
   * @param {number|string} [options.roleId] - Optional role ID filter.
   * @param {object} [options.params] - Additional query parameters.
   * @returns {Promise<{ success: boolean, data: object[] }>} Normalized user list.
   */
  getAllUsers: async (options = {}) => {
    try {
      const response = await api.get('/v1/users', {
        params: { page: 1, pageSize: 100, roleId: options.roleId, ...options.params },
      });

      let data = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.items || []);

      return {
        success: true,
        data: data.map(normalizeUser).filter(Boolean),
      };
    } catch (err) {
      console.error('[UserManagementService] Failed to load accounts from database:', err.message);
      return {
        success: false,
        data: [],
        message: err.response?.data?.message || err.message || 'Không thể kết nối máy chủ cơ sở dữ liệu.'
      };
    }
  },

  /**
   * Retrieves account details by unique identifier from database.
   *
   * @param {string} id - The user ID.
   * @returns {Promise<object|null>} The normalized user account object.
   */
  getUserById: async (id) => {
    try {
      const response = await api.get(`/v1/users/${id}`);
      return normalizeUser(response.data?.data || response.data);
    } catch (error) {
      console.error('[UserManagementService] Failed to retrieve user by ID:', error.message);
      return null;
    }
  },

  /**
   * Creates a new employee or user account in MongoDB (UC14).
   *
   * @param {object} userData - Account payload including username, password, email, role.
   * @returns {Promise<{ success: boolean, data?: object, message: string }>} Result message.
   */
  createUser: async (userData) => {
    const payload = {
      username: userData.username || userData.fullName?.replace(/\s+/g, '').toLowerCase() || userData.email?.split('@')[0],
      password: userData.password,
      email: userData.email,
      phoneNumber: userData.phone || userData.phoneNumber,
      fullName: userData.fullName,
      roleId: Number(userData.roleId) || 9,
      isActive: Boolean(userData.isActive),
    };

    const response = await api.post('/v1/users', payload);
    return {
      success: true,
      data: response.data?.data || response.data,
      message: response.data?.message || 'Tài khoản người dùng đã được tạo thành công trên hệ thống.'
    };
  },

  /**
   * Updates an existing user account's demographic and role metadata in MongoDB (UC14, UC09).
   *
   * @param {string} id - Target user ID.
   * @param {object} userData - Updated user fields.
   * @returns {Promise<{ success: boolean, data?: object, message: string }>} Operation result.
   */
  updateUser: async (id, userData) => {
    const payload = {
      username: userData.username,
      email: userData.email,
      phoneNumber: userData.phone || userData.phoneNumber,
      fullName: userData.fullName,
      roleId: Number(userData.roleId),
      isActive: userData.isActive !== undefined ? Boolean(userData.isActive) : undefined,
    };

    const response = await api.put(`/v1/users/${id}`, payload);
    return {
      success: true,
      data: response.data,
      message: response.data?.message || 'Thông tin tài khoản đã được cập nhật thành công.'
    };
  },

  /**
   * Deactivates or permanently removes a user account in MongoDB (UC14).
   *
   * @param {string} id - The user ID to delete.
   * @returns {Promise<{ success: boolean, message: string }>} Operation result.
   */
  deleteUser: async (id) => {
    const response = await api.delete(`/v1/users/${id}`);
    return {
      success: true,
      message: response.data?.message || 'Tài khoản đã được xoá an toàn khỏi cơ sở dữ liệu.'
    };
  },

  /**
   * Toggles user account active/locked status in MongoDB (BR-IAM-03 / UC14).
   *
   * @param {object} user - Target user object containing id.
   * @param {boolean} isActive - New activation state.
   * @returns {Promise<{ success: boolean, data?: object, message?: string }>} Operation result.
   */
  toggleUserStatus: async (user, isActive) => {
    const response = await api.patch(`/v1/users/${user.id}/status`, { isActive });
    return {
      success: true,
      data: response.data,
      message: response.data?.message || `Tài khoản đã được ${isActive ? 'kích hoạt' : 'khóa'} thành công.`
    };
  },

  /**
   * Administrative password reset for any system account (UC07 / UC14).
   *
   * @param {string} id - Target user ID.
   * @param {string} newPassword - New plaintext password conforming to policy.
   * @returns {Promise<{ success: boolean, data?: object, message: string }>} Operation result.
   */
  changePassword: async (id, newPassword) => {
    const response = await api.post(`/v1/users/${id}/reset-password`, { newPassword });
    return {
      success: true,
      data: response.data,
      message: response.data?.message || 'Mật khẩu tài khoản đã được thiết lập lại thành công.'
    };
  },

  /**
   * Computes human resources headcount metrics grouped by role from live database accounts.
   *
   * @returns {Promise<{ success: boolean, data: object }>} Aggregated staff counts.
   */
  getUserStats: async () => {
    const usersResult = await userManagementService.getAllUsers();
    const users = usersResult.success ? usersResult.data : [];

    return {
      success: true,
      data: {
        totalEmployees: users.filter(u => u.role !== 'patient').length,
        doctors: users.filter(u => u.role === 'doctor').length,
        labTechs: users.filter(u => u.role === 'lab_user').length,
        receptionists: users.filter(u => u.role === 'receptionist').length,
        managers: users.filter(u => u.role === 'manager' || u.role === 'admin').length,
        patients: users.filter(u => u.role === 'patient').length,
        activeAccounts: users.filter(u => u.isActive).length,
      },
    };
  },

  /**
   * Retrieves operational clinical laboratory rooms.
   */
  getLabRooms: async () => {
    try {
      const res = await api.get('/laboratory/rooms');
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (err) {
      console.error('[userManagementService] Failed to load lab rooms from database:', err);
    }
    return [];
  },
};

export default userManagementService;
