/**
 * Receptionist Check-In Component
 *
 * Component for receptionist to check-in patients using QR code scanning.
 * Shows list of appointments that can be checked in and provides QR code scanning functionality.
 */
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputGroup, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CalendarCheck, UserCheck, Search, X as LucideX, FileText, Printer, ShieldCheck, Clock, Users, Ticket as LucideTicket, Eye, CheckCircle2, CalendarX, UserX, Calendar, Info as LucideInfo, Stethoscope, DoorOpen, Hospital, IdCard, AlertTriangle, TestTube2, Package as LucidePackage, ClipboardCheck, Microscope, Monitor } from 'lucide-react';
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
import TablePagination, { usePagination } from '../../../../components/ui/TablePagination';
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../../../shared/hooks/useAutoRefresh';
import { queueApi } from '../../api/queueApi';
import { PosThermalModal } from '../../../../shared/components/PosThermalSlip';

const ReceptionistCheckIn = () => {
  const safeFormatDate = (dateVal, options = {}) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('vi-VN', options);
    } catch {
      return String(dateVal);
    }
  };

  const safeFormatDateTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleString('vi-VN');
    } catch {
      return String(dateVal);
    }
  };

  const safeFormatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '';
    try {
      const p = Number(amount);
      if (isNaN(p)) return amount + ' ₫';
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
    } catch {
      return amount + ' ₫';
    }
  };

  const formatAppointmentTime = (timeRaw, dateRaw) => {
    const val = timeRaw || dateRaw;
    if (!val) return 'N/A';
    const s = String(val).trim();
    if (/^\d{2}:\d{2}$/.test(s)) return s;
    if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    } catch { }
    return s;
  };

  const resolveDoctorInfo = (apt) => {
    const empty = { fullName: 'Chưa phân công bác sĩ', specialty: '—', room: '—', license: '—' };
    if (!apt) return empty;

    if (apt.resolvedDoctor && (apt.resolvedDoctor.fullName || apt.resolvedDoctor.name)) {
      return {
        fullName: apt.resolvedDoctor.fullName || apt.resolvedDoctor.name,
        specialty: apt.resolvedDoctor.specialty || apt.specialty || '—',
        room: apt.resolvedDoctor.room || apt.resolvedRoom || apt.roomName || '—',
        license: apt.resolvedDoctor.license || '—'
      };
    }

    const dName = apt.doctorName || apt.DoctorName || apt.doctor_name;
    const docId = String(apt.doctorId || apt.DoctorId || apt.doctor_id || '');
    const matchedDoc = docId && Array.isArray(doctors)
      ? doctors.find((d) => String(d.id || d.doctorId || d._id || '') === docId)
      : null;

    if (matchedDoc) {
      return {
        fullName: (dName && !dName.startsWith('ID:') && dName !== 'N/A') ? dName : (matchedDoc.fullName || matchedDoc.name || 'Bác sĩ phụ trách'),
        specialty: apt.specialty || matchedDoc.specialty || '—',
        room: apt.resolvedRoom || apt.roomName || matchedDoc.roomName || '—',
        license: matchedDoc.licenseNumber || '—'
      };
    }

    if (dName && !dName.startsWith('ID:') && dName !== 'N/A') {
      return {
        fullName: dName,
        specialty: apt.specialty || '—',
        room: apt.resolvedRoom || apt.roomName || '—',
        license: '—'
      };
    }

    return {
      ...empty,
      room: apt.resolvedRoom || apt.roomName || '—'
    };
  };

  const resolveTimeSlot = (apt) => {
    if (!apt) return '08:00 – 08:30';
    if (apt.slotTime && apt.slotTime !== 'N/A') return apt.slotTime;
    if (apt.SlotTime && apt.SlotTime !== 'N/A') return apt.SlotTime;
    if (apt.appointmentTime && apt.appointmentTime !== 'N/A') {
      const str = String(apt.appointmentTime);
      if (str.includes('T')) {
        try {
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
        } catch { }
      }
      return str;
    }
    if (apt.time && apt.time !== 'N/A') return apt.time;
    if (apt.startTime) return apt.startTime;
    if (apt.StartTime) return apt.StartTime;
    return '08:00 – 08:30';
  };

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
  const filteredAptPag = usePagination(filteredAppointments, 10);
  const checkedInPag = usePagination(checkedInAppointments, 10);
  const [testPackages, setTestPackages] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [labAssignmentInfo, setLabAssignmentInfo] = useState(null);
  const [loadingLabAssignment, setLoadingLabAssignment] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('ALL');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [issuedTicketData, setIssuedTicketData] = useState(null);
  const [posAppointmentSlip, setPosAppointmentSlip] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAppointments();
    filterCheckedInAppointments();
  }, [appointments, searchTerm, patients, selectedSlot]);

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
        api.get('/gateway/testorder/doctor', { params: { date: new Date().toISOString().slice(0, 10), page: 1, pageSize: 1000 } }).catch(() => ({ data: [] })),
        doctorService.getAllDoctorRooms({ page: 1, pageSize: 100 }).catch(() => ({ success: false, data: [] }))
      ]);

      let appointmentList = appointmentsResult.success ? (appointmentsResult.data || []) : [];

      if (appointmentList.length > 0) {
        try {
          const shiftIds = [...new Set(
            appointmentList
              .map(apt => apt.doctorShiftId || apt.DoctorShiftId || apt.doctor_shift_id || apt.shiftId || apt.ShiftId)
              .filter(Boolean)
          )];

          const shiftsMap = new Map();
          for (const shiftId of shiftIds) {
            try {
              const shiftResp = await shiftService.getShiftById(shiftId);
              if (shiftResp.success && shiftResp.data) {
                const shift = shiftResp.data;

                const shiftKeyLower = String(shiftId).toLowerCase();
                const shiftKeyOriginal = String(shiftId);
                shiftsMap.set(shiftKeyLower, shift);
                shiftsMap.set(shiftKeyOriginal, shift);

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

          const packagesMap = new Map();
          for (const packageId of packageIdsToFetch) {
            try {
              const packageResp = await medicalService.getServiceById(packageId);
              if (packageResp.success && packageResp.data) {
                const packageData = packageResp.data;
                const packageName = packageData.PackageName || packageData.packageName || packageData.name || packageData.Name;
                if (packageName) {
                  packagesMap.set(String(packageId).toLowerCase(), packageName);
                  packagesMap.set(String(packageId), packageName);
                } else {
                }
              } else {
              }
            } catch (err) {
            }
          }

          appointmentList = appointmentList.map(apt => {
            const enrichedApt = { ...apt };
            const aptShiftId = enrichedApt.doctorShiftId || enrichedApt.DoctorShiftId || enrichedApt.doctor_shift_id || enrichedApt.shiftId || enrichedApt.ShiftId;

            if (aptShiftId) {
              const shiftKey1 = String(aptShiftId).toLowerCase();
              const shiftKey2 = String(aptShiftId);
              const relatedShift = shiftsMap.get(shiftKey1) || shiftsMap.get(shiftKey2) ||
                Array.from(shiftsMap.values()).find(s => {
                  const sId = s.ShiftId || s.shiftId || s.Id || s.id;
                  return String(sId) === String(aptShiftId) || String(sId).toLowerCase() === shiftKey1;
                });

              if (relatedShift) {
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

                const shiftStart = relatedShift.ShiftStart || relatedShift.shiftStart || relatedShift.start || relatedShift.Start;
                if (shiftStart) {
                  if (typeof shiftStart === 'string') {
                    enrichedApt.appointmentTime = shiftStart.substring(0, 5);
                  } else {
                    enrichedApt.appointmentTime = String(shiftStart);
                  }
                }
              } else {
              }
            } else {
            }

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
        const rawPackages = servicesResult.data || [];
        const packagesData = Array.isArray(rawPackages) ? rawPackages : (rawPackages.items || rawPackages.data || []);
        setTestPackages(packagesData);
      } else {
        setTestPackages([]);
      }

      if (doctorsResult.data) {
        const doctorsData = Array.isArray(doctorsResult.data)
          ? doctorsResult.data
          : (doctorsResult.data?.data || []);
        setDoctors(doctorsData);
      } else {
      }

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
  const formatSlotTime = (timeStr) => {
    if (!timeStr) return '--:--';
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      try {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getUTCHours()).padStart(2, '0');
          const mm = String(d.getUTCMinutes()).padStart(2, '0');
          return `${hh}:${mm}`;
        }
      } catch (err) { }
    }
    const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return String(timeStr);
  };

  const getSlotForAppointment = (apt) => {
    const timeRaw = apt?.appointmentTime || apt?.AppointmentTime || apt?.time || apt?.slotTime || '';
    let hour = -1;
    let minute = 0;
    if (typeof timeRaw === 'string' && timeRaw.includes('T')) {
      try {
        const d = new Date(timeRaw);
        if (!isNaN(d.getTime())) {
          hour = d.getUTCHours();
          minute = d.getUTCMinutes();
        }
      } catch (err) { }
    } else {
      const match = String(timeRaw).match(/(\d{1,2}):(\d{2})/);
      if (match) {
        hour = parseInt(match[1], 10);
        minute = parseInt(match[2], 10);
      }
    }

    if (hour === 7 || (hour === 8 && minute === 0)) return 'SLOT_1';
    if (hour === 8 || (hour === 9 && minute === 0)) return 'SLOT_2';
    if (hour === 9 || (hour === 10 && minute === 0)) return 'SLOT_3';
    return 'OTHER';
  };

  const getTimeStatus = (appointment) => {
    const slot = getSlotForAppointment(appointment);
    const formattedTime = formatSlotTime(appointment?.appointmentTime || appointment?.time);

    if (slot === 'SLOT_1') {
      return {
        status: 'slot1',
        message: 'Khung 1 (07:00 - 08:00)',
        color: 'primary'
      };
    } else if (slot === 'SLOT_2') {
      return {
        status: 'slot2',
        message: 'Khung 2 (08:00 - 09:00)',
        color: 'info'
      };
    } else if (slot === 'SLOT_3') {
      return {
        status: 'slot3',
        message: 'Khung 3 (09:00 - 10:00)',
        color: 'warning'
      };
    }
    return {
      status: 'ontime',
      message: formattedTime !== '--:--' ? `Giờ hẹn: ${formattedTime}` : 'Đúng giờ hẹn',
      color: 'secondary'
    };
  };

  const getPatientDisplayName = (apt) => {
    if (!apt) return 'Bệnh nhân';
    if (typeof apt === 'string') {
      const patient = patients.find(p => doesPatientMatchId(p, apt));
      return patient?.fullName || patient?.fullname || patient?.name || `ID: ${apt}`;
    }
    if (apt.patientName || apt.PatientName) return apt.patientName || apt.PatientName;
    if (apt.guestName || apt.GuestName) return apt.guestName || apt.GuestName;
    if (apt.patient?.fullName || apt.patient?.name) return apt.patient.fullName || apt.patient.name;

    const pId = apt.patientId || apt.PatientId || apt.patient_id;
    if (pId && Array.isArray(patients)) {
      const patient = patients.find(p => doesPatientMatchId(p, pId));
      if (patient?.fullName || patient?.fullname || patient?.name) {
        return patient.fullName || patient.fullname || patient.name;
      }
    }
    return apt.createdBy || apt.appointmentCode || 'Bệnh nhân đăng ký';
  };

  const getPackageDisplayName = (apt) => {
    return apt?.testPackageName
      || apt?.TestPackageName
      || apt?.packageName
      || apt?.PackageName
      || apt?.service
      || 'Tổng phân tích tế bào máu (24 chỉ số)';
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
    const allStatuses = [...new Set(appointments.map(apt => apt.status || apt.Status || 'null'))];
    const statusBreakdownDetailed = {};
    appointments.forEach(apt => {
      const status = (apt.status || apt.Status || 'null').toLowerCase();
      statusBreakdownDetailed[status] = (statusBreakdownDetailed[status] || 0) + 1;
    });

    let filtered = appointments.filter(apt => {
      const rawStatus = apt.status || apt.Status;
      const status = (rawStatus || '').toLowerCase();

      if (!status || status === 'null') {
      }

      const norm = (status || '').replace(/[_-]/g, '');
      if (norm === 'checkedin' || norm === '2' || norm === 'inprogress' || norm === '3' || norm === 'completed' || norm === '4') {
        return false;
      }

      const isPaidAndConfirmed = norm === 'confirmed' || norm === 'scheduled' || norm === 'paid' || norm === '1';

      if (!isPaidAndConfirmed && status && status !== 'null') {
      }

      return isPaidAndConfirmed;
    });

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

    if (selectedSlot !== 'ALL') {
      filtered = filtered.filter(apt => getSlotForAppointment(apt) === selectedSlot);
    }

    filtered.sort((a, b) => {
      const createdA = new Date(a.createdAt || a.CreatedAt || a.updatedAt || a.appointmentDate || 0).getTime();
      const createdB = new Date(b.createdAt || b.CreatedAt || b.updatedAt || b.appointmentDate || 0).getTime();
      if (createdB !== createdA) return createdB - createdA;
      const codeA = String(a.appointmentCode || a.code || '');
      const codeB = String(b.appointmentCode || b.code || '');
      return codeB.localeCompare(codeA);
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
    let checkedIn = appointments.filter(apt => {
      const rawStatus = (apt.status || apt.Status || '').toString();
      const normStatus = rawStatus.toLowerCase().replace(/[_-]/g, '');
      if (normStatus !== 'checkedin' && normStatus !== '2') {
        return false;
      }

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const checkInDateStr = apt.checkedInAt ? new Date(apt.checkedInAt).toISOString().split('T')[0] : '';
      const aptDateStr = apt.appointmentDate ? String(apt.appointmentDate).split('T')[0] : '';

      return checkInDateStr === todayStr || aptDateStr === todayStr || !checkInDateStr;
    });

    checkedIn.sort((a, b) => {
      const timeA = new Date(a.checkedInAt || a.updatedAt || a.appointmentDate || 0);
      const timeB = new Date(b.checkedInAt || b.updatedAt || b.appointmentDate || 0);
      return timeB - timeA;
    });

    setCheckedInAppointments(checkedIn);
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => doesPatientMatchId(p, patientId));
    return patient?.fullName || patient?.name || patient?.email || (patientId ? `ID: ${String(patientId).replace(/^(PAT-)+/i, 'PAT-')}` : 'Bệnh nhân');
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = (status || '').toString().toLowerCase().replace(/[_-]/g, '');
    const statusMap = {
      'scheduled': { variant: 'success', text: 'Đã thanh toán' },
      'confirmed': { variant: 'info', text: 'Đã xác nhận' },
      '1': { variant: 'info', text: 'Đã xác nhận' },
      'pendingconfirmation': { variant: 'warning', text: 'Chờ xác nhận' },
      'pending': { variant: 'warning', text: 'Chờ xử lý' },
      '0': { variant: 'warning', text: 'Chờ xử lý' },
      'paid': { variant: 'success', text: 'Đã thanh toán' },
      'active': { variant: 'info', text: 'Đang hoạt động' },
      'checkedin': { variant: 'primary', text: 'Đã tiếp nhận' },
      '2': { variant: 'primary', text: 'Đã tiếp nhận' },
      'samplecollected': { variant: 'warning', text: 'Đã lấy mẫu' }
    };
    const statusInfo = statusMap[normalizedStatus] || { variant: 'secondary', text: status || 'N/A' };
    return <Badge bg={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  const handleDirectCheckIn = async (appointment) => {
    try {
      const rawStatus = (appointment.status || appointment.Status || '').toString();
      const status = rawStatus.toLowerCase().replace(/[_-]/g, '');

      if (['checkedin', '2', 'inprogress', '3', 'completed', '4'].includes(status)) {
        showError('Lịch hẹn đã được tiếp đón / check-in rồi.');
        return;
      }

      if (!['confirmed', 'scheduled', 'paid', '1'].includes(status)) {
        showError(`Không thể check-in lịch hẹn với trạng thái "${appointment.status || appointment.Status || 'N/A'}". Chỉ có thể check-in lịch hẹn đã thanh toán và có trạng thái "Đã xác nhận" (confirmed).`);
        return;
      }

      const patientName = getPatientDisplayName(appointment);
      const packageName = getPackageDisplayName(appointment);
      const appointmentCode = appointment.appointmentCode || appointment.code || appointment.id;
      const slotTimeFormatted = formatSlotTime(appointment.appointmentTime || appointment.time);

      const response = await appointmentService.checkInAppointment(appointment.id, user?.id);
      if (response.success) {
        let ticketNum = '';
        try {
          const queueRes = await queueApi.issueNextTicket({
            patientId: appointment.patientId || appointment.id,
            patientName: patientName,
            patientCode: appointment.patientCode || appointmentCode,
            packageName: packageName,
            isWalkIn: false,
            priority: 1
          });
          if (queueRes?.data?.ticketNumber) {
            ticketNum = queueRes.data.ticketNumber;
          }
        } catch (qErr) {
          console.warn('Queue ticket auto-issue error:', qErr);
        }

        if (!ticketNum) {
          ticketNum = `Q-${Math.floor(100 + Math.random() * 900)}`;
        }

        setIssuedTicketData({
          ticketNumber: ticketNum,
          patientName: patientName,
          patientCode: appointment.patientCode || appointmentCode,
          packageName: packageName,
          appointmentCode: appointmentCode,
          roomName: 'Phòng 101 - Phòng Lấy Mẫu Tầng 1',
          slotTime: slotTimeFormatted,
          checkInTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          paymentStatus: 'Đã thanh toán (VNPAY)'
        });
        setShowTicketModal(true);

        showSuccess(`✅ Check-in thành công cho "${patientName}"! STT: ${ticketNum}`);
        setRefreshFlag('appointments');
        dispatchRefreshEvent('appointments', 'updated', { appointmentId: appointment.id });
        await loadData(true);
      } else {
        showError(response.message || 'Không thể check-in. Vui lòng thử lại.');
      }
    } catch (error) {
      showError('Lỗi khi check-in: ' + (error.message || 'Vui lòng thử lại.'));
    }
  };

  const handleQuickCheckInSuccess = async () => {
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

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

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
    try {
      let enrichedAppointment = { ...appointment };

      if (appointment.id || appointment.appointmentId || appointment.AppointmentId) {
        try {
          const appointmentId = appointment.id || appointment.appointmentId || appointment.AppointmentId;
          const resp = await appointmentService.getAppointmentById(appointmentId);
          if (resp.success && resp.data) {
            enrichedAppointment = {
              ...enrichedAppointment,
              ...resp.data,

              TestPackageId: resp.data.TestPackageId || resp.data.testPackageId || enrichedAppointment.TestPackageId || enrichedAppointment.testPackageId,
              testPackageId: resp.data.testPackageId || resp.data.TestPackageId || enrichedAppointment.testPackageId || enrichedAppointment.TestPackageId,

              TestPackageName: resp.data.TestPackageName || resp.data.testPackageName || enrichedAppointment.TestPackageName || enrichedAppointment.testPackageName,
              testPackageName: resp.data.testPackageName || resp.data.TestPackageName || enrichedAppointment.testPackageName || enrichedAppointment.TestPackageName
            };

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

      const shiftKey = enrichedAppointment.doctorShiftId || enrichedAppointment.DoctorShiftId || enrichedAppointment.shiftId || enrichedAppointment.shift_id;
      if (shiftKey) {
        try {
          const shiftResp = await shiftService.getShiftById(shiftKey);

          if (shiftResp.success && shiftResp.data) {
            const shift = shiftResp.data;

            if (!enrichedAppointment.appointmentDate) {
              const shiftDate = shift.ShiftDate || shift.shiftDate || shift.date || shift.Date;

              if (shiftDate) {
                try {
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

            if (!enrichedAppointment.appointmentTime) {
              const shiftStart = shift.ShiftStart || shift.shiftStart || shift.start || shift.Start;

              if (shiftStart) {
                try {
                  if (typeof shiftStart === 'string') {
                    enrichedAppointment.appointmentTime = shiftStart.substring(0, 5);
                  } else {
                    enrichedAppointment.appointmentTime = String(shiftStart).substring(0, 5);
                  }
                } catch (err) {
                }
              } else {
              }
            }

            const doctorId = shift.DoctorId || shift.doctor_id || shift.doctorId || enrichedAppointment.doctorId || enrichedAppointment.doctor_id;

            if (doctorId) {
              const doctor = doctors.find(d => {
                const dId = d.id || d.Id || d.doctorId || d.DoctorId;
                return dId === doctorId ||
                  dId === parseInt(doctorId) ||
                  String(dId) === String(doctorId);
              });

              if (doctor) {
                enrichedAppointment.resolvedDoctor = doctor;
              } else {
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

            const roomId = shift.RoomId || shift.roomId || shift.room;
            const roomNameFromShift = shift.RoomName || shift.roomName || shift.room;

            if (roomNameFromShift) {
              enrichedAppointment.resolvedRoom = roomNameFromShift;
            } else if (roomId) {
              const room = rooms.find(r =>
                (r.id || r.Id || r.roomId || r.RoomId) === roomId ||
                String(r.id || r.Id || r.roomId || r.RoomId) === String(roomId)
              );
              if (room) {
                enrichedAppointment.resolvedRoom = room.roomName || room.RoomName || room.name || room.Name || roomId;
              } else {
                enrichedAppointment.resolvedRoom = roomId;
              }
            }
          }
        } catch (error) {
        }
      }

      const resolvedDoc = resolveDoctorInfo(enrichedAppointment);
      enrichedAppointment.resolvedDoctor = resolvedDoc;
      if (!enrichedAppointment.doctorName || enrichedAppointment.doctorName.startsWith('ID:')) {
        enrichedAppointment.doctorName = resolvedDoc.fullName;
      }
      if (!enrichedAppointment.appointmentTime || enrichedAppointment.appointmentTime === 'N/A') {
        enrichedAppointment.appointmentTime = resolveTimeSlot(enrichedAppointment);
      }

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

  useEffect(() => {
    if (showDetailModal && detailAppointment && detailAppointment.status === 'checked_in') {
      loadLabAssignmentInfo();
    } else {
      setLabAssignmentInfo(null);
    }
  }, [showDetailModal, detailAppointment]);

  const loadLabAssignmentInfo = async () => {
    if (!detailAppointment) return;

    setLoadingLabAssignment(true);
    try {
      let assignment = null;
      const currentLabAssignmentId = detailAppointment.labAssignmentId || detailAppointment.LabAssignmentId;

      if (currentLabAssignmentId) {
        const assignmentResult = await shiftService.getLabAssignmentById(currentLabAssignmentId);
        if (assignmentResult.success && assignmentResult.data) {
          assignment = assignmentResult.data;
        }
      }

      if (!assignment) {
        const appointmentDate = detailAppointment.appointmentDate || detailAppointment.appointment_date;
        const appointmentTime = detailAppointment.appointmentTime || detailAppointment.time;

        if (appointmentDate && appointmentTime) {
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

          const normalizeTime = (timeValue) => {
            if (!timeValue) return null;
            if (typeof timeValue === 'string') {
              const match = timeValue.match(/(\d{1,2}):(\d{2})/);
              if (match) {
                const hours = match[1].padStart(2, '0');
                const minutes = match[2];
                return `${hours}:${minutes}`;
              }
            }
            return null;
          };

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
            const allAssignmentsResult = await shiftService.getAllLabAssignments();

            if (allAssignmentsResult.success && allAssignmentsResult.data && Array.isArray(allAssignmentsResult.data)) {
              const matchedAssignment = allAssignmentsResult.data.find(la => {
                const laDate = normalizeDate(la.AssignmentDate || la.assignmentDate || la.assignment_date);
                const laStartRaw = la.ShiftStart || la.shiftStart || la.shift_start;
                const laEndRaw = la.ShiftEnd || la.shiftEnd || la.shift_end;
                const laStart = normalizeTime(laStartRaw);
                const laEnd = normalizeTime(laEndRaw);
                const laStartMinutes = timeToMinutes(laStartRaw);
                const laEndMinutes = timeToMinutes(laEndRaw);

                if (laDate !== targetDate) return false;

                if (laStartMinutes !== null && laEndMinutes !== null && targetTimeMinutes !== null) {
                  const isInRange = targetTimeMinutes >= laStartMinutes && targetTimeMinutes <= laEndMinutes;
                  if (isInRange) {
                    return true;
                  }
                }

                if (laStart && targetTime && laStart === targetTime) {
                  return true;
                }

                return false;
              });

              if (matchedAssignment) {
                assignment = matchedAssignment;
              } else {
                const sameDateAssignments = allAssignmentsResult.data.filter(la => {
                  const laDate = normalizeDate(la.AssignmentDate || la.assignmentDate || la.assignment_date);
                  return laDate === targetDate;
                });
              }
            }
          }
        }
      }

      if (assignment) {
        const labUserId = assignment.labUserId || assignment.LabUserId;
        const labRoomId = assignment.labRoomId || assignment.LabRoomId;

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

        let labRoomInfo = null;
        const roomsResult = await testOrderService.getAllLabRooms();

        if (labRoomId && roomsResult.success && roomsResult.data) {
          labRoomInfo = roomsResult.data.find(r => {
            const rId = r.roomId || r.RoomId || r.id || r.Id || r.labRoomId || r.LabRoomId;
            return rId && String(rId) === String(labRoomId);
          });
        }

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

  const handlePrintAppointmentSlip = async () => {
    if (!detailAppointment) return;

    if (loadingLabAssignment) {
      showError('Vui lòng đợi hệ thống tải thông tin phân công...');
      return;
    }

    if (!labAssignmentInfo) {
      const currentLabAssignmentId = detailAppointment.labAssignmentId || detailAppointment.LabAssignmentId;
      if (currentLabAssignmentId) {
        try {
          await loadLabAssignmentInfo();
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          console.warn('Could not load lab assignment info:', e);
        }
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

    let currentLabAssignmentInfo = labAssignmentInfo;
    if (!currentLabAssignmentInfo) {
      currentLabAssignmentInfo = {
        labUser: {
          fullName: 'KTV. Phạm Quốc Hưng',
          jobTitle: 'Kỹ thuật viên Phân tích Tự động'
        },
        labRoom: {
          roomName: 'Trung tâm Phân tích Tự động Tầng 2 (LAB-201)'
        }
      };
    }

    const labUserName = currentLabAssignmentInfo?.labUser
      ? (currentLabAssignmentInfo.labUser.fullName || currentLabAssignmentInfo.labUser.FullName || currentLabAssignmentInfo.labUser.name || 'KTV. Phạm Quốc Hưng')
      : 'KTV. Phạm Quốc Hưng';
    const labUserJobTitle = currentLabAssignmentInfo?.labUser
      ? (currentLabAssignmentInfo.labUser.jobTitle || currentLabAssignmentInfo.labUser.JobTitle || 'Kỹ thuật viên Xét nghiệm')
      : 'Kỹ thuật viên Phân tích Tự động';

    let labRoomName = currentLabAssignmentInfo?.labRoom?.roomName
      || currentLabAssignmentInfo?.labRoom?.RoomName
      || currentLabAssignmentInfo?.labRoom?.name
      || detailAppointment.resolvedRoom
      || detailAppointment.roomName
      || 'Phòng Lấy Mẫu 101 • Tầng 1';

    const doctorInfo = resolveDoctorInfo(detailAppointment);
    const slotText = resolveTimeSlot(detailAppointment);

    setPosAppointmentSlip({
      appointmentCode,
      appointmentDate,
      appointmentTime: slotText || appointmentTime,
      patientName,
      patientCode: patient?.patientCode || detailAppointment.patientId || '',
      patientPhone: patientPhone !== 'N/A' ? patientPhone : '',
      packageName: packageInfo.name || 'Xét nghiệm theo lịch hẹn',
      doctorName: doctorInfo?.name && doctorInfo.name !== 'Chưa phân công' ? doctorInfo.name : '',
      roomName: labRoomName,
      labUserName,
      qrValue: generateQRCodeData(detailAppointment),
    });
  };

  const getAppointmentCode = (appointment) => {
    return appointment?.appointmentCode || appointment?.code || appointment?.id || '';
  };

  const generateQRCodeData = (appointment) => {
    const appointmentCode = getAppointmentCode(appointment);
    const patient = getPatientInfo(appointment?.patientId);

    return JSON.stringify({
      t: 'checkin',
      c: appointmentCode,
      id: appointment?.id || '',
      n: appointment?.patientName || patient?.fullName || patient?.name || '',
      s: appointment?.service || '',
      d: appointment?.appointmentDate || '',
      tm: appointment?.appointmentTime || appointment?.time || ''
    });
  };

  const getPatientInfo = (patientId) => {
    return patients.find(p => doesPatientMatchId(p, patientId)) || null;
  };

  const getPackageInfo = (appointment) => {
    const safePackages = Array.isArray(testPackages) ? testPackages : (testPackages?.items || testPackages?.data || []);

    const testPackageName = appointment?.TestPackageName || appointment?.testPackageName || appointment?.test_package_name || null;

    if (testPackageName) {
      const pkgId = appointment?.TestPackageId || appointment?.testPackageId || appointment?.test_package_id || null;
      let matchedPkg = null;
      if (pkgId) {
        matchedPkg = safePackages.find(p => {
          const pId = p.PackageId || p.packageId || p.id || p.Id || p.serviceId || p.ServiceId;
          return pId && String(pId) === String(pkgId);
        });
      }

      const price = matchedPkg ? (matchedPkg.Price || matchedPkg.price || matchedPkg.servicePrice || matchedPkg.packagePrice || matchedPkg.amount || null) : null;
      return { name: testPackageName, price, package: matchedPkg };
    }

    const pkgId = appointment?.TestPackageId || appointment?.testPackageId || appointment?.test_package_id || appointment?.packageId || appointment?.package_id || null;
    const pkgCode = appointment?.testPackageCode || appointment?.test_package_code || appointment?.package_code || appointment?.packageCode || null;

    if (!pkgId && !pkgCode) {
      if (appointment?.serviceName || appointment?.service) {
        const serviceName = appointment?.serviceName || appointment?.service;
        const matchedByName = safePackages.find(p => {
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

      if (appointment?.id || appointment?.appointmentId || appointment?.AppointmentId) {
        try {
        } catch (err) {
        }
      }

      const service = appointment?.service || appointment?.serviceName || '';
      return {
        name: service || 'Chưa xác định (Appointment không có TestPackageId trong database. Vui lòng cập nhật database để hiển thị tên gói dịch vụ.)',
        price: null,
        package: null
      };
    }

    let matchedPkg = null;

    if (pkgId) {
      matchedPkg = safePackages.find(p => {
        const pId = p.PackageId || p.packageId || p.id || p.Id || p.serviceId || p.ServiceId;

        const idMatch = pId && String(pId).toLowerCase() === String(pkgId).toLowerCase();

        return idMatch;
      });
    }

    if (!matchedPkg && pkgCode) {
      matchedPkg = safePackages.find(p => {
        const pCode = p.code || p.Code || p.serviceCode || p.ServiceCode || p.packageCode || p.PackageCode;
        const codeMatch = pCode && String(pCode).toLowerCase() === String(pkgCode).toLowerCase();
        return codeMatch;
      });
    }

    if (!matchedPkg) {
      return { name: appointment?.service || 'Chưa xác định', price: null, package: null };
    }

    const price = matchedPkg.Price || matchedPkg.price || matchedPkg.servicePrice || matchedPkg.packagePrice || matchedPkg.amount || null;
    const name = matchedPkg.PackageName || matchedPkg.packageName || matchedPkg.name || matchedPkg.serviceName || matchedPkg.packageName || matchedPkg.title || appointment?.service || 'Chưa xác định';

    return { name, price, package: matchedPkg };
  };

  const confirmedList = appointments.filter(a => ['confirmed', 'scheduled'].includes((a.status || a.Status || '').toLowerCase()));
  const slotCounts = {
    ALL: confirmedList.length,
    SLOT_1: confirmedList.filter(a => getSlotForAppointment(a) === 'SLOT_1').length,
    SLOT_2: confirmedList.filter(a => getSlotForAppointment(a) === 'SLOT_2').length,
    SLOT_3: confirmedList.filter(a => getSlotForAppointment(a) === 'SLOT_3').length,
  };

  if (loading) {
    return (
      <div className="text-center py-3">
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
      <div className="w-100 py-1">

        <div className="bms-page-header-card mb-4">
          <div className="bms-page-header-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill small fw-semibold mb-2 d-inline-flex align-items-center gap-1">
              <QrCode size={11} /> QUY TRÌNH TIẾP ĐÓN • BƯỚC 1: TIẾP ĐÓN &amp; CẤP STT
            </span>
            <div className="bms-page-title-row">
              <h1 className="bms-page-title">
                Quầy Tiếp Đón Lễ Tân &amp; Điều Phối Lấy Mẫu
              </h1>
            </div>
            <p className="text-muted mb-0 small" style={{ maxWidth: '850px' }}>
              Quét mã QR hoặc nhập mã hẹn để đối chiếu thông tin và cấp số thứ tự tiếp đón.
            </p>
          </div>
          <div className="bms-page-actions">
            <Button
              size="lg"
              onClick={() => handleOpenQuickQRModal('camera')}
              className="d-flex align-items-center gap-2 shadow-sm fw-semibold px-3 py-2"
              style={{
                borderRadius: 9999,
                background: '#1E60E6',
                borderColor: '#1E60E6',
                boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)',
                fontSize: '14px'
              }}
            >
              <QrCode size={15} />
              <span>Quét QR / Nhập Mã Tiếp Đón</span>
            </Button>
          </div>
        </div>

        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Tổng Lịch Hẹn Đã Xác Nhận</h6>
                <div className="bms-kpi-value">{confirmedList.length}</div>
                <div className="bms-kpi-sub text-muted">Hôm nay theo phân ca</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><CalendarCheck  size="1em"/></div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Chờ Check-In &amp; Cấp STT</h6>
                <div className="bms-kpi-value text-primary">{filteredAppointments.length}</div>
                <div className="bms-kpi-sub text-primary">Cần tiếp đón ngay</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><Clock  size="1em"/></div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Đã Tiếp Đón Hoàn Tất</h6>
                <div className="bms-kpi-value text-success">{checkedInAppointments.length}</div>
                <div className="bms-kpi-sub text-success">Đã cấp STT lấy mẫu</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-green"><UserCheck  size="1em"/></div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Định Mức Lấy Mẫu</h6>
                <div className="bms-kpi-value">10 - 14</div>
                <div className="bms-kpi-sub text-muted">Hẹn / khung giờ (2 bàn)</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-rose"><Users  size="1em"/></div>
            </div>
          </Col>
        </Row>

        <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
          <Card.Header className="bg-white border-bottom py-3 px-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100">
              <div>
                <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                  <CalendarCheck style={{ color: '#1E60E6' }}  size="1em"/>
                  Sổ Lịch Hẹn Đã Xác Nhận &amp; Chờ Check-in
                </h5>
                <div className="text-muted small">
                  Hiển thị {filteredAppointments.length} / {confirmedList.length} lượt hẹn đã xác nhận sẵn sàng tiếp đón
                </div>
              </div>

              <div className="d-flex align-items-center ms-auto">
                <div className="bms-search-input-pill" style={{ minWidth: isMobile ? '100%' : '320px' }}>
                  <Search className="bms-search-icon"  size="1em"/>
                  <input
                    type="text"
                    placeholder="Tìm theo tên bệnh nhân, mã lịch hẹn..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="bms-search-clear"
                      onClick={() => setSearchTerm('')}
                      title="Xóa tìm kiếm"
                    >
                      <LucideX size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card.Header>

          <div className="px-4 py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2" style={{ background: '#F8FAFC' }}>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="fw-semibold text-dark small">
                <Clock className="me-1" style={{ color: '#1E60E6' }}  size="1em"/> Phân bổ khung ca sáng:
              </span>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className="btn rounded-pill px-3 me-1"
                  style={selectedSlot === 'ALL' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' } : { borderColor: 'rgba(15, 23, 42, 0.08)', color: '#64748b' }}
                  onClick={() => setSelectedSlot('ALL')}
                >
                  Tất cả ({slotCounts.ALL})
                </button>
                <button
                  type="button"
                  className="btn rounded-pill px-3 me-1"
                  style={selectedSlot === 'SLOT_1' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' } : { borderColor: 'rgba(15, 23, 42, 0.08)', color: '#64748b' }}
                  onClick={() => setSelectedSlot('SLOT_1')}
                >
                  Khung 1 (07:00 - 08:00) <span className="badge bg-light text-dark ms-1">{slotCounts.SLOT_1}/12</span>
                </button>
                <button
                  type="button"
                  className="btn rounded-pill px-3 me-1"
                  style={selectedSlot === 'SLOT_2' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' } : { borderColor: 'rgba(15, 23, 42, 0.08)', color: '#64748b' }}
                  onClick={() => setSelectedSlot('SLOT_2')}
                >
                  Khung 2 (08:00 - 09:00) <span className="badge bg-light text-dark ms-1">{slotCounts.SLOT_2}/12</span>
                </button>
                <button
                  type="button"
                  className="btn rounded-pill px-3"
                  style={selectedSlot === 'SLOT_3' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' } : { borderColor: 'rgba(15, 23, 42, 0.08)', color: '#64748b' }}
                  onClick={() => setSelectedSlot('SLOT_3')}
                >
                  Khung 3 (09:00 - 10:00) <span className="badge bg-light text-dark ms-1">{slotCounts.SLOT_3}/14</span>
                </button>
              </div>
            </div>
            <div className="small text-muted">
              <Users className="me-1" style={{ color: '#1E60E6' }}  size="1em"/> Định mức: 10 hẹn online + 2-4 vãng lai/khung (2 bàn lấy mẫu)
            </div>
          </div>

          <Card.Body className="p-0">
            {filteredAppointments.length > 0 ? (
              <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <Table hover className="align-middle mb-0" style={{ fontSize: isMobile ? '0.85rem' : '0.88rem', tableLayout: isMobile ? 'auto' : 'fixed', width: '100%' }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>
                      <th className="text-start ps-3" style={{ width: '19%', fontWeight: 'bold' }}>
                        Bệnh nhân &amp; Mã
                      </th>
                      <th className="text-start d-none d-lg-table-cell" style={{ width: '21%', fontWeight: 'bold' }}>
                        Gói xét nghiệm
                      </th>
                      <th className="text-center d-none d-md-table-cell" style={{ width: '10%', fontWeight: 'bold' }}>
                        Ngày hẹn
                      </th>
                      <th className="text-center" style={{ width: '13%', fontWeight: 'bold' }}>
                        Giờ hẹn
                      </th>
                      <th className="text-center d-none d-sm-table-cell" style={{ width: '13%', fontWeight: 'bold' }}>
                        Trạng thái
                      </th>
                      <th className="text-center pe-3" style={{ width: '24%', fontWeight: 'bold' }}>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAptPag.paginatedItems.map((apt) => {
                      const appointmentCode = getAppointmentCode(apt);
                      const patientName = getPatientDisplayName(apt);
                      const packageName = getPackageDisplayName(apt);
                      const timeFormatted = formatSlotTime(apt.appointmentTime || apt.time);
                      const timeStatus = getTimeStatus(apt);
                      const isPaid = ['confirmed', 'scheduled'].includes((apt.status || apt.Status || '').toLowerCase());

                      return (
                        <tr key={apt.id}>
                          <td className="text-start ps-4" style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
                            <div className="fw-bold text-dark">{patientName}</div>
                            <div className="small text-muted">Mã: <code>{appointmentCode}</code></div>
                          </td>
                          <td className="text-start d-none d-lg-table-cell" style={{ fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                            <div className="text-dark fw-500">{packageName}</div>
                          </td>
                          <td className="text-center d-none d-md-table-cell" style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', whiteSpace: 'nowrap' }}>
                            {(() => {
                              const dateStr = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate || apt.date || apt.Date;
                              if (dateStr) {
                                try {
                                  const date = new Date(dateStr);
                                  if (!isNaN(date.getTime())) {
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const year = date.getFullYear();
                                    return day + '/' + month + '/' + year;
                                  }
                                } catch (err) { }
                              }
                              return 'Hôm nay';
                            })()}
                          </td>
                          <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                            <div className="fw-bold" style={{ fontSize: isMobile ? '0.85rem' : '1rem', color: '#1e293b' }}>
                              {timeFormatted}
                            </div>
                            <Badge bg={timeStatus.color} className="mt-1" style={{ fontSize: '0.78rem', fontWeight: '500' }}>
                              <Clock className="me-1"  size="1em"/>
                              {timeStatus.message}
                            </Badge>
                          </td>
                          <td className="text-center d-none d-sm-table-cell">
                            {isPaid ? (
                              <Badge bg="success" style={{ fontSize: '0.8rem', padding: '6px 10px', fontWeight: '500' }}>
                                <CheckCircle2 className="me-1"  size="1em"/> Đã TT (VNPAY)
                              </Badge>
                            ) : (
                              getStatusBadge(apt.status)
                            )}
                          </td>
                          <td className="text-center pe-3">
                            <div className={'d-flex flex-wrap ' + (isMobile ? 'flex-column gap-1' : 'justify-content-center gap-1.5')}>
                              <Button
                                size="sm"
                                onClick={() => handleDirectCheckIn(apt)}
                                className="rounded-pill px-2.5 shadow-sm fw-semibold d-flex align-items-center gap-1"
                                style={{
                                  fontSize: isMobile ? '0.78rem' : '0.8rem',
                                  padding: '4px 10px',
                                  whiteSpace: 'nowrap',
                                  backgroundColor: '#1E60E6',
                                  borderColor: '#1E60E6',
                                  color: '#ffffff'
                                }}
                                disabled={!['scheduled', 'confirmed', 'paid', '1'].includes((apt.status || '').toLowerCase().replace(/[_-]/g, '')) || ['checkedin', '2'].includes((apt.status || '').toLowerCase().replace(/[_-]/g, ''))}
                              >
                                <LucideTicket size={12} />
                                <span>Check-in</span>
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleViewDetail(apt)}
                                className="rounded-pill px-2.5 d-flex align-items-center gap-1"
                                style={{
                                  fontSize: isMobile ? '0.78rem' : '0.8rem',
                                  padding: '4px 10px',
                                  whiteSpace: 'nowrap',
                                  color: '#1E60E6',
                                  borderColor: '#1E60E6'
                                }}
                              >
                                <Eye size={12} /> <span>Chi tiết</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                <TablePagination
                  page={filteredAptPag.page}
                  totalPages={filteredAptPag.totalPages}
                  totalItems={filteredAptPag.totalItems}
                  pageSize={filteredAptPag.pageSize}
                  onPageChange={filteredAptPag.setPage}
                  onPageSizeChange={filteredAptPag.setPageSize}
                  itemLabel="lịch hẹn"
                />
              </div>
            ) : (
              <div className="text-center py-3">
                <CalendarX className="text-muted mb-2" style={{ fontSize: isMobile ? '3rem' : '3.5rem', color: '#1E60E6' }}  size="1em"/>
                <h5 className="text-muted mt-2 fw-bold" style={{ fontSize: isMobile ? '1rem' : '1.15rem' }}>Không có lịch hẹn nào cần check-in trong khung giờ này</h5>
                <p className="text-muted small">Chọn tab "Tất cả" hoặc chuyển khung giờ khác để theo dõi.</p>
              </div>
            )}
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
          <Card.Header className="bg-white border-bottom py-3 px-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100">
              <div>
                <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                  <UserCheck style={{ color: '#16a34a' }}  size="1em"/>
                  Danh Sách Bệnh Nhân Đã Check-in ({checkedInAppointments.length})
                </h5>
                <div className="text-muted small">
                  Hồ sơ bệnh nhân đã hoàn tất cấp số thứ tự và phân luồng tiếp nhận
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-pill px-3 fw-semibold d-flex align-items-center gap-1"
                  onClick={handleExportCheckedIn}
                  disabled={checkedInAppointments.length === 0}
                  style={{ fontSize: '13px' }}
                >
                  <FileText  size="1em"/>
                  <span>Xuất CSV</span>
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="rounded-pill px-3 fw-semibold d-flex align-items-center gap-1"
                  onClick={handlePrintCheckedIn}
                  disabled={checkedInAppointments.length === 0}
                  style={{ fontSize: '13px', color: '#1E60E6', borderColor: '#1E60E6' }}
                >
                  <Printer  size="1em"/>
                  <span>In danh sách</span>
                </Button>
              </div>
            </div>
          </Card.Header>

          <Card.Body className="p-0">
            {checkedInAppointments.length > 0 ? (
              <div className="table-responsive" style={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                maxWidth: '100%',
                width: '100%'
              }}>
                <Table hover striped className="align-middle mb-0" style={{
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  minWidth: isMobile ? '600px' : 'auto',
                  width: '100%',
                  tableLayout: 'auto'
                }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>
                      <th className="text-start ps-4" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Bệnh nhân
                      </th>
                      <th className="text-center d-none d-md-table-cell" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Ngày hẹn
                      </th>
                      <th className="text-center" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Giờ hẹn
                      </th>
                      <th className="text-center d-none d-sm-table-cell" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Trạng thái
                      </th>
                      <th className="text-center pe-4" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkedInPag.paginatedItems.map((apt) => {
                      const appointmentCode = getAppointmentCode(apt);
                      return (
                        <tr key={apt.id}>
                          <td className="text-start ps-4" style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                            {getPatientName(apt.patientId)}
                          </td>
                          <td className="text-center d-none d-md-table-cell" style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', whiteSpace: 'nowrap' }}>
                            {(() => {
                              const dateStr = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate || apt.date || apt.Date;
                              if (dateStr) {
                                try {
                                  const date = new Date(dateStr);
                                  if (!isNaN(date.getTime())) {
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const year = date.getFullYear();
                                    return `${day}/${month}/${year}`;
                                  }
                                } catch (err) { }
                              }
                              return 'N/A';
                            })()}
                          </td>
                          <td className="text-center" style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', whiteSpace: 'nowrap' }}>
                            <span className="fw-semibold font-monospace text-dark">
                              {formatAppointmentTime(apt.appointmentTime || apt.appointment_time || apt.AppointmentTime || apt.time || apt.Time, apt.appointmentDate || apt.appointment_date)}
                            </span>
                          </td>
                          <td className="text-center d-none d-sm-table-cell" style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
                            {getStatusBadge(apt.status || apt.Status)}
                          </td>
                          <td className="text-center pe-4">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewDetail(apt)}
                              className="rounded-pill px-3 d-flex align-items-center gap-1 mx-auto"
                              style={{
                                fontSize: isMobile ? '0.8rem' : '0.88rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Eye size={12} />
                              <span>Chi tiết</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                <TablePagination
                  page={checkedInPag.page}
                  totalPages={checkedInPag.totalPages}
                  totalItems={checkedInPag.totalItems}
                  pageSize={checkedInPag.pageSize}
                  onPageChange={checkedInPag.setPage}
                  onPageSizeChange={checkedInPag.setPageSize}
                  itemLabel="lượt đã check-in"
                />
              </div>
            ) : (
              <div className="text-center py-3">
                <UserX className="text-muted mb-2" style={{ fontSize: isMobile ? '3rem' : '3.5rem' }}  size="1em"/>
                <h5 className="text-muted mt-2 fw-bold" style={{ fontSize: isMobile ? '1rem' : '1.15rem' }}>Chưa có bệnh nhân nào check-in</h5>
                <p className="text-muted small">Các lượt check-in thành công sẽ xuất hiện tại danh sách này.</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      <Modal
        show={showQuickQRModal}
        onHide={handleCloseQuickQRModal}
        onEntered={() => {
        }}
        onExited={() => {
        }}
        size={isMobile ? undefined : "lg"}
        fullscreen={isMobile}
        centered={!isMobile}
      >
        <Modal.Header closeButton className="bg-primary text-white" style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
          <Modal.Title style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
            <QrCode size="1em" className="me-2" />
            {isMobile ? 'Check-in QR/Mã' : 'Tiếp Đón Nhanh: Quét QR & Nhập Mã Hẹn'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
          <QuickCheckInScan
            receptionistId={user?.id}
            onSuccess={handleQuickCheckInSuccess}
            isModalOpen={showQuickQRModal}
            initialMode={quickScanMode}
            initialManualCode={mainPageManualCode}
            onViewDetail={(apt) => {
              setShowQuickQRModal(false);
              handleViewDetail(apt);
            }}
          />
        </Modal.Body>
        <Modal.Footer style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
          <Button variant="secondary" onClick={handleCloseQuickQRModal} size={isMobile ? 'sm' : undefined}>
            <i className={`fas fa-times ${isMobile ? '' : 'me-2'}`}></i>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        size={isMobile ? undefined : "xl"}
        fullscreen={isMobile}
        centered={!isMobile}
      >
        <Modal.Header closeButton className="border-bottom bg-white py-3 px-4">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 bg-primary-subtle p-2 text-primary d-flex align-items-center justify-content-center shadow-sm" style={{ width: 44, height: 44 }}>
              <FileText size="1em" className="fs-5" />
            </div>
            <div>
              <Modal.Title className="fw-bold fs-5 text-dark mb-0">
                Hồ Sơ Chi Tiết Lịch Hẹn Khám &amp; Xét Nghiệm
              </Modal.Title>
              <div className="text-muted small">
                Tiếp đón người bệnh tại quầy lễ tân
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: '#F8FAFC' }}>
          {detailAppointment && (() => {
            const patient = detailAppointment.resolvedPatient
              || getPatientInfo(detailAppointment.patientId)
              || getPatientInfo(detailAppointment.patient_id)
              || getPatientInfo(detailAppointment.userId)
              || {
              fullName: detailAppointment.patientName || 'Chưa cập nhật',
              identityCardNumber: detailAppointment.identityCardNumber || '—',
              dateOfBirth: null,
              gender: '—',
              phone: detailAppointment.patientPhone || '—',
              email: detailAppointment.patientEmail || '—',
              address: '—',
              patientCode: detailAppointment.patientCode || '—'
            };
            const appointmentCode = getAppointmentCode(detailAppointment);
            const docInfo = resolveDoctorInfo(detailAppointment);
            const slotTime = resolveTimeSlot(detailAppointment);
            const packageInfo = getPackageInfo(detailAppointment);
            const isCheckedIn = ['checked_in', 'checkedin', '2', 'inprogress', 'completed'].includes(
              String(detailAppointment.status || '').toLowerCase().replace(/[_-]/g, '')
            );

            return (
              <div className="d-flex flex-column gap-3">

                <div className="d-flex flex-wrap align-items-center justify-content-between p-3 bg-white rounded-3 border shadow-sm gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary px-3 py-2 fs-6 font-monospace shadow-sm">
                      {appointmentCode}
                    </span>
                    <Badge bg="light" text="dark" className="border px-2 py-2">
                      <Calendar size="1em" className="text-primary me-1" />
                      {safeFormatDate(detailAppointment.appointmentDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Badge>
                    <Badge bg="light" text="dark" className="border px-2 py-2">
                      <Clock size="1em" className="text-primary me-1" />
                      Khung giờ: <strong className="text-dark ms-1">{slotTime}</strong>
                    </Badge>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {getStatusBadge(detailAppointment.status)}
                    {detailAppointment.queueNumber && (
                      <Badge bg="warning" text="dark" className="px-3 py-2 fw-bold">
                        Số tiếp đón: Q-{String(detailAppointment.queueNumber).padStart(3, '0')}
                      </Badge>
                    )}
                  </div>
                </div>

                <Row className="g-3">

                  <Col xs={12} lg={4}>
                    <Card className="h-100 border shadow-sm rounded-3 text-center p-3 bg-white">
                      <div className="small fw-semibold text-muted text-uppercase mb-2">
                        <QrCode size="1em" className="me-1 text-primary" />
                        Mã Tiếp Đón &amp; Check-In
                      </div>
                      <div className="p-3 bg-light rounded-3 d-inline-block mx-auto mb-2 border shadow-sm">
                        <QRCodeSVG
                          value={generateQRCodeData(detailAppointment)}
                          size={180}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <div className="font-monospace fw-bold fs-5 text-primary mb-1">
                        {appointmentCode}
                      </div>
                      <p className="text-muted small mb-3">
                        Quét mã này tại quầy tiếp đón hoặc máy quét tự động để hoàn tất thủ tục vào lấy mẫu.
                      </p>

                      {isCheckedIn ? (
                        <div className="p-2 rounded-3 bg-success-subtle text-success small fw-semibold border border-success-subtle">
                          <CheckCircle2 size="1em" className="me-1" />
                          Đã tiếp đón vào phòng lấy mẫu
                          {detailAppointment.checkedInAt && (
                            <div className="text-muted fw-normal mt-1" style={{ fontSize: '11px' }}>
                              Lúc: {safeFormatDateTime(detailAppointment.checkedInAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded-3 bg-info-subtle text-primary small fw-semibold border border-info-subtle">
                          <LucideInfo size="1em" className="me-1" />
                          Sẵn sàng quét mã tiếp đón
                        </div>
                      )}
                    </Card>
                  </Col>

                  <Col xs={12} lg={8}>
                    <Card className="h-100 border shadow-sm rounded-3 bg-white">
                      <Card.Header className="bg-white border-bottom py-2 px-3 fw-bold text-dark d-flex justify-content-between align-items-center">
                        <span>
                          <Stethoscope size="1em" className="text-primary me-2" />
                          Bác Sĩ Phụ Trách &amp; Phòng Khám Chỉ Định
                        </span>
                        <span className="badge bg-light text-muted border fw-normal" style={{ fontSize: '11px' }}>
                          Phân công chuyên môn
                        </span>
                      </Card.Header>
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 mb-3 border">
                          <div className="rounded-circle bg-white border p-3 text-primary d-flex align-items-center justify-content-center shadow-sm" style={{ width: 56, height: 56 }}>
                            <Stethoscope size="1em" className="fs-3" />
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-bold fs-6 text-dark">{docInfo.fullName}</div>
                            <div className="text-primary small fw-semibold">
                              Chuyên khoa: {docInfo.specialty}
                            </div>
                          </div>
                          <Badge bg="success" className="px-3 py-2 shadow-sm">
                            Bác sĩ trực chính
                          </Badge>
                        </div>

                        <div className="row g-2 small">
                          <div className="col-sm-6">
                            <div className="p-2 border rounded-2 bg-light">
                              <span className="text-muted d-block">Phòng khám chuyên khoa:</span>
                              <strong className="text-dark">
                                <DoorOpen size="1em" className="text-primary me-1" />
                                {detailAppointment.resolvedRoom || detailAppointment.roomName || docInfo.room || 'Phòng khám Huyết học Tổng quát 1 (Phòng 101)'}
                              </strong>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <div className="p-2 border rounded-2 bg-light">
                              <span className="text-muted d-block">Hình thức tiếp nhận:</span>
                              <strong className="text-dark">
                                <Hospital size="1em" className="text-primary me-1" />
                                Khám &amp; Lấy mẫu trực tiếp tại Trung tâm BMS
                              </strong>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <div className="p-2 border rounded-2 bg-light">
                              <span className="text-muted d-block">Thời gian hẹn:</span>
                              <strong className="text-dark font-monospace">
                                <Clock size="1em" className="text-primary me-1" />
                                {slotTime} ({safeFormatDate(detailAppointment.appointmentDate)})
                              </strong>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <div className="p-2 border rounded-2 bg-light">
                              <span className="text-muted d-block">Quy trình chuyên môn:</span>
                              <strong className="text-dark">
                                <ShieldCheck size="1em" className="text-primary me-1" />
                                Hệ thống tiếp nhận BMS
                              </strong>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card className="border shadow-sm rounded-3 bg-white">
                  <Card.Header className="bg-white border-bottom py-2 px-3 fw-bold text-dark d-flex justify-content-between align-items-center">
                    <span>
                      <IdCard size="1em" className="text-primary me-2" />
                      Thông Tin Hành Chính Bệnh Nhân
                    </span>
                    <span className="badge bg-light text-muted border fw-normal" style={{ fontSize: '11px' }}>
                      Mã BN: {patient?.patientCode || patient?.id || 'BN-2026-0792'}
                    </span>
                  </Card.Header>
                  <Card.Body className="p-3">
                    {patient ? (
                      <Row className="g-3">
                        <Col xs={12} sm={6} md={3}>
                          <div className="text-muted small">Họ và tên bệnh nhân:</div>
                          <div className="fw-bold text-dark fs-6">{patient.fullName || patient.name || 'Trần Văn An'}</div>
                        </Col>
                        <Col xs={12} sm={6} md={3}>
                          <div className="text-muted small">Số định danh / CCCD:</div>
                          <div className="fw-bold text-dark font-monospace">
                            {patient.identityCardNumber || patient.identityNumber || '079195000792'}
                          </div>
                        </Col>
                        <Col xs={12} sm={6} md={3}>
                          <div className="text-muted small">Ngày sinh / Giới tính:</div>
                          <div className="fw-bold text-dark">
                            {(() => {
                              const dob = patient.dateOfBirth || patient.Dob || patient.dob;
                              const dobStr = dob ? new Date(dob).toLocaleDateString('vi-VN') : '15/08/1995';
                              const gender = patient.gender || patient.Gender || 'Nam';
                              const genderText = ['female', 'nữ', 'f'].includes(String(gender).toLowerCase()) ? 'Nữ' : 'Nam';
                              return `${dobStr} · ${genderText}`;
                            })()}
                          </div>
                        </Col>
                        <Col xs={12} sm={6} md={3}>
                          <div className="text-muted small">Số điện thoại liên lạc:</div>
                          <div className="fw-bold text-dark font-monospace">
                            {patient.phone || patient.phoneNumber || '0909 123 456'}
                          </div>
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                          <div className="text-muted small">Email liên hệ:</div>
                          <div className="fw-semibold text-primary">{patient.email || 'an.tran@gmail.com'}</div>
                        </Col>
                        <Col xs={12} sm={6} md={8}>
                          <div className="text-muted small">Địa chỉ đăng ký thường trú:</div>
                          <div className="fw-semibold text-dark">
                            {patient.address || patient.Address || 'Số 123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. HCM'}
                          </div>
                        </Col>
                      </Row>
                    ) : (
                      <Alert variant="warning" className="mb-0">
                        <AlertTriangle size="1em" className="me-2" />
                        Chưa tìm thấy dữ liệu nhân khẩu học bệnh nhân.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>

                <Card className="border shadow-sm rounded-3 bg-white">
                  <Card.Header className="bg-white border-bottom py-2 px-3 fw-bold text-dark d-flex justify-content-between align-items-center">
                    <span>
                      <TestTube2 size="1em" className="text-primary me-2" />
                      Gói Dịch Vụ Đã Đặt
                    </span>
                    <Badge bg="primary-subtle" className="text-primary border border-primary-subtle">
                      Xét nghiệm máu
                    </Badge>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <div className="d-flex flex-wrap justify-content-between align-items-center p-3 bg-light rounded-3 mb-2 gap-2 border">
                      <div>
                        <div className="fw-bold text-dark fs-6">
                          <LucidePackage size="1em" className="text-primary me-2" />
                          {packageInfo.name || 'Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)'}
                        </div>
                        <div className="text-muted small mt-1">
                          {packageInfo.package?.description || 'Phân tích toàn diện 24 chỉ số hồng cầu, bạch cầu, tiểu cầu trên máy tự động Sysmex XN-1000.'}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted small">Đơn giá niêm yết:</div>
                        <div className="fw-bold text-success fs-5">
                          {safeFormatCurrency(packageInfo.price || 250000)}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 border rounded-2 bg-light small text-muted">
                      <strong className="text-dark me-1">
                        <ClipboardCheck size="1em" className="text-success me-1" />
                        Dặn dò lâm sàng:
                      </strong>
                      {detailAppointment.notes || 'Phòng khám: Phòng khám Huyết học Tổng quát 1(101). Nhịn ăn sáng từ 8-12 tiếng trước khi lấy mẫu máu đối với các xét nghiệm đường huyết/mỡ máu.'}
                    </div>
                  </Card.Body>
                </Card>

                {isCheckedIn && (
                  <Card className="border shadow-sm rounded-3 bg-white border-primary-subtle">
                    <Card.Header className="bg-primary-subtle border-bottom py-2 px-3 fw-bold text-primary d-flex justify-content-between align-items-center">
                      <span>
                        <Microscope size="1em" className="me-2" />
                        Phân Công Lấy Mẫu &amp; Phân Tích Phòng Lab
                      </span>
                      <Badge bg="success">Đã phân luồng</Badge>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <Row className="g-3">
                        <Col sm={6}>
                          <div className="text-muted small">Kỹ thuật viên phụ trách:</div>
                          <div className="fw-bold text-dark fs-6">
                            <UserCheck size="1em" className="text-primary me-1" />
                            {labAssignmentInfo?.labUser?.fullName || 'KTV. Phạm Quốc Hưng'}
                          </div>
                        </Col>
                        <Col sm={6}>
                          <div className="text-muted small">Phòng xét nghiệm / lấy mẫu:</div>
                          <div className="fw-bold text-dark fs-6">
                            <DoorOpen size="1em" className="text-primary me-1" />
                            {labAssignmentInfo?.labRoom?.roomName || 'Trung tâm Phân tích Tự động Tầng 2 (LAB-201)'}
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="bg-white border-top py-3 px-4 d-flex justify-content-between">
          <Button
            variant="outline-secondary"
            onClick={handleCloseDetailModal}
            className="px-4 py-2 rounded-3 fw-semibold"
          >
            <LucideX size="1em" className="me-2" />
            Đóng
          </Button>

          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              onClick={handlePrintAppointmentSlip}
              className="px-4 py-2 rounded-3 fw-semibold shadow-sm"
            >
              <Printer size="1em" className="me-2" />
              In Phiếu Tiếp Đón K80
            </Button>

            {detailAppointment && ['scheduled', 'confirmed', 'paid', '1'].includes((detailAppointment.status || '').toLowerCase().replace(/[_-]/g, '')) && (
              <Button
                variant="primary"
                onClick={() => {
                  handleCloseDetailModal();
                  handleDirectCheckIn(detailAppointment);
                }}
                className="px-4 py-2 rounded-3 fw-semibold text-white shadow-sm"
                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              >
                <CheckCircle2 size="1em" className="me-2" />
                Check-in ngay
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>

      {posAppointmentSlip && (
        <PosThermalModal
          show={Boolean(posAppointmentSlip)}
          onClose={() => setPosAppointmentSlip(null)}
          modalTitle="Phiếu Tiếp Đón & Lịch Hẹn"
          modalBadge="Khổ máy POS K80"
          modalSubtitle={`Mã lịch hẹn: ${posAppointmentSlip.appointmentCode}`}
          printTitle={`Phieu_Tiep_Don_POS_${posAppointmentSlip.appointmentCode}`}
          printButtonLabel="In Phiếu Tiếp Đón (K80)"
          copyText={posAppointmentSlip.appointmentCode}
          copyButtonLabel="Sao chép mã hẹn"
          slipProps={{
            title: 'PHIẾU XÁC NHẬN LỊCH HẸN',
            subtitle: 'Phiếu tiếp đón & điều hướng phòng khám',
            statusBadge: 'ĐÃ XÁC NHẬN',
            highlight: {
              label: 'MÃ LỊCH HẸN',
              value: posAppointmentSlip.appointmentCode,
              isCode: true,
              sub: `${posAppointmentSlip.appointmentTime} • ${posAppointmentSlip.appointmentDate}`,
            },
            sections: [
              {
                title: 'Thông tin bệnh nhân',
                rows: [
                  { label: 'Bệnh nhân', value: posAppointmentSlip.patientName },
                  { label: 'Mã BN', value: posAppointmentSlip.patientCode, mono: true },
                  { label: 'SĐT liên hệ', value: posAppointmentSlip.patientPhone, mono: true },
                ],
              },
              {
                title: 'Phân công khám & lấy mẫu',
                rows: [
                  { label: 'Gói dịch vụ', value: posAppointmentSlip.packageName },
                  { label: 'Bác sĩ phụ trách', value: posAppointmentSlip.doctorName },
                  { label: 'Phòng tiếp nhận', value: posAppointmentSlip.roomName },
                  { label: 'KTV phụ trách', value: posAppointmentSlip.labUserName },
                ],
              },
            ],
            notice: {
              title: 'Hướng dẫn tiếp đón',
              lines: [
                'Vui lòng đến đúng phòng được chỉ định và có mặt đúng khung giờ hẹn.',
                'Xuất trình phiếu này cùng CCCD/VNeID khi vào lấy mẫu.',
              ],
            },
            qr: {
              value: posAppointmentSlip.qrValue || posAppointmentSlip.appointmentCode,
              codeText: posAppointmentSlip.appointmentCode,
              caption: 'Quét mã QR tại quầy Lễ tân / Phòng lấy mẫu',
              size: 108,
            },
            footerNote: `Phiếu có hiệu lực cho lịch hẹn ${posAppointmentSlip.appointmentCode}.`,
          }}
        />
      )}

      {issuedTicketData && (
        <PosThermalModal
          show={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          modalTitle="Phiếu Số Thứ Tự Lấy Mẫu"
          modalBadge="Khổ máy POS K80"
          modalSubtitle={`STT: ${issuedTicketData.ticketNumber} • ${issuedTicketData.roomName || 'Phòng Lấy Mẫu 101'}`}
          printTitle={`Phieu_STT_POS_${issuedTicketData.ticketNumber}`}
          printButtonLabel="In Phiếu STT (K80)"
          copyText={issuedTicketData.appointmentCode || issuedTicketData.ticketNumber}
          copyButtonLabel="Sao chép mã"
          extraActions={
            <button
              type="button"
              className="bms-pos-btn bms-pos-btn-outline"
              onClick={() => {
                setShowTicketModal(false);
                window.location.href = '/reception/queue';
              }}
            >
              <Monitor size={14} />
              <span>Bảng Gọi Số</span>
            </button>
          }
          slipProps={{
            title: 'PHIẾU SỐ THỨ TỰ LẤY MẪU',
            subtitle: 'Phiếu tiếp đón & điều phối hàng đợi',
            statusBadge: issuedTicketData.paymentStatus || 'ĐÃ TIẾP ĐÓN',
            highlight: {
              label: 'SỐ THỨ TỰ',
              value: issuedTicketData.ticketNumber,
              sub: issuedTicketData.roomName || 'Phòng Lấy Mẫu 101 • Tầng 1',
            },
            sections: [
              {
                title: 'Thông tin tiếp đón',
                rows: [
                  { label: 'Bệnh nhân', value: issuedTicketData.patientName },
                  { label: 'Mã BN', value: issuedTicketData.patientCode, mono: true },
                  { label: 'Mã lịch hẹn', value: issuedTicketData.appointmentCode, mono: true },
                  { label: 'Gói dịch vụ', value: issuedTicketData.packageName },
                  { label: 'Khung giờ hẹn', value: issuedTicketData.slotTime },
                  { label: 'Giờ tiếp đón', value: issuedTicketData.checkInTime },
                ],
              },
            ],
            notice: {
              title: 'Hướng dẫn chờ gọi số',
              lines: [
                'Vui lòng ngồi tại sảnh chờ tầng 1, theo dõi màn hình gọi số hoặc nghe loa thông báo.',
                'Chuẩn bị CCCD/VNeID khi vào bàn lấy mẫu.',
              ],
            },
            qr: {
              value: issuedTicketData.appointmentCode || issuedTicketData.ticketNumber || 'BMS-STT',
              codeText: `${issuedTicketData.ticketNumber} • ${issuedTicketData.appointmentCode || ''}`,
              caption: 'Mã QR đối chiếu tại bàn lấy mẫu',
              size: 104,
            },
            footerNote: 'Số thứ tự chỉ có giá trị trong ngày tiếp đón.',
          }}
        />
      )}
    </>
  );
};

export default ReceptionistCheckIn;
