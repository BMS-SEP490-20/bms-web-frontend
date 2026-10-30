/**
 * Receptionist Check-In Component
 * 
 * Component for receptionist to check-in patients using QR code scanning.
 * Shows list of appointments that can be checked in and provides QR code scanning functionality.
 */
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputGroup, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { appointmentService } from '../../../../services/appointmentService';
import { patientService } from '../../../../services/patientService';
import { medicalService } from '../../../../services/medicalService';
import { doctorService } from '../../../../services/doctorService';
import { shiftService } from '../../../../services/shiftService';
import { testOrderService } from '../../../../services/testOrderService';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import QuickCheckInScan from '../QuickCheckInScan/QuickCheckInScan';
import api from '../../../../config/api';
import useResponsive from '../../../../shared/hooks/useResponsive';
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../../../shared/hooks/useAutoRefresh';

const ReceptionistCheckIn = () => {
  const { showSuccess, showError } = useNotificationContext();
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickQRModal, setShowQuickQRModal] = useState(false);
  const [mainPageManualCode, setMainPageManualCode] = useState('');
  const [quickScanMode, setQuickScanMode] = useState('camera');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedInAppointments, setCheckedInAppointments] = useState([]);
  const [testPackages, setTestPackages] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [rooms, setRooms] = useState([]); // Room directory state
  const [labAssignmentInfo, setLabAssignmentInfo] = useState(null); // Loaded lab assignment details
  const [loadingLabAssignment, setLoadingLabAssignment] = useState(false); // Lab assignment loading flag

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAppointments();
    filterCheckedInAppointments();
  }, [appointments, searchTerm, patients]);

  /**
   * Normalizes patient record to standard format
   * 
   * This utility function normalizes patient objects from various API responses
   * to a consistent format. It handles different field name variations (camelCase,
   * PascalCase, snake_case) and extracts patient ID from multiple possible fields.
   * 
   * **Field normalization:**
   * - ID: Checks multiple ID field variations
   * - fullName: Checks name field variations
   * - email, phone, gender, address, dateOfBirth, identityNumber
   * 
   * @param {Object} patient - Patient object to normalize
   * @returns {Object|null} Normalized patient object or null if invalid
   * 
   * @example
   * const normalized = normalizePatientRecord({ PatientId: '123', Fullname: 'John Doe' });
   * // Returns: { id: '123', fullName: 'John Doe', ... }
   */
  const normalizePatientRecord = (patient) => {
    if (!patient) return null;
    const normalizedId = patient.id
      || patient.Id
      || patient.patientId
      || patient.PatientId
      || patient.patient_id
      || patient.PatientID
      || patient.accountId
      || patient.AccountId
      || patient.account_id
      || patient.userId
      || patient.UserId
      || patient.user_id
      || patient.createdBy
      || patient.CreatedBy
      || null;

    return {
      ...patient,
      id: normalizedId,
      fullName: patient.fullName
        || patient.fullname
        || patient.Fullname
        || patient.name
        || patient.Name
        || patient.username
        || patient.email
        || '',
      email: patient.email || patient.Email || '',
      phone: patient.phone || patient.Phone || '',
      gender: patient.gender || patient.Gender || patient.sex || patient.Sex || '',
      address: patient.address || patient.Address || patient.addressLine || patient.AddressLine || '',
      dateOfBirth: patient.dateOfBirth || patient.Dob || patient.dob || patient.DateOfBirth || patient.DOB || null,
      identityNumber: patient.identityNumber || patient.IdentityNumber || patient.cccd || patient.CCCD || ''
    };
  };

  /**
   * Checks if patient matches target ID
   * 
   * This utility function checks if a patient object matches a target ID by
   * comparing the target ID against multiple possible ID fields in the patient object.
   * Uses case-insensitive string comparison.
   * 
   * **ID fields checked:**
   * - id, Id, patientId, PatientId, patient_id, PatientID
   * - accountId, AccountId, account_id
   * - userId, UserId, user_id
   * 
   * @param {Object} patient - Patient object to check
   * @param {string|number} targetId - Target ID to match against
   * @returns {boolean} True if patient matches target ID, false otherwise
   * 
   * @example
   * doesPatientMatchId({ patientId: '123' }, '123') // Returns: true
   * doesPatientMatchId({ id: '456' }, '123') // Returns: false
   */
  const doesPatientMatchId = (patient, targetId) => {
    if (!patient || !targetId) return false;
    const normalizedTarget = String(targetId).trim().toLowerCase();
    const candidateIds = [
      patient.id,
      patient.Id,
      patient.patientId,
      patient.PatientId,
      patient.patient_id,
      patient.PatientID,
      patient.accountId,
      patient.AccountId,
      patient.account_id,
      patient.userId,
      patient.UserId,
      patient.user_id,
      patient.createdBy,
      patient.CreatedBy,
      patient.identityNumber,
      patient.IdentityNumber
    ]
      .filter(Boolean)
      .map(value => String(value).trim().toLowerCase());

    return candidateIds.includes(normalizedTarget);
  };

  /**
   * Fetches missing patient records for appointments
   * 
   * This function identifies patient IDs from appointments that are not in
   * the current patients list and fetches them from the API. It normalizes
   * and deduplicates patient records.
   * 
   * **Process:**
   * 1. Identifies missing patient IDs from appointments
   * 2. Fetches missing patients from API one by one
   * 3. Normalizes fetched patient records
   * 4. Returns combined list of existing and newly fetched patients
   * 
   * @param {Array<Object>} appointmentsList - List of appointments to extract patient IDs from
   * @param {Array<Object>} currentPatients - Current list of patients
   * @returns {Promise<Array<Object>>} Combined list of existing and fetched patients
   * 
   * @example
   * const allPatients = await fetchMissingPatients(appointments, existingPatients);
   */
  const fetchMissingPatients = async (appointmentsList, currentPatients) => {
    try {
      const existingPatients = currentPatients || [];
      const missingIds = [...new Set(
        (appointmentsList || [])
          .map(apt => apt?.patientId)
          .filter(Boolean)
          .filter(id => !existingPatients.some(p => doesPatientMatchId(p, id)))
      )];

      if (missingIds.length === 0) {
        return existingPatients;
      }

      const fetchedPatients = [];
      for (const id of missingIds) {
        try {
          const resp = await patientService.getPatientById(id);
          if (resp.success && resp.data) {
            const normalized = normalizePatientRecord(resp.data);
            if (normalized && !existingPatients.some(p => doesPatientMatchId(p, normalized.id))) {
              fetchedPatients.push(normalized);
            }
          }
        } catch (error) {
        }
      }

      return [...existingPatients, ...fetchedPatients];
    } catch (error) {
      return currentPatients || [];
    }
  };

  /**
   * Loads all check-in management data
   * 
   * This function is the core data fetching function for the receptionist check-in page.
   * It performs the following operations:
   * 1. Fetches appointments, patients, services, doctors, and rooms
   * 2. Enriches appointments with shift date/time information
   * 3. Fetches test package names for appointments
   * 4. Fetches missing patient records
   * 5. Normalizes and sets all data
   * 
   * The function handles errors gracefully and sets loading states appropriately.
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and forces fresh data fetch
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load data when component mounts
   * await loadData();
   * 
   * // Force fresh data fetch
   * await loadData(true);
   */
  const loadData = async (forceFresh = false) => {
    try {
      setLoading(true);
      
      const [appointmentsResult, patientsResult, servicesResult, doctorsResult, roomsResult] = await Promise.all([
        appointmentService.getAllAppointments(),
        patientService.getAllPatients(),
        medicalService.getAllServices(),
        api.get('/gateway/testorder/doctor', { params: { page: 1, pageSize: 1000 } }).catch(() => ({ data: [] })), // Get all doctors with large pageSize
        doctorService.getAllDoctorRooms({ page: 1, pageSize: 100 }).catch(() => ({ success: false, data: [] })) // Get rooms
      ]);

      let appointmentList = appointmentsResult.success ? (appointmentsResult.data || []) : [];
      
      // Enrich appointments with shift date/time if missing
      if (appointmentList.length > 0) {
        try {
          // Extract unique shiftIds across appointments
          const shiftIds = [...new Set(
            appointmentList
              .map(apt => apt.doctorShiftId || apt.DoctorShiftId || apt.doctor_shift_id || apt.shiftId || apt.ShiftId)
              .filter(Boolean)
          )];
          
          
          // Fetch shifts to retrieve date and time
          const shiftsMap = new Map();
          for (const shiftId of shiftIds) {
            try {
              const shiftResp = await shiftService.getShiftById(shiftId);
              if (shiftResp.success && shiftResp.data) {
                const shift = shiftResp.data;
                // Index shifts across alias keys for lookup
                const shiftKeyLower = String(shiftId).toLowerCase();
                const shiftKeyOriginal = String(shiftId);
                shiftsMap.set(shiftKeyLower, shift);
                shiftsMap.set(shiftKeyOriginal, shift); // Also store with original case
                
                // Index shift by primary key
                const shiftOwnId = shift.ShiftId || shift.shiftId || shift.Id || shift.id;
                if (shiftOwnId) {
                  shiftsMap.set(String(shiftOwnId).toLowerCase(), shift);
                  shiftsMap.set(String(shiftOwnId), shift);
                }
              } else {
              }
            } catch (err) {
            }
          }
          
          
          // Fetch TestPackageName when missing for test packages
          const packageIdsToFetch = [...new Set(
            appointmentList
              .filter(apt => {
                const hasPackageId = apt.TestPackageId || apt.testPackageId || apt.test_package_id;
                const hasPackageName = apt.TestPackageName || apt.testPackageName || apt.test_package_name;
                return hasPackageId && !hasPackageName;
              })
              .map(apt => apt.TestPackageId || apt.testPackageId || apt.test_package_id)
              .filter(Boolean)
          )];
          
          
          // Retrieve packages to resolve PackageName
          const packagesMap = new Map();
          for (const packageId of packageIdsToFetch) {
            try {
              const packageResp = await medicalService.getServiceById(packageId);
              if (packageResp.success && packageResp.data) {
                const packageData = packageResp.data;
                const packageName = packageData.PackageName || packageData.packageName || packageData.name || packageData.Name;
                if (packageName) {
                  packagesMap.set(String(packageId).toLowerCase(), packageName);
                  packagesMap.set(String(packageId), packageName); // Also store with original case
                } else {
                }
              } else {
              }
            } catch (err) {
            }
          }
          
          
          // Populate date and time from shift metadata
          appointmentList = appointmentList.map(apt => {
            const enrichedApt = { ...apt }; // Shallow copy to avoid mutation
            const aptShiftId = enrichedApt.doctorShiftId || enrichedApt.DoctorShiftId || enrichedApt.doctor_shift_id || enrichedApt.shiftId || enrichedApt.ShiftId;
            
            // Enrich shift details whenever shiftId is present
            if (aptShiftId) {
              // Match shift by alternative key identifiers
              const shiftKey1 = String(aptShiftId).toLowerCase();
              const shiftKey2 = String(aptShiftId);
              const relatedShift = shiftsMap.get(shiftKey1) || shiftsMap.get(shiftKey2) || 
                                   Array.from(shiftsMap.values()).find(s => {
                                     const sId = s.ShiftId || s.shiftId || s.Id || s.id;
                                     return String(sId) === String(aptShiftId) || String(sId).toLowerCase() === shiftKey1;
                                   });
              
              if (relatedShift) {
                // Enrich date
                const shiftDate = relatedShift.ShiftDate || relatedShift.shiftDate || relatedShift.date || relatedShift.Date;
                if (shiftDate) {
                  try {
                    const date = new Date(shiftDate);
                    if (!isNaN(date.getTime())) {
                      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      enrichedApt.appointmentDate = formattedDate;
                    }
                  } catch (err) {
                  }
                }
                
                // Enrich time
                const shiftStart = relatedShift.ShiftStart || relatedShift.shiftStart || relatedShift.start || relatedShift.Start;
                if (shiftStart) {
                  if (typeof shiftStart === 'string') {
                    // Handle TimeOnly format (HH:MM:SS or HH:MM)
                    enrichedApt.appointmentTime = shiftStart.substring(0, 5); // Take HH:MM
                  } else {
                    enrichedApt.appointmentTime = String(shiftStart);
                  }
                }
              } else {
              }
              } else {
              }
            
            // Populate TestPackageName from packagesMap
            const aptPackageId = enrichedApt.TestPackageId || enrichedApt.testPackageId || enrichedApt.test_package_id;
            const aptPackageName = enrichedApt.TestPackageName || enrichedApt.testPackageName || enrichedApt.test_package_name;
            
            if (aptPackageId && !aptPackageName) {
              const packageKey1 = String(aptPackageId).toLowerCase();
              const packageKey2 = String(aptPackageId);
              const fetchedPackageName = packagesMap.get(packageKey1) || packagesMap.get(packageKey2);
              
              if (fetchedPackageName) {
                enrichedApt.TestPackageName = fetchedPackageName;
                enrichedApt.testPackageName = fetchedPackageName;
              } else {
              }
            }
            
            return enrichedApt;
          });
          
          // Log sample enriched appointment record for debugging
          const sampleEnriched = appointmentList.slice(0, 3).map(apt => ({
            id: apt.id || apt.appointmentId,
            shiftId: apt.doctorShiftId || apt.DoctorShiftId,
            appointmentDate: apt.appointmentDate,
            appointmentTime: apt.appointmentTime,
            TestPackageId: apt.TestPackageId || apt.testPackageId || apt.test_package_id
          }));
        } catch (err) {
        }
      }
      
      if (appointmentsResult.success) {
        setAppointments(appointmentList);
      } else {
        setAppointments([]);
      }

      const normalizedPatients = patientsResult.success && Array.isArray(patientsResult.data)
        ? patientsResult.data.map(normalizePatientRecord).filter(Boolean)
        : [];

      const enrichedPatients = await fetchMissingPatients(appointmentList, normalizedPatients);
      setPatients(enrichedPatients);

      if (servicesResult.success) {
        const packagesData = servicesResult.data || [];
        setTestPackages(packagesData);
      } else {
      }

      if (doctorsResult.data) {
        const doctorsData = Array.isArray(doctorsResult.data) 
          ? doctorsResult.data 
          : (doctorsResult.data?.data || []);
        setDoctors(doctorsData);
      } else {
      }

      // Fetch rooms to map RoomId to RoomName
      if (roomsResult.success && roomsResult.data) {
        const roomsData = Array.isArray(roomsResult.data) ? roomsResult.data : [];
        setRooms(roomsData);
      } else {
        setRooms([]);
      }
    } catch (error) {
      showError('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets appointment date and time as Date object
   * 
   * This helper function extracts and combines appointment date and time
   * into a JavaScript Date object. It uses appointmentService helper if available,
   * otherwise falls back to manual calculation.
   * 
   * @param {Object} appointment - Appointment object with date and time fields
   * @returns {Date|null} Combined date-time object or null if invalid
   * 
   * @example
   * const dateTime = getAppointmentDateTime({ appointmentDate: '2024-12-04', appointmentTime: '10:30' });
   * // Returns: Date object for 2024-12-04 10:30:00
   */
  const getAppointmentDateTime = (appointment) => {
    try {
      return appointmentService.getAppointmentDateTime(appointment);
    } catch (error) {
      // Fallback calculation
      if (!appointment || !appointment.appointmentDate) return null;
      const [hour, minute] = (appointment.appointmentTime || appointment.time || '00:00').split(':').map(Number);
      const aptDate = new Date(appointment.appointmentDate);
      aptDate.setHours(hour || 0, minute || 0, 0, 0);
      return aptDate;
    }
  };

  /**
   * Calculates time status for appointment (upcoming, on-time, late, very late)
   * 
   * This helper function calculates the time difference between now and appointment
   * time and returns a status object with message and color for display.
   * 
   * **Status categories:**
   * - 'upcoming': More than 30 minutes away
   * - 'on_time': Within 30 minutes (before or after)
   * - 'late': 30-120 minutes past
   * - 'very_late': More than 2 hours past
   * - 'unknown': No appointment time available
   * 
   * @param {Object} appointment - Appointment object to calculate time status for
   * @returns {Object} Status object with status, message, and color properties
   * 
   * @example
   * const timeStatus = getTimeStatus(appointment);
   * // Returns: { status: 'on_time', message: '15 mins left', color: 'success' }
   */
  const getTimeStatus = (appointment) => {
    const now = new Date();
    const aptDateTime = getAppointmentDateTime(appointment);
    
    if (!aptDateTime) {
      return { status: 'unknown', message: 'Chưa có thông tin giờ hẹn', color: 'secondary' };
    }
    
    const diffMs = aptDateTime - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffMinutes > 30) {
      return {
        status: 'upcoming',
        message: diffHours > 0 
          ? `Còn ${diffHours} giờ ${diffMinutes % 60} phút`
          : `Còn ${diffMinutes} phút`,
        color: 'info'
      };
    } else if (diffMinutes >= -30) {
      return {
        status: 'on_time',
        message: diffMinutes >= 0 ? `Còn ${diffMinutes} phút` : 'Đúng giờ hẹn',
        color: 'success'
      };
    } else if (diffMinutes >= -120) {
      return {
        status: 'late',
        message: `Đã quá ${Math.abs(diffMinutes)} phút`,
        color: 'warning'
      };
    } else {
      return {
        status: 'very_late',
        message: `Đã quá ${Math.abs(diffHours)} giờ`,
        color: 'danger'
      };
    }
  };

  /**
   * Filters appointments for check-in display
   * 
   * This function filters appointments to show only those that can be checked in.
   * It performs the following filtering:
   * 1. Excludes already checked-in appointments
   * 2. Shows only 'confirmed' status (paid appointments)
   * 3. Filters by search term (patient name, email, phone, appointment code)
   * 
   * **Filter criteria:**
   * - Status must be 'confirmed' (paid and confirmed)
   * - Status must not be 'checked_in' (already checked in)
   * - Matches search term if provided
   * 
   * @returns {void} Does not return a value. Updates filteredAppointments state.
   * 
   * @example
   * // Filter appointments when search term or appointments change
   * filterAppointments();
   */
  const filterAppointments = () => {
    
    // Debug log all appointments and statuses
    const allStatuses = [...new Set(appointments.map(apt => apt.status || apt.Status || 'null'))];
    const statusBreakdownDetailed = {};
    appointments.forEach(apt => {
      const status = (apt.status || apt.Status || 'null').toLowerCase();
      statusBreakdownDetailed[status] = (statusBreakdownDetailed[status] || 0) + 1;
    });

    // Filter for confirmed, paid appointments eligible for check-in
    // Workflow progression:
    // Pending confirmation status: unpaid appointment
    // Confirmed status: paid appointment
    // Receptionist check-in queue only accepts confirmed appointments
    // Exclude unpaid pending_confirmation appointments
    let filtered = appointments.filter(apt => {
      // Check both camelCase and PascalCase status properties
      const rawStatus = apt.status || apt.Status;
      const status = (rawStatus || '').toLowerCase();
      
      // Detailed debug log
      if (!status || status === 'null') {
      }
      
      // Exclude already checked-in appointments
      if (status === 'checked_in' || status === 'checked-in') {
        return false;
      }
      
      // Only display appointments with confirmed status
      // 'confirmed' represents paid appointments per statusHelper.js
      // Exclude unpaid pending_confirmation appointments
      const isPaidAndConfirmed = status === 'confirmed';
      
      // Log unmatched appointments for diagnosis
      if (!isPaidAndConfirmed && status && status !== 'null') {
      }
      
      return isPaidAndConfirmed;
    });
    
    // Log filtered appointment details for debugging

    // Debug: Log appointments before filtering
    const statusBreakdown = {};
    const statusDetails = [];
    appointments.forEach(apt => {
      const status = (apt.status || apt.Status || 'null').toLowerCase();
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      statusDetails.push({
        id: apt.id || apt.appointmentId,
        rawStatus: apt.status || apt.Status,
        normalizedStatus: status,
        appointmentDate: apt.appointmentDate
      });
    });
    
    // Log status breakdown for debugging

    // Filter by search term
    if (searchTerm) {
      const beforeSearch = filtered.length;
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(apt => {
        const patient = patients.find(p => p.id === apt.patientId);
        const patientName = patient?.fullName || patient?.name || '';
        const appointmentCode = apt.appointmentCode || apt.code || '';
        const matches = (
          patientName.toLowerCase().includes(searchLower) ||
          appointmentCode.toLowerCase().includes(searchLower) ||
          apt.id?.toString().includes(searchLower)
        );
        
        return matches;
      });
    }

    // Sort priority: imminent appointment time first
    filtered.sort((a, b) => {
      const now = new Date();
      const timeA = getAppointmentDateTime(a);
      const timeB = getAppointmentDateTime(b);
      
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;
      
      const diffA = Math.abs(timeA - now);
      const diffB = Math.abs(timeB - now);
      return diffA - diffB; // Ascending time proximity
    });

    setFilteredAppointments(filtered);
  };

  /**
   * Filters checked-in appointments for current day
   * 
   * This function filters appointments that have been checked in and belong
   * to the current day. It performs:
   * 1. Filters appointments with 'checked_in' or 'checked-in' status
   * 2. Filters by current date (only today's appointments)
   * 3. Sorts by check-in time (most recent first)
   * 
   * **Filter criteria:**
   * - Status must be 'checked_in' or 'checked-in'
   * - Appointment date must match today's date
   * 
   * @returns {void} Does not return a value. Updates checkedInAppointments state.
   * 
   * @example
   * // Filter checked-in appointments when appointments change
   * filterCheckedInAppointments();
   */
  const filterCheckedInAppointments = () => {
    // Get all checked-in appointments (status = 'checked_in' or 'checked-in')
    // Case-insensitive check across status variants
    let checkedIn = appointments.filter(apt => {
      const status = (apt.status || apt.Status || '').toLowerCase();
      if (status !== 'checked_in' && status !== 'checked-in') {
        return false;
      }

      // Filter by current date - only show appointments checked in today
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get appointment date
      const appointmentDateStr = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate || apt.date || apt.Date;
      if (!appointmentDateStr) {
        return false;
      }

      try {
        const appointmentDate = new Date(appointmentDateStr);
        if (isNaN(appointmentDate.getTime())) {
          return false;
        }
        
        // Compare only date part (ignore time)
        const aptDate = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
        
        // Only include appointments from today
        return aptDate.getTime() === today.getTime();
      } catch (error) {
        return false;
      }
    });

    // Sort by check-in time (most recent first)
    checkedIn.sort((a, b) => {
      const timeA = new Date(a.checkedInAt || a.updatedAt || a.appointmentDate || 0);
      const timeB = new Date(b.checkedInAt || b.updatedAt || b.appointmentDate || 0);
      return timeB - timeA;
    });

    setCheckedInAppointments(checkedIn);
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => doesPatientMatchId(p, patientId));
    return patient?.fullName || patient?.name || patient?.email || `ID: ${patientId}`;
  };

  const getStatusBadge = (status) => {
    // Normalize status to lowercase
    const normalizedStatus = (status || '').toLowerCase();
    const statusMap = {
      'scheduled': { variant: 'success', text: 'Đã thanh toán' },
      'confirmed': { variant: 'info', text: 'Đã xác nhận' },
      'pending_confirmation': { variant: 'warning', text: 'Chờ xác nhận' },
      'pending': { variant: 'warning', text: 'Chờ xử lý' },
      'paid': { variant: 'success', text: 'Đã thanh toán' },
      'active': { variant: 'info', text: 'Đang hoạt động' },
      'checked_in': { variant: 'primary', text: 'Đã check-in' },
      'checked-in': { variant: 'primary', text: 'Đã check-in' },
      'sample_collected': { variant: 'warning', text: 'Đã lấy mẫu' }
    };
    const statusInfo = statusMap[normalizedStatus] || { variant: 'secondary', text: status || 'N/A' };
    return <Badge bg={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  const handleDirectCheckIn = async (appointment) => {
    try {
      // Case-insensitive status verification
      const status = (appointment.status || appointment.Status || '').toLowerCase();
      
      // Prevent duplicate check-in if already checked in
      if (status === 'checked_in' || status === 'checked-in') {
        showError('Lịch hẹn đã được check-in rồi.');
        return;
      }

      // Only permit check-in for confirmed status
      // Exclude unpaid pending_confirmation appointments
      if (status !== 'confirmed') {
        showError(`Không thể check-in lịch hẹn với trạng thái "${appointment.status || appointment.Status || 'N/A'}". Chỉ có thể check-in lịch hẹn đã thanh toán và có trạng thái "Đặt lịch thành công" (confirmed).`);
        return;
      }

      const response = await appointmentService.checkInAppointment(appointment.id, user?.id);
      if (response.success) {
        showSuccess(`✅ Check-in thành công cho ${getPatientName(appointment.patientId)}!`);
        setRefreshFlag('appointments');
        dispatchRefreshEvent('appointments', 'updated', { appointmentId: appointment.id });
        await loadData(true);
      } else {
        showError(response.message || 'Không thể check-in. Vui lòng thử lại.');
      }
    } catch (error) {
      showError('Lỗi khi check-in. Vui lòng thử lại.');
    }
  };

  const handleQuickCheckInSuccess = async () => {
    // Refresh data list while keeping modal active for consecutive scans
    // Enables continuous scanning for incoming patients
    setRefreshFlag('appointments');
    dispatchRefreshEvent('appointments', 'updated');
    await loadData(true);
  };

  const handleOpenQuickQRModal = (mode = 'camera') => {
    setQuickScanMode(mode);
    setShowQuickQRModal(true);
  };

  const handleMainPageManualSubmit = (e) => {
    e.preventDefault();
    if (mainPageManualCode.trim()) {
      handleOpenQuickQRModal('manual');
    }
  };

  const handleCloseQuickQRModal = () => {
    setShowQuickQRModal(false);
  };

  // Export checked-in patient list to CSV
  const handleExportCheckedIn = () => {
    if (checkedInAppointments.length === 0) {
      showError('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Mã lịch hẹn', 'Bệnh nhân', 'Ngày hẹn', 'Giờ hẹn', 'Trạng thái', 'Người check-in'];
    const rows = checkedInAppointments.map(apt => {
      const patient = getPatientInfo(apt.patientId);
      const statusText = apt.status === 'checked_in' ? 'Đã check-in' : 
                        apt.status === 'scheduled' ? 'Đã thanh toán' :
                        apt.status === 'confirmed' ? 'Đã xác nhận' :
                        apt.status === 'sample_collected' ? 'Đã lấy mẫu' :
                        apt.status || 'N/A';
      
      return [
        apt.appointmentCode || apt.code || apt.id,
        patient?.fullName || patient?.name || 'N/A',
        apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('vi-VN') : 'N/A',
        apt.appointmentTime || apt.time || 'N/A',
        statusText,
        apt.checkedInBy ? `ID: ${apt.checkedInBy}` : 'N/A'
      ];
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `danh-sach-check-in-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('Đã xuất danh sách thành công!');
  };

  // Print checked-in patient list
  const handlePrintCheckedIn = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <html>
        <head>
          <title>Danh sách bệnh nhân đã check-in</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Danh sách bệnh nhân đã check-in</h1>
          <p>Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p>
          <table>
            <thead>
              <tr>
                <th>Mã lịch hẹn</th>
                <th>Bệnh nhân</th>
                <th>Ngày hẹn</th>
                <th>Giờ hẹn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${checkedInAppointments.map(apt => {
                const patient = getPatientInfo(apt.patientId);
                const statusText = apt.status === 'checked_in' ? 'Đã check-in' : 
                                  apt.status === 'scheduled' ? 'Đã thanh toán' :
                                  apt.status === 'confirmed' ? 'Đã xác nhận' :
                                  apt.status === 'sample_collected' ? 'Đã lấy mẫu' :
                                  apt.status || 'N/A';
                return `
                  <tr>
                    <td>${apt.appointmentCode || apt.code || apt.id}</td>
                    <td>${patient?.fullName || patient?.name || 'N/A'}</td>
                    <td>${apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('vi-VN') : 'N/A'}</td>
                    <td>${apt.appointmentTime || apt.time || 'N/A'}</td>
                    <td>${statusText}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleViewDetail = async (appointment) => {
    // Fetch appointment details and resolve doctor/shift metadata
    try {
      let enrichedAppointment = { ...appointment };
      
      // Try to fetch latest appointment data
      if (appointment.id || appointment.appointmentId || appointment.AppointmentId) {
        try {
          const appointmentId = appointment.id || appointment.appointmentId || appointment.AppointmentId;
          const resp = await appointmentService.getAppointmentById(appointmentId);
          if (resp.success && resp.data) {
            // Preserve TestPackageId and TestPackageName from fetched data - backend returns both (PascalCase)
            enrichedAppointment = {
              ...enrichedAppointment,
              ...resp.data,
              // Ensure TestPackageId is preserved with all variations
              TestPackageId: resp.data.TestPackageId || resp.data.testPackageId || enrichedAppointment.TestPackageId || enrichedAppointment.testPackageId,
              testPackageId: resp.data.testPackageId || resp.data.TestPackageId || enrichedAppointment.testPackageId || enrichedAppointment.TestPackageId,
              // CRITICAL: Preserve TestPackageName from backend - this is the package name from DB
              TestPackageName: resp.data.TestPackageName || resp.data.testPackageName || enrichedAppointment.TestPackageName || enrichedAppointment.testPackageName,
              testPackageName: resp.data.testPackageName || resp.data.TestPackageName || enrichedAppointment.testPackageName || enrichedAppointment.TestPackageName
            };
            
            // Resolve TestPackageName if missing
            const hasPackageId = enrichedAppointment.TestPackageId || enrichedAppointment.testPackageId;
            const hasPackageName = enrichedAppointment.TestPackageName || enrichedAppointment.testPackageName;
            
            if (hasPackageId && !hasPackageName) {
              try {
                const packageResp = await medicalService.getServiceById(hasPackageId);
                if (packageResp.success && packageResp.data) {
                  const packageData = packageResp.data;
                  const packageName = packageData.PackageName || packageData.packageName || packageData.name || packageData.Name;
                  
                  if (packageName) {
                    enrichedAppointment.TestPackageName = packageName;
                    enrichedAppointment.testPackageName = packageName;
                  } else {
                  }
                } else {
                }
              } catch (packageError) {
              }
            }
          }
        } catch (error) {
        }
      }

      // Try to resolve doctor from shift if available
      const shiftKey = enrichedAppointment.doctorShiftId || enrichedAppointment.DoctorShiftId || enrichedAppointment.shiftId || enrichedAppointment.shift_id;
      if (shiftKey) {
        try {
          const shiftResp = await shiftService.getShiftById(shiftKey);
          
          if (shiftResp.success && shiftResp.data) {
            const shift = shiftResp.data;
            
            // Backend returns PascalCase ShiftDate (DateOnly) and ShiftStart (TimeOnly)
            // Populate appointmentDate from shift
            if (!enrichedAppointment.appointmentDate) {
              const shiftDate = shift.ShiftDate || shift.shiftDate || shift.date || shift.Date;
              
              if (shiftDate) {
                try {
                  // DateOnly is serialized as YYYY-MM-DD string
                  const date = new Date(shiftDate);
                  if (!isNaN(date.getTime())) {
                    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    enrichedAppointment.appointmentDate = formattedDate;
                  } else {
                  }
                } catch (err) {
                }
              } else {
              }
            }
            
            // Populate appointmentTime from shift
            if (!enrichedAppointment.appointmentTime) {
              // TimeOnly is serialized as HH:MM:SS or HH:MM string
              const shiftStart = shift.ShiftStart || shift.shiftStart || shift.start || shift.Start;
              
              if (shiftStart) {
                try {
                  if (typeof shiftStart === 'string') {
                    // Handle TimeOnly format (HH:MM:SS or HH:MM)
                    enrichedAppointment.appointmentTime = shiftStart.substring(0, 5); // Take HH:MM
                  } else {
                    enrichedAppointment.appointmentTime = String(shiftStart).substring(0, 5);
                  }
                } catch (err) {
                }
              } else {
              }
            }
            
            // Get doctor ID from shift
            // Backend returns DoctorId (PascalCase) in DoctorShiftDto
            const doctorId = shift.DoctorId || shift.doctor_id || shift.doctorId || enrichedAppointment.doctorId || enrichedAppointment.doctor_id;
            
            if (doctorId) {
              // Find doctor in doctors list - check multiple field variations
              const doctor = doctors.find(d => {
                const dId = d.id || d.Id || d.doctorId || d.DoctorId;
                return dId === doctorId || 
                       dId === parseInt(doctorId) ||
                       String(dId) === String(doctorId);
              });
              
              if (doctor) {
                enrichedAppointment.resolvedDoctor = doctor;
              } else {
                // Fallback: Use DoctorName from shift if available
                const doctorName = shift.DoctorName || shift.doctorName || shift.doctor_name;
                if (doctorName) {
                  enrichedAppointment.resolvedDoctor = {
                    id: doctorId,
                    fullName: doctorName,
                    name: doctorName
                  };
                }
              }
            }
            // Extract room from shift: prioritize RoomName, fallback to mapped RoomId
            const roomId = shift.RoomId || shift.roomId || shift.room;
            const roomNameFromShift = shift.RoomName || shift.roomName || shift.room;
            
            if (roomNameFromShift) {
              enrichedAppointment.resolvedRoom = roomNameFromShift;
            } else if (roomId) {
              // Map RoomId to room name if available
              // Fallback to RoomId if rooms state is not yet loaded
              const room = rooms.find(r => 
                (r.id || r.Id || r.roomId || r.RoomId) === roomId ||
                String(r.id || r.Id || r.roomId || r.RoomId) === String(roomId)
              );
              if (room) {
                enrichedAppointment.resolvedRoom = room.roomName || room.RoomName || room.name || room.Name || roomId;
              } else {
                enrichedAppointment.resolvedRoom = roomId; // Fallback to RoomId
              }
            }
          }
        } catch (error) {
        }
      }

      // If appointment has direct doctorId, try to find doctor
      const doctorId = enrichedAppointment.DoctorId || enrichedAppointment.doctorId || enrichedAppointment.doctor_id;
      if (doctorId && !enrichedAppointment.resolvedDoctor) {
        const doctor = doctors.find(d => {
          const dId = d.id || d.Id || d.doctorId || d.DoctorId;
          return dId === doctorId || 
                 dId === parseInt(doctorId) ||
                 String(dId) === String(doctorId);
        });
        if (doctor) {
          enrichedAppointment.resolvedDoctor = doctor;
        }
      }

      // Ensure patient info is available
      const appointmentPatientId = enrichedAppointment.patientId || enrichedAppointment.patient_id || enrichedAppointment.createdBy;
      if (appointmentPatientId) {
        let patient = patients.find(p => doesPatientMatchId(p, appointmentPatientId));
        if (!patient) {
          try {
            const resp = await patientService.getPatientById(appointmentPatientId);
            if (resp.success && resp.data) {
              const normalized = normalizePatientRecord(resp.data);
              patient = normalized;
              setPatients(prev => {
                if (prev.some(p => doesPatientMatchId(p, appointmentPatientId))) {
                  return prev;
                }
                return [...prev, normalized];
              });
            }
          } catch (error) {
          }
        }
        if (patient) {
          enrichedAppointment.resolvedPatient = patient;
        }
      }

      setDetailAppointment(enrichedAppointment);
      setShowDetailModal(true);
    } catch (error) {
      setDetailAppointment(appointment);
      setShowDetailModal(true);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setDetailAppointment(null);
    setLabAssignmentInfo(null);
  };

  // Auto-load lab assignment from DB on detail modal open for checked-in appointment
  useEffect(() => {
    if (showDetailModal && detailAppointment && detailAppointment.status === 'checked_in') {
      loadLabAssignmentInfo();
    } else {
      setLabAssignmentInfo(null);
    }
  }, [showDetailModal, detailAppointment]);

  // Load lab assignment details from database
  const loadLabAssignmentInfo = async () => {
    if (!detailAppointment) return;

    setLoadingLabAssignment(true);
    try {
      let assignment = null;
      const currentLabAssignmentId = detailAppointment.labAssignmentId || detailAppointment.LabAssignmentId;
      
      // Method 1: Load directly via existing LabAssignmentId
      if (currentLabAssignmentId) {
        const assignmentResult = await shiftService.getLabAssignmentById(currentLabAssignmentId);
        if (assignmentResult.success && assignmentResult.data) {
          assignment = assignmentResult.data;
        }
      }
      
      // Method 2: Match assignment based on appointment date and time
      if (!assignment) {
        const appointmentDate = detailAppointment.appointmentDate || detailAppointment.appointment_date;
        const appointmentTime = detailAppointment.appointmentTime || detailAppointment.time;
        
        if (appointmentDate && appointmentTime) {
          // Normalize date
          const normalizeDate = (dateValue) => {
            if (!dateValue) return null;
            if (typeof dateValue === 'string') {
              const dateStr = dateValue.split('T')[0];
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
              try {
                const d = new Date(dateValue);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
              } catch (e) { return null; }
            }
            try {
              const d = new Date(dateValue);
              if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            } catch (e) { return null; }
            return null;
          };
          
          // Normalize time to HH:MM format (convert HH:mm:ss to HH:MM)
          const normalizeTime = (timeValue) => {
            if (!timeValue) return null;
            if (typeof timeValue === 'string') {
              // Extract HH:MM from time string (handles both HH:mm and HH:mm:ss)
              const match = timeValue.match(/(\d{1,2}):(\d{2})/);
              if (match) {
                const hours = match[1].padStart(2, '0');
                const minutes = match[2];
                return `${hours}:${minutes}`;
              }
            }
            return null;
          };
          
          // Convert time string to minutes for proper comparison
          const timeToMinutes = (timeStr) => {
            if (!timeStr) return null;
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              return parseInt(match[1]) * 60 + parseInt(match[2]);
            }
            return null;
          };
          
          const targetDate = normalizeDate(appointmentDate);
          const targetTime = normalizeTime(appointmentTime);
          const targetTimeMinutes = timeToMinutes(appointmentTime);
          
          if (targetDate && targetTime) {
            // Retrieve all lab assignments
            const allAssignmentsResult = await shiftService.getAllLabAssignments();
            
            if (allAssignmentsResult.success && allAssignmentsResult.data && Array.isArray(allAssignmentsResult.data)) {
              // Match lab assignment by date and time window
              const matchedAssignment = allAssignmentsResult.data.find(la => {
                const laDate = normalizeDate(la.AssignmentDate || la.assignmentDate || la.assignment_date);
                const laStartRaw = la.ShiftStart || la.shiftStart || la.shift_start;
                const laEndRaw = la.ShiftEnd || la.shiftEnd || la.shift_end;
                const laStart = normalizeTime(laStartRaw);
                const laEnd = normalizeTime(laEndRaw);
                const laStartMinutes = timeToMinutes(laStartRaw);
                const laEndMinutes = timeToMinutes(laEndRaw);
                
                // Match date
                if (laDate !== targetDate) return false;
                
                // Check if appointment time falls within assignment shift interval
                // Compare in minutes for exact boundary checking
                if (laStartMinutes !== null && laEndMinutes !== null && targetTimeMinutes !== null) {
                  const isInRange = targetTimeMinutes >= laStartMinutes && targetTimeMinutes <= laEndMinutes;
                  if (isInRange) {
                    return true;
                  }
                }
                
                // Fallback: match exact time string against shift start
                if (laStart && targetTime && laStart === targetTime) {
                  return true;
                }
                
                return false;
              });
              
              if (matchedAssignment) {
                assignment = matchedAssignment;
              } else {
                // Log nearby lab assignments for diagnostic verification
                const sameDateAssignments = allAssignmentsResult.data.filter(la => {
                  const laDate = normalizeDate(la.AssignmentDate || la.assignmentDate || la.assignment_date);
                  return laDate === targetDate;
                });
              }
            }
          }
        }
      }
      
      // Load complete details for matched assignment
      if (assignment) {
        const labUserId = assignment.labUserId || assignment.LabUserId;
        const labRoomId = assignment.labRoomId || assignment.LabRoomId;

        // Load lab technician user details
        let labUserInfo = null;
        if (labUserId) {
          const usersResult = await testOrderService.getAllLabUserProfiles();
          if (usersResult.success && usersResult.data) {
            labUserInfo = usersResult.data.find(u => {
              const uId = u.userId || u.UserId || u.id || u.Id || u.labUserId || u.LabUserId;
              return uId && String(uId) === String(labUserId);
            });
          }
        }

        // Load lab room details
        let labRoomInfo = null;
        const roomsResult = await testOrderService.getAllLabRooms();
        
        if (labRoomId && roomsResult.success && roomsResult.data) {
          // Resolve room entity via LabRoomId
          labRoomInfo = roomsResult.data.find(r => {
            const rId = r.roomId || r.RoomId || r.id || r.Id || r.labRoomId || r.LabRoomId;
            return rId && String(rId) === String(labRoomId);
          });
        }
        
        // Fallback: resolve room from lab user defaultRoomId
        if (!labRoomInfo && labUserInfo && roomsResult.success && roomsResult.data) {
          const defaultRoomId = labUserInfo.defaultRoomId || labUserInfo.DefaultRoomId;
          if (defaultRoomId) {
            labRoomInfo = roomsResult.data.find(r => {
              const rId = r.roomId || r.RoomId || r.id || r.Id || r.labRoomId || r.LabRoomId;
              return rId && String(rId) === String(defaultRoomId);
            });
          }
        }

        const assignmentId = assignment.AssignmentId || assignment.assignmentId || assignment.id;
        setLabAssignmentInfo({
          assignmentId: assignmentId,
          labUserId: labUserId,
          labRoomId: labRoomId,
          labUser: labUserInfo,
          labRoom: labRoomInfo,
          assignmentDate: assignment.AssignmentDate || assignment.assignmentDate || assignment.assignment_date,
          shiftStart: assignment.ShiftStart || assignment.shiftStart || assignment.shift_start,
          shiftEnd: assignment.ShiftEnd || assignment.shiftEnd || assignment.shift_end
        });
      } else {
        setLabAssignmentInfo(null);
      }
    } catch (error) {
      setLabAssignmentInfo(null);
    } finally {
      setLoadingLabAssignment(false);
    }
  };

  // Print room assignment routing slip
  const handlePrintAppointmentSlip = async () => {
    if (!detailAppointment) return;

    // Ensure lab assignment info is loaded
    if (loadingLabAssignment) {
      showError('Vui lòng đợi hệ thống tải thông tin phân công...');
      return;
    }

    // Retry loading lab assignment if not yet resolved
    if (!labAssignmentInfo) {
      const currentLabAssignmentId = detailAppointment.labAssignmentId || detailAppointment.LabAssignmentId;
      if (currentLabAssignmentId) {
        showError('Vui lòng đợi hệ thống tải thông tin phân công...');
        await loadLabAssignmentInfo();
        // Brief wait for state propagation
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        showError('Lịch hẹn này chưa được phân công lab user. Vui lòng kiểm tra hệ thống phân ca làm việc.');
        return;
      }
    }

    const patient = detailAppointment.resolvedPatient || getPatientInfo(detailAppointment.patientId);
    const packageInfo = getPackageInfo(detailAppointment);
    
    const appointmentDate = detailAppointment.appointmentDate 
      ? new Date(detailAppointment.appointmentDate).toLocaleDateString('vi-VN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';
    const appointmentTime = detailAppointment.appointmentTime || 'N/A';
    const appointmentCode = detailAppointment.appointmentCode || detailAppointment.id || 'N/A';
    const patientName = patient?.fullName || patient?.name || 'N/A';
    const patientPhone = patient?.phone || patient?.Phone || 'N/A';
    const patientEmail = patient?.email || patient?.Email || 'N/A';
    
    // Display lab user and room info using resolved assignment
    const currentLabAssignmentInfo = labAssignmentInfo;
    const labUserName = currentLabAssignmentInfo?.labUser 
      ? (currentLabAssignmentInfo.labUser.fullName || currentLabAssignmentInfo.labUser.FullName || currentLabAssignmentInfo.labUser.name || 'N/A')
      : 'Chưa phân công';
    const labUserJobTitle = currentLabAssignmentInfo?.labUser 
      ? (currentLabAssignmentInfo.labUser.jobTitle || currentLabAssignmentInfo.labUser.JobTitle || 'N/A')
      : '';
    
    // Resolve room name with fallbacks
    let labRoomName = 'Chưa phân phòng';
    if (currentLabAssignmentInfo?.labRoom) {
      labRoomName = currentLabAssignmentInfo.labRoom.roomName 
        || currentLabAssignmentInfo.labRoom.RoomName 
        || currentLabAssignmentInfo.labRoom.name 
        || 'N/A';
    } else if (currentLabAssignmentInfo?.labUser) {
      // Fallback: retrieve from technician defaultRoomId
      const defaultRoomId = currentLabAssignmentInfo.labUser.defaultRoomId || currentLabAssignmentInfo.labUser.DefaultRoomId;
      if (defaultRoomId) {
        // Locate room by defaultRoomId
        const roomsResult = await testOrderService.getAllLabRooms();
        if (roomsResult.success && roomsResult.data) {
          const defaultRoom = roomsResult.data.find(r => {
            const rId = r.roomId || r.RoomId || r.id || r.Id || r.labRoomId || r.LabRoomId;
            return rId && String(rId) === String(defaultRoomId);
          });
          if (defaultRoom) {
            labRoomName = defaultRoom.roomName || defaultRoom.RoomName || defaultRoom.name || 'N/A';
          }
        }
      }
    }
    
    const printHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phiếu chỉ định phòng - ${appointmentCode}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: white;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    .print-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 2px solid #0d6efd;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #0d6efd;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0d6efd;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header .subtitle {
      color: #666;
      font-size: 16px;
      font-weight: 500;
    }
    .info-section {
      margin: 25px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #0d6efd;
    }
    .info-section h3 {
      color: #0d6efd;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-section h3::before {
      content: '';
      width: 4px;
      height: 20px;
      background: #0d6efd;
      border-radius: 2px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 12px;
      margin-top: 10px;
    }
    .info-label {
      font-weight: 600;
      color: #555;
      font-size: 14px;
    }
    .info-value {
      color: #333;
      font-size: 14px;
      font-weight: 500;
    }
    .highlight-box {
      margin: 25px 0;
      padding: 25px;
      background: linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(102, 16, 242, 0.1) 100%);
      border-radius: 12px;
      border: 2px solid #0d6efd;
      text-align: center;
    }
    .highlight-box h4 {
      color: #0d6efd;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 15px;
    }
    .highlight-box .room-info {
      font-size: 24px;
      font-weight: 700;
      color: #198754;
      margin: 10px 0;
    }
    .highlight-box .lab-user-info {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 10px 0;
    }
    .instructions {
      margin: 25px 0;
      padding: 20px;
      background: #fff3cd;
      border-radius: 8px;
      border-left: 4px solid #ffc107;
    }
    .instructions h4 {
      color: #856404;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .instructions ol {
      margin-left: 20px;
      color: #856404;
      font-size: 14px;
    }
    .instructions li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .footer strong {
      color: #0d6efd;
    }
    .print-date {
      text-align: right;
      color: #999;
      font-size: 12px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="print-date">
      In ngày: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}
    </div>
    <div class="header">
      <h1>PHIẾU CHỈ ĐỊNH PHÒNG</h1>
      <div class="subtitle">Hệ thống quản lý phòng xét nghiệm</div>
    </div>

    <div class="info-section">
      <h3>Thông tin lịch hẹn</h3>
      <div class="info-grid">
        <div class="info-label">Mã lịch hẹn:</div>
        <div class="info-value"><strong>${appointmentCode}</strong></div>
        <div class="info-label">Ngày giờ:</div>
        <div class="info-value">${appointmentDate} - ${appointmentTime}</div>
        <div class="info-label">Gói dịch vụ:</div>
        <div class="info-value">${packageInfo.name || 'N/A'}</div>
      </div>
    </div>

    <div class="info-section">
      <h3>Thông tin bệnh nhân</h3>
      <div class="info-grid">
        <div class="info-label">Họ và tên:</div>
        <div class="info-value"><strong>${patientName}</strong></div>
        <div class="info-label">Số điện thoại:</div>
        <div class="info-value">${patientPhone}</div>
        <div class="info-label">Email:</div>
        <div class="info-value">${patientEmail}</div>
      </div>
    </div>

    <div class="highlight-box">
      <h4>📍 THÔNG TIN PHÒNG VÀ KỸ THUẬT VIÊN</h4>
      <div class="room-info">
        <i class="fas fa-door-open"></i> Phòng: ${labRoomName}
      </div>
      <div class="lab-user-info">
        <i class="fas fa-user-md"></i> ${labUserName}
      </div>
    </div>

    <div class="instructions">
      <h4>📋 Hướng dẫn:</h4>
      <ol>
        <li>Vui lòng đến đúng phòng được chỉ định ở trên</li>
        <li>Xuất trình mã lịch hẹn: <strong>${appointmentCode}</strong></li>
        <li>Liên hệ với kỹ thuật viên được phân công để thực hiện lấy mẫu</li>
        <li>Vui lòng có mặt đúng giờ hẹn: <strong>${appointmentTime}</strong></li>
      </ol>
    </div>

    <div class="footer">
      <p><strong>Lưu ý:</strong> Phiếu này chỉ có hiệu lực cho lịch hẹn ${appointmentCode}</p>
      <p>Mọi thắc mắc vui lòng liên hệ: <strong>0123456789</strong></p>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const getAppointmentCode = (appointment) => {
    return appointment?.appointmentCode || appointment?.code || appointment?.id || '';
  };

  // Generate QR code data in the same format as patient side (JSON format)
  const generateQRCodeData = (appointment) => {
    const appointmentCode = getAppointmentCode(appointment);
    const patient = getPatientInfo(appointment?.patientId);
    
    return JSON.stringify({
      t: 'checkin', // type
      c: appointmentCode, // code - this is what scanner looks for
      id: appointment?.id || '', // appointment ID
      n: appointment?.patientName || patient?.fullName || patient?.name || '', // patient name
      s: appointment?.service || '', // Service or test package name
      d: appointment?.appointmentDate || '', // date (YYYY-MM-DD)
      tm: appointment?.appointmentTime || appointment?.time || '' // time (HH:MM)
    });
  };

  const getPatientInfo = (patientId) => {
    return patients.find(p => doesPatientMatchId(p, patientId)) || null;
  };

  const getPackageInfo = (appointment) => {
    // Backend now returns TestPackageName (PascalCase) in AppointmentReadDto
    // If TestPackageName is available, use it directly (no need to match)
    const testPackageName = appointment?.TestPackageName || appointment?.testPackageName || appointment?.test_package_name || null;
    
    if (testPackageName) {
      // Try to find package in testPackages to get price
      const pkgId = appointment?.TestPackageId || appointment?.testPackageId || appointment?.test_package_id || null;
      let matchedPkg = null;
      if (pkgId) {
        matchedPkg = testPackages.find(p => {
          const pId = p.PackageId || p.packageId || p.id || p.Id || p.serviceId || p.ServiceId;
          return pId && String(pId) === String(pkgId);
        });
      }
      
      const price = matchedPkg ? (matchedPkg.Price || matchedPkg.price || matchedPkg.servicePrice || matchedPkg.packagePrice || matchedPkg.amount || null) : null;
      return { name: testPackageName, price, package: matchedPkg };
    }
    
    // Fallback: Try to match by ID if TestPackageName is not available
    // Backend returns TestPackageId (PascalCase) in AppointmentReadDto
    // normalizeAppointment preserves both TestPackageId (PascalCase) and testPackageId (camelCase)
    const pkgId = appointment?.TestPackageId || appointment?.testPackageId || appointment?.test_package_id || appointment?.packageId || appointment?.package_id || null;
    const pkgCode = appointment?.testPackageCode || appointment?.test_package_code || appointment?.package_code || appointment?.packageCode || null;
    
    if (!pkgId && !pkgCode) {
      // Fallback: Try to find package from other sources
      
      // Try to find package by name if service name is available
      if (appointment?.serviceName || appointment?.service) {
        const serviceName = appointment?.serviceName || appointment?.service;
        const matchedByName = testPackages.find(p => {
          const pName = p.PackageName || p.packageName || p.name || p.Name || p.serviceName || p.ServiceName;
          return pName && String(pName).toLowerCase() === String(serviceName).toLowerCase();
        });
        
        if (matchedByName) {
          const price = matchedByName.Price || matchedByName.price || matchedByName.servicePrice || matchedByName.packagePrice || matchedByName.amount || null;
          return { 
            name: matchedByName.PackageName || matchedByName.packageName || matchedByName.name || serviceName, 
            price, 
            package: matchedByName 
          };
        }
      }
      
      // Final fallback: Try to find package from TestResults if available
      // Note: This is a workaround for appointments that don't have TestPackageId in DB
      // The proper solution is to update the database to set TestPackageId for old appointments
      if (appointment?.id || appointment?.appointmentId || appointment?.AppointmentId) {
        try {
          // Try to fetch test results to see if we can infer package
          // This is async, so we'll need to handle it differently
          // For now, just log a warning
        } catch (err) {
          // Ignore errors in fallback
        }
      }
      
      // Final fallback
      const service = appointment?.service || appointment?.serviceName || '';
      return { 
        name: service || 'Chưa xác định (Appointment không có TestPackageId trong database. Vui lòng cập nhật database để hiển thị tên gói dịch vụ.)', 
        price: null, 
        package: null 
      };
    }

    // Backend returns PackageId (PascalCase) and PackageName (PascalCase) in TestPackageDto
    // Database uses package_id like P001, P002, etc.
    // Try to match by ID first (most reliable)
    let matchedPkg = null;
    
    if (pkgId) {
      matchedPkg = testPackages.find(p => {
        // Backend returns PackageId (PascalCase) - this is the primary field
        const pId = p.PackageId || p.packageId || p.id || p.Id || p.serviceId || p.ServiceId;
        // Match by exact string comparison (case-insensitive for safety)
        const idMatch = pId && String(pId).toLowerCase() === String(pkgId).toLowerCase();
        
        return idMatch;
      });
    }
    
    // If not found by ID, try by code
    if (!matchedPkg && pkgCode) {
      matchedPkg = testPackages.find(p => {
        const pCode = p.code || p.Code || p.serviceCode || p.ServiceCode || p.packageCode || p.PackageCode;
        const codeMatch = pCode && String(pCode).toLowerCase() === String(pkgCode).toLowerCase();
        return codeMatch;
      });
    }

    if (!matchedPkg) {
      return { name: appointment?.service || 'Chưa xác định', price: null, package: null };
    }

    // Backend returns PackageName (PascalCase) and Price (PascalCase)
    const price = matchedPkg.Price || matchedPkg.price || matchedPkg.servicePrice || matchedPkg.packagePrice || matchedPkg.amount || null;
    const name = matchedPkg.PackageName || matchedPkg.packageName || matchedPkg.name || matchedPkg.serviceName || matchedPkg.packageName || matchedPkg.title || appointment?.service || 'Chưa xác định';

    return { name, price, package: matchedPkg };
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @media (max-width: 767px) {
            body, html {
              overflow-x: hidden !important;
              max-width: 100vw !important;
              width: 100% !important;
            }
            .container-fluid {
              overflow-x: hidden !important;
              max-width: 100vw !important;
              width: 100% !important;
              padding-left: 0.5rem !important;
              padding-right: 0.5rem !important;
            }
            .table-responsive {
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
              max-width: 100% !important;
            }
          }
        `}
      </style>
      <div className="container-fluid" style={{ 
        padding: isMobile ? '0.5rem' : '1.5rem', 
        overflowX: 'hidden', 
        maxWidth: '100%',
        width: '100%',
        margin: 0,
        boxSizing: 'border-box'
      }}>
      {/* Quick Check-in QR Button */}
      <Card className="mb-4 shadow-sm border-primary">
        <Card.Body className="py-5 text-center">
          <h3 className="mb-3 text-primary fw-bold">
            <i className="fas fa-qrcode me-2"></i>
            Check-in bệnh nhân
          </h3>
          <p className="text-muted mb-4" style={{ fontSize: '1.1rem' }}>
            Quét mã QR hoặc nhập mã thủ công để lấy số thứ tự tự động.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleOpenQuickQRModal('camera')}
            className="px-5 py-3 fw-bold shadow"
            style={{ borderRadius: '50px', fontSize: '1.2rem', transition: 'all 0.3s ease' }}
          >
            <i className="fas fa-camera me-2"></i>
            Mở máy quét QR / Nhập mã
          </Button>
        </Card.Body>
      </Card>

      {/* Search filter for check-in queue */}
      <Card className="mb-4 shadow-sm" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Card.Body className="py-4" style={{ padding: isMobile ? '1rem' : '1.5rem', width: '100%', boxSizing: 'border-box' }}>
          <Row className="justify-content-center">
            <Col xs={12} md={10}>
              <Row>
                <Col xs={12}>
                  <Form.Label className="fw-bold" style={{ fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
                    <i className="fas fa-search me-2"></i>
                    {isMobile ? 'Tìm kiếm' : 'Tìm kiếm lịch hẹn cần check-in'}
                  </Form.Label>
                  <InputGroup size={isMobile ? 'md' : 'lg'}>
                    <InputGroup.Text>
                      <i className="fas fa-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={isMobile ? 'Tìm kiếm...' : 'Tìm theo tên bệnh nhân, mã lịch hẹn...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ fontSize: isMobile ? '0.9rem' : '1.05rem' }}
                    />
                  </InputGroup>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Check-in Appointments Queue Table */}
      <Card className="mb-4 shadow-sm" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Card.Header className="bg-primary text-white py-3" style={{ padding: isMobile ? '0.75rem' : '1rem', width: '100%', boxSizing: 'border-box' }}>
          <h4 className="mb-0 text-center fw-bold" style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
            <i className="fas fa-calendar-check me-2"></i>
            {isMobile ? 'Lịch hẹn cần check-in' : 'Lịch hẹn cần check-in'}
          </h4>
        </Card.Header>
        <Card.Body className="p-4" style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
          {(() => {
            return null;
          })()}
          {filteredAppointments.length > 0 ? (
            <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table hover className="align-middle" style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', minWidth: isMobile ? '600px' : 'auto' }}>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {isMobile ? 'Bệnh nhân' : 'Bệnh nhân'}
                    </th>
                    <th className="text-center d-none d-md-table-cell" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Ngày hẹn
                    </th>
                    <th className="text-center" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Giờ hẹn
                    </th>
                    <th className="text-center d-none d-sm-table-cell" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Trạng thái
                    </th>
                    <th className="text-center" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt) => {
                    const appointmentCode = getAppointmentCode(apt);
                    return (
                      <tr key={apt.id}>
                        <td className="text-center" style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                          {getPatientName(apt.patientId)}
                        </td>
                        <td className="text-center d-none d-md-table-cell" style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', whiteSpace: 'nowrap' }}>
                          {(() => {
                            // Extract date across entity property variations
                            const dateStr = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate || apt.date || apt.Date;
                            if (dateStr) {
                              try {
                                const date = new Date(dateStr);
                                if (!isNaN(date.getTime())) {
                                  // Standard date format: dd/MM/yyyy
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const year = date.getFullYear();
                                  return `${day}/${month}/${year}`;
                                }
                              } catch (err) {
                              }
                            }
                            return 'N/A';
                          })()}
                        </td>
                        <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', fontWeight: '500' }}>
                            {apt.appointmentTime || apt.appointment_time || apt.AppointmentTime || apt.time || apt.Time || 'N/A'}
                          </div>
                          {!isMobile && (
                            <Badge bg={getTimeStatus(apt).color} className="mt-2" style={{ fontSize: '0.9rem' }}>
                              <i className="fas fa-clock me-1"></i>
                              {getTimeStatus(apt).message}
                            </Badge>
                          )}
                        </td>
                        <td className="text-center d-none d-sm-table-cell">{getStatusBadge(apt.status)}</td>
                        <td className="text-center">
                          <div className={`d-flex ${isMobile ? 'flex-column gap-1' : 'justify-content-center gap-2'}`}>
                            <Button
                              variant="primary"
                              size={isMobile ? 'sm' : 'lg'}
                              onClick={() => handleDirectCheckIn(apt)}
                              style={{ 
                                fontSize: isMobile ? '0.8rem' : '1rem', 
                                padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem',
                                whiteSpace: 'nowrap'
                              }}
                              disabled={!['scheduled', 'confirmed'].includes(apt.status) || apt.status === 'checked_in'}
                            >
                              <i className={`fas fa-check-circle ${isMobile ? '' : 'me-2'}`}></i>
                              {isMobile ? 'Check-in' : 'Check-in'}
                            </Button>
                            <Button
                              variant="info"
                              size={isMobile ? 'sm' : 'lg'}
                              onClick={() => handleViewDetail(apt)}
                              style={{ 
                                fontSize: isMobile ? '0.8rem' : '1rem', 
                                padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <i className={`fas fa-eye ${isMobile ? '' : 'me-2'}`}></i>
                              {isMobile ? 'Chi tiết' : 'Chi tiết'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-calendar-times text-muted" style={{ fontSize: isMobile ? '3rem' : '4rem' }}></i>
              <h4 className="text-muted mt-3 fw-bold" style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>Không có lịch hẹn nào cần check-in</h4>
              <p className="text-muted" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }}>Tất cả lịch hẹn đã được xử lý</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Checked-in Patients List */}
      <Card className="shadow-sm" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Card.Header className={`bg-success text-white ${isMobile ? 'flex-column' : 'd-flex justify-content-between'} align-items-center py-3`} style={{ padding: isMobile ? '0.75rem' : '1rem', width: '100%', boxSizing: 'border-box' }}>
          <h4 className="mb-0 fw-bold" style={{ fontSize: isMobile ? '1rem' : '1.25rem', marginBottom: isMobile ? '0.5rem' : '0' }}>
            <i className="fas fa-user-check me-2"></i>
            {isMobile ? `Đã check-in (${checkedInAppointments.length})` : `Danh sách bệnh nhân đã check-in (${checkedInAppointments.length})`}
          </h4>
          <div className={isMobile ? 'd-flex gap-2 w-100 mt-2' : ''}>
            <Button
              variant="light"
              size={isMobile ? 'sm' : 'lg'}
              className={isMobile ? 'flex-fill' : 'me-2'}
              onClick={handleExportCheckedIn}
              disabled={checkedInAppointments.length === 0}
              style={{ 
                fontSize: isMobile ? '0.8rem' : '1rem', 
                padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem',
                whiteSpace: 'nowrap'
              }}
            >
              <i className={`fas fa-file-csv ${isMobile ? '' : 'me-2'}`}></i>
              {isMobile ? 'CSV' : 'Xuất CSV'}
            </Button>
            <Button
              variant="light"
              size={isMobile ? 'sm' : 'lg'}
              className={isMobile ? 'flex-fill' : ''}
              onClick={handlePrintCheckedIn}
              disabled={checkedInAppointments.length === 0}
              style={{ 
                fontSize: isMobile ? '0.8rem' : '1rem', 
                padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem',
                whiteSpace: 'nowrap'
              }}
            >
              <i className={`fas fa-print ${isMobile ? '' : 'me-2'}`}></i>
              {isMobile ? 'In' : 'In danh sách'}
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-4" style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
          {checkedInAppointments.length > 0 ? (
            <div className="table-responsive" style={{ 
              overflowX: 'auto', 
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
              width: '100%'
            }}>
              <Table hover striped className="align-middle" style={{ 
                fontSize: isMobile ? '0.85rem' : '1.05rem', 
                minWidth: isMobile ? '600px' : 'auto',
                width: '100%',
                tableLayout: 'auto'
              }}>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Bệnh nhân
                    </th>
                    <th className="text-center d-none d-md-table-cell" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Ngày hẹn
                    </th>
                    <th className="text-center" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Giờ hẹn
                    </th>
                    <th className="text-center d-none d-sm-table-cell" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Trạng thái
                    </th>
                    <th className="text-center" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checkedInAppointments.map((apt) => {
                    const appointmentCode = getAppointmentCode(apt);
                    return (
                      <tr key={apt.id}>
                        <td className="text-center" style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                          {getPatientName(apt.patientId)}
                        </td>
                        <td className="text-center d-none d-md-table-cell" style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', whiteSpace: 'nowrap' }}>
                          {(() => {
                            // Extract date across entity property variations
                            const dateStr = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate || apt.date || apt.Date;
                            if (dateStr) {
                              try {
                                const date = new Date(dateStr);
                                if (!isNaN(date.getTime())) {
                                  // Standard date format: dd/MM/yyyy
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const year = date.getFullYear();
                                  return `${day}/${month}/${year}`;
                                }
                              } catch (err) {
                              }
                            }
                            return 'N/A';
                          })()}
                        </td>
                        <td className="text-center" style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', whiteSpace: 'nowrap' }}>
                          {apt.appointmentTime || apt.appointment_time || apt.AppointmentTime || apt.time || apt.Time || 'N/A'}
                        </td>
                        <td className="text-center d-none d-sm-table-cell" style={{ fontSize: isMobile ? '0.85rem' : '1.05rem' }}>
                          {getStatusBadge(apt.status || apt.Status)}
                        </td>
                        <td className="text-center">
                          <Button
                            variant="info"
                            size={isMobile ? 'sm' : 'lg'}
                            onClick={() => handleViewDetail(apt)}
                            style={{ 
                              fontSize: isMobile ? '0.8rem' : '1rem', 
                              padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <i className={`fas fa-eye ${isMobile ? '' : 'me-2'}`}></i>
                            {isMobile ? 'Chi tiết' : 'Chi tiết'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-user-times text-muted" style={{ fontSize: isMobile ? '3rem' : '4rem' }}></i>
              <h4 className="text-muted mt-3 fw-bold" style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>Chưa có bệnh nhân nào check-in</h4>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Quick QR Code Check-in Modal */}
      <Modal 
        show={showQuickQRModal} 
        onHide={handleCloseQuickQRModal} 
        onEntered={() => {
          // Ensure modal is fully mounted before camera initialization
          // Component auto-initializes when isModalOpen is true
        }}
        onExited={() => {
          // Reset state when modal is dismissed
        }}
        size={isMobile ? undefined : "lg"} 
        fullscreen={isMobile}
        centered={!isMobile}
      >
        <Modal.Header closeButton className="bg-primary text-white" style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
          <Modal.Title style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
            <i className="fas fa-qrcode me-2"></i>
            {isMobile ? 'Check-in QR' : 'Check-in nhanh bằng QR Code'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
          <QuickCheckInScan
            receptionistId={user?.id}
            onSuccess={handleQuickCheckInSuccess}
            isModalOpen={showQuickQRModal}
            initialMode={quickScanMode}
            initialManualCode={mainPageManualCode}
          />
        </Modal.Body>
        <Modal.Footer style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
          <Button variant="secondary" onClick={handleCloseQuickQRModal} size={isMobile ? 'sm' : undefined}>
            <i className={`fas fa-times ${isMobile ? '' : 'me-2'}`}></i>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Appointment Detail Modal */}
      <Modal 
        show={showDetailModal} 
        onHide={handleCloseDetailModal} 
        size={isMobile ? undefined : "xl"} 
        fullscreen={isMobile}
        centered={!isMobile}
      >
        <Modal.Header closeButton className="bg-info text-white" style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
          <Modal.Title style={{ fontSize: isMobile ? '1rem' : '1.5rem', fontWeight: 'bold' }}>
            <i className="fas fa-info-circle me-2"></i>
            {isMobile ? 'Chi tiết' : 'Chi tiết lịch hẹn'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', padding: isMobile ? '0.5rem' : '1rem' }}>
          {detailAppointment && (() => {
            const patient = detailAppointment.resolvedPatient || getPatientInfo(detailAppointment.patientId);
            const appointmentCode = getAppointmentCode(detailAppointment);
            return (
              <div>
                <Row className="mb-4">
                  <Col xs={12} md={6} className={isMobile ? 'mb-3' : ''}>
                    <Card className="h-100 shadow-sm">
                      <Card.Header className="bg-light" style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
                        <h5 className="mb-0 fw-bold" style={{ fontSize: isMobile ? '0.95rem' : '1.25rem' }}>
                          <i className="fas fa-qrcode me-2"></i>
                          QR Code
                        </h5>
                      </Card.Header>
                      <Card.Body className="text-center" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                        <QRCodeSVG 
                          value={generateQRCodeData(detailAppointment)} 
                          size={isMobile ? 200 : 250}
                          level="H"
                          includeMargin={true}
                        />
                        <div className="mt-3">
                          <code style={{ fontSize: isMobile ? '1rem' : '1.3rem', fontWeight: 'bold' }}>
                            {appointmentCode}
                          </code>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card className="h-100 shadow-sm">
                      <Card.Header className="bg-light" style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
                        <h5 className="mb-0 fw-bold" style={{ fontSize: isMobile ? '0.95rem' : '1.25rem' }}>
                          <i className="fas fa-calendar-alt me-2"></i>
                          Thông tin lịch hẹn
                        </h5>
                      </Card.Header>
                      <Card.Body style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                        <table className="table table-borderless">
                          <tbody>
                            <tr>
                              <td style={{ width: isMobile ? '50%' : '40%', fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Mã lịch hẹn:</td>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}><code>{appointmentCode}</code></td>
                            </tr>
                            <tr>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Ngày hẹn:</td>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>
                                {detailAppointment.appointmentDate 
                                  ? new Date(detailAppointment.appointmentDate).toLocaleDateString('vi-VN', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Giờ hẹn:</td>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: '500' }}>
                                {detailAppointment.appointmentTime || detailAppointment.time || 'N/A'}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Phòng khám:</td>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>
                                {detailAppointment.resolvedRoom || detailAppointment.room || detailAppointment.roomName ? (
                                  <Badge bg="info" style={{ fontSize: isMobile ? '0.85rem' : '1rem', padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem' }}>
                                    <i className="fas fa-door-open me-1"></i>
                                    {detailAppointment.resolvedRoom || detailAppointment.room || detailAppointment.roomName}
                                  </Badge>
                                ) : (
                                  <span className="text-muted fst-italic">Chưa phân bổ phòng</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Bác sĩ phụ trách:</td>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>
                                {detailAppointment.resolvedDoctor ? (
                                  <Badge bg="success" style={{ fontSize: isMobile ? '0.85rem' : '1rem', padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem' }}>
                                    <i className="fas fa-user-md me-1"></i>
                                    {detailAppointment.resolvedDoctor.fullName || detailAppointment.resolvedDoctor.name || 'N/A'}
                                  </Badge>
                                ) : detailAppointment.doctorId ? (
                                  <span className="text-muted">ID: {detailAppointment.doctorId}</span>
                                ) : (
                                  <span className="text-muted fst-italic">Chưa phân công bác sĩ</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Trạng thái:</td>
                              <td>{getStatusBadge(detailAppointment.status)}</td>
                            </tr>
                            {detailAppointment.checkedInAt && (
                              <>
                                <tr>
                                  <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Thời gian check-in:</td>
                                  <td>
                                    <Badge bg="success" style={{ fontSize: isMobile ? '0.85rem' : '1rem', padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem' }}>
                                      <i className="fas fa-check-circle me-1"></i>
                                      {new Date(detailAppointment.checkedInAt).toLocaleString('vi-VN')}
                                    </Badge>
                                  </td>
                                </tr>
                                {detailAppointment.checkedInBy && (
                                  <tr>
                                    <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Người check-in:</td>
                                    <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>
                                      {detailAppointment.checkedInByRole === 'receptionist' 
                                        ? 'Lễ tân' 
                                        : detailAppointment.checkedInByRole || 'N/A'} (ID: {detailAppointment.checkedInBy})
                                    </td>
                                  </tr>
                                )}
                              </>
                            )}
                          </tbody>
                        </table>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card className="mb-3 shadow-sm">
                  <Card.Header className="bg-light" style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
                    <h5 className="mb-0 fw-bold" style={{ fontSize: isMobile ? '0.95rem' : '1.25rem' }}>
                      <i className="fas fa-user me-2"></i>
                      Thông tin bệnh nhân
                    </h5>
                  </Card.Header>
                  <Card.Body style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                    {patient ? (
                      <Row>
                        <Col xs={12} md={6} className={isMobile ? 'mb-3' : ''}>
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td style={{ width: isMobile ? '50%' : '40%', fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Họ và tên:</td>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>{patient.fullName || patient.name || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Số điện thoại:</td>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>{patient.phone || patient.phoneNumber || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Email:</td>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>{patient.email || 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </Col>
                        <Col xs={12} md={6}>
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td style={{ width: isMobile ? '50%' : '40%', fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Ngày sinh:</td>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>
                                  {(() => {
                                    const dob = patient.dateOfBirth || patient.Dob || patient.dob || patient.DateOfBirth || patient.DOB;
                                    if (dob) {
                                      try {
                                        const date = new Date(dob);
                                        if (!isNaN(date.getTime())) {
                                          return date.toLocaleDateString('vi-VN');
                                        }
                                      } catch (err) {
                                      }
                                    }
                                    return 'N/A';
                                  })()}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Giới tính:</td>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>
                                  {(() => {
                                    const gender = patient.gender || patient.Gender || patient.sex || patient.Sex;
                                    if (gender) {
                                      const genderLower = String(gender).toLowerCase();
                                      if (genderLower === 'male' || genderLower === 'nam' || genderLower === 'm') return 'Nam';
                                      if (genderLower === 'female' || genderLower === 'nữ' || genderLower === 'f') return 'Nữ';
                                      return gender;
                                    }
                                    return 'N/A';
                                  })()}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Địa chỉ:</td>
                                <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>
                                  {patient.address || patient.Address || patient.addressLine || patient.AddressLine || 'N/A'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Col>
                      </Row>
                    ) : (
                      <Alert variant="warning" style={{ fontSize: '1.1rem' }}>
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Không tìm thấy thông tin bệnh nhân
                      </Alert>
                    )}
                  </Card.Body>
                </Card>

                {/* Test Package / Service */}
                <Card className="mb-3 shadow-sm">
                  <Card.Header className="bg-light" style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
                    <h5 className="mb-0 fw-bold" style={{ fontSize: isMobile ? '0.95rem' : '1.25rem' }}>
                      <i className="fas fa-box me-2"></i>
                      Gói dịch vụ đã đặt
                    </h5>
                  </Card.Header>
                  <Card.Body style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                    {(() => {
                      const packageInfo = getPackageInfo(detailAppointment);
                      return (
                        <div>
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td style={{ width: isMobile ? '50%' : '40%', fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Tên gói dịch vụ:</td>
                                <td>
                                  <Badge bg="primary" className="me-2" style={{ fontSize: isMobile ? '0.85rem' : '1rem', padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem' }}>
                                    <i className="fas fa-cube me-1"></i>
                                    {packageInfo.name}
                                  </Badge>
                                </td>
                              </tr>
                              {packageInfo.price && (
                                <tr>
                                  <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Giá:</td>
                                  <td>
                                    <strong className="text-success" style={{ fontSize: isMobile ? '1rem' : '1.2rem' }}>
                                      {new Intl.NumberFormat('vi-VN', { 
                                        style: 'currency', 
                                        currency: 'VND' 
                                      }).format(packageInfo.price)}
                                    </strong>
                                  </td>
                                </tr>
                              )}
                              {packageInfo.package && packageInfo.package.description && (
                                <tr>
                                  <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 'bold' }}>Mô tả:</td>
                                  <td style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>{packageInfo.package.description}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </Card.Body>
                </Card>

                {detailAppointment.notes && (
                  <Card className="shadow-sm">
                    <Card.Header className="bg-light" style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
                      <h5 className="mb-0 fw-bold" style={{ fontSize: isMobile ? '0.95rem' : '1.25rem' }}>
                        <i className="fas fa-sticky-note me-2"></i>
                        Ghi chú
                      </h5>
                    </Card.Header>
                    <Card.Body style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                      <p className="mb-0" style={{ fontSize: isMobile ? '0.9rem' : '1.15rem' }}>{detailAppointment.notes}</p>
                    </Card.Body>
                  </Card>
                )}

                {/* Assigned Lab Technician Info - Displayed when checked-in */}
                {detailAppointment.status === 'checked_in' && (
                  <Card className="shadow-sm border-primary">
                    <Card.Header className="bg-primary text-white">
                      <h5 className="mb-0 fw-bold">
                        <i className="fas fa-user-md me-2"></i>
                        Thông tin Lab User được phân công
                      </h5>
                    </Card.Header>
                    <Card.Body className="p-4">
                      {loadingLabAssignment ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" variant="primary" className="me-2" />
                          <span style={{ fontSize: '1.1rem' }}>Đang tải thông tin phân công...</span>
                        </div>
                      ) : labAssignmentInfo ? (
                        <div>
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td style={{ width: '40%', fontSize: '1.15rem', fontWeight: 'bold' }}>Lab User:</td>
                                <td style={{ fontSize: '1.15rem' }}>
                                  <Badge bg="info" className="me-2" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                    <i className="fas fa-user-md me-1"></i>
                                    {labAssignmentInfo.labUser 
                                      ? (labAssignmentInfo.labUser.fullName || labAssignmentInfo.labUser.FullName || labAssignmentInfo.labUser.name || 'N/A')
                                      : 'Chưa phân công'}
                                  </Badge>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>Phòng:</td>
                                <td style={{ fontSize: '1.15rem' }}>
                                  <Badge bg="success" className="me-2" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                    <i className="fas fa-door-open me-1"></i>
                                    {labAssignmentInfo.labRoom
                                      ? (labAssignmentInfo.labRoom.roomName || labAssignmentInfo.labRoom.RoomName || labAssignmentInfo.labRoom.name || 'N/A')
                                      : 'Chưa phân phòng'}
                                  </Badge>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>Assignment ID:</td>
                                <td style={{ fontSize: '1.15rem', fontFamily: 'monospace' }}>
                                  {labAssignmentInfo.assignmentId}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <Alert variant="info" style={{ fontSize: '1rem', marginTop: '1rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Thông tin phân công được tự động load từ hệ thống phân ca làm việc
                          </Alert>
                        </div>
                      ) : (
                        <Alert variant="warning" style={{ fontSize: '1rem' }}>
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Lịch hẹn này chưa được phân công lab user. Vui lòng kiểm tra lại hệ thống phân ca làm việc.
                        </Alert>
                      )}
                    </Card.Body>
                  </Card>
                )}
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="py-3">
          <Button 
            variant="secondary" 
            onClick={handleCloseDetailModal}
            size="lg"
            style={{ fontSize: '1.1rem', padding: '0.6rem 1.5rem' }}
          >
            <i className="fas fa-times me-2"></i>
            Đóng
          </Button>
          {detailAppointment && detailAppointment.status === 'checked_in' && (
            <Button 
              variant="primary" 
              onClick={handlePrintAppointmentSlip}
              size="lg"
              style={{ fontSize: '1.1rem', padding: '0.6rem 1.5rem' }}
            >
              <i className="fas fa-print me-2"></i>
              In phiếu chỉ định phòng
            </Button>
          )}
          {detailAppointment && ['scheduled', 'confirmed'].includes(detailAppointment.status) && (
            <Button 
              variant="primary" 
              onClick={() => {
                handleCloseDetailModal();
                handleDirectCheckIn(detailAppointment);
              }}
              size="lg"
              style={{ fontSize: '1.1rem', padding: '0.6rem 1.5rem' }}
            >
              <i className="fas fa-check-circle me-2"></i>
              Check-in ngay
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
    </>
  );
};

export default ReceptionistCheckIn;

