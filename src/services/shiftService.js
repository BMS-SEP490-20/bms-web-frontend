import api from '../config/api';

export const shiftService = {
  async getShiftById(id) {
    if (!id) return { success: false, data: null };
    try {
      const res = await api.get(`/shifts/${encodeURIComponent(id)}`);
      return { success: true, data: res.data?.data || res.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Không thể tải thông tin ca trực.',
        data: null
      };
    }
  },

  async getLabAssignmentById(id) {
    return {
      success: false,
      data: null
    };
  },

  async getAllLabAssignments() {
    return {
      success: true,
      data: []
    };
  }
};

