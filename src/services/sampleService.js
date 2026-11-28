/**
 * Sample Service
 *
 * This service handles all blood sample-related operations including
 * sample collection, tracking, storage management, and sample status updates.
 *
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from '../config/api';

const mapUiToBackendSampleType = (label) => {
  if (!label && label !== 0) return '';
  const t = String(label).toLowerCase().trim();
  const map = {
    'máu': 'blood',
    'blood': 'blood',
    'huyết thanh': 'serum',
    'serum': 'serum',
    'huyết tương': 'plasma',
    'plasma': 'plasma',
    'nước tiểu': 'urine',
    'urine': 'urine',
    'dịch tỵ hầu': 'swab',
    'swab': 'swab',
    'nước bọt': 'saliva',
    'saliva': 'saliva',
    'phân': 'stool',
    'stool': 'stool',
    'mô': 'tissue',
    'tissue': 'tissue',
    'khác': 'other',
    'other': 'other'
  };
  return map[t] || label;
};

/**
 * Sample Service Object
 *
 * Contains methods for blood sample management and tracking.
 * All methods return a standardized response object with success status and data/message.
 */
export const sampleService = {
  /**
   * Retrieves standardized barcode label metadata for printing sample labels.
   * Feature Task: Print Barcodes (Web).
   *
   * @description Fetches the 4 mandatory medical specimen label properties:
   * Patient Initials, Sample ID, Test Codes, and Collection Timestamp.
   *
   * @param {string} sampleId - The unique identifier of the blood sample.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} The label metadata object.
   *
   * @example
   * const label = await sampleService.getBarcodeLabel('SA123456');
   */
  getBarcodeLabel: async (sampleId) => {
    try {
      const response = await api.get(`/gateway/testorder/bloodsample/${sampleId}/barcode-label`);
      return { success: true, data: response.data };
    } catch (error) {
      try {
        const fallback = await sampleService.getSampleById(sampleId);
        if (fallback.success && fallback.data) {
          return {
            success: true,
            data: {
              sampleId: fallback.data.sampleId || fallback.data.SampleId,
              barcode: fallback.data.barcode || fallback.data.sampleId || fallback.data.SampleId,
              sampleType: fallback.data.sampleType,
              collectedAt: fallback.data.collectedAt,
              collectionTimestamp: fallback.data.collectedAt ? new Date(fallback.data.collectedAt).toISOString() : ''
            }
          };
        }
      } catch (e) {}
      return { success: false, message: 'Lỗi tải thông tin nhãn barcode' };
    }
  },

  /**
   * Submits quality validation and assessment for a collected specimen.
   * Feature Task: Validate Sample (Web).
   *
   * @description Allows laboratory technicians and managers to accept ('validated') or reject ('rejected')
   * a blood sample based on volume, clotting, hemolysis, and labeling criteria.
   *
   * @param {string} sampleId - The unique identifier of the sample to validate.
   * @param {Object} data - Validation payload.
   * @param {string} data.Status - The result status ('validated' or 'rejected').
   * @param {string} [data.Notes] - Technical notes or reason for rejection.
   * @param {string} [data.LabUserId] - The ID of the technician performing the validation.
   * @returns {Promise<Object>} The API response confirming sample validation.
   *
   * @example
   * const res = await sampleService.validateSample('SA123456', {
   *   Status: 'validated',
   *   Notes: 'Specimen in good condition, volume acceptable',
   *   LabUserId: 'tech_01'
   * });
   */
  validateSample: async (sampleId, data) => {
    try {
      const response = await api.put('/gateway/testorder/bloodsample/' + sampleId + '/validate', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get All Samples
   *
   * Retrieves a list of all blood samples from the database.
   *
   * @returns {Promise<Object>} Response object with success status and sample list
   */
  getAllSamples: async (options = {}) => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/bloodsample', { params: { page, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
        }
      }

      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách mẫu máu' };
    }
  },

  getSampleById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin mẫu máu' };
    }
  },

  generateUniqueBarcode: async () => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const existingBarcodes = new Set(existingSamples.map(s => s.barcode));

      let barcode;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        barcode = 'S' + timestamp.slice(-8) + random;
        attempts++;

        if (attempts >= maxAttempts) {
          barcode = 'S' + Date.now().toString();
          break;
        }
      } while (existingBarcodes.has(barcode));

      return barcode;
    } catch (error) {
      return 'S' + Date.now().toString();
    }
  },

  createSample: async (sampleData) => {
    try {
      const barcode = await sampleService.generateUniqueBarcode();

      const resolvedType = sampleData.sampleType || sampleData.sample_type || sampleData.SampleType || '';
      const backendType = mapUiToBackendSampleType(resolvedType);
      const newSample = {
        ...sampleData,
        id: Date.now(),
        barcode: barcode,
        status: 'collected',
        collectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        sampleType: backendType,
        sample_type: backendType,
        SampleType: backendType
      };

      const response = await api.post('/gateway/testorder/bloodsample', newSample);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo mẫu máu mới' };
    }
  },

  createSampleOnCheckIn: async (appointmentData, options = {}) => {
    try {
      try {
        const appointmentSamplesResponse = await api.get(`/gateway/testorder/bloodsample/by-appointment/${appointmentData.id}`);
        const appointmentSamples = Array.isArray(appointmentSamplesResponse.data)
          ? appointmentSamplesResponse.data
          : (appointmentSamplesResponse.data?.data || []);
        if (appointmentSamples.length > 0) {
          return { success: true, data: appointmentSamples[0] };
        }
      } catch (err) {
      }
      const allSamplesResponse = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(allSamplesResponse.data)
        ? allSamplesResponse.data
        : (allSamplesResponse.data?.data || []);
      const existingSample = existingSamples.find(s =>
        s.appointmentId === appointmentData.id ||
        String(s.appointmentId) === String(appointmentData.id)
      );

      if (existingSample) {
        return { success: true, data: existingSample };
      }

      const barcode = await sampleService.generateUniqueBarcode();

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      const newSample = {
        appointmentId: appointmentData.id,
        patientId: appointmentData.patientId,
        barcode: barcode,
        status: 'pending_collection',

        createdAt: new Date().toISOString(),
        createdBy: currentUser.name || currentUser.username || 'Lab User'
      };

      try {
        const labUserIdPassed = options.labUserId || options.lab_user_id || appointmentData.labUserId || appointmentData.lab_user_id || null;
        if (labUserIdPassed) {
          newSample.labUserId = labUserIdPassed;
          newSample.lab_user_id = labUserIdPassed;
        }

        const storagePassed = options.storageLocation || options.storage_location || appointmentData.storageLocation || appointmentData.storage_location || null;
        if (storagePassed) {
          const str = String(storagePassed || '').trim();
          const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(str);
          const isNumeric = /^\d+$/.test(str);
          if (isUUID || isNumeric) {
            newSample.storageLocation = str;
            newSample.storage_location = str;
          }
        }
      } catch (e) {
      }

      const resolvedSampleType = appointmentData.sampleType || appointmentData.sample_type || appointmentData.SampleType || '';
      const backendSampleType = mapUiToBackendSampleType(resolvedSampleType);
      newSample.sampleType = backendSampleType;
      newSample.sample_type = backendSampleType;
      newSample.SampleType = backendSampleType;

      const response = await api.post('/gateway/testorder/bloodsample', newSample);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo mẫu khi check-in: ' + (error.response?.data?.message || error.message) };
    }
  },

  updateSample: async (id, sampleData) => {
    try {
      const existingBarcode = sampleData.barcode || sampleData.Barcode || sampleData.existingBarcode || null;

      if (!existingBarcode) {
        try {
          const currentSampleResponse = await Promise.race([
            api.get(`/gateway/testorder/bloodsample/${id}`, { timeout: 10000 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);
          const currentSample = currentSampleResponse.data?.data || currentSampleResponse.data;

          if (currentSample?.barcode || currentSample?.Barcode) {
            sampleData.barcode = currentSample.barcode || currentSample.Barcode;
          } else {
            sampleData.barcode = 'S' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
          }
        } catch (getError) {
          sampleData.barcode = 'S' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
        }
      } else {
        sampleData.barcode = existingBarcode;
      }

      const canonicalId = sampleData.SampleId || sampleData.sampleId || sampleData.sample_id || sampleData.id || id;
      const updateBody = {
        ...sampleData,
        SampleId: canonicalId,
        bloodSampleId: canonicalId,
        BloodSampleId: canonicalId
      };

      try {
        const canonicalLabUser = sampleData.labUserId || sampleData.lab_user_id || sampleData.collected_by || sampleData.collectedBy || sampleData.collectedById || sampleData.collected_by_id || null;
        if (canonicalLabUser) {
          updateBody.labUserId = canonicalLabUser;
          updateBody.lab_user_id = canonicalLabUser;
        }
      } catch (e) {}

      const _capturedStorageCandidate = updateBody.storageLocation || updateBody.storage_location || updateBody.storage || null;

      try {
        const storage = _capturedStorageCandidate;
        if (storage) {
          const s = String(storage).trim();
          const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
          const isNumeric = /^\d+$/.test(s);
          if (!(isUUID || isNumeric)) {
            delete updateBody.storageLocation;
            delete updateBody.storage_location;
            delete updateBody.storage;
          }
        }
      } catch (e) {}

      const minimalBody = {};

      const sampleTypeVal = updateBody.sampleType || updateBody.sample_type || updateBody.SampleType || null;
      if (sampleTypeVal !== undefined && sampleTypeVal !== null && String(sampleTypeVal).trim() !== '') {
        minimalBody.SampleType = mapUiToBackendSampleType(sampleTypeVal);
      }

      const collectedAtVal = updateBody.collectedAt || updateBody.collected_at || updateBody.CollectedAt || null;
      if (collectedAtVal) {
        try {
          const date = new Date(collectedAtVal);
          if (!isNaN(date.getTime())) {
            minimalBody.CollectedAt = date.toISOString();
          }
        } catch (e) {
        }
      }

      const collectedByVal = updateBody.collectedBy || updateBody.collected_by || updateBody.CollectedBy || null;
      if (collectedByVal) minimalBody.CollectedBy = String(collectedByVal);

      if (updateBody.volume !== undefined && updateBody.volume !== null && updateBody.volume !== '') {
        const vol = Number(updateBody.volume);
        if (!Number.isNaN(vol)) minimalBody.Volume = vol;
      }

      if (updateBody.status) minimalBody.Status = updateBody.status;

      const storageVal = _capturedStorageCandidate || updateBody.StorageLocation || updateBody.storageLocation || updateBody.storage_location || updateBody.storage || null;
      if (storageVal) {
        minimalBody.StorageLocation = storageVal;
        minimalBody.storage_location = storageVal;
        minimalBody.storageLocation = storageVal;
      }

      if (updateBody.notes !== undefined && updateBody.notes !== null) minimalBody.Notes = updateBody.notes;

      const labUserVal = updateBody.labUserId || updateBody.lab_user_id || updateBody.LabUserId || null;
      if (labUserVal) minimalBody.LabUserId = labUserVal;

      const response = await api.put(`/gateway/testorder/bloodsample/${id}`, minimalBody);
      const data = response?.data?.data || response?.data || {};
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật mẫu máu: ' + (error.response?.data?.message || error.message) };
    }
  },

  updateSampleStatus: async (id, status) => {
    try {
      const statusBody = { status, SampleId: id, bloodSampleId: id, BloodSampleId: id };
      const response = await api.put(`/gateway/testorder/bloodsample/${id}`, statusBody);
      const data = response?.data?.data || response?.data || {};
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái mẫu máu' };
    }
  },

  deleteSample: async (id) => {
    try {
      await api.delete(`/gateway/testorder/bloodsample/${id}`);
      return { success: true, message: 'Xóa mẫu máu thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa mẫu máu' };
    }
  },

  getSampleByBarcode: async (barcode) => {
    try {
      const scannedRaw = String(barcode || '').trim();
      if (!scannedRaw) return { success: true, data: null };

      const formatBarcode = (value) => {
        if (!value) return null;
        const strValue = String(value).trim();

        if (/^[A-Z0-9]+$/i.test(strValue) && strValue.length <= 20) {
          return strValue.toUpperCase();
        }

        if (strValue.includes('-')) {
          return strValue.replace(/-/g, '').toUpperCase();
        }

        if (strValue.length > 20 && /^\d+$/.test(strValue)) {
          return strValue.slice(-12);
        }

        return strValue.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      };

      const scannedUpper = scannedRaw.toUpperCase();
      const scannedNormalized = formatBarcode(scannedRaw);

      if (/^\d+$/.test(scannedRaw)) {
        try {
          const byId = await api.get(`/gateway/testorder/bloodsample/${scannedRaw}`);
          const data = byId.data?.data || byId.data;
          if (data) {
            return { success: true, data };
          }
        } catch (_) {
        }
      }

      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      const sample = allSamples.find(s => {
        const sampleBarcodeRaw = s.barcode ?? s.id ?? s.sample_id ?? s.sampleId ?? '';
        const sampleUpper = String(sampleBarcodeRaw).trim().toUpperCase();
        const sampleNormalized = formatBarcode(sampleBarcodeRaw);

        if (sampleUpper && sampleUpper === scannedUpper) {
          return true;
        }

        if (sampleNormalized && scannedNormalized && sampleNormalized === scannedNormalized) {
          return true;
        }

        if (sampleNormalized && scannedUpper && sampleNormalized === scannedUpper) return true;
        if (sampleUpper && scannedNormalized && sampleUpper === scannedNormalized) return true;

        if (String(sampleBarcodeRaw).trim().toLowerCase() === scannedRaw.toLowerCase()) return true;

        return false;
      });

      return { success: true, data: sample || null };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo mã vạch' };
    }
  },

  fixMissingBarcodes: async () => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample');
      const samples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samplesWithoutBarcode = samples.filter(s => !s.barcode || s.barcode === '');

      if (samplesWithoutBarcode.length === 0) {
        return { success: true, message: 'Tất cả samples đều đã có barcode', fixed: 0 };
      }

      let fixedCount = 0;
      const errors = [];

      for (const sample of samplesWithoutBarcode) {
        try {
          const sampleId = sample.id || sample.sample_id || sample.sampleId;
          if (!sampleId) {
            errors.push(`Sample has no valid ID: ${JSON.stringify(sample)}`);
            continue;
          }

          const barcode = await sampleService.generateUniqueBarcode();

          const updateBody = { ...sample, barcode, SampleId: sampleId, bloodSampleId: sampleId, BloodSampleId: sampleId };
          const updateResponse = await api.put(`/gateway/testorder/bloodsample/${sampleId}`, updateBody);
          if (updateResponse.data) {
            fixedCount++;
          }
        } catch (error) {
          errors.push(`Sample ${sample.id || sample.sample_id}: ${error.message}`);
        }
      }

      return {
        success: true,
        message: `Đã tạo barcode cho ${fixedCount}/${samplesWithoutBarcode.length} samples`,
        fixed: fixedCount,
        total: samplesWithoutBarcode.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return { success: false, message: 'Lỗi khi fix barcode: ' + error.message };
    }
  },

  createMissingSamplesForCheckedInAppointments: async (appointments) => {
    try {
      const samplesResponse = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(samplesResponse.data)
        ? samplesResponse.data
        : (samplesResponse.data?.data || []);
      const existingAppointmentIds = new Set(
        existingSamples.map(s => String(s.appointmentId)).filter(id => id && id !== 'undefined')
      );

      const checkedInStatuses = ['checked_in', 'sample_collected', 'sample_processed', 'result_pending', 'waiting_review'];
      const appointmentsNeedingSamples = appointments.filter(apt => {
        const aptIdStr = String(apt.id);
        return checkedInStatuses.includes(apt.status) && !existingAppointmentIds.has(aptIdStr);
      });

      if (appointmentsNeedingSamples.length === 0) {
        return { success: true, message: 'Tất cả appointments đã check-in đều có sample', created: 0 };
      }

      let createdCount = 0;
      const errors = [];

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      for (const appointment of appointmentsNeedingSamples) {
        try {
          const barcode = await sampleService.generateUniqueBarcode();

          const newSample = {
            id: Date.now() + Math.random(),
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            barcode: barcode,
            status: 'pending_collection',
            createdAt: new Date().toISOString(),
            createdBy: currentUser.name || currentUser.username || 'System Fix'
          };

          const resolvedType = appointment.sampleType || appointment.sample_type || appointment.SampleType || '';
          const backendResolvedType = mapUiToBackendSampleType(resolvedType);
          newSample.sampleType = backendResolvedType;
          newSample.sample_type = backendResolvedType;
          newSample.SampleType = backendResolvedType;

          if (appointment.status === 'sample_collected' || appointment.status === 'sample_processed') {
            newSample.status = 'collected';
            newSample.collectedAt = appointment.checkedInAt || new Date().toISOString();
          }

          const response = await api.post('/gateway/testorder/bloodsample', newSample);
          if (response.data) {
            createdCount++;
          }
        } catch (error) {
          errors.push(`Appointment ${appointment.id}: ${error.message}`);
        }
      }

      return {
        success: true,
        message: `Đã tạo sample cho ${createdCount}/${appointmentsNeedingSamples.length} appointments`,
        created: createdCount,
        total: appointmentsNeedingSamples.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return { success: false, message: 'Lỗi khi tạo sample cho appointments: ' + error.message };
    }
  },

  getSamplesByLabTest: async (labTestId) => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.labTestId === parseInt(labTestId));
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo phiếu xét nghiệm' };
    }
  },

  getSamplesByStatus: async (status) => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.status === status);
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo trạng thái' };
    }
  },

  getSamplesByAppointment: async (appointmentId) => {
    try {
      const response = await api.get(`/gateway/testorder/bloodsample/by-appointment/${appointmentId}`);
      const samples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo lịch hẹn' };
    }
  },

  getSamplesByPatient: async (patientId) => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.patientId === parseInt(patientId));
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo bệnh nhân' };
    }
  },

  isSampleReadyForResults: async (sampleId) => {
    try {
      const response = await api.get(`/gateway/testorder/bloodsample/${sampleId}`);
      const sample = response.data;
      return {
        success: true,
        data: sample && sample.status === 'completed',
        sample: sample
      };
    } catch (error) {
      return { success: false, message: 'Lỗi kiểm tra trạng thái mẫu' };
    }
  },

  markSampleProcessed: async (id) => {
    try {
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      if (!['collected', 'processing', 'pending_collection'].includes(sample.status)) {
        return { success: false, message: 'Không thể đánh dấu hoàn thành cho trạng thái hiện tại của mẫu' };
      }

      const patchBody = {
        status: 'completed',
        processedAt: new Date().toISOString()
      };

      if (sample.status === 'pending_collection' && !sample.collectedAt) {
        patchBody.collectedAt = new Date().toISOString();
      }

      const canonicalPatchId = patchBody.SampleId || patchBody.sampleId || patchBody.sample_id || id;
      patchBody.SampleId = canonicalPatchId;
      patchBody.bloodSampleId = canonicalPatchId;
      patchBody.BloodSampleId = canonicalPatchId;

      const response = await api.put(`/gateway/testorder/bloodsample/${id}`, patchBody);

      if (sample.appointmentId) {
        try {
          await api.put(`/gateway/testorder/appointment/${sample.appointmentId}`, {
            status: 'sample_processed',
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
        }
      }

      const data = response?.data?.data || response?.data || {};
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi đánh dấu mẫu đã xử lý' };
    }
  },

  getSamplesReadyForResults: async () => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.status === 'completed');
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách mẫu sẵn sàng nhập kết quả' };
    }
  },

  getSamplesNeedProcessing: async () => {
    try {
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.status === 'collected');
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách mẫu cần xử lý' };
    }
  },

  createSampleWithSync: async (sampleData, appointmentId) => {
    try {
      const appointmentResponse = await api.get(`/appointments/${appointmentId}`);
      const appointment = appointmentResponse.data;

      if (!appointment) {
        return { success: false, message: 'Không tìm thấy lịch hẹn' };
      }

      if (appointment.status !== 'checked_in') {
        return { success: false, message: 'Chỉ có thể lấy mẫu cho lịch hẹn đã check-in' };
      }

      const barcode = await sampleService.generateUniqueBarcode();

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      const newSample = {
        ...sampleData,
        id: Date.now(),
        barcode: barcode,
        appointmentId: appointmentId,
        status: 'collected',
        collectedAt: new Date().toISOString(),
        collectedById: currentUser.id,
        createdAt: new Date().toISOString()
      };

      const response = await api.post('/gateway/testorder/bloodsample', newSample);

      await api.put(`/gateway/testorder/appointment/${appointmentId}`, {
        status: 'sample_collected',
        updatedAt: new Date().toISOString()
      });

      const labTestData = {
        id: Date.now() + 1,
        appointmentId: appointmentId,
        patientId: appointment.patientId,
        sampleId: newSample.id,
        testPackage: appointment.service,
        status: 'pending',
        results: {},
        createdAt: new Date().toISOString()
      };

      await api.post('/gateway/patients/lab-tests', labTestData);

      return {
        success: true,
        data: {
          sample: response.data,
          labTest: labTestData
        }
      };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo mẫu máu' };
    }
  },

  startProcessingSample: async (id) => {
    try {
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      if (sample.status !== 'collected') {
        return { success: false, message: 'Chỉ có thể bắt đầu xử lý mẫu đã lấy' };
      }

      const processingBody = {
        status: 'processing',
        processingStartedAt: new Date().toISOString(),
        SampleId: id,
        bloodSampleId: id,
        BloodSampleId: id
      };
      const response = await api.put(`/gateway/testorder/bloodsample/${id}`, processingBody);
      const data = response?.data?.data || response?.data || {};
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi bắt đầu xử lý mẫu' };
    }
  },

  getSampleWithDetails: async (id) => {
    try {
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      let appointment = null;
      if (sample.appointmentId) {
        try {
          const aptResponse = await api.get(`/gateway/testorder/appointment/${sample.appointmentId}`);
          appointment = aptResponse.data?.data || aptResponse.data;
        } catch (err) {
        }
      }

      let patient = null;
      if (sample.patientId) {
        try {
          const patientResponse = await api.get(`/gateway/patients/by-id/${sample.patientId}`);
          patient = patientResponse.data?.data || patientResponse.data;
        } catch (err) {
        }
      }

      const labTestsResponse = await api.get('/gateway/patients/lab-tests');
      const labTest = labTestsResponse.data.find(lt => lt.sampleId === sample.id);

      return {
        success: true,
        data: {
          sample,
          appointment,
          patient,
          labTest
        }
      };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin chi tiết mẫu máu' };
    }
  },

  getBloodSampleByAppointmentId: async (appointmentId) => {
    try {
      const response = await api.get(`/gateway/testorder/bloodsample/by-appointment/${appointmentId}`);

      let data = [];
      try {
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (Array.isArray(response.data?.data)) {
          data = response.data.data;
        } else if (Array.isArray(response.data?.samples)) {
          data = response.data.samples;
        } else if (Array.isArray(response.data?.result) || Array.isArray(response.data?.results)) {
          data = response.data.result || response.data.results;
        } else if (response.data && typeof response.data === 'object') {
          const candidates = ['sample','data','result','item','bloodSample','blood_sample'];
          let found = null;
          for (const k of candidates) {
            if (response.data[k]) {
              if (Array.isArray(response.data[k])) { found = response.data[k]; break; }
              if (typeof response.data[k] === 'object') { found = [response.data[k]]; break; }
            }
          }
          if (found) data = found;
          else {
            const maybe = response.data;
            if (maybe && (maybe.id || maybe.sampleId || maybe.appointmentId || maybe.barcode)) data = [maybe];
          }
        }
      } catch (e) {
        data = [];
      }

      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo appointment ID' };
    }
  },

  canMarkAsProcessed: async (id) => {
    try {
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu', can: false };
      }

      const can = sample.status === 'collected' || sample.status === 'processing';
      return {
        success: true,
        can: can,
        message: can ? 'Có thể đánh dấu xử lý xong' : 'Không thể đánh dấu xử lý xong',
        currentStatus: sample.status
      };
    } catch (error) {
      return { success: false, message: 'Lỗi kiểm tra trạng thái mẫu', can: false };
    }
  }
};
