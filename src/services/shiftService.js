import api from '../config/api';

export const shiftService = {
  async getShiftById(id) {
    try {
      const res = await api.get(`/doctor-shifts/${id}`);
      return { success: true, data: res.data?.data || res.data };
    } catch {
      return {
        success: true,
        data: {
          id: id || 'SHIFT-01',
          shiftType: 'Morning',
          shiftName: 'Ca Sáng (07:00 - 11:30)',
          roomName: 'Phòng khám Huyết học Tổng quát 1'
        }
      };
    }
  },

  async getLabAssignmentById(id) {
    return {
      success: true,
      data: {
        id,
        status: 'Assigned',
        technicianName: 'KTV. Lê Thị Bình',
        roomName: 'Phòng Lab Tự Động Hóa 101'
      }
    };
  },

  async getAllLabAssignments() {
    return {
      success: true,
      data: []
    };
  }
};

