/**
 * Shift Service
 * * Service for managing doctor shifts.
 * * Refactored to support DB Schema (TestOrderManagementDB):
 * - Table: Doctor_Shifts
 * - Columns: shift_id, doctor_id, shift_date, shift_start, shift_end, status
 * * This file also contains Lab Assignment APIs (lab-assignments) to keep
 * everything in a single service as requested.
 * @version 1.2.0
 */

import api from './api';

export const shiftService = {
  /**
   * Get All Shifts
   * Swagger: GET /gateway/testorder/doctorshift
   * Note: Backend có pagination, cần request với pageSize lớn để lấy tất cả shifts
   */
  getAllShifts: async () => {
    try {
      // Request với pageSize lớn để lấy tất cả shifts (backend có pagination mặc định pageSize=10)
      const response = await api.get('/gateway/testorder/doctorshift', {
        params: {
          page: 1,
          pageSize: 10000 // Request tất cả shifts
        }
      });
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách ca làm việc', data: [] };
    }
  },

  getShifts: async () => {
    return shiftService.getAllShifts();
  },

  getShiftById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/doctorshift/${id}`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin ca làm việc' };
    }
  },

  createShift: async (shiftData) => {
    try {
      const response = await api.post('/gateway/testorder/doctorshift', shiftData);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo ca làm việc mới' };
    }
  },

  updateShift: async (id, shiftData) => {
    try {
      const response = await api.put(`/gateway/testorder/doctorshift/${id}`, shiftData);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật ca làm việc' };
    }
  },

  deleteShift: async (id) => {
    try {
      await api.delete(`/gateway/testorder/doctorshift/${id}`);
      return { success: true };
    } catch (error) {
      
      let errorMessage = 'Lỗi xóa ca làm việc';
      if (error.response?.status === 404) {
        errorMessage = 'Không tìm thấy ca làm việc này. Có thể đã bị xóa trước đó.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Bạn không có quyền xóa ca làm việc này.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `Lỗi: ${error.message}`;
      }
      
      return { success: false, message: errorMessage };
    }
  },

  /**
   * Lấy ca làm việc theo ngày
   * Note: Client-side filter vì API lấy tất cả
   */
  getShiftsByDate: async (date) => {
    try {
      const result = await shiftService.getAllShifts();
      if (!result.success) return result;

      const normalizeDate = (dateValue) => {
        if (!dateValue) return null;
        if (typeof dateValue === 'string') {
          const dateStr = dateValue.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        }
        try {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        } catch (e) { return null; }
        return null;
      };

      const targetDate = normalizeDate(date);
      if (!targetDate) return { success: false, message: 'Ngày không hợp lệ', data: [] };

      const shifts = result.data.filter(shift => {
        const rawDate = shift.shiftDate || shift.ShiftDate || shift.shift_date || shift.date || shift.Date;
        const normalizedShiftDate = normalizeDate(rawDate);
        const matches = normalizedShiftDate === targetDate;
        return matches;
      });

      return { success: true, data: shifts };
    } catch (error) {
      return { success: false, message: 'Lỗi lọc ca theo ngày', data: [] };
    }
  },

  /**
   * Lấy ca làm việc theo User/Doctor ID
   */
  getShiftsByUser: async (userId) => {
    try {
      const result = await shiftService.getAllShifts();
      if (!result.success) return result;

      const shifts = result.data.filter(shift => {
        const shiftUserId = shift.doctorId || shift.DoctorId || shift.doctor_id || shift.userId || shift.UserId;
        return shiftUserId && String(shiftUserId) === String(userId);
      });

      return { success: true, data: shifts };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy ca làm việc của bác sĩ', data: [] };
    }
  },

  updateShiftStatus: async (id, status) => {
    try {
      const response = await api.put(`/gateway/testorder/doctorshift/${id}`, { status });
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái' };
    }
  },

  // ---------------------------
  // Lab Assignment APIs (kept here per request)
  // ---------------------------
  getAllLabAssignments: async () => {
    try {
      // Request với pageSize lớn để lấy tất cả lab assignments (backend có pagination mặc định pageSize=10)
      const response = await api.get('/gateway/testorder/lab-assignments', {
        params: {
          page: 1,
          pageSize: 10000 // Request tất cả lab assignments
        }
      });
      
      // Backend trả về format: { total, page, pageSize, data: [...] }
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      
      // Đảm bảo trả về array
      if (!Array.isArray(data)) {
        return { success: false, message: 'Dữ liệu không đúng format', data: [] };
      }
      
      return { success: true, data };
    } catch (error) {
      // Handle 404 gracefully - endpoint might not exist or no data available
      if (error.response?.status === 404) {
        return { success: true, data: [], message: 'Không có dữ liệu phân công Lab' };
      }
      return { success: false, message: 'Lỗi lấy danh sách phân công Lab', data: [] };
    }
  },

  getLabAssignmentById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/lab-assignments/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin phân công Lab' };
    }
  },

  createLabAssignment: async (payload) => {
    try {
      const response = await api.post('/gateway/testorder/lab-assignments', payload);
      
      // Backend trả về CreatedAtAction với object trực tiếp trong body
      // Format: { AssignmentId, LabUserId, LabRoomId, AssignmentDate, ShiftStart, ShiftEnd, Status, CreatedAt }
      let data = response.data;
      
      // Nếu response.data có property 'data', lấy nó (trường hợp wrap)
      if (response.data?.data && typeof response.data.data === 'object') {
        data = response.data.data;
      }
      
      // Đảm bảo data có AssignmentId (dấu hiệu thành công)
      if (!data || (!data.AssignmentId && !data.assignmentId && !data.id)) {
        return { 
          success: false, 
          message: 'Response từ server không đúng format. Không tìm thấy AssignmentId.',
          data: null 
        };
      }
      
      return { success: true, data };
    } catch (error) {
      let errorMessage = 'Lỗi tạo phân công Lab';
      
      if (error.response?.status === 500) {
        // Lỗi 500 - Internal Server Error
        const serverMessage = error.response?.data?.message || error.response?.data?.error || '';
        if (serverMessage.includes('entity changes') || serverMessage.includes('inner exception')) {
          errorMessage = 'Lỗi server khi lưu phân công Lab. Vui lòng kiểm tra dữ liệu và thử lại.';
        } else if (serverMessage) {
          errorMessage = `Lỗi server: ${serverMessage}`;
        } else {
          errorMessage = 'Lỗi server khi tạo phân công Lab. Vui lòng thử lại sau.';
        }
      } else if (error.response?.status === 400) {
        // Lỗi 400 - Bad Request
        errorMessage = error.response?.data?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Không tìm thấy endpoint. Vui lòng liên hệ quản trị viên.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `Lỗi: ${error.message}`;
      }
      
      return { success: false, message: errorMessage, data: null };
    }
  },

  updateLabAssignment: async (id, payload) => {
    try {
      const response = await api.put(`/gateway/testorder/lab-assignments/${id}`, payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật phân công Lab' };
    }
  },

  deleteLabAssignment: async (id) => {
    try {
      await api.delete(`/gateway/testorder/lab-assignments/${id}`);
      return { success: true };
    } catch (error) {
      
      let errorMessage = 'Lỗi xóa phân công Lab';
      if (error.response?.status === 404) {
        errorMessage = 'Không tìm thấy phân công Lab này. Có thể đã bị xóa trước đó.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Bạn không có quyền xóa phân công Lab này.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `Lỗi: ${error.message}`;
      }
      
      return { success: false, message: errorMessage };
    }
  },

  createLabAssignmentsBulk: async (payloadArray) => {
    try {
      const response = await api.post('/gateway/testorder/lab-assignments/bulk', payloadArray);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo phân công Lab (bulk)' };
    }
  },

  updateLabAssignmentStatus: async (id, status) => {
    try {
      const response = await api.put(`/gateway/testorder/lab-assignments/${id}`, { status });
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái phân công Lab' };
    }
  }
};
export default shiftService;