/**
 * UC26 – Walk-in registration API.
 * Uses centralized Axios client with automatic token injection and RFC 7807 error parsing.
 */
import api from '../../../config/api';

export const walkInApi = {
  async register(body) {
    try {
      const response = await api.post('/walk-in/register', body);
      return response.data;
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Không thể đăng ký hồ sơ khách vãng lai.';
      const error = new Error(errMsg);
      error.status = err?.response?.status;
      error.code = err?.response?.data?.code;
      throw error;
    }
  },

  async lookupByIdentity(identityNumber) {
    try {
      const response = await api.get(`/walk-in/lookup/identity/${encodeURIComponent(identityNumber)}`);
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        return { exists: false };
      }
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Không thể đối soát thông tin CCCD lúc này.';
      const error = new Error(errMsg);
      error.status = err?.response?.status;
      error.code = err?.response?.data?.code;
      throw error;
    }
  },

  async lookupByPhone(phone) {
    try {
      const response = await api.get(`/walk-in/lookup/phone/${encodeURIComponent(phone)}`);
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        return { exists: false };
      }
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Không thể tra cứu theo số điện thoại.';
      const error = new Error(errMsg);
      error.status = err?.response?.status;
      error.code = err?.response?.data?.code;
      throw error;
    }
  },
};
