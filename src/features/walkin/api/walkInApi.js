/**
 * UC26 – Walk-in registration API.
 * Uses centralized Axios client with automatic token injection and RFC 7807 / Vietnamese error parsing.
 */
import api from '../../../config/api';

function buildWalkInError(err, fallbackMsg) {
  if (!err?.response) {
    const netErr = new Error(
      'Không thể kết nối đến máy chủ BMS (Network Error). Vui lòng kiểm tra kết nối mạng hoặc liên hệ quản trị viên.'
    );
    netErr.status = 0;
    netErr.code = 'NETWORK_ERROR';
    return netErr;
  }

  const status = err.response.status;
  const data = err.response.data;
  let errMsg = '';

  if (data?.errors && typeof data.errors === 'object') {
    const fieldList = Object.entries(data.errors)
      .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
      .filter(Boolean);
    if (fieldList.length > 0) {
      errMsg = fieldList.join('; ');
    }
  }

  const rawMsg = data?.message || data?.Message || data?.detail || data?.title;
  const isGenericOrTechnical =
    !rawMsg ||
    rawMsg === 'Dữ liệu không hợp lệ.' ||
    rawMsg === 'One or more validation errors occurred.' ||
    String(rawMsg).includes('An error occurred while processing') ||
    String(rawMsg).startsWith('HTTP ');

  if (!errMsg && !isGenericOrTechnical) {
    errMsg = rawMsg;
  }

  if (!errMsg) {
    switch (status) {
      case 400:
        errMsg = 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
        break;
      case 401:
        errMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại hệ thống.';
        break;
      case 403:
        errMsg = 'Tài khoản không có quyền thao tác tiếp nhận bệnh nhân. Vui lòng sử dụng tài khoản Lễ tân.';
        break;
      case 404:
        errMsg = 'Không tìm thấy dữ liệu hoặc tài nguyên yêu cầu trên hệ thống.';
        break;
      case 409:
        errMsg = data?.message || 'Thông tin người bệnh (CCCD hoặc Họ tên + SĐT + Ngày sinh) đã tồn tại trên hệ thống.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errMsg = 'Hệ thống máy chủ BMS đang gặp sự cố xử lý (Lỗi 500). Vui lòng thử lại sau giây lát hoặc báo quản trị viên.';
        break;
      default:
        errMsg = fallbackMsg || `Thao tác không thành công (Mã phản hồi: ${status}). Vui lòng thử lại.`;
        break;
    }
  }

  const error = new Error(errMsg);
  error.status = status;
  error.code = data?.code || `HTTP_${status}`;
  error.errors = data?.errors;
  return error;
}

export const walkInApi = {
  async register(body) {
    try {
      const response = await api.post('/walk-in/register', body);
      return response.data;
    } catch (err) {
      throw buildWalkInError(err, 'Không thể đăng ký hồ sơ khách vãng lai.');
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
      throw buildWalkInError(err, 'Không thể đối soát thông tin CCCD lúc này.');
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
      throw buildWalkInError(err, 'Không thể tra cứu theo số điện thoại.');
    }
  },

  async lookupByEmail(email) {
    try {
      const response = await api.get('/walk-in/lookup/email', { params: { email } });
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        return { exists: false };
      }
      throw buildWalkInError(err, 'Không thể tra cứu theo địa chỉ email.');
    }
  },
};

export default walkInApi;
