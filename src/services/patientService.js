/**
 * @file patientService.js
 * @description API client for Create Guest Profile (UC25) & View Patient Information (UC30).
 * Connects to BMS Backend PatientsController (/api/patients & /api/v1/patients).
 */

import api from '../config/api';

function extractError(err, fallbackMsg) {
  const data = err?.response?.data;
  if (!data) return err?.message || fallbackMsg;

  if (data.errors && typeof data.errors === 'object') {
    const firstErrors = Object.values(data.errors).flat().filter(Boolean);
    if (firstErrors.length > 0) {
      return firstErrors.join(' ');
    }
  }

  return (
    data.message ||
    data.Message ||
    data.title ||
    data.detail ||
    err.message ||
    fallbackMsg
  );
}

/**
 * Searches and filters patient profiles (registered and guest profiles).
 *
 * @param {Object} [params] - Query parameters.
 * @param {string} [params.search] - Keyword matching fullName, patientCode, phoneNumber, identityNumber, email.
 * @param {string} [params.gender] - 'Male' | 'Female' | 'Other'.
 * @param {string} [params.bloodType] - ABO/Rh blood type.
 * @param {boolean|string} [params.isGuest] - true for walk-in guests, false for registered patients.
 * @param {number} [params.page=1] - Page number.
 * @param {number} [params.pageSize=15] - Page size.
 * @returns {Promise<{ items: Array, page: number, pageSize: number, totalItems: number, totalPages: number }>}
 */
export async function searchPatients(params = {}) {
  try {
    const cleanParams = {};
    if (params.search && String(params.search).trim()) {
      cleanParams.search = String(params.search).trim();
    }
    if (params.gender && params.gender !== 'ALL') {
      cleanParams.gender = params.gender;
    }
    if (params.bloodType && params.bloodType !== 'ALL') {
      cleanParams.bloodType = params.bloodType;
    }
    if (params.isGuest === true || params.isGuest === 'true') {
      cleanParams.isGuest = true;
    } else if (params.isGuest === false || params.isGuest === 'false') {
      cleanParams.isGuest = false;
    }
    cleanParams.page = params.page || 1;
    cleanParams.pageSize = params.pageSize || 15;

    const response = await api.get('/patients', { params: cleanParams });
    return response.data;
  } catch (err) {
    throw new Error(extractError(err, 'Không thể tải danh sách hồ sơ bệnh nhân.'));
  }
}

/**
 * Retrieves detailed patient information by Patient ID (PAT-...), Patient Code (BN-...), or CCCD/CMND.
 *
 * @param {string} identifier - Patient ID, code, or identity number.
 * @returns {Promise<Object>} Full PatientInformationDto with vitals, dependents, recentAppointments, recentMedicalRecords.
 */
export async function getPatientById(identifier) {
  try {
    const response = await api.get(`/patients/${encodeURIComponent(String(identifier).trim())}`);
    return response.data;
  } catch (err) {
    throw new Error(extractError(err, 'Không tìm thấy thông tin hồ sơ bệnh nhân.'));
  }
}

/**
 * Retrieves the authenticated user's own clinical patient record (/api/patients/me).
 *
 * @returns {Promise<Object>} Full PatientInformationDto.
 */
export async function getMyPatientInformation() {
  try {
    const response = await api.get('/patients/me');
    return response.data;
  } catch (err) {
    throw new Error(extractError(err, 'Không thể tải hồ sơ bệnh nhân cá nhân.'));
  }
}

/**
 * Creates a new walk-in / guest patient profile (POST /api/patients/guests).
 *
 * @param {Object} payload - CreateGuestProfileRequest body.
 * @returns {Promise<Object>} Newly created PatientInformationDto.
 */
export async function createGuestProfile(payload) {
  try {
    const response = await api.post('/patients/guests', payload);
    return response.data;
  } catch (err) {
    const error = new Error(extractError(err, 'Không thể tạo hồ sơ khách vãng lai.'));
    error.status = err?.response?.status;
    error.code = err?.response?.data?.code;
    throw error;
  }
}

export default {
  searchPatients,
  getPatientById,
  getMyPatientInformation,
  createGuestProfile,
};
