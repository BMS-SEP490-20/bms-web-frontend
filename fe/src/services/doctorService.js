/**
 * Doctor Service
 * * Service for managing doctor profiles and rooms.
 * * NOTE: Doctor Shifts are handled in 'shiftService.js' to avoid duplication.
 * * @author Blood Laboratory Management Team
 * @version 1.1.0 (Refactored for Real Backend)
 */

import api from './api';

export const doctorService = {
  
  // =================================================================
  // 1. DOCTOR PROFILES (Bảng Doctors)
  // =================================================================

  /**
   * Get All Doctors
   * Swagger: GET /gateway/testorder/doctor
   */
  getAllDoctors: async (options = {}) => {
    try {
      const { page = 1, pageSize = 10 } = options.params || options;
      const response = await api.get('/gateway/testorder/doctor', {
        params: options.params || { page, pageSize }
      });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let p = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || pageSize;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/doctor', { params: { page: p, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            p += 1;
            if (p > 200) break;
          }
          return { success: true, data: collected, total: collected.length };
        } catch (e) {
        }
      }

      return { 
        success: true, 
        data: data,
        total: response.data?.total || data.length,
        page: response.data?.page || page
      };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách bác sĩ', data: [] };
    }
  },

  /**
   * Get Doctor By ID
   * Swagger: GET /gateway/testorder/doctor/{id}
   */
  getDoctorById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Doctor ID is required' };
      const response = await api.get(`/gateway/testorder/doctor/${id}`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin bác sĩ' };
    }
  },

  /**
   * Get Doctor By Email (Crucial for Auth Identity)
   * Swagger: GET /gateway/testorder/doctor/email/{email}
   */
  getDoctorByEmail: async (email) => {
    try {
      if (!email) return { success: false, message: 'Email is required' };
      // Backend trả về list bác sĩ có email này (thường là 1)
      const response = await api.get(`/gateway/testorder/doctor/email/${encodeURIComponent(email)}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi tìm bác sĩ theo email', data: [] };
    }
  },

  /**
   * Create Doctor
   * Swagger: POST /gateway/testorder/doctor
   */
  createDoctor: async (doctorData) => {
    try {
      const response = await api.post('/gateway/testorder/doctor', doctorData);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo bác sĩ mới' };
    }
  },

  /**
   * Update Doctor
   * Swagger: PUT /gateway/testorder/doctor/{id}
   */
  updateDoctor: async (id, doctorData) => {
    try {
      const response = await api.put(`/gateway/testorder/doctor/${id}`, doctorData);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật thông tin bác sĩ' };
    }
  },

  /**
   * Delete Doctor
   * Swagger: DELETE /gateway/testorder/doctor/{id}
   */
  deleteDoctor: async (id) => {
    try {
      await api.delete(`/gateway/testorder/doctor/${id}`);
      return { success: true, message: 'Xóa bác sĩ thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa bác sĩ' };
    }
  },

  // =================================================================
  // 2. DOCTOR ROOMS (Bảng Doctor_Rooms)
  // =================================================================

  /**
   * Get All Rooms
   * Swagger: GET /gateway/testorder/doctorroom
   */
  getAllDoctorRooms: async (options = {}) => {
    try {
      const { page = 1, pageSize = 10 } = options.params || options;
      const response = await api.get('/gateway/testorder/doctorroom', {
        params: options.params || { page, pageSize }
      });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let p = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || pageSize;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/doctorroom', { params: { page: p, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            p += 1;
            if (p > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
        }
      }

      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách phòng', data: [] };
    }
  },

  getDoctorRoomById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/doctorroom/${id}`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin phòng' };
    }
  },

  createDoctorRoom: async (roomData) => {
    try {
      const response = await api.post('/gateway/testorder/doctorroom', roomData);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo phòng mới' };
    }
  },

  updateDoctorRoom: async (id, roomData) => {
    try {
      const response = await api.put(`/gateway/testorder/doctorroom/${id}`, roomData);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật phòng' };
    }
  },

  deleteDoctorRoom: async (id) => {
    try {
      await api.delete(`/gateway/testorder/doctorroom/${id}`);
      return { success: true, message: 'Xóa phòng thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa phòng' };
    }
  }
};

export default doctorService;