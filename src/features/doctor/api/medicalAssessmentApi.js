/**
 * @file medicalAssessmentApi.js
 * @description UC50 – Medical Assessment API Client (Iteration 3).
 * Interacts with backend /api/medical-assessments endpoints via centralized api client.
 * Conforms to: Production Standards, Token Interceptor & AGENTS-CODE.md.
 */

import api from '../../../config/api';

/**
 * Searches and queries medical assessments with pagination and filters.
 */
export async function getAssessments(params = {}) {
  try {
    const response = await api.get('/medical-assessments', { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Lỗi khi tải danh sách đánh giá y khoa';
    const err = new Error(message);
    err.status = error.response?.status;
    err.errors = error.response?.data?.errors;
    throw err;
  }
}

/**
 * Gets details of a medical assessment by its unique ID or AssessmentCode.
 */
export async function getAssessmentById(id) {
  try {
    const response = await api.get(`/medical-assessments/${encodeURIComponent(id)}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Lỗi khi tải chi tiết hồ sơ';
    const err = new Error(message);
    err.status = error.response?.status;
    throw err;
  }
}

/**
 * Retrieves all medical assessments recorded for a specific patient.
 */
export async function getPatientAssessments(patientId) {
  try {
    const response = await api.get(`/medical-assessments/patient/${encodeURIComponent(patientId)}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Lỗi khi tải lịch sử bệnh án';
    const err = new Error(message);
    err.status = error.response?.status;
    throw err;
  }
}

/**
 * Retrieves active encounters or clinical appointments of a patient for clinical association.
 */
export async function getPatientEncounters(patientId) {
  try {
    const response = await api.get(`/medical-assessments/patient/${encodeURIComponent(patientId)}/encounters`);
    return response.data;
  } catch (error) {
    console.warn(`Could not load encounters for patient ${patientId}:`, error.message);
    return { data: [] };
  }
}

/**
 * Creates a new clinical medical assessment (UC50).
 */
export async function createAssessment(payload) {
  try {
    const response = await api.post('/medical-assessments', payload);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Lỗi khi tạo mới đánh giá y khoa';
    const err = new Error(message);
    err.status = error.response?.status;
    err.errors = error.response?.data?.errors;
    throw err;
  }
}

/**
 * Updates an existing draft medical assessment.
 */
export async function updateAssessment(id, payload) {
  try {
    const response = await api.put(`/medical-assessments/${encodeURIComponent(id)}`, payload);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Lỗi khi cập nhật đánh giá y khoa';
    const err = new Error(message);
    err.status = error.response?.status;
    err.errors = error.response?.data?.errors;
    throw err;
  }
}

/**
 * Finalizes and locks a medical assessment.
 */
export async function finalizeAssessment(id, finalNotes = '') {
  try {
    const response = await api.patch(`/medical-assessments/${encodeURIComponent(id)}/finalize`, { finalNotes });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Lỗi khi khóa hồ sơ đánh giá';
    const err = new Error(message);
    err.status = error.response?.status;
    throw err;
  }
}

/**
 * Soft deletes a medical assessment with an audit reason.
 */
export async function deleteAssessment(id, deleteReason) {
  try {
    const response = await api.delete(`/medical-assessments/${encodeURIComponent(id)}`, {
      data: { deleteReason }
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Lỗi khi xóa hồ sơ đánh giá';
    const err = new Error(message);
    err.status = error.response?.status;
    throw err;
  }
}

export const medicalAssessmentApi = {
  getAssessments,
  getAssessmentById,
  getPatientAssessments,
  getPatientEncounters,
  createAssessment,
  updateAssessment,
  finalizeAssessment,
  deleteAssessment,
};

export default medicalAssessmentApi;
