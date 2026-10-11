/**
 * Patient Service
 * 
 * This service handles all patient-related operations including
 * CRUD operations, search functionality, and patient data management.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';

/**
 * Normalize patient data from API response
 * Ensures consistent field names across different API response formats
 */
const normalizePatient = (item = {}) => {
  if (!item) return null;

  // Normalize dateOfBirth from various field names
  let dateOfBirth = item.dateOfBirth || item.DateOfBirth || item.date_of_birth ||
    item.dob || item.Dob || item.DOB || null;

  // If dateOfBirth is a string, try to parse it
  if (dateOfBirth && typeof dateOfBirth === 'string') {
    const parsed = new Date(dateOfBirth);
    if (!isNaN(parsed.getTime())) {
      dateOfBirth = parsed.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }
  }

  // Normalize gender from various field names and values
  let gender = item.gender || item.Gender || item.sex || item.Sex || '';
  if (gender) {
    const genderLower = String(gender).toLowerCase().trim();
    // Map various gender values to standard format
    if (genderLower === 'male' || genderLower === 'nam' || genderLower === 'm') {
      gender = 'male';
    } else if (genderLower === 'female' || genderLower === 'nữ' || genderLower === 'nu' || genderLower === 'f') {
      gender = 'female';
    } else if (genderLower === 'unknown' || genderLower === 'không rõ' || genderLower === 'other' || genderLower === 'khác') {
      gender = 'unknown';
    } else {
      // Keep original value if not recognized
      gender = genderLower;
    }
  }

  return {
    id: item.id || item.Id || item.patientId || item.PatientId || item.patient_id || '',
    fullName: item.fullName || item.FullName || item.fullname || item.full_name || item.name || item.Name || '',
    dateOfBirth: dateOfBirth,
    dob: dateOfBirth, // Alias for backward compatibility
    gender: gender,
    phone: item.phone || item.Phone || item.phoneNumber || item.phone_number || item.mobile || '',
    email: item.email || item.Email || item.emailAddress || item.email_address || '',
    address: item.address || item.Address || item.addr || '',
    bloodType: item.bloodType || item.BloodType || item.blood_type || item.bloodGroup || '',
    identityNumber: item.identityNumber || item.IdentityNumber || item.identity_number || item.idCard || '',
    createdAt: item.createdAt || item.CreatedAt || item.created_at || item.dateCreated || null,
    updatedAt: item.updatedAt || item.UpdatedAt || item.updated_at || item.dateUpdated || null,
    raw: item // Keep raw data for reference
  };
};

/**
 * Patient Service Object
 * 
 * Contains methods for patient data management and operations.
 * All methods return a standardized response object with success status and data/message.
 */
export const patientService = {
  /**
   * Get All Patients
   * 
   * Retrieves a list of all patients from the database.
   * 
   * @returns {Promise<Object>} Response object with success status and patient list
   */
  getAllPatients: async (options = {}) => {
    try {
      const {
        page = 1,
        pageSize = 1000
      } = options;

      const response = await api.get('/gateway/patients', {
        params: options.params || { page, pageSize }
      });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let p = 1;
          const MAX_PAGES = 100; // Giới hạn tối đa để tránh load quá nhiều
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || pageSize;
          while (p <= MAX_PAGES) {
            const pagedResp = await api.get('/gateway/patients', { params: { page: p, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) {
              const normalized = normalizePatient(it);
              if (normalized) collected.push(normalized);
            }
            if (pageData.length < respPageSize) break;
            p += 1;
          }
          return { success: true, data: collected, page: 1, pageSize: respPageSize, total: collected.length };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      // Normalize data before returning
      const normalizedData = Array.isArray(data)
        ? data.map(item => normalizePatient(item)).filter(Boolean)
        : [];

      return {
        success: true,
        data: normalizedData,
        page: response.data?.page || page,
        pageSize: response.data?.pageSize || pageSize,
        total: response.data?.total || normalizedData.length
      };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi lấy danh sách bệnh nhân' };
    }
  },

  // Lấy thông tin bệnh nhân theo ID
  getPatientById: async (id) => {
    try {
      const response = await api.get(`/gateway/patients/id/${id}`);
      const rawData = response.data?.data || response.data;
      const normalized = normalizePatient(rawData);
      return { success: true, data: normalized || rawData };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin bệnh nhân' };
    }
  },

  // Lấy thông tin bệnh nhân theo email
  getPatientByEmail: async (email) => {
    try {
      const response = await api.get(`/gateway/patients/email/${encodeURIComponent(email)}`);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi lấy thông tin bệnh nhân theo email';
      const errorStatus = error.response?.status;

      // Return success: false với message chi tiết
      return {
        success: false,
        message: errorMessage,
        status: errorStatus,
        data: null
      };
    }
  },

  // Tìm kiếm bệnh nhân
  searchPatients: async (query) => {
    try {
      const response = await api.get(`/gateway/patients/search?key=${encodeURIComponent(query)}`);
      const rawData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const normalizedData = Array.isArray(rawData)
        ? rawData.map(item => normalizePatient(item)).filter(Boolean)
        : [];
      return { success: true, data: normalizedData };
    } catch (error) {
      return { success: false, message: 'Lỗi tìm kiếm bệnh nhân' };
    }
  },

  // Tạo bệnh nhân mới
  createPatient: async (patientData) => {
    try {
      // Primary: try the /register path first because gateway maps POST /gateway/patients/register
      try {
        const regResp = await api.post('/gateway/patients/register', patientData).catch(e => e.response);
        if (regResp && (regResp.status === 200 || regResp.status === 201 || regResp.data)) {
          const data = regResp.data?.data || regResp.data;
          return { success: true, data, raw: regResp.data, status: regResp.status };
        }
        // If register returned but not successful, capture for diagnostics and continue to try primary endpoint
        var primaryErrorResponse = regResp;
      } catch (regErr) {
        var primaryErrorResponse = regErr.response;
      }

      // Secondary: try legacy /gateway/patients path if register didn't succeed
      try {
        const resp = await api.post('/gateway/patients', patientData).catch(e => e.response);
        if (resp && (resp.status === 200 || resp.status === 201 || resp.data)) {
          const data = resp.data?.data || resp.data;
          return { success: true, data, raw: resp.data, status: resp.status };
        }
        // If this also failed, return the more informative error (register or this one)
        const errSource = (primaryErrorResponse && primaryErrorResponse.data) ? primaryErrorResponse : resp;
        const errMsg = (errSource && (errSource.data?.message || errSource.data)) || 'Unknown error creating patient';
        return { success: false, message: String(errMsg), raw: errSource };
      } catch (primaryErr) {
        const errMsg = primaryErr.response?.data?.message || primaryErr.message || 'Lỗi tạo bệnh nhân mới';
        return { success: false, message: errMsg, raw: primaryErr.response };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message || 'Lỗi tạo bệnh nhân mới' };
    }
  },

  // Cập nhật thông tin bệnh nhân
  updatePatient: async (id, patientData) => {
    try {
      const response = await api.put(`/gateway/patients/${id}`, patientData);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật thông tin bệnh nhân' };
    }
  },

  // Xóa bệnh nhân
  deletePatient: async (id) => {
    try {
      await api.delete(`/gateway/patients/${id}`);
      return { success: true, message: 'Xóa bệnh nhân thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa bệnh nhân' };
    }
  },

  // Lấy lịch sử khám của bệnh nhân
  getPatientHistory: async (patientId) => {
    try {
      const [appointmentsResponse, labTestsResponse] = await Promise.all([
        api.get(`/gateway/testorder/appointment/patient/${patientId}`),
        api.get(`/gateway/patients/lab-tests/search?key=${patientId}`)
      ]);

      const appointments = Array.isArray(appointmentsResponse.data)
        ? appointmentsResponse.data
        : (appointmentsResponse.data?.data || []);
      const labTests = Array.isArray(labTestsResponse.data)
        ? labTestsResponse.data
        : (labTestsResponse.data?.data || []);

      return {
        success: true,
        data: {
          appointments,
          labTests
        }
      };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch sử bệnh nhân' };
    }
  },

  // ============ MEDICAL RECORDS OPERATIONS ============
  // GET /gateway/patients/medical-records
  getAllMedicalRecords: async (options = {}) => {
    try {
      const response = await api.get('/gateway/patients/medical-records', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let p = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/patients/medical-records', { params: { page: p, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            p += 1;
            if (p > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách hồ sơ bệnh án', data: [] };
    }
  },

  // GET /gateway/patients/medical-records/{id}
  getMedicalRecordById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const response = await api.get(`/gateway/patients/medical-records/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin hồ sơ bệnh án' };
    }
  },

  // GET /gateway/patients/medical-records/by-patient/{patientId}
  getMedicalRecordsByPatient: async (patientId) => {
    try {
      if (!patientId) return { success: false, message: 'Missing patientId' };
      const response = await api.get(`/gateway/patients/medical-records/by-patient/${patientId}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data };
    } catch (error) {
      // Handle 404 như trường hợp hợp lệ (không có data)
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      return { success: false, message: 'Lỗi lấy hồ sơ bệnh án theo bệnh nhân', data: [] };
    }
  },

  // GET /gateway/patients/medical-records/search
  searchMedicalRecords: async (query) => {
    try {
      const response = await api.get(`/gateway/patients/medical-records/search?key=${encodeURIComponent(query)}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi tìm kiếm hồ sơ bệnh án', data: [] };
    }
  },

  // POST /gateway/patients/medical-records
  createMedicalRecord: async (payload) => {
    try {
      const response = await api.post('/gateway/patients/medical-records', payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo hồ sơ bệnh án mới' };
    }
  },

  // PUT /gateway/patients/medical-records/{id}
  updateMedicalRecord: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const response = await api.put(`/gateway/patients/medical-records/${id}`, payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật hồ sơ bệnh án' };
    }
  },

  // DELETE /gateway/patients/medical-records/{id}
  deleteMedicalRecord: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      await api.delete(`/gateway/patients/medical-records/${id}`);
      return { success: true, message: 'Xóa hồ sơ bệnh án thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa hồ sơ bệnh án' };
    }
  },

  // ============ LAB TESTS OPERATIONS (PATIENT SERVICE) ============
  // GET /gateway/patients/lab-tests
  getAllLabTests: async (options = {}) => {
    try {
      const response = await api.get('/gateway/patients/lab-tests', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let p = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/patients/lab-tests', { params: { page: p, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            p += 1;
            if (p > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách xét nghiệm', data: [] };
    }
  },

  // GET /gateway/patients/lab-tests/{id}
  getLabTestById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const response = await api.get(`/gateway/patients/lab-tests/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin xét nghiệm' };
    }
  },

  // GET /gateway/patients/lab-tests/search
  searchLabTests: async (query) => {
    try {
      const response = await api.get(`/gateway/patients/lab-tests/search?key=${encodeURIComponent(query)}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi tìm kiếm xét nghiệm', data: [] };
    }
  },

  // POST /gateway/patients/lab-tests
  createLabTest: async (payload) => {
    try {
      const response = await api.post('/gateway/patients/lab-tests', payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo xét nghiệm mới' };
    }
  },

  // PATCH /gateway/patients/lab-tests/{id} (use PATCH to avoid strict PUT validation)
  updateLabTest: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const response = await api.patch(`/gateway/patients/lab-tests/${id}`, payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const message = (data && (data.message || data.error || JSON.stringify(data))) || error.message || 'Lỗi cập nhật xét nghiệm';
      return { success: false, message, status, data };
    }
  },

  // DELETE /gateway/patients/lab-tests/{id}
  deleteLabTest: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      await api.delete(`/gateway/patients/lab-tests/${id}`);
      return { success: true, message: 'Xóa xét nghiệm thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa xét nghiệm' };
    }
  },

  // ============ LAB CRITERIA OPERATIONS ============
  // GET /gateway/patients/lab-criteria
  getAllLabCriteria: async (options = {}) => {
    try {
      const response = await api.get('/gateway/patients/lab-criteria', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let p = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/patients/lab-criteria', { params: { page: p, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            p += 1;
            if (p > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách tiêu chí xét nghiệm', data: [] };
    }
  },

  // GET /gateway/patients/lab-criteria/{id}
  getLabCriteriaById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const response = await api.get(`/gateway/patients/lab-criteria/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin tiêu chí xét nghiệm' };
    }
  },

  // GET /gateway/patients/lab-criteria/search
  searchLabCriteria: async (query) => {
    try {
      const response = await api.get(`/gateway/patients/lab-criteria/search?key=${encodeURIComponent(query)}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi tìm kiếm tiêu chí xét nghiệm', data: [] };
    }
  },

  // POST /gateway/patients/lab-criteria
  createLabCriteria: async (payload) => {
    try {
      const response = await api.post('/gateway/patients/lab-criteria', payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo tiêu chí xét nghiệm mới' };
    }
  },

  // PUT /gateway/patients/lab-criteria/{id}
  updateLabCriteria: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const response = await api.put(`/gateway/patients/lab-criteria/${id}`, payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật tiêu chí xét nghiệm' };
    }
  },

  // DELETE /gateway/patients/lab-criteria/{id}
  deleteLabCriteria: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      await api.delete(`/gateway/patients/lab-criteria/${id}`);
      return { success: true, message: 'Xóa tiêu chí xét nghiệm thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa tiêu chí xét nghiệm' };
    }
  }
};
