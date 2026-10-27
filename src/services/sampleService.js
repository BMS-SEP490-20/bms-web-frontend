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

import api from './api';

// Map UI sample type labels (Vietnamese or English) to backend canonical values
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
      console.error('Error validating sample:', error);
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
      // Swagger: GET /TestOrder/BloodSample
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

  // Retrieve blood sample by ID
  getSampleById: async (id) => {
    try {
      // Swagger: GET /TestOrder/BloodSample/{id}
      const response = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin mẫu máu' };
    }
  },

  // Helper function to generate unique sample barcode
  generateUniqueBarcode: async () => {
    try {
      // Fetch all samples to check barcode uniqueness
      // Swagger: GET /TestOrder/BloodSample
      const response = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const existingBarcodes = new Set(existingSamples.map(s => s.barcode));
      
      // Generate barcode with timestamp + random suffix to ensure uniqueness
      let barcode;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        // Format: S + timestamp (8 digits) + random (2 digits)
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        barcode = 'S' + timestamp.slice(-8) + random;
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Fallback: S + full timestamp
          barcode = 'S' + Date.now().toString();
          break;
        }
      } while (existingBarcodes.has(barcode));
      
      return barcode;
    } catch (error) {
      // Fallback if sample list retrieval fails
      return 'S' + Date.now().toString();
    }
  },

  // Create new blood sample
  createSample: async (sampleData) => {
    try {
      // Generate unique barcode
      const barcode = await sampleService.generateUniqueBarcode();
      
      const resolvedType = sampleData.sampleType || sampleData.sample_type || sampleData.SampleType || '';
      const backendType = mapUiToBackendSampleType(resolvedType);
      const newSample = {
        ...sampleData,
        id: Date.now(),
        barcode: barcode,
        status: 'collected', // Workflow status: collected
        collectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        sampleType: backendType,
        sample_type: backendType,
        SampleType: backendType
      };
      
      // Swagger: POST /TestOrder/BloodSample
      const response = await api.post('/gateway/testorder/bloodsample', newSample);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo mẫu máu mới' };
    }
  },

  // Create sample placeholder during check-in for early barcode printing
  createSampleOnCheckIn: async (appointmentData, options = {}) => {
    try {
      // Check if sample already exists for this appointment
      // Swagger: GET /TestOrder/BloodSample/by-appointment/{appointmentId}
      try {
        const appointmentSamplesResponse = await api.get(`/gateway/testorder/bloodsample/by-appointment/${appointmentData.id}`);
        const appointmentSamples = Array.isArray(appointmentSamplesResponse.data) 
          ? appointmentSamplesResponse.data 
          : (appointmentSamplesResponse.data?.data || []);
        if (appointmentSamples.length > 0) {
          return { success: true, data: appointmentSamples[0] };
        }
      } catch (err) {
        // Fallback: get all and filter
      }
      const allSamplesResponse = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(allSamplesResponse.data) 
        ? allSamplesResponse.data 
        : (allSamplesResponse.data?.data || []);
      const existingSample = existingSamples.find(s => 
        s.appointmentId === appointmentData.id || 
        String(s.appointmentId) === String(appointmentData.id)
      );
      
      // Return existing sample if already created
      if (existingSample) {
        return { success: true, data: existingSample };
      }
      
      // Generate unique barcode
      const barcode = await sampleService.generateUniqueBarcode();
      
      // Retrieve authenticated user profile from local storage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const newSample = {
        appointmentId: appointmentData.id,
        patientId: appointmentData.patientId,
        barcode: barcode,
        status: 'pending_collection', // Status: awaiting collection
        // collectedAt omitted until physical collection
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name || currentUser.username || 'Lab User'
      };

      // If caller passed a lab user id, include it (use common aliases)
      try {
        const labUserIdPassed = options.labUserId || options.lab_user_id || appointmentData.labUserId || appointmentData.lab_user_id || null;
        if (labUserIdPassed) {
          newSample.labUserId = labUserIdPassed;
          newSample.lab_user_id = labUserIdPassed;
        }

        // If caller passed a storageLocation, only include it when it looks like an identifier (UUID or numeric)
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
        // ignore malformed options
      }
      // Ensure SampleType is provided (backend validation requires this)
      const resolvedSampleType = appointmentData.sampleType || appointmentData.sample_type || appointmentData.SampleType || '';
      const backendSampleType = mapUiToBackendSampleType(resolvedSampleType);
      newSample.sampleType = backendSampleType;
      newSample.sample_type = backendSampleType;
      newSample.SampleType = backendSampleType;
      
      // Swagger: POST /TestOrder/BloodSample
      const response = await api.post('/gateway/testorder/bloodsample', newSample);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo mẫu khi check-in: ' + (error.response?.data?.message || error.message) };
    }
  },

  // Update blood sample
  updateSample: async (id, sampleData) => {
    try {
      // Normalize barcode across different entity field aliases
      const existingBarcode = sampleData.barcode || sampleData.Barcode || sampleData.existingBarcode || null;
      
      // Optimization: only fetch current sample if barcode validation needed
      // If barcode exists, bypass extra GET to avoid timeout
      if (!existingBarcode) {
        try {
          // Fetch existing sample with short timeout
          const currentSampleResponse = await Promise.race([
            api.get(`/gateway/testorder/bloodsample/${id}`, { timeout: 10000 }), // 10s timeout
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);
          const currentSample = currentSampleResponse.data?.data || currentSampleResponse.data;
          
          // Retain existing barcode if present
          if (currentSample?.barcode || currentSample?.Barcode) {
            sampleData.barcode = currentSample.barcode || currentSample.Barcode;
          } else {
            // Generate lightweight timestamp barcode without unbounded fetch
            sampleData.barcode = 'S' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
          }
        } catch (getError) {
          // Generate new barcode on timeout or lookup failure
          // Simple timestamp barcode without full list fetch
          sampleData.barcode = 'S' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
        }
      } else {
        // Barcode already exists, keep current value
        sampleData.barcode = existingBarcode;
      }
      
      // Ensure backend receives canonical SampleId and common aliases
      const canonicalId = sampleData.SampleId || sampleData.sampleId || sampleData.sample_id || sampleData.id || id;
      const updateBody = { 
        ...sampleData, 
        SampleId: canonicalId,
        bloodSampleId: canonicalId,
        BloodSampleId: canonicalId
      };

      // Canonicalize lab user id fields: prefer explicit labUserId/lab_user_id or collected_by
      try {
        const canonicalLabUser = sampleData.labUserId || sampleData.lab_user_id || sampleData.collected_by || sampleData.collectedBy || sampleData.collectedById || sampleData.collected_by_id || null;
        if (canonicalLabUser) {
          updateBody.labUserId = canonicalLabUser;
          updateBody.lab_user_id = canonicalLabUser;
        }
      } catch (e) {}

      // Capture storage candidate before defensive stripping so we can still send it if needed
      const _capturedStorageCandidate = updateBody.storageLocation || updateBody.storage_location || updateBody.storage || null;
      // Defensive: strip storage_location if it looks like a human-friendly room name (not UUID or numeric)
      try {
        const storage = _capturedStorageCandidate;
        if (storage) {
          const s = String(storage).trim();
          const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
          const isNumeric = /^\d+$/.test(s);
          if (!(isUUID || isNumeric)) {
            // remove human-friendly room names to avoid storing them in storage_location
            delete updateBody.storageLocation;
            delete updateBody.storage_location;
            delete updateBody.storage;
          }
        }
      } catch (e) {}

      // Build minimal payload matching backend DTO:
      // BloodSampleUpdateDto {
      //   SampleType, CollectedAt, CollectedBy, Volume, Status, StorageLocation, Notes, LabUserId
      // }
      const minimalBody = {};
      // SampleType: accept either snake_case or camelCase from updateBody
      const sampleTypeVal = updateBody.sampleType || updateBody.sample_type || updateBody.SampleType || null;
      if (sampleTypeVal !== undefined && sampleTypeVal !== null && String(sampleTypeVal).trim() !== '') {
        minimalBody.SampleType = mapUiToBackendSampleType(sampleTypeVal);
      }

      // CollectedAt - Backend expects DateTime?, convert ISO string to proper format
      const collectedAtVal = updateBody.collectedAt || updateBody.collected_at || updateBody.CollectedAt || null;
      if (collectedAtVal) {
        try {
          // Ensure it's a valid ISO string that backend can parse
          const date = new Date(collectedAtVal);
          if (!isNaN(date.getTime())) {
            minimalBody.CollectedAt = date.toISOString();
          }
        } catch (e) {
          // If parsing fails, skip CollectedAt
        }
      }

      // CollectedBy
      const collectedByVal = updateBody.collectedBy || updateBody.collected_by || updateBody.CollectedBy || null;
      if (collectedByVal) minimalBody.CollectedBy = String(collectedByVal);

      // Volume (decimal)
      if (updateBody.volume !== undefined && updateBody.volume !== null && updateBody.volume !== '') {
        const vol = Number(updateBody.volume);
        if (!Number.isNaN(vol)) minimalBody.Volume = vol;
      }

      // Status
      if (updateBody.status) minimalBody.Status = updateBody.status;

      // StorageLocation: prefer captured candidate (original value) so we can send human-friendly room if desired
      const storageVal = _capturedStorageCandidate || updateBody.StorageLocation || updateBody.storageLocation || updateBody.storage_location || updateBody.storage || null;
      if (storageVal) {
        // include multiple aliases to satisfy backends expecting different casing
        minimalBody.StorageLocation = storageVal;
        minimalBody.storage_location = storageVal;
        minimalBody.storageLocation = storageVal;
      }

      // Notes
      if (updateBody.notes !== undefined && updateBody.notes !== null) minimalBody.Notes = updateBody.notes;

      // LabUserId (prefer labUserId / lab_user_id)
      const labUserVal = updateBody.labUserId || updateBody.lab_user_id || updateBody.LabUserId || null;
      if (labUserVal) minimalBody.LabUserId = labUserVal;


      // Swagger: PUT /TestOrder/BloodSample/{id}
      const response = await api.put(`/gateway/testorder/bloodsample/${id}`, minimalBody);
      const data = response?.data?.data || response?.data || {};
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật mẫu máu: ' + (error.response?.data?.message || error.message) };
    }
  },

  // Update blood sample status
  updateSampleStatus: async (id, status) => {
    try {
      // Swagger: PUT /TestOrder/BloodSample/{id} (use PUT to update status)
      const statusBody = { status, SampleId: id, bloodSampleId: id, BloodSampleId: id };
      const response = await api.put(`/gateway/testorder/bloodsample/${id}`, statusBody);
      const data = response?.data?.data || response?.data || {};
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái mẫu máu' };
    }
  },

  // Delete blood sample
  deleteSample: async (id) => {
    try {
      // Swagger: DELETE /TestOrder/BloodSample/{id}
      await api.delete(`/gateway/testorder/bloodsample/${id}`);
      return { success: true, message: 'Xóa mẫu máu thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa mẫu máu' };
    }
  },

  // Retrieve blood sample by barcode
  getSampleByBarcode: async (barcode) => {
    try {
      const scannedRaw = String(barcode || '').trim();
      if (!scannedRaw) return { success: true, data: null };

      // Helper function to format barcode like frontend does
      const formatBarcode = (value) => {
        if (!value) return null;
        const strValue = String(value).trim();

        // Simple alphanumeric
        if (/^[A-Z0-9]+$/i.test(strValue) && strValue.length <= 20) {
          return strValue.toUpperCase();
        }

        // UUID format - remove dashes and return full cleaned value
        if (strValue.includes('-')) {
          return strValue.replace(/-/g, '').toUpperCase();
        }

        // Long timestamp - take last 12 digits
        if (strValue.length > 20 && /^\d+$/.test(strValue)) {
          return strValue.slice(-12);
        }

        // Default: sanitize and return full cleaned value
        return strValue.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      };

      const scannedUpper = scannedRaw.toUpperCase();
      const scannedNormalized = formatBarcode(scannedRaw);


      // If the scanned value is purely numeric, try lookup by numeric ID first (use raw)
      if (/^\d+$/.test(scannedRaw)) {
        try {
          const byId = await api.get(`/gateway/testorder/bloodsample/${scannedRaw}`);
          const data = byId.data?.data || byId.data;
          if (data) {
            return { success: true, data };
          }
        } catch (_) {
          // continue to fallback search
        }
      }

      // Fallback: load list and try to match using multiple symmetric normalizations
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);


      const sample = allSamples.find(s => {
        const sampleBarcodeRaw = s.barcode ?? s.id ?? s.sample_id ?? s.sampleId ?? '';
        const sampleUpper = String(sampleBarcodeRaw).trim().toUpperCase();
        const sampleNormalized = formatBarcode(sampleBarcodeRaw);

        // Matching strategies (symmetric):
        // 1) Exact raw uppercase match
        if (sampleUpper && sampleUpper === scannedUpper) {
          return true;
        }

        // 2) Normalized-to-normalized match (removes dashes/non-alnum etc.)
        if (sampleNormalized && scannedNormalized && sampleNormalized === scannedNormalized) {
          return true;
        }

        // 3) Cross checks: sometimes one side is normalized and the other isn't
        if (sampleNormalized && scannedUpper && sampleNormalized === scannedUpper) return true;
        if (sampleUpper && scannedNormalized && sampleUpper === scannedNormalized) return true;

        // 4) As a last resort, compare raw string equality (case-insensitive)
        if (String(sampleBarcodeRaw).trim().toLowerCase() === scannedRaw.toLowerCase()) return true;

        return false;
      });


      return { success: true, data: sample || null };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo mã vạch' };
    }
  },

  // Auto-assign barcodes for legacy samples without barcode
  fixMissingBarcodes: async () => {
    try {
      // Swagger: GET /TestOrder/BloodSample
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
          // Validate sample ID exists (check multiple possible field names)
          const sampleId = sample.id || sample.sample_id || sample.sampleId;
          if (!sampleId) {
            errors.push(`Sample has no valid ID: ${JSON.stringify(sample)}`);
            continue;
          }
          
          const barcode = await sampleService.generateUniqueBarcode();
          // Use PUT for updating sample, as API gateway only supports PUT for bloodsample
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

  // Auto-create sample records for checked-in appointments lacking specimens
  createMissingSamplesForCheckedInAppointments: async (appointments) => {
    try {
      // Retrieve all active samples
      // Swagger: GET /TestOrder/BloodSample
      const samplesResponse = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(samplesResponse.data) 
        ? samplesResponse.data 
        : (samplesResponse.data?.data || []);
      const existingAppointmentIds = new Set(
        existingSamples.map(s => String(s.appointmentId)).filter(id => id && id !== 'undefined')
      );
      
      // Filter checked-in appointments without registered samples
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
      
      // Retrieve current user identity
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      for (const appointment of appointmentsNeedingSamples) {
        try {
          // Create sample with barcode
          const barcode = await sampleService.generateUniqueBarcode();
          
          const newSample = {
            id: Date.now() + Math.random(), // Unique client-side ID
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            barcode: barcode,
            status: 'pending_collection', // Default to pending_collection
            createdAt: new Date().toISOString(),
            createdBy: currentUser.name || currentUser.username || 'System Fix'
          };
          // Ensure SampleType is present to satisfy backend validation
          const resolvedType = appointment.sampleType || appointment.sample_type || appointment.SampleType || '';
          const backendResolvedType = mapUiToBackendSampleType(resolvedType);
          newSample.sampleType = backendResolvedType;
          newSample.sample_type = backendResolvedType;
          newSample.SampleType = backendResolvedType;
          
          // Create sample with collected status if appointment already collected
          if (appointment.status === 'sample_collected' || appointment.status === 'sample_processed') {
            newSample.status = 'collected';
            newSample.collectedAt = appointment.checkedInAt || new Date().toISOString();
          }
          
          // Swagger: POST /TestOrder/BloodSample
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

  // Retrieve sample by lab test ID
  getSamplesByLabTest: async (labTestId) => {
    try {
      // Swagger: GET /TestOrder/BloodSample (filter client-side)
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.labTestId === parseInt(labTestId));
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo phiếu xét nghiệm' };
    }
  },

  // Retrieve samples by workflow status
  getSamplesByStatus: async (status) => {
    try {
      // Swagger: GET /TestOrder/BloodSample (filter client-side)
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.status === status);
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo trạng thái' };
    }
  },

  // Retrieve samples by appointment ID
  getSamplesByAppointment: async (appointmentId) => {
    try {
      // Gateway: GET /TestOrder/bloodsample/by-appointment/{appointmentId}
      const response = await api.get(`/gateway/testorder/bloodsample/by-appointment/${appointmentId}`);
      const samples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo lịch hẹn' };
    }
  },

  // Retrieve blood samples by patient ID
  getSamplesByPatient: async (patientId) => {
    try {
      // Swagger: GET /TestOrder/BloodSample (filter client-side)
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.patientId === parseInt(patientId));
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo bệnh nhân' };
    }
  },

  // Verify if sample is eligible for result entry
  isSampleReadyForResults: async (sampleId) => {
    try {
      // Swagger: GET /TestOrder/BloodSample/{id}
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

  // ========== NEW WORKFLOW FUNCTIONS ==========

  // Mark sample as processed (ready for result entry)
  markSampleProcessed: async (id) => {
    try {
      // Validate sample before transition
      // Gateway route: GET /TestOrder/BloodSample/{id}
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      // Allow direct transition from 'pending_collection' to 'completed' with verified barcode
      if (!['collected', 'processing', 'pending_collection'].includes(sample.status)) {
        return { success: false, message: 'Không thể đánh dấu hoàn thành cho trạng thái hiện tại của mẫu' };
      }

      // Update sample status
      const patchBody = {
        status: 'completed',
        processedAt: new Date().toISOString()
      };
      // Add collectedAt timestamp if transitioning directly to completed
      if (sample.status === 'pending_collection' && !sample.collectedAt) {
        patchBody.collectedAt = new Date().toISOString();
      }

      // Ensure backend gets SampleId and common aliases for validation
      const canonicalPatchId = patchBody.SampleId || patchBody.sampleId || patchBody.sample_id || id;
      patchBody.SampleId = canonicalPatchId;
      patchBody.bloodSampleId = canonicalPatchId;
      patchBody.BloodSampleId = canonicalPatchId;
      // Swagger: PUT /TestOrder/BloodSample/{id}
      const response = await api.put(`/gateway/testorder/bloodsample/${id}`, patchBody);

      // Synchronize appointment status
      // Swagger: PUT /TestOrder/Appointment/{id}
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

  // Retrieve samples ready for result entry (status = 'completed')
  getSamplesReadyForResults: async () => {
    try {
      // Swagger: GET /TestOrder/BloodSample (filter client-side)
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.status === 'completed');
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách mẫu sẵn sàng nhập kết quả' };
    }
  },

  // Retrieve samples awaiting processing (status = 'collected')
  getSamplesNeedProcessing: async () => {
    try {
      // Swagger: GET /TestOrder/BloodSample (filter client-side)
      const response = await api.get('/gateway/testorder/bloodsample');
      const allSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const samples = allSamples.filter(s => s.status === 'collected');
      return { success: true, data: samples };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách mẫu cần xử lý' };
    }
  },

  // Create new blood sample and synchronize appointment
  createSampleWithSync: async (sampleData, appointmentId) => {
    try {
      // Validate appointment
      const appointmentResponse = await api.get(`/appointments/${appointmentId}`);
      const appointment = appointmentResponse.data;

      if (!appointment) {
        return { success: false, message: 'Không tìm thấy lịch hẹn' };
      }

      if (appointment.status !== 'checked_in') {
        return { success: false, message: 'Chỉ có thể lấy mẫu cho lịch hẹn đã check-in' };
      }

      // Generate unique barcode
      const barcode = await sampleService.generateUniqueBarcode();
      
      // Retrieve authenticated user profile from local storage
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
      
      // Create sample record
      // Swagger: POST /TestOrder/BloodSample
      const response = await api.post('/gateway/testorder/bloodsample', newSample);

      // Update appointment status
      // Swagger: PUT /TestOrder/Appointment/{id}
      await api.put(`/gateway/testorder/appointment/${appointmentId}`, {
        status: 'sample_collected',
        updatedAt: new Date().toISOString()
      });

      // Initialize lab test record
      const labTestData = {
        id: Date.now() + 1, // Offset ID to avoid collision
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

  // Transition sample to processing status
  startProcessingSample: async (id) => {
    try {
      // Gateway route: GET /TestOrder/BloodSample/{id}
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      if (sample.status !== 'collected') {
        return { success: false, message: 'Chỉ có thể bắt đầu xử lý mẫu đã lấy' };
      }

      // Swagger: PUT /TestOrder/BloodSample/{id}
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

  // Retrieve comprehensive sample details (appointment, patient, labTest)
  getSampleWithDetails: async (id) => {
    try {
      // Gateway route: GET /TestOrder/BloodSample/{id}
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      // Fetch appointment metadata
      let appointment = null;
      if (sample.appointmentId) {
        try {
          // Swagger: GET /TestOrder/Appointment/{id}
          const aptResponse = await api.get(`/gateway/testorder/appointment/${sample.appointmentId}`);
          appointment = aptResponse.data?.data || aptResponse.data;
        } catch (err) {
        }
      }

      // Fetch patient metadata
      let patient = null;
      if (sample.patientId) {
        try {
          // Swagger: GET /Patients/by-id/{id}
          const patientResponse = await api.get(`/gateway/patients/by-id/${sample.patientId}`);
          patient = patientResponse.data?.data || patientResponse.data;
        } catch (err) {
        }
      }

      // Fetch lab test metadata
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

  // Retrieve samples by appointment ID
  getBloodSampleByAppointmentId: async (appointmentId) => {
    try {
      // Swagger: GET /TestOrder/BloodSample/by-appointment/{appointmentId}
      const response = await api.get(`/gateway/testorder/bloodsample/by-appointment/${appointmentId}`);

      // Normalize backend response into an array of samples
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
          // If response.data is an object that contains a single sample, try common fields
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
            // As a last resort, if response.data looks like a sample (has appointmentId or barcode or id), wrap it
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

  // Validate if sample can be marked as processed
  canMarkAsProcessed: async (id) => {
    try {
      // Gateway route: GET /TestOrder/BloodSample/{id}
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


