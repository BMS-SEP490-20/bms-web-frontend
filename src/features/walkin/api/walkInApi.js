/**
 * UC26 – Walk-in registration API.
 */
const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE = (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`) + '/walk-in';

function authHeaders() {
  const token = localStorage.getItem('bms_access_token') || localStorage.getItem('bms_token') || sessionStorage.getItem('bms_access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  try {
    res = await res;
  } catch (networkErr) {
    const error = new Error('Không thể kết nối đến máy chủ BMS (Network Error). Vui lòng kiểm tra kết nối mạng hoặc liên hệ quản trị viên.');
    error.status = 0;
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    let errMsg = '';

    // Priority 1: Extract field-specific errors if present
    if (err?.errors && typeof err.errors === 'object') {
      const fieldList = Object.entries(err.errors)
        .flatMap(([_, v]) => (Array.isArray(v) ? v : [v]))
        .filter(Boolean);
      if (fieldList.length > 0) {
        errMsg = fieldList.join('; ');
      }
    }

    // Priority 2: Use specific backend business message if not generic/technical
    const rawMsg = err?.message || err?.Message || err?.detail || err?.title;
    const isGenericOrTechnical = !rawMsg ||
      rawMsg === 'Dữ liệu không hợp lệ.' ||
      rawMsg === 'One or more validation errors occurred.' ||
      rawMsg.includes('An error occurred while processing') ||
      rawMsg.startsWith('HTTP ');

    if (!errMsg && !isGenericOrTechnical) {
      errMsg = rawMsg;
    }

    // Priority 3: Professional Vietnamese error messages according to healthcare standards & HTTP status codes
    if (!errMsg) {
      switch (res.status) {
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
          errMsg = err?.message || 'Thông tin người bệnh (CCCD hoặc Họ tên + SĐT + Ngày sinh) đã tồn tại trên hệ thống.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errMsg = 'Hệ thống máy chủ BMS đang gặp sự cố xử lý (Lỗi 500). Vui lòng thử lại sau giây lát hoặc báo quản trị viên.';
          break;
        default:
          errMsg = `Thao tác không thành công (Mã phản hồi: ${res.status}). Vui lòng thử lại.`;
          break;
      }
    }

    const error = new Error(errMsg);
    error.status = res.status;
    error.code = err?.code || `HTTP_${res.status}`;
    error.errors = err?.errors;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const walkInApi = {
  register(body) {
    return handle(
      fetch(`${BASE}/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
    );
  },
  lookupByIdentity(identityNumber) {
    return handle(
      fetch(`${BASE}/lookup/identity/${encodeURIComponent(identityNumber)}`, {
        headers: authHeaders(),
      })
    );
  },
  lookupByPhone(phone) {
    return handle(
      fetch(`${BASE}/lookup/phone/${encodeURIComponent(phone)}`, {
        headers: authHeaders(),
      })
    );
  },
};

export default walkInApi;
