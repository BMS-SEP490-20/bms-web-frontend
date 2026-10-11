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
   * Validate Sample (Role: lab_user, manager)
   * @param {string} sampleId
   * @param {Object} data - { Status, Notes, LabUserId }
   */
  validateSample: async (sampleId, data) => {
    try {
      const response = await api.put('/gateway/testorder/bloodsample/' + sampleId + '/validate', data);
      return response.data;
    } catch (error) {
      console.error('L?i khi validate sample:', error);
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

  // Lấy mẫu máu theo ID
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

  // Helper function để tạo mã vạch duy nhất
  generateUniqueBarcode: async () => {
    try {
      // Lấy tất cả samples để kiểm tra barcode trùng
      // Swagger: GET /TestOrder/BloodSample
      const response = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const existingBarcodes = new Set(existingSamples.map(s => s.barcode));
      
      // Tạo barcode với timestamp + random để đảm bảo unique
      let barcode;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        // Format: S + timestamp (8 số) + random (2 số)
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        barcode = 'S' + timestamp.slice(-8) + random;
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Fallback: S + timestamp đầy đủ
          barcode = 'S' + Date.now().toString();
          break;
        }
      } while (existingBarcodes.has(barcode));
      
      return barcode;
    } catch (error) {
      // Fallback nếu không lấy được danh sách samples
      return 'S' + Date.now().toString();
    }
  },

  // Tạo mẫu máu mới
  createSample: async (sampleData) => {
    try {
      // Tạo mã vạch duy nhất
      const barcode = await sampleService.generateUniqueBarcode();
      
      const resolvedType = sampleData.sampleType || sampleData.sample_type || sampleData.SampleType || '';
      const backendType = mapUiToBackendSampleType(resolvedType);
      const newSample = {
        ...sampleData,
        id: Date.now(),
        barcode: barcode,
        status: 'collected', // Trạng thái "Đang chờ" theo luồng mới
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

  // Tạo mẫu máu khi check-in (chưa lấy mẫu - để in barcode sớm)
  createSampleOnCheckIn: async (appointmentData, options = {}) => {
    try {
      // Kiểm tra xem đã có sample nào cho appointment này chưa
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
      
      // Nếu đã có sample, trả về sample đó
      if (existingSample) {
        return { success: true, data: existingSample };
      }
      
      // Tạo mã vạch duy nhất
      const barcode = await sampleService.generateUniqueBarcode();
      
      // Lấy thông tin user hiện tại từ localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const newSample = {
        appointmentId: appointmentData.id,
        patientId: appointmentData.patientId,
        barcode: barcode,
        status: 'pending_collection', // Trạng thái "Chờ lấy mẫu" - chưa lấy mẫu
        // KHÔNG có collectedAt vì chưa lấy mẫu
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

  // Cập nhật mẫu máu
  updateSample: async (id, sampleData) => {
    try {
      // Normalize barcode từ các field names khác nhau
      const existingBarcode = sampleData.barcode || sampleData.Barcode || sampleData.existingBarcode || null;
      
      // Tối ưu: Chỉ lấy sample hiện tại nếu cần kiểm tra barcode
      // Nếu sampleData đã có barcode, không cần GET sample hiện tại (tránh timeout)
      if (!existingBarcode) {
        try {
          // Lấy sample hiện tại để kiểm tra barcode (với timeout ngắn hơn)
          const currentSampleResponse = await Promise.race([
            api.get(`/gateway/testorder/bloodsample/${id}`, { timeout: 10000 }), // 10s timeout
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);
          const currentSample = currentSampleResponse.data?.data || currentSampleResponse.data;
          
          // Nếu sample hiện tại có barcode, sử dụng nó
          if (currentSample?.barcode || currentSample?.Barcode) {
            sampleData.barcode = currentSample.barcode || currentSample.Barcode;
          } else {
            // Nếu không có barcode, tạo barcode đơn giản dựa trên timestamp (không cần GET tất cả samples)
            sampleData.barcode = 'S' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
          }
        } catch (getError) {
          // Nếu không lấy được sample hiện tại (timeout hoặc lỗi), tạo barcode mới ngay lập tức
          // Tạo barcode đơn giản dựa trên timestamp (không cần GET tất cả samples để tránh timeout)
          sampleData.barcode = 'S' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
        }
      } else {
        // Đã có barcode, sử dụng nó
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

  // Cập nhật trạng thái mẫu máu
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

  // Xóa mẫu máu
  deleteSample: async (id) => {
    try {
      // Swagger: DELETE /TestOrder/BloodSample/{id}
      await api.delete(`/gateway/testorder/bloodsample/${id}`);
      return { success: true, message: 'Xóa mẫu máu thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa mẫu máu' };
    }
  },

  // Lấy mẫu máu theo barcode
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

  // Tự động tạo barcode cho các samples chưa có barcode (fix samples cũ)
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

  // Tự động tạo sample cho các appointments đã check-in nhưng chưa có sample
  createMissingSamplesForCheckedInAppointments: async (appointments) => {
    try {
      // Lấy tất cả samples hiện có
      // Swagger: GET /TestOrder/BloodSample
      const samplesResponse = await api.get('/gateway/testorder/bloodsample');
      const existingSamples = Array.isArray(samplesResponse.data) 
        ? samplesResponse.data 
        : (samplesResponse.data?.data || []);
      const existingAppointmentIds = new Set(
        existingSamples.map(s => String(s.appointmentId)).filter(id => id && id !== 'undefined')
      );
      
      // Lọc các appointments đã check-in nhưng chưa có sample
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
      
      // Lấy thông tin user hiện tại
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      for (const appointment of appointmentsNeedingSamples) {
        try {
          // Tạo sample với barcode
          const barcode = await sampleService.generateUniqueBarcode();
          
          const newSample = {
            id: Date.now() + Math.random(), // Tạo ID unique
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            barcode: barcode,
            status: 'pending_collection', // Hoặc 'collected' nếu status là sample_collected
            createdAt: new Date().toISOString(),
            createdBy: currentUser.name || currentUser.username || 'System Fix'
          };
          // Ensure SampleType is present to satisfy backend validation
          const resolvedType = appointment.sampleType || appointment.sample_type || appointment.SampleType || '';
          const backendResolvedType = mapUiToBackendSampleType(resolvedType);
          newSample.sampleType = backendResolvedType;
          newSample.sample_type = backendResolvedType;
          newSample.SampleType = backendResolvedType;
          
          // Nếu appointment đã là sample_collected, tạo sample với status collected
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

  // Lấy mẫu máu theo lab test ID
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

  // Lấy mẫu máu theo trạng thái
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

  // Lấy mẫu máu theo appointment ID
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

  // Lấy mẫu máu theo bệnh nhân
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

  // Kiểm tra mẫu có sẵn sàng để nhập kết quả không
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

  // Đánh dấu mẫu đã xử lý xong (sẵn sàng nhập kết quả)
  markSampleProcessed: async (id) => {
    try {
      // Validate sample trước khi đánh dấu
      // Gateway route: GET /TestOrder/BloodSample/{id}
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      // Cho phép chuyển trực tiếp từ 'pending_collection' → 'completed' khi đã xác nhận barcode
      if (!['collected', 'processing', 'pending_collection'].includes(sample.status)) {
        return { success: false, message: 'Không thể đánh dấu hoàn thành cho trạng thái hiện tại của mẫu' };
      }

      // Cập nhật status mẫu
      const patchBody = {
        status: 'completed',
        processedAt: new Date().toISOString()
      };
      // Nếu đang ở 'pending_collection' mà hoàn thành luôn, bổ sung collectedAt để đảm bảo dữ liệu đầy đủ
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

      // Đồng thời cập nhật appointment status
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

  // Lấy danh sách mẫu sẵn sàng nhập kết quả (status = completed)
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

  // Lấy danh sách mẫu cần xử lý (status = collected)
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

  // Tạo mẫu máu mới với sync appointment
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

      // Tạo mã vạch duy nhất
      const barcode = await sampleService.generateUniqueBarcode();
      
      // Lấy thông tin user hiện tại từ localStorage
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
      
      // Tạo sample
      // Swagger: POST /TestOrder/BloodSample
      const response = await api.post('/gateway/testorder/bloodsample', newSample);

      // Cập nhật appointment status
      // Swagger: PUT /TestOrder/Appointment/{id}
      await api.put(`/gateway/testorder/appointment/${appointmentId}`, {
        status: 'sample_collected',
        updatedAt: new Date().toISOString()
      });

      // Tạo labTest record
      const labTestData = {
        id: Date.now() + 1, // +1 để tránh trùng với sample id
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

  // Cập nhật mẫu sang trạng thái đang xử lý
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

  // Lấy thông tin đầy đủ về mẫu (bao gồm appointment, patient, labTest)
  getSampleWithDetails: async (id) => {
    try {
      // Gateway route: GET /TestOrder/BloodSample/{id}
      const sampleResponse = await api.get(`/gateway/testorder/bloodsample/${id}`);
      const sample = sampleResponse.data;

      if (!sample) {
        return { success: false, message: 'Không tìm thấy mẫu máu' };
      }

      // Lấy thông tin appointment
      let appointment = null;
      if (sample.appointmentId) {
        try {
          // Swagger: GET /TestOrder/Appointment/{id}
          const aptResponse = await api.get(`/gateway/testorder/appointment/${sample.appointmentId}`);
          appointment = aptResponse.data?.data || aptResponse.data;
        } catch (err) {
        }
      }

      // Lấy thông tin patient
      let patient = null;
      if (sample.patientId) {
        try {
          // Swagger: GET /Patients/by-id/{id}
          const patientResponse = await api.get(`/gateway/patients/by-id/${sample.patientId}`);
          patient = patientResponse.data?.data || patientResponse.data;
        } catch (err) {
        }
      }

      // Lấy thông tin labTest
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

  // Lấy mẫu máu theo appointment ID
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

  // Validate có thể đánh dấu mẫu đã xử lý không
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


