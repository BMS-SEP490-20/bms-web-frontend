/**
 * My Results Component
 * * Patient test results viewing component for the Blood Laboratory Management System.
 * Allows patients to view their test results, download reports,
 * and access detailed result information with secure access.
 * * Refactored:
 * - Fixed Status Case-Sensitivity (COMPLETED vs completed)
 * - Added Status Filter
 * - Corrected Data Fetching Logic (TestOrderService & MedicalRecords)
 * * @author Blood Laboratory Management Team
 * @version 1.2.0
 * @since 2024
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { medicalService } from '../../../../services/medicalService';
import { formatLabTestCode } from '../../../../shared/utils/format/formatHelper';
import { patientService } from '../../../../services/patientService';
import { sampleService } from '../../../../services/sampleService';
import { appointmentService } from '../../../../services/appointmentService';
import { testOrderService } from '../../../../services/testOrderService';
import api from '../../../../services/api';
import { useAutoRefresh, setRefreshFlag, dispatchRefreshEvent } from '../../../../shared/hooks/useAutoRefresh';

import PatientHeader from '../../../../components/Layout/PatientHeader';
import GuestFooter from '../../../../components/Layout/GuestFooter';
import html2pdf from 'html2pdf.js';
import signatureImg from '../../../../assets/chukyao.png';
import stampImg from '../../../../assets/condauao.png';

/**
 * My Results Component
 * * Displays patient's test results with detailed view and download options.
 * Provides secure access to medical test results and reports.
 * * @returns {React.ReactNode} My results component
 */


// --- MASTER DATA: CHUẨN Y KHOA QUỐC TẾ (WHO / MAYO CLINIC / ADA) ---
// Dùng để hiển thị cho Bệnh nhân thấy (Clinical Range) thay vì giới hạn nhập liệu (Input Limit)
const STANDARD_CRITERIA_MAP = {
  // --- 1. TIỂU ĐƯỜNG & TUYẾN GIÁP ---
  "CRI441512": { name: "Glucose (Fasting)", min: 70, max: 99, unit: "mg/dL" },
  "CRI051935": { name: "HbA1c", min: 4.0, max: 5.6, unit: "%" },
  "CRI016631": { name: "Insulin (Fasting)", min: 2.6, max: 24.9, unit: "µIU/mL" },
  "CRI171039": { name: "TSH", min: 0.4, max: 4.0, unit: "µIU/mL" },
  "CRI013168": { name: "Free T4", min: 0.9, max: 1.7, unit: "ng/dL" },
  "CRI773647": { name: "Free T3", min: 2.0, max: 4.4, unit: "pg/mL" },

  // --- 2. CHỨC NĂNG GAN (LIVER PANEL) ---
  "CRI897060": { name: "ALT (SGPT)", min: 7, max: 55, unit: "U/L" },
  "CRI502589": { name: "AST (SGOT)", min: 8, max: 48, unit: "U/L" },
  "CRI073542": { name: "GGT", min: 9, max: 48, unit: "U/L" },
  "CRI966044": { name: "ALP (Alkaline Phos)", min: 44, max: 147, unit: "U/L" },
  "CRI571965": { name: "Anti-HCV", min: 0, max: 0.99, unit: "index" },
  "CRI672303": { name: "HBsAg", min: 0, max: 0.99, unit: "index" },

  // --- 3. CHỨC NĂNG THẬN & ĐIỆN GIẢI ---
  "CRI803959": { name: "Creatinine", min: 0.6, max: 1.3, unit: "mg/dL" },
  "CRI347159": { name: "Uric Acid", min: 2.4, max: 7.0, unit: "mg/dL" },
  "CRI540981": { name: "Sodium (Na+)", min: 135, max: 145, unit: "mmol/L" },
  "CRI869790": { name: "Potassium (K+)", min: 3.6, max: 5.2, unit: "mmol/L" },
  "CRI872437": { name: "Chloride (Cl-)", min: 96, max: 106, unit: "mmol/L" },
  "CRI928224": { name: "Calcium (Total)", min: 8.6, max: 10.3, unit: "mg/dL" },
  "CRI849406": { name: "Phosphate (PO4)", min: 2.5, max: 4.5, unit: "mg/dL" },
  "CRI887270": { name: "Magnesium", min: 1.7, max: 2.2, unit: "mg/dL" },

  // --- 4. CÔNG THỨC MÁU (CBC) ---
  "CRI941438": { name: "WBC (Bạch cầu)", min: 4.5, max: 11.0, unit: "10^3/µL" },
  "CRI570441": { name: "RBC (Hồng cầu)", min: 3.90, max: 5.70, unit: "10^6/µL" },
  "CRI516637": { name: "Hemoglobin (Hb)", min: 12.0, max: 17.5, unit: "g/dL" },
  "CRI948163": { name: "Hematocrit (HCT)", min: 36.0, max: 53.0, unit: "%" },
  "CRI121186": { name: "Platelets (PLT)", min: 150, max: 450, unit: "10^3/µL" },
  "CRI571201": { name: "MCV", min: 80, max: 100, unit: "fL" },
  "CRI895158": { name: "MCH", min: 27, max: 33, unit: "pg" },
  "CRI546570": { name: "MCHC", min: 32, max: 36, unit: "g/dL" },
  "CRI702335": { name: "RDW", min: 11.5, max: 14.5, unit: "%" },
  "CRI573742": { name: "MPV", min: 7.4, max: 10.4, unit: "fL" },

  // --- 5. BẠCH CẦU (Differential) ---
  "CRI555788": { name: "Neutrophils %", min: 40, max: 70, unit: "%" },
  "CRI468709": { name: "Lymphocytes %", min: 20, max: 40, unit: "%" },
  "CRI431029": { name: "Monocytes %", min: 2, max: 8, unit: "%" },
  "CRI870099": { name: "Eosinophils %", min: 1, max: 4, unit: "%" },
  "CRI779576": { name: "Basophils %", min: 0, max: 1, unit: "%" },

  // --- 6. MỠ MÁU & TIM MẠCH ---
  "CRI595579": { name: "Cholesterol Total", min: 100, max: 200, unit: "mg/dL" },
  "CRI619589": { name: "Triglycerides", min: 0, max: 149, unit: "mg/dL" },
  "CRI232336": { name: "HDL Cholesterol", min: 40, max: 100, unit: "mg/dL" },
  "CRI632580": { name: "LDL Cholesterol", min: 101, max: 129, unit: "mg/dL" },
  "CRI703073": { name: "CRP", min: 0, max: 5.0, unit: "mg/L" },
  "CRI528199": { name: "D-Dimer", min: 0, max: 500, unit: "ng/mL" },

  // --- 7. ĐÔNG MÁU & MIỄN DỊCH ---
  "CRI517936": { name: "INR", min: 0.8, max: 1.2, unit: "ratio" },
  "CRI798493": { name: "aPTT", min: 30, max: 40, unit: "seconds" },
  "CRI587326": { name: "Fibrinogen", min: 200, max: 400, unit: "mg/dL" },
  "CRI354985": { name: "ESR", min: 0, max: 20, unit: "mm/h" },
  "CRI474817": { name: "RF", min: 0, max: 14, unit: "IU/mL" },
  "CRI294100": { name: "ANA", min: 0, max: 0.99, unit: "index" },
  "CRI923584": { name: "HIV Ag/Ab Combo", min: 0, max: 0.99, unit: "index" }
};

const MyResults = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const location = useLocation();
  const [labTests, setLabTests] = useState([]);
  const [services, setServices] = useState([]);
  const [samples, setSamples] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorShifts, setDoctorShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Filter & Pagination states
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Use ref to track if we've already checked for refresh flag in this render cycle
  const refreshCheckedRef = useRef(false);

  /**
   * Effect: Load test result data when user is available
   * 
   * This effect runs when the user object changes. It loads test result data
   * for the current patient and resets the refresh check flag.
   * 
   * @effect
   * @dependencies {Object} user - User object from auth context
   */
  useEffect(() => {
    if (user && user.id) {
      loadData();
      // Reset refresh check when user changes
      refreshCheckedRef.current = false;
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect: Refresh results when navigating to page after result is ready
   * 
   * This effect checks for a refresh flag in sessionStorage when navigating
   * to the results page. If the flag is set (e.g., after doctor approves a result),
   * it forces a fresh data fetch to display the new result.
   * 
   * @effect
   * @dependencies {string} location.pathname - Current route path
   * @dependencies {Object} user - User object from auth context
   * @dependencies {boolean} hideHeader - Component prop
   */
  useEffect(() => {
    // Check if we just navigated to results page after test result is ready
    const shouldRefresh = sessionStorage.getItem('shouldRefreshResults') === 'true';
    
    if (shouldRefresh && user && user.id && !refreshCheckedRef.current) {
      // Mark as checked
      refreshCheckedRef.current = true;
      // Clear the flag
      sessionStorage.removeItem('shouldRefreshResults');
      // Force fresh fetch to get the new test result
      // Small delay to ensure backend has saved the result
      setTimeout(() => {
        loadData(true);
      }, 300);
    }
  }, [location.pathname, user, hideHeader]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect: Additional refresh check for Dashboard tab switching
   * 
   * This effect runs once on component mount to handle cases where the component
   * is embedded in a Dashboard with tabs. When switching tabs, the component may
   * not detect navigation changes, so this effect checks for refresh flags after
   * a short delay.
   * 
   * @effect
   * @dependencies [] - Runs only once on mount
   */
  useEffect(() => {
    // Reset refresh check when component is rendered
    refreshCheckedRef.current = false;
    
    // Check flag after a short delay to ensure it's set
    const checkTimer = setTimeout(() => {
      const shouldRefresh = sessionStorage.getItem('shouldRefreshResults') === 'true';
      if (shouldRefresh && user && user.id) {
        sessionStorage.removeItem('shouldRefreshResults');
        loadData(true);
      }
    }, 100);
    
    return () => clearTimeout(checkTimer);
  }, []); // Only run on mount/render

  /**
   * Effect: Listen for test result events to refresh results list
   * 
   * This effect sets up event listeners for test result events:
   * - 'testResultChanged': When a test result is created or updated
   * - 'testResultApproved': When a doctor approves a test result
   * - 'testResultCompleted': When a test result is completed
   * 
   * When any of these events fire, the component automatically refreshes
   * the results list to show the updated data. Uses a 2000ms delay to ensure
   * backend has finished processing.
   * 
   * @effect
   * @dependencies {Object} user - User object from auth context
   */
  useEffect(() => {
    const handleTestResultChanged = () => {
      // Refresh results list when a test result is created or updated
      // Force fresh fetch to get the new/updated result
      if (user && user.id) {
        // Increased delay to ensure backend has saved the result and updated appointment status
        setTimeout(() => {
          loadData(true);
        }, 2000);
      }
    };

    window.addEventListener('testResultChanged', handleTestResultChanged);
    window.addEventListener('testResultApproved', handleTestResultChanged);
    window.addEventListener('testResultCompleted', handleTestResultChanged);
    
    return () => {
      window.removeEventListener('testResultChanged', handleTestResultChanged);
      window.removeEventListener('testResultApproved', handleTestResultChanged);
      window.removeEventListener('testResultCompleted', handleTestResultChanged);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Loads and enriches test result data for the current patient
   * 
   * This function is the core data fetching function for the test results page.
   * It performs the following operations:
   * 1. Retrieves the patient ID from the user's email
   * 2. Fetches test packages, appointments, doctors, and doctor shifts
   * 3. Fetches lab test results linked to patient's appointments
   * 4. Fetches blood samples to get collection dates
   * 5. Enriches each result with:
   *    - Sample collection date
   *    - Test date (prioritizing reviewedAt, completedAt, approvedAt, etc.)
   *    - Doctor name from shift or doctor ID
   *    - Service/test package name
   *    - Patient information
   * 6. Ensures testDate is never before sampleDate (date consistency)
   * 7. Sorts results by date (newest first)
   * 
   * The enrichment process ensures that test results have all necessary display
   * information by matching IDs across different data sources (appointments, samples,
   * doctors, shifts, services).
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and forces fresh data fetch.
   *                                      Used when we know data has changed (e.g., after result approval).
   * @returns {Promise<void>} Does not return a value. Updates component state with enriched data.
   * 
   * @example
   * // Load cached data (default)
   * await loadData();
   * 
   * // Force fresh fetch after doctor approves result
   * await loadData(true);
   */
  const loadData = async (forceFresh = false) => {
    try {
      setLoading(true);

      // Check if user exists
      if (!user || !user.id) {
        showError('Không tìm thấy thông tin người dùng');
        return;
      }

      // Get Patient ID (PAT-xxx) from email
      let patientId = null;
      if (user?.email) {
        try {
          const patientResult = await patientService.getPatientByEmail(user.email);
          if (patientResult.success && patientResult.data) {
            const rawPatient = patientResult.data;

            // Normalize patient data to handle API field naming (fullname vs fullName, dob vs dateOfBirth)
            const normalizedPatient = {
              ...rawPatient,
              id: rawPatient.id || rawPatient.Id,
              fullName: rawPatient.fullName || rawPatient.fullname || rawPatient.full_name,
              dateOfBirth: rawPatient.dateOfBirth || rawPatient.dob,
              phone: rawPatient.phone || rawPatient.phoneNumber,
              email: rawPatient.email,
              address: rawPatient.address,
              gender: rawPatient.gender,
              bloodType: rawPatient.bloodType || rawPatient.blood_type,
              identityNumber: rawPatient.identityNumber || rawPatient.identity_number
            };

            patientId = normalizedPatient.id;
            setSelectedPatient(normalizedPatient);
          }
        } catch (err) {
        }
      }

      // If no patient ID found, skip patient-specific data
      if (!patientId) {
        setLoading(false);
        return;
      }

      // Load test packages and appointments in parallel (consistent with Dashboard)
      // If forceFresh, add timestamp to bypass cache
      const cacheBuster = forceFresh ? `?t=${Date.now()}` : '';
      const [testPackagesResult, appointmentsResult] = await Promise.all([
        testOrderService.getAllTestPackages({ fetchAll: true }),
        appointmentService.getAppointmentsByPatient(patientId).catch(() => ({ success: false, data: [] }))
      ]);

      // Map test packages to services compatible format
      if (testPackagesResult.success && Array.isArray(testPackagesResult.data)) {
        const mappedServices = testPackagesResult.data.map(pkg => ({
          id: pkg.id || pkg.testPackageId || pkg.packageId,
          name: pkg.packageName || pkg.name || pkg.title,
          ...pkg
        }));
        setServices(mappedServices);
      }

      let patientAppointments = [];
      if (appointmentsResult.success && appointmentsResult.data) {
        patientAppointments = appointmentsResult.data;
        setAppointments(patientAppointments);
      }

      // Load doctors list for mapping names
      try {
        const doctorsResponse = await api.get('/gateway/testorder/doctor');
        const doctorsData = Array.isArray(doctorsResponse.data)
          ? doctorsResponse.data
          : (doctorsResponse.data?.data || []);
        setDoctors(doctorsData);
      } catch (error) {
      }

      // THÊM ĐOẠN NÀY (Load Doctor Shifts):
      // THAY BẰNG (Load ALL Doctor Shifts với pagination):
      try {
        const allShifts = [];
        let page = 1;
        let hasMore = true;
        const pageSize = 50; // Số records mỗi trang (tùy chỉnh)

        // Lặp qua tất cả các trang
        while (hasMore && page <= 100) { // Giới hạn tối đa 100 trang để tránh vòng lặp vô hạn
          const shiftsResponse = await api.get('/gateway/testorder/doctorshift', {
            params: { page, pageSize }
          });

          const shiftsData = Array.isArray(shiftsResponse.data)
            ? shiftsResponse.data
            : (shiftsResponse.data?.data || []);

          if (shiftsData.length > 0) {
            allShifts.push(...shiftsData);

            // Nếu số records trả về ít hơn pageSize → đây là trang cuối
            if (shiftsData.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false; // Không còn dữ liệu
          }
        }

        setDoctorShifts(allShifts);
      } catch (error) {
      }


      // Load Lab Results AND Samples in parallel
      let allResults = [];
      let allSamples = [];

      try {
        // Fetch samples first to get collection dates
        const samplesRes = await sampleService.getAllSamples();
        if (samplesRes.success && samplesRes.data) {
          allSamples = samplesRes.data;
          setSamples(allSamples);
        }
      } catch (e) {
      }

      try {
        // Fetch results linked to the patient's appointments via TestOrder Service
        if (patientAppointments.length > 0) {
          const appointmentIds = patientAppointments.map(a => a.id || a.appointmentId);

          // Force fresh fetch if needed (bypass cache)
          const resultsPromises = appointmentIds.map(aptId => {
            // Add timestamp to force fresh fetch when forceFresh is true
            const promise = testOrderService.getResultsByAppointment(aptId);
            return promise.catch(() => ({ success: false, data: [] }));
          });

          const resultsArrays = await Promise.all(resultsPromises);
          const flatResults = resultsArrays.flatMap(r => r.data || []);

          // Map to the format MyResults expects, enriching with sample dates and doctor name
          allResults = flatResults.map(res => {
            // Find the related sample to get collection date
            const relatedSample = allSamples.find(s =>
              String(s.sampleId || s.id) === String(res.sampleId)
            );

            let doctorName = 'Chưa phân bổ';

            // Priority 1: reviewedBy (nếu là Doctor)
            if (res.reviewedBy && doctors.length > 0) {
              const foundName = getDoctorNameFromId(res.reviewedBy);
              if (foundName) {
                doctorName = foundName;
              }
            }

            // Priority 2: Lấy từ appointment qua doctor_shift_id → doctorName
            if (doctorName === 'Chưa phân bổ') {
              const matchedAppointment = patientAppointments.find(apt =>
                String(apt.id || apt.appointmentId) === String(res.appointmentId)
              );

              if (matchedAppointment) {
                const shiftId = getDoctorShiftId(matchedAppointment);

                if (shiftId) {
                  // Lấy doctorName TRỰC TIẾP từ shift
                  const foundName = getDoctorNameFromShift(shiftId);
                  if (foundName) {
                    doctorName = foundName;
                  }
                }
              }
            }

            // Sample Date: from sample's collectedAt
            const sampleDate = relatedSample?.collectedAt || relatedSample?.collected_at || res.createdAt;
            
            // Test Date (Ngày báo cáo): reviewedAt (khi bác sĩ duyệt) - phải >= ngày lấy mẫu
            let testDate = res.reviewedAt || res.completedAt || res.approvedAt;
            
            // Nếu có testDate, đảm bảo nó >= sampleDate
            if (testDate && sampleDate) {
              const testDateObj = new Date(testDate);
              const sampleDateObj = new Date(sampleDate);
              // Nếu ngày báo cáo < ngày lấy mẫu, dùng ngày lấy mẫu hoặc ngày hiện tại
              if (testDateObj < sampleDateObj) {
                testDate = sampleDate; // Dùng ngày lấy mẫu làm ngày báo cáo tối thiểu
              }
            } else if (!testDate) {
              // Nếu không có reviewedAt, dùng updatedAt hoặc createdAt, nhưng phải >= sampleDate
              const fallbackDate = res.updatedAt || res.createdAt;
              if (fallbackDate && sampleDate) {
                const fallbackDateObj = new Date(fallbackDate);
                const sampleDateObj = new Date(sampleDate);
                testDate = fallbackDateObj >= sampleDateObj ? fallbackDate : sampleDate;
              } else {
                testDate = fallbackDate || sampleDate;
              }
            }

            return {
              ...res,
              id: res.testResultId || res.id,
              sampleDate: sampleDate,
              testDate: testDate,
              // Doctor name from reviewedBy
              doctorName: doctorName,
              patientId: patientId,
              status: res.status // Keep raw status from API
            };
          });
        }
      } catch (err) {
      }

      // Add pending samples (samples without results yet)
      if (allSamples.length > 0) {
        const resultSampleIds = new Set(allResults.map(r => r.sampleId).filter(Boolean));

        const patSamples = allSamples.filter(s => {
          return patientAppointments.some(apt =>
            String(apt.id || apt.appointmentId) === String(s.appointmentId)
          ) && !resultSampleIds.has(s.sampleId || s.id); // Only samples without results
        });

        // Convert samples to "Pending Results" for display
        const sampleResults = patSamples.map((s, idx) => ({
          id: s.sampleId || `SAMPLE-${idx}`,
          sampleId: s.sampleId,
          appointmentId: s.appointmentId,
          patientId: patientId,
          status: s.status === 'collected' ? 'processing' : 'pending',
          sampleDate: s.collectedAt || s.collected_at,
          testDate: null, // Chưa có ngày xét nghiệm
          source: 'sample'
        }));
        allResults = [...allResults, ...sampleResults];
      }

      setLabTests(allResults);

    } catch (error) {
      showError('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh hook - must be after loadData is defined
  useAutoRefresh(loadData, {
    eventName: 'testResultsChanged',
    flagKey: 'shouldRefreshResults'
  });

  /**
   * Evaluates test result status based on value and reference range
   * 
   * This function compares a test result value against the normal reference range
   * (min-max) to determine if the result is normal, high, or low. This is used
   * to display color-coded status badges and alerts for abnormal values.
   * 
   * **Status determination:**
   * - 'normal': Value is within the reference range (min <= value <= max)
   * - 'low': Value is below the minimum reference value
   * - 'high': Value is above the maximum reference value
   * - 'unknown': Value is null, undefined, or empty string
   * 
   * If reference range is not available (min/max are NaN), returns 'normal'
   * as a safe default.
   * 
   * @param {number|string} value - Test result value to evaluate
   * @param {number|string} min - Minimum reference value (normal range lower bound)
   * @param {number|string} max - Maximum reference value (normal range upper bound)
   * @returns {string} Status string: 'normal', 'low', 'high', or 'unknown'
   * 
   * @example
   * evaluateResultStatus(85, 70, 99) // Returns: 'normal'
   * evaluateResultStatus(50, 70, 99) // Returns: 'low'
   * evaluateResultStatus(120, 70, 99) // Returns: 'high'
   * evaluateResultStatus(null, 70, 99) // Returns: 'unknown'
   */
  const evaluateResultStatus = (value, min, max) => {
    if (value === null || value === undefined || String(value).trim() === '') return 'unknown';

    const numVal = parseFloat(value);
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);

    if (isNaN(numVal)) return 'normal';
    if (isNaN(numMin) || isNaN(numMax)) return 'normal'; // Nếu không có chuẩn thì bình thường

    if (numVal < numMin) return 'low';
    if (numVal > numMax) return 'high';

    return 'normal';
  };

  /**
   * Extracts doctor shift ID from appointment object
   * 
   * This utility function extracts the doctor shift ID from an appointment object,
   * handling various field name formats (camelCase, PascalCase, snake_case) that
   * may come from different API endpoints or data sources.
   * 
   * @param {Object} appointment - Appointment object that may contain shift ID
   * @returns {string|number|null} Doctor shift ID if found, null otherwise
   * 
   * @example
   * const shiftId = getDoctorShiftId(appointment);
   * if (shiftId) {
   *   // Use shiftId to get doctor name
   * }
   */
  const getDoctorShiftId = (appointment) => {
    if (!appointment) return null;
    return appointment.doctorShiftId ||
      appointment.DoctorShiftId ||
      appointment.doctor_shift_id ||
      appointment.shiftId ||
      appointment.ShiftId ||
      null;
  };

  /**
   * Gets doctor name directly from doctor shift data
   * 
   * This function retrieves the doctor name from the doctor shifts array
   * by matching the shift ID. The API already includes doctorName in the
   * shift object, so this is a direct lookup.
   * 
   * This is the preferred method for getting doctor name as it uses the
   * most up-to-date shift data that includes doctor information.
   * 
   * @param {string|number} shiftId - Doctor shift ID to look up
   * @returns {string|null} Doctor name if found, null otherwise
   * 
   * @example
   * const doctorName = getDoctorNameFromShift(shiftId);
   * // Returns: 'Dr. Nguyễn Văn A' or null
   */
  const getDoctorNameFromShift = (shiftId) => {
    if (!shiftId || doctorShifts.length === 0) return null;

    const shift = doctorShifts.find(s =>
      String(s.shiftId || s.id || s.doctorShiftId || s.doctor_shift_id) === String(shiftId)
    );

    if (!shift) return null;

    // API đã trả về doctorName sẵn!
    return shift.doctorName || shift.doctor_name || null;
  };

  /**
   * Gets doctor name from doctor ID
   * 
   * This function retrieves the doctor name from the doctors array by
   * matching the doctor ID. It handles various ID field formats and
   * name field formats (fullName, name).
   * 
   * This is used as a fallback when shift data is not available or
   * when we only have the doctor ID.
   * 
   * @param {string|number} doctorId - Doctor ID to look up
   * @returns {string|null} Doctor name if found, null otherwise
   * 
   * @example
   * const doctorName = getDoctorNameFromId(doctorId);
   * // Returns: 'Dr. Nguyễn Văn A' or null
   */
  const getDoctorNameFromId = (doctorId) => {
    if (!doctorId || doctors.length === 0) return null;

    const doctor = doctors.find(d =>
      String(d.id) === String(doctorId) ||
      String(d.doctorId) === String(doctorId) ||
      String(d.userId) === String(doctorId)
    );

    return doctor ? (doctor.fullName || doctor.name) : null;
  };

  /**
   * Opens test result detail modal with full result information
   * 
   * This function prepares and displays the test result detail modal, which shows:
   * - Test parameters with values and reference ranges
   * - Status indicators (normal/high/low) for each parameter
   * - Doctor name who reviewed/approved the result
   * - Service/test package name
   * - Sample collection date and test date
   * - Patient information
   * 
   * The function enriches the lab test data by:
   * 1. Fetching detailed test parameters from backend
   * 2. Matching criteria IDs with standard reference ranges (STANDARD_CRITERIA_MAP)
   * 3. Resolving doctor name from multiple sources (reviewedBy, approvedBy, shift)
   * 4. Resolving service name from appointment or test package
   * 5. Formatting dates and values for display
   * 
   * @param {Object} labTest - Lab test object to display details for
   * @returns {Promise<void>} Does not return a value. Opens modal and sets selectedResult state.
   * 
   * @example
   * // Open detail modal for a test result
   * await handleViewResult(labTest);
   */
  const handleViewResult = async (labTest) => {
    try {
      // Find appointment and service info
      const appointmentId = labTest.appointmentId || labTest.appointment_id;
      const relatedAppointment = appointments.find(a => String(a.id || a.appointmentId) === String(appointmentId));

      // Resolve Service Name from multiple possible fields
      let serviceName = labTest.testPackage || labTest.testType || labTest.packageName;
      if (!serviceName && relatedAppointment) {
        // Try testPackageId first (as in Dashboard)
        const packageId = relatedAppointment.testPackageId || relatedAppointment.test_package_id
          || relatedAppointment.packageId || relatedAppointment.serviceId;
        if (packageId) {
          const svc = services.find(s => String(s.id) === String(packageId));
          if (svc) serviceName = svc.name;
        }
      }

      // Find Doctor Name - prioritize reviewedBy from test result
      let doctorName = labTest.doctorName || 'Chưa phân bổ';

      // Priority 1: reviewedBy from test result (bác sĩ duyệt kết quả)
      if (labTest.reviewedBy && doctors.length > 0) {
        const doc = doctors.find(d =>
          String(d.id) === String(labTest.reviewedBy) ||
          String(d.doctorId) === String(labTest.reviewedBy) ||
          String(d.userId) === String(labTest.reviewedBy)
        );
        if (doc) doctorName = doc.fullName || doc.name;
      }
      // Priority 2: approvedBy (fallback for old data)
      else if (labTest.approvedBy && doctors.length > 0) {
        const doc = doctors.find(d =>
          String(d.id) === String(labTest.approvedBy) ||
          String(d.userId) === String(labTest.approvedBy)
        );
        if (doc) doctorName = doc.fullName || doc.name;
      }
      // Priority 3: Lấy từ doctor_shift_id của appointment
      else if (relatedAppointment) {
        const shiftId = getDoctorShiftId(relatedAppointment);
        if (shiftId) {
          const foundName = getDoctorNameFromShift(shiftId);
          if (foundName) doctorName = foundName;
        }
      }

      // 1. Fetch Detailed Parameters from TestOrderService
      const testId = labTest.testResultId || labTest.id;
      let formattedResults = {};

      try {
        // Get raw parameters
        const paramRes = await testOrderService.getTestParametersByResultId(testId);

        if (paramRes.success && Array.isArray(paramRes.data) && paramRes.data.length > 0) {
          const enrichedParams = await Promise.all(paramRes.data.map(async (p) => {
            const criteriaId = p.criteriaId || p.testCriterionId;

            // --- ƯU TIÊN: Kiểm tra STANDARD_CRITERIA_MAP trước ---
            const standardData = STANDARD_CRITERIA_MAP[criteriaId];

            // Mặc định lấy từ API (nếu không có trong Map)
            let criteriaInfo = {};
            if (!standardData && criteriaId) {
              try {
                const criteriaRes = await testOrderService.getTestCriterion(criteriaId);
                if (criteriaRes.success && criteriaRes.data) criteriaInfo = criteriaRes.data;
              } catch (e) { }
            }

            // ƯU TIÊN DỮ LIỆU CHUẨN (standardData) > Dữ liệu API (criteriaInfo)
            const name = standardData?.name || criteriaInfo.criteriaName || p.paramName || p.name;
            const unit = standardData?.unit || criteriaInfo.unit || p.unit || '';
            const min = standardData ? standardData.min : (criteriaInfo.referenceMin !== undefined ? criteriaInfo.referenceMin : p.min);
            const max = standardData ? standardData.max : (criteriaInfo.referenceMax !== undefined ? criteriaInfo.referenceMax : p.max);
            const val = p.value;

            // Tạo chuỗi tham chiếu
            let normalRange = '';
            if (min !== undefined && max !== undefined) {
              normalRange = `${min} - ${max}`;
            } else if (criteriaInfo.normalRange) {
              normalRange = criteriaInfo.normalRange;
            }

            // Đánh giá trạng thái với Min/Max chuẩn
            const status = evaluateResultStatus(val, min, max);

            return {
              key: name,
              data: {
                value: val,
                unit: unit,
                normal: normalRange,
                status: status
              }
            };
          }));

          const groupName = serviceName || 'Chi tiết kết quả';
          formattedResults[groupName] = {};
          enrichedParams.forEach(item => {
            formattedResults[groupName][item.key] = item.data;
          });
        } else {
          // Fallback logic for old data
          if (typeof labTest.results === 'string') {
            try { formattedResults = JSON.parse(labTest.results); } catch (e) { }
          } else if (typeof labTest.results === 'object') {
            formattedResults = labTest.results;
          }
        }
      } catch (err) {
      }

      // 2. Fetch Medical Record for Diagnosis and Notes
      let doctorNotes = '';
      let diagnosis = '';

      try {
        const recordsRes = await patientService.getMedicalRecordsByPatient(labTest.patientId);
        if (recordsRes.success && recordsRes.data) {
          // Find the specific record for this appointment
          const matchRecord = recordsRes.data.find(r => String(r.title) === String(appointmentId));

          if (matchRecord) {
            if (matchRecord.description) {
              doctorNotes = matchRecord.description;
            }
            if (matchRecord.recordData) {
              try {
                const rd = JSON.parse(matchRecord.recordData);
                if (rd.diagnosis) diagnosis = rd.diagnosis;
              } catch (e) {
                if (!diagnosis) diagnosis = matchRecord.recordData;
              }
            }
          }
        }
      } catch (e) {
      }

      const finalNotesDisplay = [
        diagnosis ? `Chẩn đoán: ${diagnosis}` : '',
        doctorNotes ? `Lời khuyên: ${doctorNotes}` : ''
      ].filter(Boolean).join('\n\n') || (labTest.doctorNotes || 'Chưa có nhận xét');

      const enrichedResult = {
        ...labTest,
        testCode: formatLabTestCode(testId),
        testPackage: serviceName,
        testType: serviceName,
        doctorName: doctorName,
        sampleDate: labTest.createdAt,
        testDate: labTest.reviewedAt || labTest.updatedAt || labTest.createdAt,
        results: formattedResults,
        doctorNotes: finalNotesDisplay
      };

      setSelectedResult(enrichedResult);

      if (!selectedPatient && labTest.patientId) {
        const pRes = await patientService.getPatientById(labTest.patientId);
        if (pRes.success) {
          const rawPatient = pRes.data;
          // Normalize patient fields
          const normalizedPatient = {
            ...rawPatient,
            id: rawPatient.id || rawPatient.Id,
            fullName: rawPatient.fullName || rawPatient.fullname || rawPatient.full_name,
            dateOfBirth: rawPatient.dateOfBirth || rawPatient.dob,
            phone: rawPatient.phone || rawPatient.phoneNumber,
            address: rawPatient.address,
            gender: rawPatient.gender,
            bloodType: rawPatient.bloodType || rawPatient.blood_type
          };
          setSelectedPatient(normalizedPatient);
        }
      }

      setShowModal(true);
    } catch (error) {
      showError('Không thể tải chi tiết kết quả');
    }
  };

  /**
   * Downloads test result as PDF file
   * 
   * This function generates and downloads a PDF file containing the complete
   * test result report. The PDF includes:
   * - Patient information (name, DOB, gender, address, phone)
   * - Sample information (test type, collection date, result date, doctor)
   * - Detailed test results with reference ranges and status indicators
   * - Doctor notes and diagnosis
   * - Official stamp and signature
   * 
   * The function:
   * 1. Fetches patient data if not already loaded
   * 2. Enriches lab test data with all necessary information
   * 3. Formats results into HTML template
   * 4. Converts HTML to PDF using html2pdf library
   * 5. Triggers browser download
   * 
   * The PDF is formatted as an official medical report suitable for printing
   * and use in medical consultations.
   * 
   * @param {Object} labTest - Lab test object to download as PDF
   * @returns {Promise<void>} Does not return a value. Triggers PDF download.
   * 
   * @example
   * // Download test result as PDF
   * await handleDownloadResult(labTest);
   */
  const handleDownloadResult = async (labTest) => {
    try {
      let patientData = selectedPatient;
      if (!patientData) {
        const patientResult = await patientService.getPatientById(labTest.patientId);
        if (patientResult.success) {
          const rawPatient = patientResult.data;
          // Normalize patient fields for PDF generation
          patientData = {
            ...rawPatient,
            id: rawPatient.id || rawPatient.Id,
            fullName: rawPatient.fullName || rawPatient.fullname || rawPatient.full_name,
            dateOfBirth: rawPatient.dateOfBirth || rawPatient.dob,
            phone: rawPatient.phone || rawPatient.phoneNumber,
            address: rawPatient.address,
            gender: rawPatient.gender,
            bloodType: rawPatient.bloodType || rawPatient.blood_type
          };
        }
      }

      let enrichedLabTest = selectedResult && selectedResult.id === labTest.id ? selectedResult : { ...labTest };

      let servicesList = services;
      if (!servicesList || servicesList.length === 0) {
        try {
          const servicesResult = await medicalService.getAllServices();
          if (servicesResult.success) {
            servicesList = servicesResult.data;
          }
        } catch (error) {
        }
      }

      let serviceName = enrichedLabTest.testPackage || enrichedLabTest.testType || labTest.testPackage || labTest.testType || 'N/A';
      let serviceId = enrichedLabTest.serviceId || labTest.serviceId;

      if (!serviceId && (labTest.appointmentId || enrichedLabTest.appointmentId)) {
        const appointmentId = enrichedLabTest.appointmentId || labTest.appointmentId;
        const relatedAppointment = appointments.find(apt => {
          const aptId = apt.id || apt.appointmentId || apt.appointment_id;
          return String(aptId) === String(appointmentId);
        });
        if (relatedAppointment && relatedAppointment.serviceId) {
          serviceId = relatedAppointment.serviceId;
        }
      }

      if (serviceId && servicesList && servicesList.length > 0) {
        const service = servicesList.find(s => String(s.id) === String(serviceId));
        if (service) {
          serviceName = service.name;
        }
      }

      let parsedResults = enrichedLabTest.results || labTest.results;
      if (typeof parsedResults === 'string') {
        parsedResults = JSON.parse(parsedResults);
      } else {
        parsedResults = parsedResults || {};
      }

      enrichedLabTest.testPackage = serviceName;
      enrichedLabTest.testType = serviceName;
      enrichedLabTest.results = parsedResults;
      // Fetch diagnosis and doctor notes from medical records
      let diagnosis = '';
      let doctorNotes = '';

      // Get appointmentId for medical record lookup
      const appointmentId = enrichedLabTest.appointmentId || labTest.appointmentId;

      try {
        const recordsRes = await patientService.getMedicalRecordsByPatient(labTest.patientId);

        if (recordsRes.success && recordsRes.data) {
          // Find the specific record for this appointment
          const matchRecord = recordsRes.data.find(r => String(r.title) === String(appointmentId));

          if (matchRecord) {
            if (matchRecord.description) {
              doctorNotes = matchRecord.description;
            }
            if (matchRecord.recordData) {
              try {
                const rd = JSON.parse(matchRecord.recordData);
                if (rd.diagnosis) diagnosis = rd.diagnosis;
              } catch (e) {
                if (!diagnosis) diagnosis = matchRecord.recordData;
              }
            }
          }
        }
      } catch (e) {
      }

      const finalNotesDisplay = [
        diagnosis ? `Chẩn đoán: ${diagnosis}` : '',
        doctorNotes ? `Lời khuyên: ${doctorNotes}` : ''
      ].filter(Boolean).join('\n\n') || 'Chưa có nhận xét';


      const buildRows = (data) => {
        if (!data) return '';
        const entries = Object.entries(data).filter(([key]) => {
          const metadataFields = ['doctorNotes', 'approvedBy', 'approvedAt', 'technicianNotes', 'enteredBy', 'confirmedBy'];
          return !metadataFields.includes(key);
        });
        return entries.map(([key, value], idx) => {
          let indicatorValue = value;
          let indicatorUnit = '';
          let indicatorNormal = '';
          let indicatorStatus = 'normal';

          if (typeof value === 'object' && value !== null) {
            indicatorValue = value.value !== undefined ? value.value : (typeof value === 'number' ? value : '');
            indicatorUnit = value.unit || value.unitName || '';
            indicatorNormal = value.normal || value.normalRange || value.referenceRange || '';
            indicatorStatus = value.status || 'normal';
          }

          const statusText = indicatorStatus === 'normal' ? 'Bình thường' :
            indicatorStatus === 'high' ? 'Cao' :
              indicatorStatus === 'low' ? 'Thấp' : 'N/A';
          const zebra = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
          const statusBg = indicatorStatus === 'normal' ? '#d1e7dd' :
            indicatorStatus === 'high' ? '#f8d7da' :
              indicatorStatus === 'low' ? '#fff3cd' : '#e9ecef';
          const statusColor = indicatorStatus === 'normal' ? '#0f5132' :
            indicatorStatus === 'high' ? '#842029' :
              indicatorStatus === 'low' ? '#664d03' : '#495057';

          return `
            <tr style="background:${zebra}">
              <td style="padding:10px;border:1px solid #dee2e6;font-weight:600">${key}</td>
              <td style="padding:10px;border:1px solid #dee2e6;text-align:right">${indicatorValue ?? ''}</td>
              <td style="padding:10px;border:1px solid #dee2e6;text-align:center">${indicatorUnit || '-'}</td>
              <td style="padding:10px;border:1px solid #dee2e6;text-align:center">${indicatorNormal || '-'}</td>
              <td style="padding:6px 10px;border:1px solid #dee2e6;text-align:center;">
                <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${statusBg};color:${statusColor};font-weight:700;font-size:11px;">${statusText}</span>
              </td>
            </tr>
          `;
        }).join('');
      };

      // --- BẮT ĐẦU ĐOẠN COPY ---
      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #000; line-height: 1.5; font-size: 13px;">
          <style>
             /* Ép buộc tất cả phần tử dùng chung 1 font để không bị lỗi font lạ */
             * { font-family: Arial, Helvetica, sans-serif !important; }
             table { width: 100%; border-collapse: collapse; }
             th, td { padding: 8px; vertical-align: top; }
             .header-table td { padding: 0; vertical-align: middle; }
             .info-box { border: 1px solid #999; border-radius: 8px; overflow: hidden; margin-bottom: 0; height: 100%; }
             .info-header { background-color: #f0f0f0; font-weight: bold; padding: 8px 12px; border-bottom: 1px solid #999; text-transform: uppercase; font-size: 12px; }
             .info-content { padding: 10px; }
             .result-table th { background-color: #f0f0f0; border: 1px solid #999; font-weight: bold; text-align: center; font-size: 12px; }
             .result-table td { border: 1px solid #999; }
          </style>

          <table class="header-table" style="margin-bottom: 20px; border: none;">
            <tr>
              <td style="width: 80px; border: none;">
                 <img src="/logo1.png" alt="Logo" crossorigin="anonymous" style="width:70px; height:70px; object-fit:contain;"/>
              </td>
              <td style="border: none;">
                <div style="font-weight:700; font-size:18px; color: #0d6efd; letter-spacing: 0.5px;">PHÒNG XÉT NGHIỆM MÁU</div>
                <div style="font-size:13px; color:#555; margin-top: 4px;">Địa chỉ: Số 123, Đường ABC, Quận XYZ, TP. Hà Nội</div>
                <div style="font-size:13px; color:#555;">Hotline: 1900 1234</div>
              </td>
              <td style="text-align: right; vertical-align: top; border: none;">
                 <div style="font-size: 12px; color: #777;">Mã hồ sơ: ${labTest.id}</div>
                 <div style="font-size: 12px; color: #777;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
              </td>
            </tr>
          </table>

          <div style="text-align:center; margin-bottom:25px;">
            <div style="font-weight:700; font-size:22px; letter-spacing: 1.5px;">PHIẾU KẾT QUẢ XÉT NGHIỆM</div>
          </div>
          
          <table style="margin-bottom: 20px; border-spacing: 15px 0; border-collapse: separate;">
            <tr>
              <td style="width:50%; padding: 0;">
                <div class="info-box">
                  <div class="info-header" style="color: #0d6efd;">THÔNG TIN BỆNH NHÂN</div>
                  <div class="info-content">
                    <div style="margin-bottom:6px;"><strong>Họ và tên:</strong> <span style="font-size: 14px; text-transform: uppercase;">${patientData?.fullName || 'Chưa có'}</span></div>
                    <div style="margin-bottom:6px;"><strong>Năm sinh:</strong> ${patientData?.dateOfBirth ? new Date(patientData.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa có'} &nbsp;|&nbsp; <strong>Giới tính:</strong> ${patientData?.gender ? (patientData.gender.toLowerCase() === 'male' ? 'Nam' : (patientData.gender.toLowerCase() === 'female' ? 'Nữ' : 'Khác')) : 'Chưa có'}</div>
                    <div style="margin-bottom:6px;"><strong>Địa chỉ:</strong> ${patientData?.address || (patientData?.province ? `${patientData.province}, ${patientData.district}, ${patientData.ward}` : 'Chưa có')}</div>
                    <div><strong>Số điện thoại:</strong> ${patientData?.phone || 'Chưa có'}</div>
                  </div>
                </div>
              </td>
              <td style="width:50%; padding: 0;">
                <div class="info-box">
                  <div class="info-header" style="color: #198754;">THÔNG TIN MẪU</div>
                  <div class="info-content">
                    <div style="margin-bottom:6px;"><strong>Loại XN:</strong> ${enrichedLabTest.testPackage || enrichedLabTest.testType || getServiceName(enrichedLabTest.serviceId) || 'N/A'}</div>
                    <div style="margin-bottom:6px;"><strong>Ngày lấy mẫu:</strong> ${formatDate(enrichedLabTest.sampleDate || enrichedLabTest.sample_date)}</div>
                    <div style="margin-bottom:6px;"><strong>Ngày có KQ:</strong> ${formatDate(enrichedLabTest.testDate || enrichedLabTest.completedAt || enrichedLabTest.resultDate)}</div>
                    <div><strong>Bác sĩ chỉ định:</strong> ${enrichedLabTest.doctorName || 'Chưa phân bổ'}</div>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-bottom: 20px;">
            <div style="font-weight:bold; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px;">CHI TIẾT KẾT QUẢ</div>
            
            ${Object.keys(parsedResults).map(category => {
        if (parsedResults[category] && typeof parsedResults[category] === 'object') {
          const categoryNames = {
            'huyetHoc': 'Huyết học',
            'sinhHoa': 'Sinh hóa máu',
            'menGan': 'Chức năng gan',
            'mienDich': 'Miễn dịch',
            'chucNangThan': 'Chức năng thận',
            'dongMau': 'Đông máu',
            'hormonGiap': 'Hormon giáp',
            'hba1c': 'HbA1c'
          };
          const categoryName = categoryNames[category] || category;

          return `
                  <div style="margin-top: 15px; margin-bottom: 5px; font-weight:bold; color:#000; text-transform: uppercase; font-size: 13px;">• ${categoryName}</div>
                  <table class="result-table" style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                      <tr>
                        <th style="width:35%; text-align: left; padding-left: 10px;">Tên xét nghiệm</th>
                        <th style="width:20%;">Kết quả</th>
                        <th style="width:15%;">Đơn vị</th>
                        <th style="width:30%;">Trị số tham chiếu</th>
                        <th style="width:15%;">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${buildRows(parsedResults[category])}
                    </tbody>
                  </table>
                `;
        }
        return '';
      }).join('')}
          </div>

          ${finalNotesDisplay && finalNotesDisplay !== 'Chưa có nhận xét' ? `
            <div style="border: 1px dashed #000; padding: 15px; margin-top: 20px; border-radius: 8px; background-color: #fcfcfc;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 8px;">NHẬN XÉT & ĐỀ NGHỊ:</div>
                <div style="font-style: italic; white-space: pre-line;">${finalNotesDisplay}</div>
            </div>
          ` : ''}

          <div style="margin-top:40px; page-break-inside: avoid;">
            <table style="width:100%; border: none;">
              <tr>
                <td style="width:60%; border: none;"></td>
                <td style="width:40%; text-align:center; border: none;">
                  <div style="font-style: italic; margin-bottom: 5px;">Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
                  <div style="font-weight:bold; text-transform: uppercase;">Bác sĩ chuyên khoa</div>
                  <div style="height:100px; position: relative; margin: 10px auto;">
                     <img src="${stampImg}" alt="Con dấu" style="position:absolute; right:30px; top:0; width:100px; opacity:0.8; object-fit: contain;"/>
                     <img src="${signatureImg}" alt="Chữ ký" style="position:absolute; right:20px; bottom:0; width:120px; object-fit: contain;"/>
                  </div>
                  <div style="font-weight:bold; margin-top: 5px;">${labTest.doctorName || 'Chưa phân bổ'}</div>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 11px; text-align: center; color: #777;">
            <i>Phiếu kết quả này có giá trị như bản gốc. Vui lòng mang theo khi tái khám.</i>
          </div>
        </div>
      `;
      // --- KẾT THÚC ĐOẠN COPY ---

      const container = document.createElement('div');
      container.style.padding = '12px';
      container.innerHTML = html;
      document.body.appendChild(container);

      const opt = {
        margin: 10,
        filename: `ket-qua-xet-nghiem-${labTest.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(container).save();

      document.body.removeChild(container);
      showSuccess('Tải kết quả PDF thành công');
    } catch (error) {
      showError('Lỗi tạo file PDF: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    // FIX: Normalize status to lowercase to handle API response like 'COMPLETED'
    const normalizedStatus = String(status || '').toLowerCase();

    const statusConfig = {
      'pending': { variant: 'warning', text: 'Chờ xử lý' },
      'processing': { variant: 'info', text: 'Đang xử lý' },
      'completed': { variant: 'success', text: 'Hoàn thành' },
      'approved': { variant: 'success', text: 'Đã duyệt' },
      'cancelled': { variant: 'danger', text: 'Đã hủy' },
      'rejected': { variant: 'danger', text: 'Đã từ chối' },
      'failed': { variant: 'danger', text: 'Thất bại' },
      'error': { variant: 'danger', text: 'Lỗi' },
      'unknown': { variant: 'secondary', text: 'Trạng thái không xác định' },
      'waiting_review': { variant: 'warning', text: 'Chờ duyệt' },
    };

    const config = statusConfig[normalizedStatus] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  /**
   * Formats date string to Vietnamese locale format
   * 
   * Converts a date string (ISO format or any valid date string) to
   * Vietnamese locale format (dd/mm/yyyy). Handles null/undefined values
   * gracefully by returning 'N/A'.
   * 
   * @param {string|null|undefined} dateString - Date string to format
   * @returns {string} Formatted date string in Vietnamese locale (e.g., '04/12/2024')
   *                  or 'N/A' if input is invalid
   * 
   * @example
   * formatDate('2024-12-04') // Returns: '04/12/2024'
   * formatDate(null) // Returns: 'N/A'
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Chưa có';
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return 'Chưa có';
    }
  };

  /**
   * Gets service/test package name from service ID
   * 
   * This utility function looks up the service name from the services array
   * by matching the service ID. Used to display test package names when
   * only the ID is available.
   * 
   * @param {string|number} serviceId - Service/test package ID to look up
   * @returns {string|null} Service name if found, null otherwise
   * 
   * @example
   * const serviceName = getServiceName('PKG-123');
   * // Returns: 'Gói xét nghiệm tổng quát' or null
   */
  const getServiceName = (serviceId) => {
    if (!serviceId) return 'N/A';
    const service = services.find(s =>
      String(s.id) === String(serviceId)
    );
    return service ? service.name : 'N/A';
  };

  /**
   * Safely renders a value for display, handling null/undefined/empty cases
   * 
   * This utility function ensures that values are safely displayed in the UI
   * by converting null/undefined/empty values to a user-friendly placeholder.
   * Prevents "null" or "undefined" from appearing in the UI.
   * 
   * @param {any} value - Value to render (can be any type)
   * @returns {string} Safe string representation of the value, or 'N/A' if invalid
   * 
   * @example
   * safeRender(123) // Returns: '123'
   * safeRender(null) // Returns: 'N/A'
   * safeRender('') // Returns: 'N/A'
   * safeRender('test') // Returns: 'test'
   */
  const safeRender = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    if (typeof value === 'object') {
      if (value.hasOwnProperty('value')) return String(value.value || '');
      return '[Object]';
    }
    return String(value);
  };

  /**
   * Renders test results UI in a structured table format
   * 
   * This function renders test results in a user-friendly table format with:
   * - Test parameter names
   * - Result values with units
   * - Reference ranges (normal min-max)
   * - Status indicators (normal/high/low) with color coding
   * 
   * The function handles:
   * - Empty/null results (shows placeholder message)
   * - Grouped results by category (e.g., blood count, liver function)
   * - Status evaluation for each parameter
   * - Safe rendering of all value types
   * 
   * Results are organized into sections with icons and headers for better
   * readability and navigation.
   * 
   * @param {Object} results - Test results object, can be nested by category
   * @param {Object} [labTest=null] - Lab test object for additional context
   * @returns {React.ReactNode} JSX element containing formatted results table
   * 
   * @example
   * // Render results in modal
   * {renderResultsUI(selectedResult.results, selectedResult)}
   */
  const renderResultsUI = (results, labTest = null) => {
    if (!results || typeof results !== 'object') {
      return (
        <div className="text-center text-muted py-4">
          <i className="fas fa-flask fa-2x mb-2"></i>
          <p>Chưa có kết quả xét nghiệm</p>
        </div>
      );
    }

    const renderTestSection = (title, data, icon) => {
      if (!data) return null;

      return (
        <div className="mb-4">
          <h6 className="text-primary mb-3">
            <i className={`fas ${icon} me-2`}></i>
            {title}
          </h6>
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '30%' }}>Chỉ số</th>
                  <th style={{ width: '20%' }}>Giá trị</th>
                  <th style={{ width: '15%' }}>Đơn vị</th>
                  <th style={{ width: '20%' }}>Giá trị bình thường</th>
                  <th style={{ width: '15%' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data).filter(([key]) => {
                  const metadataFields = ['doctorNotes', 'approvedBy', 'approvedAt', 'technicianNotes', 'enteredBy', 'confirmedBy'];
                  return !metadataFields.includes(key);
                }).map(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    if (value.hasOwnProperty('value')) {
                      const isNormal = value.status === 'normal';
                      const isLow = value.status === 'low';
                      const isHigh = value.status === 'high';

                      const statusColor = isNormal ? 'success' : 'danger';
                      const statusText = isNormal ? 'Bình thường' :
                        (isLow ? 'Thấp' :
                          (isHigh ? 'Cao' : 'Bất thường'));

                      return (
                        <tr key={key}>
                          <td className="fw-bold">{safeRender(key)}</td>
                          <td className="text-center">
                            <span className={`badge bg-${statusColor} bg-opacity-10 text-${statusColor} fs-6 fw-bold`}>
                              {safeRender(value.value)}
                            </span>
                          </td>
                          <td className="text-center text-muted">{safeRender(value.unit || value.unitName || '-')}</td>
                          <td className="text-center">{safeRender(value.normal || value.normalRange || value.referenceRange || '-')}</td>
                          <td className="text-center">
                            <Badge bg={statusColor}>
                              {statusText}
                            </Badge>
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={key}>
                          <td colSpan="5" className="fw-bold text-primary">
                            <i className="fas fa-layer-group me-2"></i>
                            {safeRender(key)}
                          </td>
                        </tr>
                      );
                    }
                  } else {
                    return (
                      <tr key={key}>
                        <td className="fw-bold">{safeRender(key)}</td>
                        <td className="text-center">
                          <span className="badge bg-secondary bg-opacity-10 text-secondary fs-6 fw-bold">
                            {String(value || '')}
                          </span>
                        </td>
                        <td className="text-center text-muted">-</td>
                        <td className="text-center">-</td>
                        <td className="text-center">
                          <Badge bg="secondary">N/A</Badge>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const filteredResults = Object.keys(results).reduce((acc, key) => {
      const metadataFields = ['doctorNotes', 'approvedBy', 'approvedAt', 'technicianNotes', 'enteredBy', 'confirmedBy'];
      if (!metadataFields.includes(key)) {
        acc[key] = results[key];
      }
      return acc;
    }, {});

    if (!filteredResults || Object.keys(filteredResults).length === 0) {
      return (
        <div className="text-center text-muted py-4">
          <i className="fas fa-flask fa-2x mb-2"></i>
          <p>Chưa có kết quả xét nghiệm</p>
        </div>
      );
    }

    const categoryNames = {
      'huyetHoc': 'Huyết học',
      'sinhHoa': 'Sinh hóa máu',
      'menGan': 'Chức năng gan',
      'mienDich': 'Miễn dịch',
      'chucNangThan': 'Chức năng thận',
      'dongMau': 'Đông máu',
      'hormonGiap': 'Hormon giáp',
      'hba1c': 'HbA1c'
    };

    return (
      <div>
        {filteredResults.huyetHoc && (
          <div key="huyetHoc">
            {renderTestSection('Huyết học', filteredResults.huyetHoc, 'fa-tint')}
          </div>
        )}
        {filteredResults.sinhHoa && (
          <div key="sinhHoa">
            {renderTestSection('Sinh hóa máu', filteredResults.sinhHoa, 'fa-vial')}
          </div>
        )}
        {filteredResults.menGan && (
          <div key="menGan">
            {renderTestSection('Chức năng gan', filteredResults.menGan, 'fa-heartbeat')}
          </div>
        )}
        {filteredResults.mienDich && (
          <div key="mienDich">
            {renderTestSection('Miễn dịch', filteredResults.mienDich, 'fa-shield-virus')}
          </div>
        )}
        {filteredResults.chucNangThan && (
          <div key="chucNangThan">
            {renderTestSection('Chức năng thận', filteredResults.chucNangThan, 'fa-kidneys')}
          </div>
        )}

        {Object.keys(filteredResults).map(key => {
          if (!['huyetHoc', 'sinhHoa', 'menGan', 'mienDich', 'chucNangThan'].includes(key) && filteredResults[key]) {
            const categoryName = categoryNames[key] || key;
            return (
              <div key={key}>
                {renderTestSection(categoryName, filteredResults[key], 'fa-flask')}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const enrichedLabTests = useMemo(() => {
    if (!labTests || labTests.length === 0) {
      return [];
    }

    const enriched = labTests.map(labTest => {
      const relatedAppointment = appointments.find(apt => {
        const aptId = apt.id || apt.appointmentId || apt.appointment_id;
        return String(aptId) === String(labTest.appointmentId) ||
          String(aptId) === String(labTest.appointment_id);
      });

      const relatedSample = samples.find(s => {
        const sAppointmentId = s.appointmentId || s.appointment_id || s.AppointmentId;
        return String(sAppointmentId) === String(labTest.appointmentId);
      });

      let serviceName = labTest.testPackage || labTest.testType || labTest.packageName || 'N/A';
      let serviceId = labTest.serviceId || labTest.testPackageId || labTest.test_package_id;

      if (relatedAppointment) {
        // Prioritize testPackageId from appointment (as in Dashboard)
        const packageId = relatedAppointment.testPackageId || relatedAppointment.test_package_id || relatedAppointment.packageId || relatedAppointment.serviceId;
        if (packageId) {
          serviceId = packageId;
          const service = services.find(s => String(s.id) === String(serviceId));
          if (service) {
            serviceName = service.name;
          }
        }
      } else if (serviceId) {
        const service = services.find(s => String(s.id) === String(serviceId));
        if (service) {
          serviceName = service.name;
        }
      }

      // Resolve doctor name - prioritize reviewedBy from test result
      let doctorName = labTest.doctorName || 'Chưa phân bổ';

      // Priority 1: reviewedBy (bác sĩ duyệt kết quả)
      if (labTest.reviewedBy && doctors.length > 0) {
        const doctor = doctors.find(d =>
          String(d.id) === String(labTest.reviewedBy) ||
          String(d.doctorId) === String(labTest.reviewedBy) ||
          String(d.userId) === String(labTest.reviewedBy)
        );
        if (doctor) {
          doctorName = doctor.fullName || doctor.name || doctorName;
        }
      }
      // Priority 2: approvedBy (fallback)
      else if (labTest.approvedBy && doctors.length > 0) {
        const doctor = doctors.find(d =>
          String(d.id) === String(labTest.approvedBy) ||
          String(d.userId) === String(labTest.approvedBy)
        );
        if (doctor) {
          doctorName = doctor.fullName || doctor.name || doctorName;
        }
      }
      // Priority 3: doctorId from appointment
      else if (relatedAppointment && relatedAppointment.doctorId) {
        const doctor = doctors.find(d => String(d.id) === String(relatedAppointment.doctorId));
        if (doctor) {
          doctorName = doctor.fullName || doctor.name || 'Chưa phân bổ';
        }
      }

      const sampleDate = relatedSample?.collectedAt ||
        relatedSample?.collected_at ||
        labTest.sampleDate ||
        labTest.sample_date ||
        (relatedSample?.createdAt ? new Date(relatedSample.createdAt) : null);

      // Test Date (Ngày báo cáo): Ưu tiên reviewedAt, đảm bảo >= sampleDate
      let testDate = labTest.reviewedAt ? new Date(labTest.reviewedAt) :
        (labTest.completedAt ? new Date(labTest.completedAt) :
          (labTest.approvedAt ? new Date(labTest.approvedAt) :
            (labTest.resultDate ? new Date(labTest.resultDate) :
              (labTest.testDate ? new Date(labTest.testDate) :
                (labTest.createdAt ? new Date(labTest.createdAt) : null)))));
      
      // Đảm bảo testDate >= sampleDate
      if (testDate && sampleDate) {
        if (testDate < sampleDate) {
          testDate = sampleDate; // Dùng ngày lấy mẫu làm ngày báo cáo tối thiểu
        }
      }

      return {
        ...labTest,
        testPackage: serviceName,
        testType: serviceName,
        serviceId: serviceId,
        doctorName: doctorName,
        sampleDate: sampleDate,
        testDate: testDate,
        // Ensure status is normalized for filtering
        normalizedStatus: String(labTest.status || '').toLowerCase()
      };
    });
    
    // Sắp xếp theo ngày mới nhất trước (ưu tiên testDate, sau đó sampleDate, cuối cùng createdAt)
    enriched.sort((a, b) => {
      // Ưu tiên testDate (ngày báo cáo) nếu có
      const dateA = a.testDate || a.sampleDate || new Date(a.createdAt || 0);
      const dateB = b.testDate || b.sampleDate || new Date(b.createdAt || 0);
      
      // Chuyển sang Date object nếu chưa phải
      const dateAObj = dateA instanceof Date ? dateA : new Date(dateA);
      const dateBObj = dateB instanceof Date ? dateB : new Date(dateB);
      
      // Sắp xếp giảm dần (mới nhất trước)
      return dateBObj - dateAObj;
    });
    
    return enriched;
  }, [labTests, appointments, samples, services, doctors]);

  // --- FILTER & PAGINATION LOGIC ---
  /**
   * Filters enriched lab tests based on selected status filter
   * 
   * This memoized value filters the enriched lab tests array based on the current
   * filterStatus state. It handles the following filter options:
   * - 'all': Shows all test results (no filtering)
   * - Specific status: Shows only tests with that status
   * 
   * The filtering uses normalized status comparison to ensure consistent results.
   * 
   * @type {Array<Object>} Filtered array of enriched lab test objects
   * 
   * @example
   * // Filtered tests update automatically when filterStatus changes
   * // If filterStatus = 'all', shows all tests
   * // If filterStatus = 'completed', shows only completed tests
   */
  const filteredLabTests = useMemo(() => {
    let result = enrichedLabTests;

    if (filterStatus !== 'all') {
      result = result.filter(item => {
        const s = item.normalizedStatus;
        if (filterStatus === 'completed') return s === 'completed' || s === 'approved';
        if (filterStatus === 'pending') return s === 'pending' || s === 'processing' || s === 'collected';
        if (filterStatus === 'cancelled') return s === 'cancelled';
        return s === filterStatus;
      });
    }

    return result;
  }, [enrichedLabTests, filterStatus]);

  /**
   * Total number of pages for pagination
   * 
   * Calculates the total number of pages based on filtered lab tests
   * and items per page. Used to display pagination controls.
   * 
   * @type {number} Total number of pages (rounded up)
   */
  const totalPages = Math.ceil(filteredLabTests.length / itemsPerPage);
  
  /**
   * Paginates filtered lab tests for current page display
   * 
   * This memoized value slices the filtered lab tests array to show only
   * the tests for the current page. It calculates the start and end
   * indices based on currentPage and itemsPerPage.
   * 
   * The pagination ensures that only a limited number of tests are
   * displayed at once, improving performance and user experience.
   * 
   * @type {Array<Object>} Array of enriched lab test objects for current page
   * 
   * @example
   * // If currentPage = 2, itemsPerPage = 5
   * // Shows tests at indices 5-9 (second page)
   */
  const paginatedLabTests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLabTests.slice(startIndex, endIndex);
  }, [filteredLabTests, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        background: `linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%), url(${require('../../../../assets/background2.jpg')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh'
      }}
    >
      {!hideHeader && <PatientHeader />}
      <Container className="py-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-5"
          style={{
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '3rem 2rem',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(30, 60, 114, 0.3), 0 0 0 1px rgba(30, 60, 114, 0.1)',
            margin: '0 1rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-30%',
              left: '-5%',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{ display: 'inline-block', marginBottom: '1rem' }}
            >
              <motion.i
                className="fas fa-flask"
                style={{
                  fontSize: '3.5rem',
                  color: '#ffffff',
                  display: 'inline-block',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
                  textShadow: '0 2px 10px rgba(255, 255, 255, 0.3)'
                }}
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
              />
            </motion.div>

            <motion.h2
              className="mb-3"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                lineHeight: '1.2',
                color: '#ffffff',
                marginTop: '1rem',
                textShadow: '0 2px 20px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 255, 255, 0.1)',
                position: 'relative'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Kết quả xét nghiệm của tôi
            </motion.h2>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '80px' }}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{
                height: '4px',
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
                borderRadius: '2px',
                margin: '0 auto 1.5rem',
                boxShadow: '0 2px 8px rgba(255, 255, 255, 0.3)'
              }}
            />

            <motion.p
              className="lead"
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '400',
                letterSpacing: '0.01em',
                marginBottom: '0',
                position: 'relative',
                textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)'
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Xem và tải kết quả xét nghiệm của bạn
            </motion.p>
          </motion.div>
        </motion.div>

        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h5 className="mb-0">
              <i className="fas fa-list me-2"></i>
              Danh sách kết quả ({filteredLabTests.length})
            </h5>

            {/* STATUS FILTER DROPDOWN */}
            <div style={{ minWidth: '200px' }}>
              <InputGroup size="sm">
                <InputGroup.Text><i className="fas fa-filter"></i></InputGroup.Text>
                <Form.Select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1); // Reset page on filter change
                  }}
                  style={{ borderRadius: '0 5px 5px 0' }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="completed">Hoàn thành / Đã duyệt</option>
                  <option value="waiting_review">Chờ duyệt</option>
                  <option value="pending">Đang xử lý</option>
                  <option value="cancelled">Đã hủy</option>
                </Form.Select>
              </InputGroup>
            </div>
          </Card.Header>

          <Card.Body>
            {/* Alert logic based on whether ANY result is completed */}
            {filteredLabTests.some(t => ['completed', 'approved'].includes(t.normalizedStatus)) && (
              <div className="alert alert-success mx-3 mt-3" role="alert">
                <i className="fas fa-check-circle me-2"></i>
                <strong>Kết quả xét nghiệm đã sẵn sàng!</strong> Bác sĩ đã duyệt và gửi kết quả xét nghiệm của bạn.
                Bạn có thể xem chi tiết và tải về báo cáo.
              </div>
            )}

            {filteredLabTests.length > 0 ? (
              <div style={{ padding: '1.5rem' }}>
                {paginatedLabTests.map((labTest, index) => {
                  // FIX: Check status case-insensitively
                  const currentStatus = String(labTest.status || '').toLowerCase();
                  const isCompleted = currentStatus === 'completed' || currentStatus === 'approved';

                  return (
                    <motion.div
                      key={labTest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="mb-4"
                    >
                      <Card
                        className="border-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,249,250,0.8) 100%)',
                          borderRadius: '20px',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                          border: '1px solid rgba(13, 110, 253, 0.1)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                        }}
                      >
                        <Card.Body className="p-4">
                          <Row className="align-items-center">
                            {/* Left Column - Test Info */}
                            <Col lg={8}>
                              <div className="mb-3">
                                <div className="d-flex align-items-center mb-2">
                                  <i className="fas fa-barcode me-2" style={{ color: '#0d6efd', fontSize: '1.1rem' }}></i>
                                  <span className="fw-bold" style={{ color: '#333', fontSize: '0.95rem' }}>Mã xét nghiệm:</span>
                                </div>
                                <code
                                  style={{
                                    background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                    color: 'white',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    fontFamily: 'monospace',
                                    boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)',
                                    border: 'none'
                                  }}
                                >
                                  {labTest.testCode || formatLabTestCode(labTest.id)}
                                </code>
                              </div>

                              <Row className="mb-3">
                                <Col md={6}>
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-flask me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                    <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Loại xét nghiệm:</span>
                                  </div>
                                  <div style={{ color: '#666', fontSize: '0.95rem', fontWeight: '500' }}>
                                    {labTest.testPackage || labTest.testType || getServiceName(labTest.serviceId) || 'N/A'}
                                  </div>
                                </Col>
                                <Col md={6}>
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-user-md me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                    <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Bác sĩ:</span>
                                  </div>
                                  <div style={{ color: '#666', fontSize: '0.95rem', fontWeight: '500' }}>
                                    {labTest.doctorName || 'Chưa phân bổ'}
                                  </div>
                                </Col>
                              </Row>

                              <Row>
                                <Col md={6}>
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-calendar me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                    <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Ngày lấy mẫu:</span>
                                  </div>
                                  <div style={{ color: '#666', fontSize: '0.95rem', fontWeight: '500' }}>
                                    {formatDate(labTest.sampleDate || labTest.sample_date)}
                                  </div>
                                </Col>
                                <Col md={6}>
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-microscope me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                    <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Ngày xét nghiệm:</span>
                                  </div>
                                  <div style={{ color: '#666', fontSize: '0.95rem', fontWeight: '500' }}>
                                    {formatDate(labTest.testDate || labTest.completedAt || labTest.resultDate)}
                                  </div>
                                </Col>
                              </Row>
                            </Col>

                            {/* Right Column - Status and Actions */}
                            <Col lg={4}>
                              <div className="text-center">
                                <div className="mb-3">
                                  <div className="d-flex align-items-center justify-content-center mb-2">
                                    <i className="fas fa-info-circle me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                    <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Trạng thái:</span>
                                  </div>
                                  <div>
                                    {getStatusBadge(labTest.status)}
                                  </div>
                                </div>

                                {/* FIX: Button Visibility based on normalized status */}
                                {isCompleted ? (
                                  <div className="d-flex flex-column gap-2">
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        variant="outline-primary"
                                        size="lg"
                                        onClick={() => handleViewResult(labTest)}
                                        style={{
                                          borderRadius: '15px',
                                          padding: '10px 20px',
                                          fontWeight: '600',
                                          border: '2px solid #0d6efd',
                                          background: 'transparent',
                                          color: '#0d6efd',
                                          transition: 'all 0.3s ease',
                                          width: '100%'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#0d6efd';
                                          e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                          e.currentTarget.style.color = '#0d6efd';
                                        }}
                                      >
                                        <i className="fas fa-eye me-2"></i>
                                        Xem kết quả
                                      </Button>
                                    </motion.div>

                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        variant="outline-success"
                                        size="lg"
                                        onClick={() => handleDownloadResult(labTest)}
                                        style={{
                                          borderRadius: '15px',
                                          padding: '10px 20px',
                                          fontWeight: '600',
                                          border: '2px solid #28a745',
                                          background: 'transparent',
                                          color: '#28a745',
                                          transition: 'all 0.3s ease',
                                          width: '100%'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#28a745';
                                          e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                          e.currentTarget.style.color = '#28a745';
                                        }}
                                      >
                                        <i className="fas fa-download me-2"></i>
                                        Tải kết quả
                                      </Button>
                                    </motion.div>
                                  </div>
                                ) : (
                                  <div className="text-muted">
                                    <i className="fas fa-clock me-2"></i>
                                    <span style={{ fontSize: '0.9rem' }}>
                                      {currentStatus === 'pending' && 'Đang chờ xử lý'}
                                      {currentStatus === 'processing' && 'Đang thực hiện'}
                                      {currentStatus === 'cancelled' && 'Đã hủy'}
                                      {!['pending', 'processing', 'cancelled'].includes(currentStatus) && 'Chưa có kết quả'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-file-medical fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Không tìm thấy kết quả nào</h5>
                <p className="text-muted">Thử thay đổi bộ lọc trạng thái hoặc quay lại sau.</p>
              </div>
            )}

            {/* Pagination */}
            {filteredLabTests.length > 0 && totalPages > 1 && (
              <div className="mt-4" style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                {/* Desktop Pagination */}
                <div className="d-none d-md-flex justify-content-center align-items-center gap-2 flex-wrap">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    style={{ borderRadius: '10px', minWidth: '40px' }}
                  >
                    <i className="fas fa-angle-double-left"></i>
                  </Button>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    style={{ borderRadius: '10px', minWidth: '40px' }}
                  >
                    <i className="fas fa-angle-left"></i>
                  </Button>

                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'primary' : 'outline-primary'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          style={{ borderRadius: '10px', minWidth: '40px' }}
                        >
                          {pageNum}
                        </Button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="mx-1">...</span>;
                    }
                    return null;
                  })}

                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    style={{ borderRadius: '10px', minWidth: '40px' }}
                  >
                    <i className="fas fa-angle-right"></i>
                  </Button>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    style={{ borderRadius: '10px', minWidth: '40px' }}
                  >
                    <i className="fas fa-angle-double-right"></i>
                  </Button>
                </div>

                {/* Mobile Pagination */}
                <div className="d-flex d-md-none justify-content-center align-items-center gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    style={{ borderRadius: '8px', minWidth: '35px', fontSize: '0.8rem' }}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </Button>

                  <div className="d-flex align-items-center gap-1">
                    <span className="text-muted small">Trang</span>
                    <Button
                      variant="primary"
                      size="sm"
                      style={{ borderRadius: '8px', minWidth: '35px', fontSize: '0.8rem' }}
                    >
                      {currentPage}
                    </Button>
                    <span className="text-muted small">/ {totalPages}</span>
                  </div>

                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    style={{ borderRadius: '8px', minWidth: '35px', fontSize: '0.8rem' }}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </Button>
                </div>

                {/* Page Info */}
                <div className="text-center mt-2">
                  <small className="text-muted">
                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredLabTests.length)} trong tổng số {filteredLabTests.length} kết quả
                  </small>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Modal xem kết quả chi tiết */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" scrollable>
          <Modal.Header
            closeButton
            style={{
              background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
              color: 'white'
            }}
          >
            <Modal.Title>
              <i className="fas fa-file-medical-alt me-2"></i>
              Kết quả xét nghiệm chi tiết
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedResult && (
              <div>
                {/* Thông tin bệnh nhân */}
                <div className="p-3 mb-4" style={{
                  background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%)',
                  borderRadius: '15px',
                  border: '1px solid rgba(13, 110, 253, 0.1)'
                }}>
                  <h6 className="text-primary mb-3">
                    <i className="fas fa-user-circle me-2"></i>
                    Thông tin bệnh nhân
                  </h6>
                  <Row className="mb-2">
                    <Col md={6}>
                      <i className="fas fa-user me-2 text-primary"></i>
                      <strong>Bệnh nhân:</strong> {selectedPatient?.fullName || 'Đang tải...'}
                    </Col>
                    <Col md={6}>
                      <i className="fas fa-birthday-cake me-2 text-primary"></i>
                      <strong>Ngày sinh:</strong> {selectedPatient?.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa có'}
                    </Col>
                  </Row>
                  <Row className="mb-2">
                    <Col md={6}>
                      <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                      <strong>Địa chỉ:</strong> {selectedPatient?.address || (selectedPatient?.province ? `${selectedPatient.province}, ${selectedPatient.district}, ${selectedPatient.ward}` : 'Chưa có')}
                    </Col>
                    <Col md={6}>
                      <i className="fas fa-phone me-2 text-primary"></i>
                      <strong>Số điện thoại:</strong> {selectedPatient?.phone || 'Chưa có'}
                    </Col>
                  </Row>
                </div>

                {/* Thông tin xét nghiệm */}
                <div className="p-3 mb-4" style={{
                  background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(32, 201, 151, 0.05) 100%)',
                  borderRadius: '15px',
                  border: '1px solid rgba(40, 167, 69, 0.1)'
                }}>
                  <h6 className="text-success mb-3">
                    <i className="fas fa-file-medical me-2"></i>
                    Thông tin xét nghiệm
                  </h6>
                  <Row className="mb-2">
                    <Col md={6}>
                      <i className="fas fa-flask me-2 text-success"></i>
                      <strong>Loại xét nghiệm:</strong> {selectedResult.testType || selectedResult.testPackage || getServiceName(selectedResult.serviceId) || 'N/A'}
                    </Col>
                    <Col md={6}>
                      <i className="fas fa-calendar me-2 text-success"></i>
                      <strong>Ngày lấy mẫu:</strong> {formatDate(selectedResult.sampleDate)}
                    </Col>
                  </Row>
                  <Row className="mb-2">
                    <Col md={6}>
                      <i className="fas fa-microscope me-2 text-success"></i>
                      <strong>Ngày xét nghiệm:</strong> {formatDate(selectedResult.testDate)}
                    </Col>
                    <Col md={6}>
                      <i className="fas fa-user-md me-2 text-success"></i>
                      <strong>Bác sĩ chỉ định:</strong> {selectedResult.doctorName || 'Chưa phân bổ'}
                    </Col>
                  </Row>
                  <Row>
                    <Col md={12}>
                      <i className="fas fa-barcode me-2 text-success"></i>
                      <strong>Mã xét nghiệm:</strong>
                      <code className="ms-2 px-2 py-1 bg-success bg-opacity-10 rounded">{selectedResult.testCode || formatLabTestCode(selectedResult.id)}</code>
                    </Col>
                  </Row>
                </div>
                <hr />
                <div className="mb-3">
                  <h5 className="text-primary mb-3">
                    <i className="fas fa-clipboard-list me-2"></i>
                    Kết quả xét nghiệm chi tiết
                  </h5>
                  {(() => {
                    try {
                      const results = typeof selectedResult.results === 'string'
                        ? JSON.parse(selectedResult.results)
                        : selectedResult.results;

                      // Additional safety check
                      if (!results || typeof results !== 'object') {
                        return <div className="text-muted">Chưa có kết quả xét nghiệm</div>;
                      }

                      // Pass selectedResult to renderResultsUI for enrichment with service indicators
                      return renderResultsUI(results, selectedResult);
                    } catch (error) {
                      return <div className="text-danger">Lỗi hiển thị kết quả xét nghiệm</div>;
                    }
                  })()}
                </div>
                {/* Nhận xét của bác sĩ */}
                <div className="p-3 mb-4" style={{
                  background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 152, 0, 0.05) 100%)',
                  borderRadius: '15px',
                  border: '1px solid rgba(255, 193, 7, 0.2)',
                  borderLeft: '4px solid #ffc107'
                }}>
                  <h6 className="text-warning mb-3">
                    <i className="fas fa-notes-medical me-2"></i>
                    Nhận xét của bác sĩ
                  </h6>
                  <p className="mb-0" style={{ fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {(() => {
                      // Handle doctorNotes - could be string, object, or null
                      let notes = selectedResult.doctorNotes;

                      // If it's an object, try to extract the actual notes
                      if (typeof notes === 'object' && notes !== null) {
                        // If it has a doctorNotes property, use that
                        if (notes.doctorNotes !== undefined) {
                          notes = notes.doctorNotes;
                        } else if (notes.notes !== undefined) {
                          notes = notes.notes;
                        } else if (notes.comment !== undefined) {
                          notes = notes.comment;
                        } else {
                          // If it's an object with only metadata fields, ignore it
                          const keys = Object.keys(notes);
                          const metadataFields = ['approvedBy', 'approvedAt', 'enteredBy', 'confirmedBy'];
                          if (keys.every(key => metadataFields.includes(key))) {
                            notes = '';
                          } else {
                            // Try to find any string value in the object
                            const stringValues = Object.values(notes).filter(v => typeof v === 'string' && v.trim() !== '');
                            notes = stringValues.length > 0 ? stringValues[0] : '';
                          }
                        }
                      }

                      // If it's a string, use it directly
                      if (typeof notes === 'string') {
                        return notes.trim() || 'Không có nhận xét';
                      }

                      return 'Không có nhận xét';
                    })()}
                  </p>
                </div>

                {selectedResult.technicianNotes && (
                  <div className="p-3 mb-4" style={{
                    background: 'linear-gradient(135deg, rgba(23, 162, 184, 0.05) 0%, rgba(13, 110, 253, 0.05) 100%)',
                    borderRadius: '15px',
                    border: '1px solid rgba(23, 162, 184, 0.2)',
                    borderLeft: '4px solid #17a2b8'
                  }}>
                    <h6 className="text-info mb-3">
                      <i className="fas fa-user-md me-2"></i>
                      Ghi chú kỹ thuật viên
                    </h6>
                    <p className="mb-0" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
                      {typeof selectedResult.technicianNotes === 'object'
                        ? JSON.stringify(selectedResult.technicianNotes, null, 2)
                        : selectedResult.technicianNotes}
                    </p>
                  </div>
                )}

                {/* Thông tin ký kết */}
                <div className="p-3 mt-4" style={{
                  background: 'rgba(108, 117, 125, 0.05)',
                  borderRadius: '15px',
                  borderTop: '2px solid #6c757d'
                }}>
                  <Row>
                    <Col md={6} className="mb-2">
                      <i className="fas fa-user-nurse me-2 text-secondary"></i>
                      <strong>Bác sĩ xét nghiệm:</strong>
                      <br />
                      <span className="ms-4">{selectedResult.doctorName || 'Chưa phân bổ'}</span>
                    </Col>
                    <Col md={6} className="mb-2">
                      <i className="fas fa-calendar-check me-2 text-secondary"></i>
                      <strong>Ngày báo cáo:</strong>
                      <br />
                      <span className="ms-4">{formatDate(
                        selectedResult.reportDate ||
                        selectedResult.approvedAt ||
                        selectedResult.completedAt ||
                        selectedResult.resultDate ||
                        selectedResult.testDate
                      )}</span>
                    </Col>
                  </Row>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Đóng
            </Button>
            {selectedResult && (
              <Button variant="success" onClick={() => handleDownloadResult(selectedResult)}>
                <i className="fas fa-download me-2"></i>
                Tải kết quả
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
      {!hideHeader && <GuestFooter />}
    </motion.div>
  );
};
export default MyResults;