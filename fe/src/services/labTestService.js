/**
 * Lab Test Service
 * 
 * This service handles all laboratory test-related operations including
 * test creation, result management, and test status tracking.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';
import { sampleService } from './sampleService';
import { doctorService } from './doctorService';
import { emailService } from './emailService';

/**
 * Lab Test Service Object
 * 
 * Contains methods for laboratory test management and operations.
 * All methods return a standardized response object with success status and data/message.
 */
export const labTestService = {
  /**
   * Get All Lab Tests
   * 
   * Retrieves a list of all laboratory tests from the database.
   * 
   * @returns {Promise<Object>} Response object with success status and test list
   */
  getAllLabTests: async (options = {}) => {
    try {
      const response = await api.get('/gateway/patients/lab-tests', { params: options.params || {} });
      let data = response.data?.data || response.data || [];

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            try {
              const pagedResp = await api.get('/gateway/patients/lab-tests', { params: { page, pageSize: respPageSize } });
              const pageData = pagedResp.data?.data || pagedResp.data || [];
              if (!pageData || pageData.length === 0) break;
              for (const it of pageData) collected.push(it);
              if (pageData.length < respPageSize) break;
              page += 1;
              if (page > 200) break;
            } catch (pageErr) {
              // Nếu là 404, không có thêm data nào
              if (pageErr.response?.status === 404) {
                break;
              }
              throw pageErr;
            }
          }
          return { success: true, data: Array.isArray(collected) ? collected : [] };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      // Handle 404 như trường hợp hợp lệ (không có data)
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      return { success: false, message: 'Lỗi lấy danh sách phiếu xét nghiệm', data: [] };
    }
  },

  // Lấy phiếu xét nghiệm theo ID
  getLabTestById: async (id) => {
    try {
      const response = await api.get(`/gateway/patients/lab-tests/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin phiếu xét nghiệm' };
    }
  },

  // Lấy phiếu xét nghiệm theo ngày
  getLabTestsByDate: async (date) => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      // Handle BE response: { message: "...", data: [...] } or array
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const tests = allTests.filter(test => {
        const testDate = new Date(test.requestedAt).toISOString().split('T')[0];
        return testDate === date;
      });
      return { success: true, data: tests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy phiếu xét nghiệm theo ngày' };
    }
  },

  // Lấy phiếu xét nghiệm theo bệnh nhân
  getTestsByPatient: async (patientId) => {
    try {
      
      // Fetch tất cả lab tests (không chỉ page đầu tiên)
      let allLabTests = [];
      try {
        // Thử fetch tất cả với pagination
        const collected = [];
        let page = 1;
        const pageSize = 50; // Lấy nhiều hơn mỗi page
        let hasMore = true;
        
        while (hasMore && page <= 200) { // Giới hạn tối đa 200 pages để tránh vòng lặp vô hạn
          try {
            const response = await api.get('/gateway/patients/lab-tests', { 
              params: { page, pageSize } 
            });
            
            const pageData = Array.isArray(response.data) 
              ? response.data 
              : (response.data?.data || []);
            
            if (!pageData || pageData.length === 0) {
              hasMore = false;
              break;
            }
            
            collected.push(...pageData);
            
            // Kiểm tra xem còn data không
            const total = response.data?.total || response.data?.pageSize || pageData.length;
            if (pageData.length < pageSize || collected.length >= total) {
              hasMore = false;
            } else {
              page += 1;
            }
          } catch (pageErr) {
            // Nếu là 404 ở page đầu tiên, có nghĩa là không có data nào - đây là trường hợp hợp lệ
            if (pageErr.response?.status === 404 && page === 1) {
              hasMore = false;
              break;
            }
            // Nếu lỗi ở page khác, dừng pagination
            hasMore = false;
            break;
          }
        }
        
        allLabTests = collected;
      } catch (err) {
        // Handle 404 như trường hợp hợp lệ (không có data)
        if (err.response?.status === 404) {
          allLabTests = [];
        } else {
          // Fallback: lấy page đầu tiên
          try {
            const response = await api.get('/gateway/patients/lab-tests');
            allLabTests = Array.isArray(response.data) 
              ? response.data 
              : (response.data?.data || []);
          } catch (fallbackErr) {
            // Nếu fallback cũng 404, trả về empty array
            if (fallbackErr.response?.status === 404) {
              allLabTests = [];
            } else {
              // Nếu là lỗi khác, throw để báo lỗi thực sự
              throw fallbackErr;
            }
          }
        }
      }

      // Lấy appointments của bệnh nhân để tìm lab tests qua appointmentId
      let appointmentIds = [];
      try {
        // Sử dụng endpoint chuyên dụng cho patient
        const appointmentsResponse = await api.get(`/gateway/testorder/appointment/patient/${patientId}`);
        const patientAppointments = Array.isArray(appointmentsResponse.data)
          ? appointmentsResponse.data
          : (appointmentsResponse.data?.data || []);
        
        appointmentIds = patientAppointments.map(apt => apt.id || apt.Id || apt.appointmentId);
      } catch (err) {
        // Fallback: lấy tất cả appointments và filter
        try {
          const appointmentsResponse = await api.get('/gateway/testorder/appointment');
          const allAppointments = Array.isArray(appointmentsResponse.data)
            ? appointmentsResponse.data
            : (appointmentsResponse.data?.data || []);
          if (allAppointments && Array.isArray(allAppointments)) {
            const patientAppointments = allAppointments.filter(apt => {
              const aptPatientId = apt.patientId || apt.patient_id || apt.PatientId;
              return aptPatientId !== undefined && aptPatientId !== null &&
                (String(aptPatientId) === String(patientId) ||
                  Number(aptPatientId) === Number(patientId) ||
                  aptPatientId === patientId);
            });
            appointmentIds = patientAppointments.map(apt => apt.id || apt.Id || apt.appointmentId);
          }
        } catch (fallbackErr) {
        }
      }

      // Tìm kiếm với nhiều cách so sánh để đảm bảo tìm được tất cả
      const tests = allLabTests.filter(test => {
        if (!test) return false;

        // Kiểm tra patientId (camelCase)
        if (test.patientId !== undefined && test.patientId !== null) {
          if (String(test.patientId) === String(patientId) ||
            Number(test.patientId) === Number(patientId) ||
            test.patientId === patientId) {
            return true;
          }
        }

        // Kiểm tra patient_id (snake_case)
        if (test.patient_id !== undefined && test.patient_id !== null) {
          if (String(test.patient_id) === String(patientId) ||
            Number(test.patient_id) === Number(patientId) ||
            test.patient_id === patientId) {
            return true;
          }
        }

        // Kiểm tra PatientId (PascalCase)
        if (test.PatientId !== undefined && test.PatientId !== null) {
          if (String(test.PatientId) === String(patientId) ||
            Number(test.PatientId) === Number(patientId) ||
            test.PatientId === patientId) {
            return true;
          }
        }

        // Nếu không tìm thấy qua patientId, thử tìm qua appointmentId
        if (appointmentIds.length > 0) {
          const testAppointmentId = test.appointmentId || test.appointment_id || test.AppointmentId;
          if (testAppointmentId !== undefined && testAppointmentId !== null) {
            const appointmentMatch = appointmentIds.some(aptId =>
              String(aptId) === String(testAppointmentId) ||
              Number(aptId) === Number(testAppointmentId) ||
              aptId === testAppointmentId
            );

            if (appointmentMatch) {
              return true;
            }
          }
        }

        return false;
      });

      return { success: true, data: tests };
    } catch (error) {
      // Nếu là 404, trả về empty array (không phải lỗi)
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      return { success: false, message: 'Lỗi lấy phiếu xét nghiệm theo bệnh nhân', error: error.message };
    }
  },

  // Lấy phiếu xét nghiệm theo bác sĩ
  getLabTestsByDoctor: async (doctorId) => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      // Handle BE response: { message: "...", data: [...] } or array
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const tests = allTests.filter(test => {
        // Some backends may store doctor reference on the test itself or via appointment
        try {
          if (test === null || test === undefined) return false;
          if (test.doctorId !== undefined && test.doctorId !== null) {
            if (String(test.doctorId) === String(doctorId)) return true;
          }
          // fallback: check appointmentDoctor if present
          if (test.appointmentDoctorId !== undefined && test.appointmentDoctorId !== null) {
            if (String(test.appointmentDoctorId) === String(doctorId)) return true;
          }
          return false;
        } catch (err) { return false; }
      });
      return { success: true, data: tests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy phiếu xét nghiệm theo bác sĩ' };
    }
  },


  // Tạo phiếu xét nghiệm mới
  createLabTest: async (testData) => {
    try {
      const newTest = {
        ...testData,
        sampleId: `S${String(Date.now()).slice(-6)}`
      };

      const response = await api.post('/gateway/patients/lab-tests', newTest);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo phiếu xét nghiệm mới: ' + error.message };
    }
  },

  // Cập nhật phiếu xét nghiệm
  updateLabTest: async (id, testData) => {
    try {
      // Use PATCH instead of PUT to avoid strict full-resource validation errors from patient-service
      const response = await api.patch(`/gateway/patients/lab-tests/${id}`, testData);
      return { success: true, data: response.data };
    } catch (error) {
      // Return backend message when available to help callers handle validation
      const status = error?.response?.status;
      const data = error?.response?.data;
      const message = (data && (data.message || data.error || JSON.stringify(data))) || error.message || 'Lỗi cập nhật phiếu xét nghiệm';
      return { success: false, message, status, data };
    }
  },

  // Cập nhật trạng thái phiếu xét nghiệm
  updateTestStatus: async (id, status) => {
    try {
      const response = await api.patch(`/gateway/patients/lab-tests/${id}`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái phiếu xét nghiệm' };
    }
  },

  // Xóa phiếu xét nghiệm
  deleteLabTest: async (id) => {
    try {
      await api.delete(`/gateway/patients/lab-tests/${id}`);
      return { success: true, message: 'Xóa phiếu xét nghiệm thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa phiếu xét nghiệm' };
    }
  },

  // Lấy kết quả xét nghiệm
  // Swagger: GET /TestOrder/TestResult/by-appointment/{appointmentId} hoặc GET /TestOrder/TestResult/{id}
  getTestResult: async (testId) => {
    try {
      // Try TestResult endpoint first (Testorder-service)
      try {
        const response = await api.get(`/gateway/testorder/testresult/${testId}`);
        const data = response.data?.data || response.data;
        return { success: true, data: data };
      } catch (err) {
        // Fallback: try lab-test (Patient-service)
        const response = await api.get(`/gateway/patients/lab-tests/${testId}`);
        const labTest = response.data?.data || response.data;
        // Results are stored in labTest.results field
        return { success: true, data: labTest?.results || [] };
      }
    } catch (error) {
      return { success: false, message: 'Lỗi lấy kết quả xét nghiệm' };
    }
  },

  // Thêm kết quả xét nghiệm
  // Swagger: POST /TestOrder/TestResult
  addTestResult: async (testId, resultData) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      // Ensure SampleId is present in the payload (some backends validate this)
      let sampleId = resultData && (resultData.SampleId || resultData.sampleId || resultData.sample_id || resultData.sampleID);
      if (!sampleId) {
        try {
          const labTestRes = await api.get(`/gateway/patients/lab-tests/${testId}`);
          const labTest = labTestRes.data?.data || labTestRes.data;
          sampleId = labTest && (labTest.SampleId || labTest.sampleId || labTest.sample_id || labTest.sampleId);
        } catch (e) {
          // ignore - we'll still try to send without it, but backend may reject
        }
      }

      // Try TestResult endpoint first (Testorder-service)
      try {
        const newTestResult = {
          ...resultData,
          labTestId: testId,
          technicianId: currentUser.id,
          SampleId: sampleId,
          createdAt: new Date().toISOString()
        };
        const response = await api.post('/gateway/testorder/testresult', newTestResult);
        const data = response.data?.data || response.data;
        return { success: true, data: data };
      } catch (err) {
        // Fallback: update lab-test (Patient-service)
        const patchBody = {
          results: resultData.results || resultData,
          status: 'completed',
          technicianId: currentUser.id,
          resultEnteredAt: new Date().toISOString()
        };
        if (sampleId) patchBody.SampleId = sampleId;
        const response = await api.patch(`/gateway/patients/lab-tests/${testId}`, patchBody);
        return { success: true, data: response.data?.data || response.data };
      }
    } catch (error) {
      return { success: false, message: 'Lỗi thêm kết quả xét nghiệm' };
    }
  },

  // Cập nhật kết quả xét nghiệm
  // Swagger: PUT /TestOrder/TestResult/{id}
  updateTestResult: async (testId, resultData) => {
    try {
      // Try TestResult endpoint first (Testorder-service)
      try {
        const response = await api.put(`/gateway/testorder/testresult/${testId}`, {
          ...resultData,
          updatedAt: new Date().toISOString()
        });
        const data = response.data?.data || response.data;
        return { success: true, data: data };
      } catch (err) {
        // Fallback: update lab-test (Patient-service)
        const response = await api.patch(`/gateway/patients/lab-tests/${testId}`, {
          results: resultData.results || resultData,
          updatedAt: new Date().toISOString()
        });
        return { success: true, data: response.data?.data || response.data };
      }
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật kết quả xét nghiệm' };
    }
  },

  // Đồng bộ status giữa lab test và appointment
  syncWithAppointment: async (labTestId, newStatus) => {
    try {
      // Lấy thông tin lab test
      const testResponse = await api.get(`/gateway/patients/lab-tests/${labTestId}`);
      const labTest = testResponse.data;

      if (!labTest) {
        return { success: false, message: 'Không tìm thấy lab test' };
      }

      // Cập nhật appointment status tương ứng
      let appointmentStatus = '';
      switch (newStatus) {
        case 'waiting_review':
          // Previously mapped to 'ready_for_consultation' (consultation flow).
          // Now map to 'waiting_review' to keep appointment sync consistent.
          appointmentStatus = 'waiting_review';
          break;
        case 'approved':
          appointmentStatus = 'completed';
          break;
        case 'completed':
          appointmentStatus = 'testing';
          break;
        default:
          appointmentStatus = labTest.appointmentId; // Giữ nguyên
      }

      if (appointmentStatus && appointmentStatus !== labTest.appointmentId && labTest.appointmentId) {
        try {
          const appointmentResponse = await api.put(`/gateway/testorder/appointment/${labTest.appointmentId}`, {
            status: appointmentStatus,
            updatedAt: new Date().toISOString()
          });

          if (!appointmentResponse.data) {
          }
        } catch (err) {
        }
      }

      return { success: true, message: 'Đồng bộ thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi đồng bộ với appointment' };
    }
  },

  // Lấy kết quả xét nghiệm theo appointment
  getLabTestsByAppointment: async (appointmentId) => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      // Handle BE response: { message: "...", data: [...] } or array
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const tests = allTests.filter(test => test.appointmentId === parseInt(appointmentId));
      return { success: true, data: tests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy kết quả xét nghiệm theo lịch hẹn' };
    }
  },

  // Lấy danh sách lab tests theo trạng thái (compatibility wrapper)
  // Một số chỗ trong code gọi getLabTestsByStatus(status)
  getLabTestsByStatus: async (status) => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const wanted = (status || '').toString().toLowerCase();
      const tests = allTests.filter(t => {
        if (!t) return false;
        const ts = (t.status || t.Status || '').toString().toLowerCase();
        return ts === wanted;
      });
      return { success: true, data: tests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách phiếu theo trạng thái' };
    }
  },

  // Xóa kết quả xét nghiệm
  // Swagger: DELETE /TestOrder/TestResult/{id}
  deleteTestResult: async (testId) => {
    try {
      // Try TestResult endpoint first (Testorder-service)
      try {
        await api.delete(`/gateway/testorder/testresult/${testId}`);
        return { success: true, message: 'Xóa kết quả xét nghiệm thành công' };
      } catch (err) {
        // Fallback: clear results in lab-test (Patient-service)
        await api.patch(`/gateway/patients/lab-tests/${testId}`, {
          results: {},
          updatedAt: new Date().toISOString()
        });
        return { success: true, message: 'Xóa kết quả xét nghiệm thành công' };
      }
    } catch (error) {
      return { success: false, message: 'Lỗi xóa kết quả xét nghiệm' };
    }
  },

  // ========== NEW WORKFLOW FUNCTIONS ==========

  // Nhập kết quả xét nghiệm (chưa xác nhận)
  enterTestResult: async (testId, resultData) => {
    try {
      // Validate labTest
      const testResponse = await api.get(`/gateway/patients/lab-tests/${testId}`);
      const labTest = testResponse.data?.data || testResponse.data;

      if (!labTest) {
        return { success: false, message: 'Không tìm thấy phiếu xét nghiệm' };
      }

      if (labTest.status !== 'pending') {
        return { success: false, message: 'Chỉ có thể nhập kết quả cho phiếu đang chờ' };
      }

      // Validate sample đã xử lý xong
      if (labTest.sampleId) {
        let sample = null;
        // Check if sampleId is a barcode (starts with 'S' or is a string that's not a pure number)
        const isBarcode = typeof labTest.sampleId === 'string' && (labTest.sampleId.startsWith('S') || isNaN(labTest.sampleId));
        if (isBarcode) {
          const sampleResult = await sampleService.getSampleByBarcode(labTest.sampleId);
          if (sampleResult.success) {
            sample = sampleResult.data;
          }
        } else {
          // sampleId is a numeric ID
          try {
            const sampleResponse = await api.get(`/samples/${labTest.sampleId}`);
            sample = sampleResponse.data;
          } catch (error) {
            // If direct ID lookup fails, try barcode lookup as fallback
            const sampleResult = await sampleService.getSampleByBarcode(String(labTest.sampleId));
            if (sampleResult.success) {
              sample = sampleResult.data;
            }
          }
        }
        if (sample && sample.status !== 'completed') {
          return { success: false, message: 'Mẫu chưa xử lý xong, không thể nhập kết quả' };
        }
      }

      // Lấy user hiện tại
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      // Cập nhật kết quả
      const response = await api.patch(`/gateway/patients/lab-tests/${testId}`, {
        results: resultData.results,
        technicianNotes: resultData.technicianNotes || '',
        status: 'result_entered',
        resultEnteredAt: new Date().toISOString(),
        enteredBy: currentUser.id
      });

      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi nhập kết quả xét nghiệm' };
    }
  },

  // Xác nhận kết quả nội bộ
  confirmTestResult: async (testId) => {
    try {
      // Validate labTest
      const testResponse = await api.get(`/gateway/patients/lab-tests/${testId}`);
      const labTest = testResponse.data?.data || testResponse.data;

      if (!labTest) {
        return { success: false, message: 'Không tìm thấy phiếu xét nghiệm' };
      }

      if (labTest.status !== 'result_entered') {
        return { success: false, message: 'Chỉ có thể xác nhận kết quả đã nhập' };
      }

      // Lấy user hiện tại
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      // Cập nhật status
      const response = await api.patch(`/gateway/patients/lab-tests/${testId}`, {
        status: 'result_pending',
        resultConfirmedAt: new Date().toISOString(),
        confirmedBy: currentUser.id
      });

      // Cập nhật appointment status
      if (labTest.appointmentId) {
        try {
          await api.put(`/gateway/testorder/appointment/${labTest.appointmentId}`, {
            status: 'result_pending',
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
        }
      }

      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi xác nhận kết quả' };
    }
  },

  // Gửi cho bác sĩ duyệt
  sendToDoctorReview: async (testId) => {
    try {
      // Validate labTest
      const testResponse = await api.get(`/gateway/patients/lab-tests/${testId}`);
      const labTest = testResponse.data?.data || testResponse.data;

      if (!labTest) {
        return { success: false, message: 'Không tìm thấy phiếu xét nghiệm' };
      }

      if (labTest.status !== 'result_pending') {
        return { success: false, message: 'Chỉ có thể gửi bác sĩ kết quả đã xác nhận' };
      }

      // Cập nhật status
      const response = await api.patch(`/gateway/patients/lab-tests/${testId}`, {
        status: 'waiting_review',
        sentToDoctorAt: new Date().toISOString()
      });

      // Cập nhật appointment status
      if (labTest.appointmentId) {
        try {
          await api.put(`/gateway/testorder/appointment/${labTest.appointmentId}`, {
            status: 'waiting_review',
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
        }
      }

      // Notify assigned doctor (best-effort). Try to fetch appointment -> doctor -> email
      try {
        if (labTest.appointmentId) {
          const aptResp = await api.get(`/gateway/testorder/appointment/${labTest.appointmentId}`);
          const apt = aptResp.data?.data || aptResp.data;
          const docId = apt?.doctorId || apt?.doctor_id;
          if (docId) {
            const docResp = await doctorService.getDoctorById(docId);
            const doc = docResp.success ? (docResp.data || docResp.data?.data) : (docResp.data || null);
            const doctorEmail = doc?.email || doc?.contactEmail || doc?.emailAddress;
            if (doctorEmail) {
              try {
                await emailService.sendDoctorNotification(doctorEmail, { id: testId, createdAt: labTest.resultEnteredAt || labTest.createdAt }, { patientName: apt.patientName || apt.patientId });
              } catch (e) {
                // Ignore email errors
              }
            }
          }
        }
      } catch (e) {
      }

      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi gửi cho bác sĩ duyệt' };
    }
  },

  // labTestService.js

  // Bác sĩ duyệt kết quả (Final Version - Correct Endpoint & Status)
  approveTestResult: async (testId, payload) => {
    try {
      // 1. Lấy user hiện tại
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      // 2. Xử lý dữ liệu input
      let notes = '';
      let inputDoctorName = '';

      if (typeof payload === 'string') {
        notes = payload;
      } else if (payload && typeof payload === 'object') {
        notes = payload.doctorNotes || payload.notes || '';
        inputDoctorName = payload.doctorName;
      }

      const finalDoctorName = inputDoctorName || currentUser.fullName || currentUser.name || 'Bác sĩ';
      const approverId = payload.approvedBy || currentUser.id;

      // 3. GỌI API UPDATE TRẠNG THÁI (TestOrder Service)
      // SỬA: Đổi endpoint về /gateway/testorder/testresult/ để trỏ đúng DB TestOrderManagementDB
      // SỬA: Đổi status thành 'Completed' để khớp với hình ảnh DB bạn cung cấp

      const response = await api.put(`/gateway/testorder/testresult/${testId}`, {
        // Backend yêu cầu deviceId và quantity (required fields theo UpdateTestResultDto)
        deviceId: payload.deviceId || '',
        quantity: payload.quantity || 1,
        // Status và review info
        status: 'Completed', // Status chuẩn trong DB là 'Completed'
        reviewedBy: approverId,
        reviewedAt: new Date().toISOString(),
      });

      // Lấy data trả về
      const updatedLabTest = response.data?.data || response.data || {};

      // 4. Cập nhật trạng thái Appointment thành 'completed'
      const appointmentIdToUpdate = updatedLabTest.appointmentId || updatedLabTest.appointment_id || payload.appointmentId;

      if (appointmentIdToUpdate) {
        try {
          await api.put(`/gateway/testorder/appointment/${appointmentIdToUpdate}`, {
            status: 'completed', // Status chuẩn cho Appointment hoàn tất
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          });
        } catch (err) {
        }
      }

      // 5. Return Success
      return {
        success: true,
        data: {
          ...updatedLabTest,
          doctorName: finalDoctorName
        }
      };

    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi hệ thống khi duyệt kết quả' };
    }
  },

  // Lấy danh sách lab tests chờ bác sĩ duyệt
  getLabTestsNeedReview: async (doctorId = null) => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      // Handle BE response: { message: "...", data: [...] } or array
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      let tests = allTests.filter(test => test && String((test.status || '').toLowerCase()) === 'waiting_review');

      // Nếu có doctorId, lọc theo bác sĩ
      if (doctorId) {
        // Lấy appointments để filter theo doctorId
        const appointmentsResponse = await api.get('/gateway/testorder/appointment');
        const allAppointments = Array.isArray(appointmentsResponse.data)
          ? appointmentsResponse.data
          : (appointmentsResponse.data?.data || []);
        const doctorAppointmentIds = allAppointments
          .filter(apt => apt && (String(apt.doctorId) === String(doctorId) || String(apt.doctor_id) === String(doctorId)))
          .map(apt => (apt.id !== undefined && apt.id !== null) ? String(apt.id) : String(apt.Id || ''))
          .filter(id => id);

        // Filter tests that either reference the doctor directly or whose appointment belongs to the doctor
        tests = tests.filter(test => {
          if (!test) return false;
          // Direct doctor reference on test
          if (test.doctorId !== undefined && test.doctorId !== null && String(test.doctorId) === String(doctorId)) return true;
          // appointmentId match (type-agnostic)
          const tAptId = test.appointmentId !== undefined && test.appointmentId !== null ? String(test.appointmentId) : '';
          if (tAptId && doctorAppointmentIds.includes(tAptId)) return true;
          // fallback: some tests may carry appointment_id
          const tAptId2 = test.appointment_id !== undefined && test.appointment_id !== null ? String(test.appointment_id) : '';
          if (tAptId2 && doctorAppointmentIds.includes(tAptId2)) return true;
          return false;
        });
      }

      return { success: true, data: tests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách chờ duyệt' };
    }
  },

  // Lấy danh sách lab tests sẵn sàng nhập kết quả (pending với sample completed)
  getLabTestsReadyToEnter: async () => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      // Handle BE response: { message: "...", data: [...] } or array
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const tests = allTests.filter(test => test.status === 'pending');

      // Lấy thông tin samples - NOTE: /samples endpoint may not exist, return tests without sample check
      let samples = [];
      try {
        // Swagger: GET /TestOrder/BloodSample
        const samplesResponse = await api.get('/gateway/testorder/bloodsample');
        samples = Array.isArray(samplesResponse.data)
          ? samplesResponse.data
          : (samplesResponse.data?.data || []);
      } catch (err) {
      }

      // Chỉ lấy tests có sample đã completed (nếu có samples data)
      const readyTests = samples.length > 0
        ? tests.filter(test => {
          const sample = samples.find(s => s.id === test.sampleId);
          return sample && sample.status === 'completed';
        })
        : tests; // Nếu không có samples data, return all pending tests

      return { success: true, data: readyTests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách sẵn sàng nhập kết quả' };
    }
  },

  // Lấy danh sách lab tests đã nhập chờ xác nhận (result_entered)
  getLabTestsNeedConfirmation: async () => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      // Handle BE response: { message: "...", data: [...] } or array
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const tests = allTests.filter(test => test.status === 'result_entered');
      return { success: true, data: tests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách chờ xác nhận' };
    }
  },

  // Lấy danh sách lab tests đã xác nhận chờ gửi bác sĩ (result_pending)
  getLabTestsReadyToSend: async () => {
    try {
      const response = await api.get('/gateway/patients/lab-tests');
      // Handle BE response: { message: "...", data: [...] } or array
      const allTests = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const tests = allTests.filter(test => test.status === 'result_pending');
      return { success: true, data: tests };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách sẵn sàng gửi bác sĩ' };
    }
  },

  // Lấy thông tin đầy đủ lab test (bao gồm appointment, patient, sample, doctor)
  getLabTestWithDetails: async (testId) => {
    try {
      const testResponse = await api.get(`/gateway/patients/lab-tests/${testId}`);
      const labTest = testResponse.data?.data || testResponse.data;

      if (!labTest) {
        return { success: false, message: 'Không tìm thấy phiếu xét nghiệm' };
      }

      // Lấy thông tin appointment
      let appointment = null;
      if (labTest.appointmentId) {
        try {
          const aptResponse = await api.get(`/gateway/testorder/appointment/${labTest.appointmentId}`);
          appointment = aptResponse.data?.data || aptResponse.data;
        } catch (err) {
        }
      }

      // Lấy thông tin patient
      let patient = null;
      if (labTest.patientId) {
        try {
          const patientResponse = await api.get(`/gateway/patients/${labTest.patientId}`);
          patient = patientResponse.data?.data || patientResponse.data;
        } catch (err) {
        }
      }

      // Lấy thông tin sample
      let sample = null;
      if (labTest.sampleId) {
        // Check if sampleId is a barcode (starts with 'S' or is a string that's not a pure number)
        const isBarcode = typeof labTest.sampleId === 'string' && (labTest.sampleId.startsWith('S') || isNaN(labTest.sampleId));
        if (isBarcode) {
          const sampleResult = await sampleService.getSampleByBarcode(labTest.sampleId);
          if (sampleResult.success) {
            sample = sampleResult.data;
          }
        } else {
          // sampleId is a numeric ID
          try {
            const sampleResponse = await api.get(`/samples/${labTest.sampleId}`);
            sample = sampleResponse.data;
          } catch (error) {
            // If direct ID lookup fails, try barcode lookup as fallback
            const sampleResult = await sampleService.getSampleByBarcode(String(labTest.sampleId));
            if (sampleResult.success) {
              sample = sampleResult.data;
            }
          }
        }
      }

      // Lấy thông tin doctor từ TestOrder service
      let doctor = null;
      if (appointment && appointment.doctorId) {
        try {
          const doctorsResponse = await api.get('/gateway/testorder/doctor');
          const doctorsData = Array.isArray(doctorsResponse.data)
            ? doctorsResponse.data
            : (doctorsResponse.data?.data || []);
          doctor = doctorsData.find(d => d.doctorId === appointment.doctorId || d.id === appointment.doctorId);
        } catch (error) {
        }
      }

      return {
        success: true,
        data: {
          labTest,
          appointment,
          patient,
          sample,
          doctor
        }
      };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin chi tiết phiếu xét nghiệm' };
    }
  }
};
