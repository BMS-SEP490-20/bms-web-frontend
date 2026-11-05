import api from '../config/api';

export const doctorService = {
  async getAllDoctorRooms(params = {}) {
    try {
      const res = await api.get('/facilities/rooms', { params });
      return { success: true, data: res.data?.data || res.data || [] };
    } catch {
      return {
        success: true,
        data: [
          { id: 'ROOM-101', name: 'Phòng khám Huyết học Tổng quát 1', roomNumber: '101', floor: 'Tầng 1 - Khu A' },
          { id: 'ROOM-102', name: 'Phòng Lấy Mẫu & Khám Chuyên Sâu 102', roomNumber: '102', floor: 'Tầng 1 - Khu A' },
          { id: 'ROOM-103', name: 'Phòng Tư Vấn Kết Quả & Xét Nghiệm Nhanh', roomNumber: '103', floor: 'Tầng 1 - Khu A' }
        ]
      };
    }
  }
};

