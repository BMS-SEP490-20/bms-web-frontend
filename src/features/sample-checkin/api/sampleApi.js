/**
 * @file sampleApi.js
 * @description API client for laboratory sample check-in, barcode scanning, and counter verification (UC41).
 * Conforms to: ISO 15189:2022, Production Medical Standards & AGENTS-CODE.md.
 */

import api from '../../../config/api';

export const sampleApi = {
  /**
   * Cập nhật tiếp nhận hoặc từ chối ống mẫu tại bàn giao Lab
   */
  async checkIn({
    code,
    labRoomId,
    rejectionCode,
    rejectionNote,
    notes,
    technicianId,
    technicianName,
    handoverBy,
    handoverById
  }) {
    const isReject = Boolean(rejectionCode);
    const payload = {
      status: isReject ? 'Rejected' : 'Received',
      technicianId: technicianId || undefined,
      technicianName: technicianName || undefined,
      handoverBy: handoverBy || undefined,
      handoverById: handoverById || undefined,
      rejectionReason: isReject ? `${rejectionCode}: ${rejectionNote || ''}`.trim() : undefined,
      labRoom: labRoomId || 'LAB-ROOM-01',
      notes: notes || (isReject ? 'Mẫu bị từ chối tiếp nhận tại Lab' : 'Tiếp nhận ống mẫu thành công vào phòng xét nghiệm'),
      timestamp: new Date().toISOString()
    };

    try {
      const res = await api.put(`/laboratory/samples/${encodeURIComponent(code)}/status`, payload);
      return res.data?.data || res.data;
    } catch (err) {
      // Fallback to legacy endpoint if present
      try {
        const fallback = await api.post('/samples/check-in', {
          code,
          labRoomId,
          rejectionCode,
          rejectionNote
        });
        return fallback.data?.data || fallback.data;
      } catch {
        const message = err.response?.data?.message || err.response?.data?.detail || err.response?.data?.title || err.message || 'Lỗi khi tiếp nhận mẫu tại Lab.';
        throw new Error(message);
      }
    }
  },

  /**
   * Tra cứu thông tin mẫu theo Barcode hoặc ID
   */
  async lookup(code) {
    if (!code || !code.trim()) {
      throw new Error('Vui lòng quét hoặc nhập mã Barcode ống mẫu.');
    }
    try {
      const res = await api.get(`/laboratory/samples/${encodeURIComponent(code.trim())}`);
      const sample = res.data?.data || res.data;
      if (!sample) {
        throw new Error(`Không tìm thấy mẫu xét nghiệm với mã "${code}".`);
      }
      return sample;
    } catch (err) {
      try {
        const fallback = await api.get(`/samples/lookup/${encodeURIComponent(code.trim())}`);
        return fallback.data?.data || fallback.data;
      } catch {
        const message = err.response?.data?.title || err.response?.data?.message || err.message || `Không tìm thấy mẫu "${code}".`;
        throw new Error(message);
      }
    }
  },

  /**
   * Lấy danh sách mẫu đang chờ tiếp nhận (Collected / InTransit)
   */
  async pending() {
    try {
      const res = await api.get('/laboratory/samples/queue', {
        params: {
          page: 1,
          pageSize: 50
        }
      });
      const list = res.data?.data || [];
      if (!Array.isArray(list)) return [];
      // Filter samples awaiting reception
      return list.filter(s => s.status === 'Collected' || s.status === 'InTransit' || s.status === 'PendingCollection');
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách nhân sự lâm sàng & KTV xét nghiệm từ cơ sở dữ liệu (Người bàn giao / KTV tiếp nhận)
   */
  async getStaff() {
    try {
      const res = await api.get('/laboratory/samples/staff');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách phòng xét nghiệm từ cơ sở dữ liệu
   */
  async getLabRooms() {
    try {
      const res = await api.get('/laboratory/rooms');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },
};

export default sampleApi;
