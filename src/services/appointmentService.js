import api from '../config/api';

// appointmentService.js - Updated normalizeAppointment

const normalizeAppointment = (item) => {
  if (!item) return null;

  // 1. ID Mapping
  const id = item.id || item.appointmentId || item.AppointmentId || item.appointment_id || null;

  // 2. Patient Name Mapping
  // Backend may return: patientName, PatientName, patient_name
  // Or nested in object: patient.fullname, Patient.FullName
  let patientName = item.patientName || item.PatientName || item.patient_name || "Chưa cập nhật";

  if (item.patient && typeof item.patient === 'object') {
    patientName = item.patient.fullname || item.patient.fullName || item.patient.name || patientName;
  }

  // Fallback to truncated ID if patient name is missing
  const patientId = item.patientId || item.patient_id || item.createdBy || item.createdById || 'N/A';
  if (patientName === "Chưa cập nhật" && patientId !== 'N/A') {
    patientName = `PAT-${patientId.substring(0, 8)}...`; // Compact fallback format
  }

  // 3. Package/Service Name Mapping
  // Prioritize TestPackageName from backend DTO
  let packageName = item.TestPackageName || item.testPackageName || item.test_package_name;

  // Fallback: resolve name from nested test package object
  if (!packageName && item.testPackage) {
    packageName = item.testPackage.packageName || item.testPackage.name;
  }
  if (!packageName) {
    packageName = item.serviceName || item.service_name || "Gói xét nghiệm";
  }

  // 4. Time Mapping
  // Parse appointment date and time to ISO format
  let appointmentDate = item.appointmentDate || item.date || item.appointment_date;
  let appointmentTime = item.appointmentTime || item.time || item.appointment_time;

  // 5. Status Mapping
  const status = item.status || item.Status || item.status_code || 'unknown';

  // 6. Doctor Shift ID Mapping (Critical for linking to Doctor_Shifts table)
  const doctorShiftId = item.doctor_shift_id || item.doctorShiftId || item.DoctorShiftId || null;

  return {
    ...item,
    id,
    appointmentId: id,
    patientId,
    patientName, // Standardized field for UI
    packageName, // Standardized field for UI
    appointmentDate,
    appointmentTime,
    status: status.toLowerCase(), // Normalized lowercase for comparison
    doctorShiftId // Link to Doctor_Shifts table
  };
};
export const appointmentService = {
  // Retrieve all appointments
  // options: { fetchAll: boolean, params: object }
  getAllAppointments: async (options = {}) => {
    try {
      const response = await api.get('/gateway/testorder/appointment', { params: options.params || {} });

      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      // If caller requested full set, iterate pages
      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const MAX_PAGES = 100; // Pagination safety limit
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(raw) ? raw.length : 0) || 50;
          while (page <= MAX_PAGES) {
            const pagedResp = await api.get('/gateway/testorder/appointment', { params: { page, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
          }
          const data = Array.isArray(collected) ? collected.map(normalizeAppointment).filter(Boolean) : [];
          return { success: true, data };
        } catch (e) {
        }
      }

      const data = Array.isArray(raw) ? raw.map(normalizeAppointment).filter(Boolean) : [];

      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách lịch hẹn', error: error.message };
    }
  },

  // Retrieve appointments by date
  getAppointmentsByDate: async (date) => {
    try {
      const response = await api.get('/gateway/testorder/appointment');
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const allAppointments = Array.isArray(raw) ? raw.map(normalizeAppointment) : [];
      const appointments = allAppointments.filter(apt => apt.appointmentDate === date);
      return { success: true, data: appointments };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch hẹn theo ngày' };
    }
  },

  // Retrieve appointments by doctor
  getAppointmentsByDoctor: async (doctorId) => {
    try {
      if (!doctorId) {
        return { success: false, message: 'Doctor ID is required' };
      }
      const response = await api.get('/gateway/testorder/appointment');
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const allAppointments = Array.isArray(raw) ? raw.map(normalizeAppointment) : [];
      // Type-safe comparison: normalize IDs to strings
      const doctorIdStr = String(doctorId);
      const appointments = allAppointments.filter(apt => {
        if (apt.doctorId === null || apt.doctorId === undefined) {
          return false;
        }
        return String(apt.doctorId) === doctorIdStr;
      });
      return { success: true, data: appointments };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch hẹn theo bác sĩ: ' + error.message };
    }
  },

  // Retrieve appointments by patient
  getAppointmentsByPatient: async (patientId) => {
    try {
      const response = await api.get(`/gateway/testorder/appointment/patient/${patientId}`);
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const data = Array.isArray(raw) ? raw.map(normalizeAppointment) : [];
      return { success: true, data: data };
    } catch (error) {
      // BE returns 404 when no appointments found - this is normal, return empty array
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      return { success: false, message: 'Lỗi lấy lịch hẹn theo bệnh nhân', data: [] };
    }
  },

  /**
   * Retrieves an appointment by its booking code or ID.
   * Feature Task: Scan QR Check-in (Web).
   * 
   * @description Searches for an existing appointment matching the scanned QR code or identifier.
   * @param {string} code - The unique appointment code or ID extracted from a QR code or manual input.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} The appointment details if matched.
   * 
   * @example
   * const result = await appointmentService.getAppointmentByCode('AP123456');
   */
  getAppointmentByCode: async (code) => {
    try {
      const response = await api.get('/gateway/testorder/appointment');
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const allAppointments = Array.isArray(raw) ? raw.map(normalizeAppointment) : [];
      const appointment = allAppointments.find(apt => apt.appointmentCode === code || String(apt.id) === String(code));
      return { success: true, data: appointment };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch hẹn theo mã' };
    }
  },

  /**
   * Creates a new lab test appointment.
   * Feature Task: Create Appointments (Web).
   * 
   * @description Submits a new appointment booking request to the backend TestOrder service.
   * Requires patient identification (CreatedBy), test package, and optional doctor shift.
   * 
   * @param {Object} appointmentData - The appointment creation payload.
   * @param {string} [appointmentData.TestPackageId] - The selected lab test package ID.
   * @param {string} [appointmentData.DoctorShiftId] - Optional doctor work shift ID.
   * @param {string} [appointmentData.Status] - Initial status (e.g., 'pending_confirmation', 'scheduled').
   * @param {string} appointmentData.CreatedBy - The user/patient ID creating the appointment.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} Object containing created appointment data or error.
   * 
   * @example
   * const res = await appointmentService.createAppointment({
   *   TestPackageId: 'PKG_001',
   *   CreatedBy: 'patient_123',
   *   Status: 'scheduled'
   * });
   */
  createAppointment: async (appointmentData) => {
    try {
      // BE DTO format: { TestPackageId, DoctorShiftId, Status, CreatedBy }
      // Accept multiple casing/field variants from callers
      const resolvedTestPackageId = appointmentData.TestPackageId || appointmentData.testPackageId || appointmentData.test_package_id || appointmentData.PackageId || appointmentData.packageId || null;
      const resolvedDoctorShiftId = appointmentData.DoctorShiftId || appointmentData.doctorShiftId || appointmentData.doctor_shift_id || null;
      const resolvedStatus = appointmentData.Status || appointmentData.status || 'pending_confirmation';
      const resolvedCreatedBy = appointmentData.CreatedBy || appointmentData.createdBy || appointmentData.Created_By || null;

      const newAppointment = {
        TestPackageId: resolvedTestPackageId,
        DoctorShiftId: resolvedDoctorShiftId,
        Status: resolvedStatus,
        CreatedBy: resolvedCreatedBy
      };

      // Validate required field
      if (!newAppointment.CreatedBy) {
        return { success: false, message: 'CreatedBy (Patient ID) is required' };
      }

      const response = await api.post('/gateway/testorder/appointment', newAppointment);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.title ||
        error.response?.data?.detail ||
        error.message ||
        'Lỗi tạo lịch hẹn mới';
      return { success: false, message: errorMessage };
    }
  },

  /**
   * Updates existing appointment details.
   * Feature Task: Update Appointments (Web).
   * 
   * @description Sends modified appointment data (time, date, package, notes, status) to the backend.
   * @param {string} id - The unique identifier of the appointment to update.
   * @param {Object} appointmentData - Payload containing fields to update.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} Update result.
   * 
   * @example
   * const res = await appointmentService.updateAppointment('AP001', { Status: 'confirmed' });
   */
  updateAppointment: async (id, appointmentData) => {
    try {
      const response = await api.put(`/gateway/testorder/appointment/${id}`, appointmentData);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật lịch hẹn' };
    }
  },

  /**
   * Deletes an appointment from the system.
   * Feature Task: Delete Appointments (Web).
   * 
   * @description Calls the backend DELETE endpoint to permanently remove an appointment record.
   * @param {string} id - The unique identifier of the appointment to remove.
   * @returns {Promise<{success: boolean, message: string}>} Result message.
   * 
   * @example
   * const res = await appointmentService.deleteAppointment('AP001');
   */
  deleteAppointment: async (id) => {
    try {
      await api.delete(`/gateway/testorder/appointment/${id}`);
      return { success: true, message: 'Xóa lịch hẹn thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa lịch hẹn' };
    }
  },

  // Update appointment status
  updateAppointmentStatus: async (id, status) => {
    try {
      // Backend DTO expects Status (PascalCase) according to AppointmentUpdateDto
      const response = await api.put(`/gateway/testorder/appointment/${id}`, { Status: status });

      // Backend returns 204 NoContent on success, or 200 OK with data
      if (response.status === 204 || response.status === 200) {
        return { success: true, data: response.data || { id, status } };
      }

      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message ||
          error.response?.data?.title ||
          error.message ||
          'Lỗi cập nhật trạng thái lịch hẹn'
      };
    }
  },

  // Retrieve available shifts
  getAvailableTimeSlots: async (date, doctorId) => {
    try {
      // Retrieve existing appointments for date
      const appointmentsResponse = await api.get('/gateway/testorder/appointment');
      const raw = Array.isArray(appointmentsResponse.data) ? appointmentsResponse.data : (appointmentsResponse.data?.data || []);
      const allAppointments = Array.isArray(raw) ? raw.map(normalizeAppointment) : [];
      const appointments = allAppointments.filter(apt =>
        apt.appointmentDate === date && String(apt.doctorId) === String(doctorId)
      );

      const bookedSlots = appointments.map(apt => apt.appointmentTime);

      // Standard fixed shift definitions
      const timeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30'
      ];

      const availableSlots = timeSlots.filter(slot => !bookedSlots.includes(slot));

      return { success: true, data: availableSlots };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy ca làm việc' };
    }
  },

  // Retrieve appointment by ID
  getAppointmentById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/appointment/${id}`);

      const raw = response.data?.data || response.data;
      const data = normalizeAppointment(raw);

      return { success: true, data: data };
    } catch (error) {

      return { success: false, message: 'Lỗi lấy thông tin lịch hẹn' };
    }
  },

  /**
   * Performs express check-in for an appointment upon QR code scan or receptionist reception.
   * Feature Task: Scan QR Check-in (Web).
   * 
   * @description Validates appointment state and check-in time window (30 mins before to 2 hours after),
   * updates status to 'checked_in', records timestamp and receptionist ID, and pushes the patient into the queue.
   * 
   * @param {string} id - The unique appointment ID to check-in.
   * @param {string} [receptionistId=null] - The ID of the receptionist performing or supervising the check-in.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} The updated appointment payload with check-in timestamp.
   * 
   * @example
   * const res = await appointmentService.checkInAppointment('AP001', 'rec_123');
   */
  checkInAppointment: async (id, receptionistId = null) => {
    try {
      // Validate appointment before check-in
      const appointmentResponse = await api.get(`/gateway/testorder/appointment/${id}`);
      const appointment = appointmentResponse.data?.data || appointmentResponse.data;

      if (!appointment) {
        return { success: false, message: 'Không tìm thấy lịch hẹn' };
      }

      // Check if already checked in
      if (appointment.status === 'checked_in') {
        const checkedInTime = appointment.checkedInAt
          ? new Date(appointment.checkedInAt).toLocaleString('vi-VN')
          : 'N/A';
        return {
          success: false,
          message: `Bệnh nhân đã được check-in lúc ${checkedInTime}. Không thể check-in lại.`
        };
      }

      // Accept 'scheduled' and 'confirmed' statuses
      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        return { success: false, message: 'Chỉ có thể check-in lịch hẹn đã thanh toán hoặc đã xác nhận' };
      }

      // Validate check-in window (30 mins before to 2 hours after scheduled time)
      const now = new Date();
      // Helper function to get appointment datetime
      const getAppointmentDateTime = (apt) => {
        if (!apt || !apt.appointmentDate) return null;
        try {
          const [hour, minute] = (apt.appointmentTime || apt.time || '00:00').split(':').map(Number);
          const aptDate = new Date(apt.appointmentDate);
          aptDate.setHours(hour || 0, minute || 0, 0, 0);
          return aptDate;
        } catch (error) {
          return null;
        }
      };
      const appointmentDateTime = getAppointmentDateTime(appointment);

      if (appointmentDateTime) {
        const windowStart = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000); // 30 mins before
        const windowEnd = new Date(appointmentDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after

        if (now < windowStart) {
          const minutesUntil = Math.ceil((windowStart - now) / (1000 * 60));
          return {
            success: false,
            message: `Chưa đến giờ check-in. Vui lòng quay lại sau ${minutesUntil} phút.`
          };
        }

        if (now > windowEnd) {
          const minutesLate = Math.ceil((now - windowEnd) / (1000 * 60));
          return {
            success: false,
            message: `Đã quá giờ check-in (quá ${minutesLate} phút). Vui lòng liên hệ quản lý.`
          };
        }
      }

      // Update status to checked_in and record timestamp
      const updateData = {
        status: 'checked_in',
        checkedInAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Record staff check-in user info if available
      if (receptionistId) {
        updateData.checkedInBy = receptionistId;
        updateData.checkedInByRole = 'receptionist';
      }

      const response = await api.put(`/gateway/testorder/appointment/${id}`, updateData);
      
      // Fetch the updated appointment to get newly generated fields like queueNumber
      try {
        const updatedResponse = await api.get(`/gateway/testorder/appointment/${id}`);
        const updatedData = updatedResponse.data?.data || updatedResponse.data || {};
        return { success: true, data: updatedData };
      } catch (e) {
        // Fallback if fetch fails
        const data = response.data?.data || response.data;
        return { success: true, data: data };
      }
    } catch (error) {
      return { success: false, message: 'Lỗi check-in bệnh nhân' };
    }
  },

  // Helper function: parse datetime from appointment
  getAppointmentDateTime: (appointment) => {
    if (!appointment || !appointment.appointmentDate) return null;

    try {
      const [hour, minute] = (appointment.appointmentTime || appointment.time || '00:00').split(':').map(Number);
      const aptDate = new Date(appointment.appointmentDate);
      aptDate.setHours(hour || 0, minute || 0, 0, 0);
      return aptDate;
    } catch (error) {
      return null;
    }
  },

  // Mark appointment as no-show
  markNoShow: async (id, notes = '') => {
    try {
      // Validate appointment
      const appointmentResponse = await api.get(`/gateway/testorder/appointment/${id}`);
      const appointment = appointmentResponse.data?.data || appointmentResponse.data;

      if (!appointment) {
        return { success: false, message: 'Không tìm thấy lịch hẹn' };
      }

      if (appointment.status !== 'confirmed') {
        return { success: false, message: 'Chỉ có thể đánh dấu không đến cho lịch hẹn đã xác nhận' };
      }

      // Update appointment status to no_show
      const response = await api.put(`/gateway/testorder/appointment/${id}`, {
        status: 'no_show',
        noShowAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: notes || appointment.notes
      });
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi đánh dấu không đến' };
    }
  },

  // Retrieve appointments by status
  getAppointmentsByStatus: async (status) => {
    try {
      const response = await api.get('/gateway/testorder/appointment');
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const allAppointments = Array.isArray(raw) ? raw.map(normalizeAppointment) : [];
      const appointments = allAppointments.filter(apt => apt.status === status);
      return { success: true, data: appointments };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch hẹn theo trạng thái' };
    }
  },

  // Retrieve appointments ready for check-in (status = 'confirmed')
  getAppointmentsNeedCheckIn: async () => {
    try {
      const response = await api.get('/gateway/testorder/appointment');
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const allAppointments = Array.isArray(raw) ? raw.map(normalizeAppointment) : [];
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Retrieve confirmed appointments for today or past dates
      const appointments = allAppointments.filter(apt => {
        return apt.status === 'confirmed' && apt.appointmentDate && apt.appointmentDate <= today;
      });

      return { success: true, data: appointments };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách cần check-in' };
    }
  },

  // Update appointment status upon sample collection
  updateAfterSampleCollection: async (id) => {
    try {
      const response = await api.put(`/gateway/testorder/appointment/${id}`, {
        status: 'sample_collected',
        updatedAt: new Date().toISOString()
      });
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật lịch hẹn sau khi lấy mẫu' };
    }
  },

  // Update appointment status upon sample processing completion
  updateAfterSampleProcessed: async (id) => {
    try {
      const response = await api.put(`/gateway/testorder/appointment/${id}`, {
        status: 'sample_processed',
        updatedAt: new Date().toISOString()
      });
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật lịch hẹn sau khi xử lý mẫu' };
    }
  },

  // Update appointment status upon internal result verification
  updateAfterResultConfirmed: async (id) => {
    try {
      const response = await api.put(`/gateway/testorder/appointment/${id}`, {
        status: 'result_pending',
        updatedAt: new Date().toISOString()
      });
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật lịch hẹn sau khi xác nhận kết quả' };
    }
  },

  // Update appointment status when submitted for doctor review
  updateAfterSendToDoctor: async (id) => {
    try {
      const response = await api.put(`/gateway/testorder/appointment/${id}`, {
        status: 'waiting_review',
        updatedAt: new Date().toISOString()
      });
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật lịch hẹn sau khi gửi bác sĩ' };
    }
  },

  // Update appointment status when doctor review is complete
  updateAfterDoctorApproval: async (id) => {
    try {
      const response = await api.put(`/gateway/testorder/appointment/${id}`, {
        status: 'completed',
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật lịch hẹn sau khi bác sĩ duyệt' };
    }
    },

  // Helper: Extract test/package id from an appointment object
  // Returns the first non-empty candidate or null.
  getTestPackageIdFromAppointment: (appointment) => {
    if (!appointment) return null;
    try {
      // 1) Direct common fields
      const direct = [
        appointment.TestPackageId, appointment.testPackageId, appointment.TestPackageId, appointment.packageId, appointment.PackageId, appointment.pkgId, appointment.pkg_id, appointment.test_package_id, appointment.test_packageid
      ];
      for (const c of direct) {
        if (c !== undefined && c !== null && String(c).trim() !== '') return c;
      }

      // 2) Shallow known nested shapes
      const shallowCandidates = [
        appointment.testPackage, appointment.package, appointment.service, appointment.pkg, appointment.items, appointment.services, appointment.order, appointment.meta
      ];
      const tryKeys = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        const keys = ['id','packageId','pkgId','testPackageId','serviceId','package_id','pkg_id','test_package_id'];
        for (const k of keys) {
          if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
        }
        return null;
      };
      for (const cand of shallowCandidates) {
        if (!cand) continue;
        if (Array.isArray(cand)) {
          for (const it of cand) {
            const v = tryKeys(it);
            if (v) return v;
          }
        } else if (typeof cand === 'object') {
          const v = tryKeys(cand);
          if (v) return v;
        }
      }

      // 3) Limited recursive search for keys that look like package id
      const seen = new Set();
      const searchForPkgId = (obj, depth = 0) => {
        if (!obj || typeof obj !== 'object' || depth > 4) return null;
        if (seen.has(obj)) return null;
        seen.add(obj);
        for (const k of Object.keys(obj)) {
          try {
            const v = obj[k];
            if (v === undefined || v === null) continue;
            const lk = String(k || '').toLowerCase();
            if (/^(package|pkg|testpackage|test_package|service).*(id|_id)?$/.test(lk) || /(^id$)/.test(lk)) {
              if (typeof v === 'string' || typeof v === 'number') {
                if (String(v).trim() !== '') return v;
              }
              if (typeof v === 'object') {
                const nested = searchForPkgId(v, depth + 1);
                if (nested) return nested;
              }
            }
            if (Array.isArray(v) && v.length > 0) {
              for (const el of v) {
                if (typeof el === 'object') {
                  const nested = searchForPkgId(el, depth + 1);
                  if (nested) return nested;
                }
              }
            }
          } catch (e) { /* ignore individual property errors */ }
        }
        return null;
      };

      const rec = searchForPkgId(appointment, 0);
      if (rec) return rec;

      // 4) shallow fallback: service.package.id
      if (appointment.service && appointment.service.package) {
        const sPkg = appointment.service.package;
        if (sPkg.id || sPkg.packageId) return sPkg.id || sPkg.packageId;
      }
      return null;
    } catch (error) {
      return null;
    }
  },
};
