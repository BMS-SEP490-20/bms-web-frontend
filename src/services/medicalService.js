import api from '../config/api';

export const medicalService = {
  async getAllServices() {
    try {
      const res = await api.get('/service-packages');
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
      return { success: true, data: list };
    } catch {
      return { success: true, data: [] };
    }
  },

  async getServiceById(id) {
    try {
      const res = await api.get(`/service-packages/${id}`);
      return { success: true, data: res.data?.data || res.data };
    } catch {
      return { success: false, data: null };
    }
  }
};

