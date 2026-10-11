/**
 * My Appointments Component
 * 
 * Patient appointment management component for the Blood Laboratory Management System.
 * Allows patients to view their appointments, check appointment details,
 * and cancel appointments with confirmation.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Button, Badge, Tooltip, OverlayTrigger, Modal, Form } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { appointmentService } from '../../../../services/appointmentService';
import { invoiceService } from '../../../../services/invoiceService';
import { medicalService } from '../../../../services/medicalService';
import { emailService } from '../../../../services/emailService';
import { patientService } from '../../../../services/patientService';
import { shiftService } from '../../../../services/shiftService';
import { vnpayService } from '../../../../services/vnpayService';
import { getPatientData, getPatientByEmail } from '../../../../services/patientDataPrefetchService';
import HighResQRCode from '../../../../shared/components/QRBarcode/QRCodeDisplay';
import PatientHeader from '../../../../components/Layout/PatientHeader';
import GuestFooter from '../../../../components/Layout/GuestFooter';
import api from '../../../../services/api';
import { setRefreshFlag, dispatchRefreshEvent } from '../../../../shared/hooks/useAutoRefresh';
import './MyAppointments.css';
import html2canvas from 'html2canvas';
import { FaDownload, FaPrint } from 'react-icons/fa';
import { StatusBadge } from '../../../../shared/utils/status/statusHelper';
import ConfirmDialog from '../../../../shared/components/ConfirmDialog/ConfirmDialog';

/**
 * My Appointments Component
 * 
 * Displays patient's appointments with ability to view details and cancel.
 * Provides appointment status tracking and service information.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.hideHeader - If true, hides the PatientHeader (used when embedded in Dashboard)
 * @returns {React.ReactNode} My appointments component
 */
const MyAppointments = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentResult, setPaymentResult] = useState(null); // Lưu thông tin kết quả thanh toán từ VNPay
  
  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelWithRefundWarning, setShowCancelWithRefundWarning] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmNoRefund, setConfirmNoRefund] = useState(false); // Checkbox cho trường hợp đã thanh toán
  
  // Removed edit functionality - patients can only cancel appointments

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Use ref to track if we've already checked for refresh flag in this render cycle
  const refreshCheckedRef = useRef(false);

  const [showCrudEdit, setShowCrudEdit] = useState(false);
    const [showCrudCreate, setShowCrudCreate] = useState(false);
  const [crudFormData, setCrudFormData] = useState({ id: '', appointmentTime: '', appointmentType: 'Khám', reasonForRescheduling: '' });

  
  const handleCrudDelete = async (apt) => {
      const reason = window.prompt('Nhập lý do hủy lịch (Bắt buộc):');
      if (reason === null) return;
      if (reason.trim() === '') {
          alert('Vui lòng nhập lý do hủy!');
          return;
      }
      try {
          await api.put(`/gateway/testorder/appointment/${apt.id || apt.appointmentId}`, { status: 'cancelled_by_patient', reasonForRescheduling: reason });
          loadData(true);
      } catch (error) {
          console.error('Error canceling:', error);
          alert('Lỗi khi hủy');
      }
  };

  const handleCrudCreateOpen = () => {
      setCrudFormData({ id: '', appointmentTime: '', appointmentType: 'Khám', reasonForRescheduling: '' });
      setShowCrudCreate(true);
  };
  const handleCrudEditOpen = (apt) => {
      setCrudFormData({
          id: apt.id || apt.appointmentId,
          appointmentTime: apt.appointmentTime ? new Date(apt.appointmentTime).toISOString().slice(0, 16) : '',
          appointmentType: apt.appointmentType || 'Khám',
          reasonForRescheduling: apt.reasonForRescheduling || ''
      });
      setShowCrudEdit(true);
  };
  const handleCrudCreateSubmit = async () => {
      try {
          let resolvedCreatedBy = user?.id || 'PATIENT';
          try {
              if (user?.email) {
                  const patRes = await getPatientByEmail(user.email);
                  if (patRes.success && patRes.data) {
                      resolvedCreatedBy = patRes.data.id || patRes.data.Id || resolvedCreatedBy;
                  }
              }
          } catch(e) {}
          
          const payload = {
              createdBy: resolvedCreatedBy,
              status: 'pending',
              appointmentTime: crudFormData.appointmentTime,
              appointmentType: crudFormData.appointmentType
          };
          await api.post('/gateway/testorder/appointment', payload);
          setShowCrudCreate(false);
          loadData(true);
      } catch (error) { alert('Lỗi khi tạo: ' + error.message); }
  };
  const handleCrudEditSubmit = async () => {
      try {
          const payload = {
              appointmentTime: crudFormData.appointmentTime,
              appointmentType: crudFormData.appointmentType,
              reasonForRescheduling: crudFormData.reasonForRescheduling
          };
          await api.put(`/gateway/testorder/appointment/${crudFormData.id}`, payload);
          setShowCrudEdit(false);
          loadData(true);
      } catch (error) { alert('Lỗi khi sửa: ' + error.message); }
  };

  /**
   * Effect: Load appointment data when user is available
   * 
   * This effect runs when the user object changes. It loads appointment data
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
   * Effect: Refresh appointments when navigating to page after booking
   * 
   * This effect checks for a refresh flag in sessionStorage when navigating
   * to the appointments page. If the flag is set (e.g., after booking a new
   * appointment), it forces a fresh data fetch to display the new appointment.
   * 
   * The refresh flag is set by other components (like booking page) to indicate
   * that appointments should be refreshed when user navigates here.
   * 
   * @effect
   * @dependencies {string} location.pathname - Current route path
   * @dependencies {Object} user - User object from auth context
   * @dependencies {boolean} hideHeader - Component prop
   */
  useEffect(() => {
    // Check if we just navigated to appointments page after booking
    const shouldRefresh = sessionStorage.getItem('shouldRefreshAppointments') === 'true';
    
    if (shouldRefresh && user && user.id && !refreshCheckedRef.current) {
      // Mark as checked
      refreshCheckedRef.current = true;
      // Clear the flag
      sessionStorage.removeItem('shouldRefreshAppointments');
      // Force fresh fetch to get the new appointment
      // Small delay to ensure backend has saved the appointment
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
   * This ensures appointments are refreshed even when the component is already
   * mounted but hidden (e.g., in a tabbed interface).
   * 
   * @effect
   * @dependencies [] - Runs only once on mount
   */
  useEffect(() => {
    // Reset refresh check when component is rendered
    refreshCheckedRef.current = false;
    
    // Check flag after a short delay to ensure it's set
    const checkTimer = setTimeout(() => {
      const shouldRefresh = sessionStorage.getItem('shouldRefreshAppointments') === 'true';
      if (shouldRefresh && user && user.id) {
        sessionStorage.removeItem('shouldRefreshAppointments');
        loadData(true);
      }
    }, 100);
    
    return () => clearTimeout(checkTimer);
  }, []); // Only run on mount/render

  /**
   * Effect: Listen for appointment created event
   * 
   * This effect sets up an event listener for the 'appointmentCreated' custom event.
   * When a new appointment is created (e.g., from booking page), this component
   * automatically refreshes the appointments list to show the new appointment.
   * 
   * Uses a 500ms delay to ensure backend has finished processing before fetching.
   * 
   * @effect
   * @dependencies {Object} user - User object from auth context
   */
  useEffect(() => {
    const handleAppointmentCreated = () => {
      // Refresh appointments list when a new appointment is created
      // Force fresh fetch to get the new appointment
      if (user && user.id) {
        // Small delay to ensure backend has saved the appointment
        setTimeout(() => {
          loadData(true); // Pass true to force fresh fetch
        }, 500);
      }
    };

    window.addEventListener('appointmentCreated', handleAppointmentCreated);
    
    return () => {
      window.removeEventListener('appointmentCreated', handleAppointmentCreated);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect: Listen for appointment cancelled event
   * 
   * This effect sets up an event listener for the 'appointmentCancelled' custom event.
   * When an appointment is cancelled (from this component or elsewhere), it refreshes
   * the appointments list to reflect the updated status.
   * 
   * Uses a 300ms delay to ensure backend has finished processing before fetching.
   * 
   * @effect
   * @dependencies {Object} user - User object from auth context
   */
  useEffect(() => {
    const handleAppointmentCancelled = () => {
      // Refresh appointments list when an appointment is cancelled
      // Force fresh fetch to get the updated appointment list
      if (user && user.id) {
        // Small delay to ensure backend has updated the appointment
        setTimeout(() => {
          loadData(true); // Pass true to force fresh fetch
        }, 300);
      }
    };

    window.addEventListener('appointmentCancelled', handleAppointmentCancelled);
    
    return () => {
      window.removeEventListener('appointmentCancelled', handleAppointmentCancelled);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect: Handle VNPay payment callback
   * 
   * This effect processes VNPay callback parameters when user returns from
   * the payment gateway. It checks URL query parameters for VNPay response
   * codes and transaction references, then calls handleVNPayCallback to
   * process the payment result.
   * 
   * After processing, it cleans up the URL by removing query parameters
   * to keep the URL clean.
   * 
   * @effect
   * @dependencies [] - Runs only once on mount to check initial URL
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vnpResponseCode = urlParams.get('vnp_ResponseCode');
    const vnpTxnRef = urlParams.get('vnp_TxnRef');
    const vnpAmount = urlParams.get('vnp_Amount');
    
    // Check if this is a VNPay callback
    if (vnpResponseCode || vnpTxnRef) {
      handleVNPayCallback(urlParams);
      // Clean up URL after processing
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Loads and enriches appointment data for the current patient
   * 
   * This function is the core data fetching function for the appointments page.
   * It performs the following operations:
   * 1. Retrieves the patient ID from the user's email (using PAT-xxx format, not ACC-xxx)
   * 2. Fetches appointments from the backend API
   * 3. Enriches each appointment with related data:
   *    - Doctor shift information (date, time, doctor, room)
   *    - Service/test package information
   *    - Patient information (name, phone, email)
   * 4. Handles fallback scenarios when nested data is not available
   * 
   * The enrichment process ensures that appointments have all necessary display information
   * even if the backend doesn't include nested objects, by matching IDs across different
   * data sources (shifts, services, doctors, rooms, lab assignments).
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and forces fresh data fetch.
   *                                        Used when we know data has changed (e.g., after booking/cancelling).
   * @returns {Promise<Array>} Array of enriched appointment objects with all display data populated.
   *                          Returns empty array if patient ID not found or on error.
   * 
   * @example
   * // Load cached data (default)
   * await loadData();
   * 
   * // Force fresh fetch after booking
   * await loadData(true);
   */
  const loadData = async (forceFresh = false) => {
    try {
      setLoading(true);
      
      // Lấy Patient ID (PAT-xxx) từ email, không dùng Account ID (ACC-xxx) - sử dụng cache
      let patientId = null;
      if (user?.email) {
        try {
          const patientResult = await getPatientByEmail(user.email, forceFresh);
          if (patientResult.success && patientResult.data) {
            patientId = patientResult.data.id || patientResult.data.Id;
          }
        } catch (err) {
          // Fallback: use account ID (may not work, but won't crash)
          patientId = user.id;
        }
      } else {
        patientId = user.id; // Fallback
      }

      if (!patientId) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      // Load appointments (force fresh if requested, otherwise use cache)
      const appointmentsResult = await getPatientData('appointments', forceFresh, patientId);
      
      if (appointmentsResult.success) {
        const rawAppointments = appointmentsResult.data || [];
        
        // Enrich appointments with additional data (sử dụng cache)
        const [shiftsResult, servicesResult, doctorsResult, roomsResult, labAssignmentsResult, patientResult] = await Promise.all([
          getPatientData('shifts').catch(() => ({ success: false, data: [] })),
          getPatientData('services').catch(() => ({ success: false, data: [] })),
          getPatientData('doctors').catch(() => ({ success: false, data: [] })),
          getPatientData('doctorRooms').catch(() => ({ success: false, data: [] })),
          api.get('/gateway/testorder/labassignment').catch(() => ({ data: [] })),
          getPatientByEmail(user.email).catch(() => ({ success: false, data: null }))
        ]);

        const shifts = shiftsResult.success ? shiftsResult.data : [];
        const services = servicesResult.success ? servicesResult.data : [];
        const doctors = Array.isArray(doctorsResult.data) ? doctorsResult.data : (doctorsResult.data?.data || []);
        const rooms = Array.isArray(roomsResult.data) ? roomsResult.data : (roomsResult.data?.data || []);
        const labAssignments = Array.isArray(labAssignmentsResult.data) 
          ? labAssignmentsResult.data 
          : (labAssignmentsResult.data?.data || []);
        const patient = patientResult.success ? patientResult.data : null;

        // Enrich each appointment
        const enrichedAppointments = rawAppointments.map(appointment => {
          const enriched = { ...appointment };
          
          // Map id fields (handle PascalCase from backend)
          enriched.id = appointment.AppointmentId || appointment.appointmentId || appointment.id;
          enriched.appointmentCode = appointment.AppointmentId || appointment.appointmentId || appointment.id;
          
          // Try to get data from nested DoctorShift first (if backend includes it)
          let shift = null;
          let shiftId = appointment.DoctorShiftId || appointment.doctorShiftId;
          
          // Check if backend includes nested DoctorShift object
          if (appointment.DoctorShift || appointment.doctorShift) {
            shift = appointment.DoctorShift || appointment.doctorShift;
            shiftId = shift.ShiftId || shift.shiftId || shift.id || shiftId;
          }
          
          // If no nested shift, try to find from shifts list
          let foundShiftData = false;
          if (!shift && shiftId && shifts.length > 0) {
            shift = shifts.find(s => {
              const sId = s.ShiftId || s.shiftId || s.id;
              return String(sId) === String(shiftId);
            });
          }
          
          if (shift) {
              foundShiftData = true;
              
              // Get appointment date from shift
              enriched.appointmentDate = shift.ShiftDate || shift.shiftDate || shift.date;
              
              // Get appointment time from shift
              const shiftStart = shift.ShiftStart || shift.shiftStart || shift.start;
              const shiftEnd = shift.ShiftEnd || shift.shiftEnd || shift.end;
              if (shiftStart) {
                if (typeof shiftStart === 'string') {
                  // Handle TimeOnly format (HH:MM:SS or HH:MM)
                  enriched.appointmentTime = shiftStart.substring(0, 5); // Take HH:MM
                } else {
                  enriched.appointmentTime = shiftStart;
                }
              }
              // Lưu shiftEnd để hiển thị theo ca
              if (shiftEnd) {
                if (typeof shiftEnd === 'string') {
                  enriched.shiftEnd = shiftEnd.substring(0, 5); // Take HH:MM
                } else {
                  enriched.shiftEnd = shiftEnd;
                }
              }
              
              // Get doctor ID from shift
              enriched.doctorId = shift.DoctorId || shift.doctorId || shift.doctor_id;
              
              // Try to get doctor from nested Doctor object in shift
              let doctor = null;
              if (shift.Doctor || shift.doctor) {
                doctor = shift.Doctor || shift.doctor;
                enriched.doctorName = doctor.FullName || doctor.fullName || doctor.name || doctor.Name;
              }
              
              // If no nested doctor, get doctor name from doctors list
              if (!doctor && enriched.doctorId && doctors.length > 0) {
                doctor = doctors.find(d => {
                  const dId = d.DoctorId || d.doctorId || d.id;
                  return String(dId) === String(enriched.doctorId);
                });
                if (doctor) {
                  enriched.doctorName = doctor.FullName || doctor.fullName || doctor.name || doctor.Name;
                }
              }
              
              // Get room from shift
              const roomId = shift.RoomId || shift.roomId || shift.room_id;
              
              // Try to get room from nested Room object in shift
              let room = null;
              if (shift.Room || shift.room || shift.DoctorRoom || shift.doctorRoom) {
                room = shift.Room || shift.room || shift.DoctorRoom || shift.doctorRoom;
                enriched.room = room.RoomName || room.roomName || room.name;
              }
              
              // If no nested room, get room from rooms list
              if (!room && roomId && rooms.length > 0) {
                room = rooms.find(r => {
                  const rId = r.RoomId || r.roomId || r.id;
                  return String(rId) === String(roomId);
                });
                if (room) {
                  enriched.room = room.RoomName || room.roomName || room.name;
                }
              }
          }
          
          // If no DoctorShift data, try LabAssignment
          if (!foundShiftData) {
            const labAssignmentId = appointment.LabAssignmentId || appointment.labAssignmentId;
            if (labAssignmentId && labAssignments.length > 0) {
              const labAssignment = labAssignments.find(la => {
                const laId = la.AssignmentId || la.assignmentId || la.id;
                return String(laId) === String(labAssignmentId);
              });
              
              if (labAssignment) {
                // Get appointment date from LabAssignment
                if (!enriched.appointmentDate) {
                  enriched.appointmentDate = labAssignment.AssignmentDate || labAssignment.assignmentDate || labAssignment.date;
                }
                
                // Get appointment time from LabAssignment
                if (!enriched.appointmentTime) {
                  const shiftStart = labAssignment.ShiftStart || labAssignment.shiftStart || labAssignment.start;
                  const shiftEnd = labAssignment.ShiftEnd || labAssignment.shiftEnd || labAssignment.end;
                  if (shiftStart) {
                    if (typeof shiftStart === 'string') {
                      enriched.appointmentTime = shiftStart.substring(0, 5); // Take HH:MM
                    } else {
                      enriched.appointmentTime = shiftStart;
                    }
                  }
                  // Lưu shiftEnd để hiển thị theo ca
                  if (shiftEnd) {
                    if (typeof shiftEnd === 'string') {
                      enriched.shiftEnd = shiftEnd.substring(0, 5); // Take HH:MM
                    } else {
                      enriched.shiftEnd = shiftEnd;
                    }
                  }
                }
                
                // Get room from LabAssignment
                if (!enriched.room) {
                  const labRoomId = labAssignment.LabRoomId || labAssignment.labRoomId;
                  if (labRoomId && rooms.length > 0) {
                    const room = rooms.find(r => {
                      const rId = r.RoomId || r.roomId || r.id;
                      return String(rId) === String(labRoomId);
                    });
                    if (room) {
                      enriched.room = room.RoomName || room.roomName || room.name;
                    }
                  }
                }
              }
            }
          }
          
          // Fallback: Use createdAt as appointmentDate if still no date
          if (!enriched.appointmentDate) {
            if (appointment.CreatedAt || appointment.createdAt) {
              const createdAt = appointment.CreatedAt || appointment.createdAt;
              try {
                const date = new Date(createdAt);
                if (!isNaN(date.getTime())) {
                  // Format as YYYY-MM-DD
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  enriched.appointmentDate = `${year}-${month}-${day}`;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
          
          // Fallback: Use default time if still no time
          if (!enriched.appointmentTime) {
            // Use a default time like "08:00" or leave empty
            enriched.appointmentTime = ''; // Leave empty if no time available
          }
          
          // Get service from TestPackage
          const testPackageId = appointment.TestPackageId || appointment.testPackageId;
          if (testPackageId && services.length > 0) {
            // Backend trả về PackageId (PascalCase) trong TestPackageDto
            // Match bằng PackageId trước (giống như trong Dashboard và openPaymentModal)
            const service = services.find(s => {
              const sId = s.PackageId || s.packageId || 
                         s.TestPackageId || s.testPackageId || 
                         s.id || s.Id;
              return String(sId) === String(testPackageId);
            });
            if (service) {
              enriched.service = service.PackageName || service.packageName || service.name || service.Name;
            } else {
              enriched.service = 'Xét nghiệm máu'; // Default service name
            }
          } else {
            // Fallback: Use default service name if no testPackageId
            enriched.service = 'Xét nghiệm máu'; // Default service name
          }
          
          // Get patient info
          if (patient) {
            enriched.patientName = patient.fullName || patient.FullName || patient.name || patient.Name;
            enriched.patientPhone = patient.phone || patient.Phone;
            enriched.patientEmail = patient.email || patient.Email || user.email;
            
            // Ensure patientName is set
            if (!enriched.patientName) {
              // Try to get from user context as fallback
              enriched.patientName = user?.fullName || user?.name || user?.username || 'Bệnh nhân';
            }
          } else {
            // Fallback: Use user context if patient data not loaded
            enriched.patientName = user?.fullName || user?.name || user?.username || 'Bệnh nhân';
            enriched.patientEmail = user?.email || '';
            enriched.patientPhone = user?.phone || '';
          }
          
          return enriched;
        });
        
        setAppointments(enrichedAppointments);
        
        // Return enriched appointments để có thể dùng ngay sau khi loadData()
        return enrichedAppointments;
      } else {
        setAppointments([]);
        return [];
      }

      // Skip services - endpoint not available
      // if (servicesResult.success) {
      //   setServices(servicesResult.data);
      // }
      setServices([]); // Set empty array as placeholder

      // Skip users endpoint - not available, use empty array
      // const doctorsList = usersResponse.data.filter(u => u.role === 'doctor');
      setDoctors([]); // Set empty array as placeholder
      
      // Skip invoices - payments service not ready
      // if (invoicesResp.success) {
      //   setInvoices(invoicesResp.data);
      // }
      setInvoices([]); // Set empty array as placeholder
    } catch (error) {
      showError('Lỗi tải dữ liệu');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Removed handleEdit function - patients can only cancel appointments

  /**
   * Generates a consistent GUID (UUID v4 format) from a string input
   * 
   * This helper function creates a deterministic GUID from any string (email, patient ID, etc.)
   * using a hash-based approach. The generated GUID follows UUID v4 format:
   * xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (36 characters total)
   * 
   * This is used to convert patient IDs (like "PAT-xxx") or emails into GUID format
   * required by the payment service backend, which expects GUID format for patientId.
   * 
   * The function uses multiple hash functions and combines them to ensure:
   * - Consistency: Same input always produces same output
   * - Uniqueness: Different inputs produce different outputs
   * - Valid format: Output matches UUID v4 specification
   * 
   * @param {string} str - Input string to convert to GUID (e.g., email, patient ID)
   * @returns {string} GUID string in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * 
   * @example
   * generateGuidFromString('PAT-123') // Returns: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
   * generateGuidFromString('user@example.com') // Returns: 'f6e5d4c3-b2a1-4f9e-8d7c-6b5a4f3e2d1c'
   */
  const generateGuidFromString = (str) => {
    // Simple hash function for consistency
    let hash1 = 0;
    let hash2 = 0;
    let hash3 = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1;
      hash2 = ((hash2 << 3) - hash2) + char;
      hash2 = hash2 & hash2;
      hash3 = ((hash3 << 7) - hash3) + char;
      hash3 = hash3 & hash3;
    }
    
    // Generate GUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (36 chars total)
    // where x is any hexadecimal digit and y is one of 8, 9, A, or B
    // Format breakdown: 8-4-4-4-12 = 32 hex chars + 4 hyphens = 36 total
    
    const h1 = Math.abs(hash1).toString(16).padStart(8, '0').substring(0, 8);
    const h2 = Math.abs(hash2).toString(16).padStart(4, '0').substring(0, 4);
    const h3 = Math.abs((hash1 ^ hash2)).toString(16).padStart(4, '0').substring(0, 3);
    const h4 = ((Math.abs(hash1) & 0x3) | 0x8).toString(16); // y must be 8, 9, a, or b
    
    // Generate last 12 hex digits from multiple hash combinations
    const part1 = Math.abs((hash1 + hash2)).toString(16).padStart(12, '0');
    const part2 = Math.abs((hash2 + hash3)).toString(16).padStart(12, '0');
    const part3 = Math.abs((hash1 + hash3)).toString(16).padStart(12, '0');
    const part4 = Math.abs((hash1 * hash2 + hash3)).toString(16).padStart(12, '0');
    
    // Combine parts to ensure we have enough characters (at least 15 for h5a + h5b)
    const combined = (part1 + part2 + part3 + part4).padStart(48, '0');
    
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // h1(8) - h2(4) - 4h3(3) - h4(1)h5a(3) - h5b(12)
    // Total: 8 + 4 + 4 + 4 + 12 = 32 hex + 4 hyphens = 36 chars
    const h5a = combined.substring(0, 3);
    // Get remaining characters from index 3 onwards, ensure we have 12
    let h5b = combined.substring(3);
    // Ensure h5b has exactly 12 characters by padding or truncating
    if (h5b.length < 12) {
      h5b = h5b.padEnd(12, '0');
    } else {
      h5b = h5b.substring(0, 12);
    }
    
    const guid = `${h1}-${h2}-4${h3}-${h4}${h5a}-${h5b}`;
    
    // Debug: verify GUID length
    if (guid.length !== 36) {
    }
    
    return guid;
  };

  /**
   * Initiates VNPay payment process for an appointment
   * 
   * This function handles the complete VNPay payment flow:
   * 1. Validates patient information and generates GUID for payment service
   * 2. Creates a payment record in the backend
   * 3. Generates VNPay payment URL with all required parameters
   * 4. Redirects user to VNPay gateway for payment
   * 
   * The function handles multiple fallback scenarios:
   * - Patient ID lookup from patient service
   * - GUID generation from patient ID, email, or account ID
   * - Amount calculation from invoice or default value
   * - Error handling with detailed validation messages
   * 
   * After successful payment, user is redirected back to this page with callback parameters,
   * which are handled by handleVNPayCallback function.
   * 
   * @param {Object} [invoice] - Invoice object containing payment amount. If not provided,
   *                             uses selectedInvoice from component state.
   * @param {Object} appointment - Appointment object to link payment to. Required for
   *                               payment record creation and appointment status update.
   * 
   * @returns {Promise<void>} Does not return a value. On success, redirects to VNPay.
   *                         On error, shows error notification and resets payment status.
   * 
   * @example
   * // Payment with invoice
   * await handleVNPayPayment(invoice, appointment);
   * 
   * // Payment without invoice (uses selectedInvoice from state)
   * await handleVNPayPayment(null, appointment);
   */
  const handleVNPayPayment = async (invoice, appointment) => {
    try {
      setPaymentStatus('processing');
      
      // Use selectedInvoice from state if invoice parameter is not provided
      const invoiceToUse = invoice || selectedInvoice;
      
      // Payment service requires PatientId as Guid
      // Patient ID from Patient service is "PAT-xxx" (string), not GUID
      // We need to get the actual Patient ID and generate a consistent GUID from it
      let patientGuid = null;
      
      // First, try to get Patient ID from patient service
      if (user?.email) {
        try {
          const patientResult = await patientService.getPatientByEmail(user.email);
          if (patientResult.success && patientResult.data) {
            const patientId = patientResult.data.id || patientResult.data.Id;
            if (patientId) {
              // Generate a consistent GUID from Patient ID (e.g., "PAT-xxx")
              patientGuid = generateGuidFromString(patientId);
            }
          }
        } catch (err) {
        }
      }
      
      // Fallback: generate GUID from email if patient ID not found
      if (!patientGuid && user?.email) {
        patientGuid = generateGuidFromString(user.email);
      }
      
      // Last fallback: generate GUID from Account ID
      if (!patientGuid && user?.id) {
        patientGuid = generateGuidFromString(user.id);
      }
      
      if (!patientGuid) {
        showError('Không tìm thấy thông tin bệnh nhân');
        setPaymentStatus('idle');
        return;
      }

      // Validate that patientGuid is a valid GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(patientGuid)) {
        showError(`Lỗi tạo ID thanh toán`);
        setPaymentStatus('idle');
        return;
      }

      // Calculate amount (ensure it's a number)
      // Try to get amount from invoice, fallback to default amount (500000 VND)
      let amount = parseFloat(invoiceToUse?.totalAmount || invoiceToUse?.amount || 0);
      
      // If no invoice or amount is 0, use default amount
      if (!invoiceToUse || amount <= 0) {
        amount = 500000; // Default amount in VND
      }
      
      if (isNaN(amount) || amount <= 0) {
        showError('Số tiền thanh toán không hợp lệ');
        setPaymentStatus('idle');
        return;
      }

      // Create payment record first
      // Note: CreatedAt has default value in backend (DateTime.UtcNow), so we can omit it
      // Backend JSON serializer converts to camelCase, so use camelCase property names
      const paymentData = {
        patientId: patientGuid, // GUID string format - camelCase (ASP.NET Core default)
        amount: parseFloat(amount.toFixed(2)), // Ensure it's a number, not string
        appointmentId: appointment?.id || null, // Link payment to appointment for PaymentHistory
        notes: `Thanh toán lịch hẹn ${appointment?.appointmentCode || appointment?.id || 'N/A'}`
        // createdAt: omitted - backend will set it automatically
      };

      // Validate payload before sending
      if (!paymentData.patientId || typeof paymentData.patientId !== 'string') {
        showError('Lỗi: patientId không hợp lệ');
        setPaymentStatus('idle');
        return;
      }
      
      if (!paymentData.amount || isNaN(paymentData.amount) || paymentData.amount <= 0) {
        showError('Lỗi: Số tiền không hợp lệ');
        setPaymentStatus('idle');
        return;
      }

      let createPaymentResult;
      try {
        createPaymentResult = await api.post('/gateway/payments', paymentData);
        
        if (!createPaymentResult.data) {
          showError('Lỗi tạo bản ghi thanh toán');
          setPaymentStatus('idle');
          return;
        }
        
      } catch (error) {
        // Enhanced error handling to show backend validation errors
        // Check for nested data.errors (some APIs wrap errors in data property)
        const errorData = error.response?.data?.data || error.response?.data;
        
        // Check for ModelState errors (ASP.NET Core validation errors)
        // ASP.NET Core returns errors in format: { "errors": { "PatientId": ["error1", "error2"] } }
        if (errorData?.errors) {
          // Process ModelState errors if needed
        } else if (error.response?.data?.errors) {
          // Direct errors property - process if needed
        }
        
        // Extract ModelState errors from backend if available
        let errorMessage = 'Lỗi tạo bản ghi thanh toán';
        if (error.response?.data) {
          const errorData = error.response.data;
          
          // Check for errors object (ASP.NET Core ModelState format)
          if (errorData.errors && typeof errorData.errors === 'object') {
            const modelStateErrors = [];
            for (const [key, value] of Object.entries(errorData.errors)) {
              if (Array.isArray(value)) {
                modelStateErrors.push(`${key}: ${value.join(', ')}`);
              } else if (typeof value === 'string') {
                modelStateErrors.push(`${key}: ${value}`);
              }
            }
            if (modelStateErrors.length > 0) {
              errorMessage = `Lỗi validation: ${modelStateErrors.join('; ')}`;
            }
          }
          
          // Check for direct message
          if (!errorMessage || errorMessage === 'Lỗi tạo bản ghi thanh toán') {
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.title) {
              errorMessage = errorData.title;
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            }
          }
        }
        
        showError(errorMessage);
        setPaymentStatus('idle');
        return;
      }

      const paymentId = createPaymentResult.data.PaymentId || createPaymentResult.data.paymentId;

      // Create VNPay payment URL
      const description = `Thanh toan don xet nghiem - Ma lich hen: ${appointment?.appointmentCode || appointment?.id || 'N/A'}`;
      // Use the amount variable already calculated above
      
      const vnpayResult = await vnpayService.createPaymentUrl(amount, description);
      
      if (!vnpayResult.success || !vnpayResult.url) {
        showError(vnpayResult.message || 'Lỗi tạo URL thanh toán VNPay');
        setPaymentStatus('idle');
        return;
      }

      // Store payment info in sessionStorage for callback
      sessionStorage.setItem('pendingPayment', JSON.stringify({
        paymentId: paymentId,
        invoiceId: invoiceToUse?.id || null,
        appointmentId: appointment?.id,
        amount: amount
      }));

      // Redirect to VNPay
      window.location.href = vnpayResult.url;
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Lỗi xử lý thanh toán VNPay');
      setPaymentStatus('idle');
    }
  };

  // Handle VNPay callback
  /**
   * Handles VNPay payment callback after user returns from payment gateway
   * 
   * This function processes the response from VNPay after payment completion.
   * It performs the following operations:
   * 1. Extracts payment response parameters from URL query string
   * 2. Validates payment response code and transaction reference
   * 3. Verifies payment signature (if implemented)
   * 4. Updates payment record status in backend
   * 5. Updates appointment status to 'confirmed' if payment successful
   * 6. Sets refresh flags for appointments and payment history
   * 7. Dispatches custom events to notify other components
   * 8. Shows success/error notifications to user
   * 
   * The function handles both success and failure scenarios:
   * - Success (vnp_ResponseCode === '00'): Payment completed, update records
   * - Failure: Show error message, keep appointment in pending state
   * 
   * @param {URLSearchParams} urlParams - URL search parameters from VNPay callback.
   *                                     Contains vnp_ResponseCode, vnp_TxnRef, vnp_Amount, etc.
   * 
   * @returns {Promise<void>} Does not return a value. Updates component state and
   *                        shows notifications based on payment result.
   * 
   * @example
   * // Called automatically when component detects VNPay callback in URL
   * const urlParams = new URLSearchParams(window.location.search);
   * await handleVNPayCallback(urlParams);
   */
  const handleVNPayCallback = async (urlParams) => {
    // Define restorePaymentData function at the top level of the function
    // so it can be accessed from all blocks (if, else, catch)
    const restorePaymentData = (pendingPaymentData, appointmentsList, isSuccess = false) => {
      if (!pendingPaymentData) return;
      
      // Restore appointment nếu có appointmentId
      if (pendingPaymentData.appointmentId) {
        // Sử dụng appointmentsList nếu có, nếu không thì dùng state appointments
        const appointmentsToSearch = appointmentsList || appointments;
        const restoredAppointment = appointmentsToSearch.find(a => a.id === pendingPaymentData.appointmentId);
        
        if (restoredAppointment) {
          setSelectedAppointmentForPayment(restoredAppointment);
          
          // Tạo invoice object từ appointment data
          setSelectedInvoice({
            id: pendingPaymentData.paymentId || pendingPaymentData.invoiceId || 'temp',
            appointmentId: pendingPaymentData.appointmentId,
            totalAmount: pendingPaymentData.amount || restoredAppointment.amount || 500000,
            amount: pendingPaymentData.amount || restoredAppointment.amount || 500000,
            status: isSuccess ? 'paid' : 'failed'
          });
        }
      }
    };

    try {
      const vnpResponseCode = urlParams.get('vnp_ResponseCode');
      const vnpTxnRef = urlParams.get('vnp_TxnRef');
      const vnpAmount = urlParams.get('vnp_Amount');
      const vnpTransactionStatus = urlParams.get('vnp_TransactionStatus');
      const vnpOrderInfo = urlParams.get('vnp_OrderInfo');
      const vnpTransactionNo = urlParams.get('vnp_TransactionNo');
      const vnpPayDate = urlParams.get('vnp_PayDate');
      const vnpBankCode = urlParams.get('vnp_BankCode');
      const vnpCardType = urlParams.get('vnp_CardType');
      

      // Backend has already verified and redirected to frontend
      // We can trust the query params from VNPay
      // Check if payment was successful based on VNPay response code
      const isSuccess = vnpResponseCode === '00' && vnpTransactionStatus === '00';
      
      // Parse VNPay date format: YYYYMMDDHHmmss -> ISO string
      let timestamp = new Date().toISOString();
      if (vnpPayDate && vnpPayDate.length === 14) {
        try {
          // Format: 20251118093238 -> 2025-11-18T09:32:38
          const year = vnpPayDate.substring(0, 4);
          const month = vnpPayDate.substring(4, 6);
          const day = vnpPayDate.substring(6, 8);
          const hour = vnpPayDate.substring(8, 10);
          const minute = vnpPayDate.substring(10, 12);
          const second = vnpPayDate.substring(12, 14);
          timestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        } catch (dateError) {
          // Ignore date parsing errors
        }
      }
      
      // Build callback data object from query params
      const callbackData = {
        isSuccess: isSuccess,
        paymentResponse: {
          code: vnpResponseCode ? parseInt(vnpResponseCode) : 0,
          description: isSuccess ? 'Giao dịch thành công' : (vnpResponseCode === '24' ? 'Giao dịch bị hủy bởi người dùng' : 'Giao dịch thất bại')
        },
        transactionStatus: {
          code: vnpTransactionStatus ? parseInt(vnpTransactionStatus) : 0,
          description: isSuccess ? 'Giao dịch thành công' : 'Giao dịch thất bại'
        },
        vnpayTransactionId: vnpTransactionNo ? parseInt(vnpTransactionNo) : 0,
        paymentMethod: vnpCardType || 'ATM',
        bankingInfor: {
          bankCode: vnpBankCode || 'N/A',
          bankTransactionId: vnpTxnRef || 'N/A'
        },
        description: vnpOrderInfo || '',
        timestamp: timestamp,
        // Thêm các thông tin chi tiết
        transactionCode: vnpTxnRef,
        bankCode: vnpBankCode,
        cardType: vnpCardType,
        amount: vnpAmount ? parseFloat(vnpAmount) / 100 : null,
        payDate: vnpPayDate
      };
      
      // Lưu payment result vào state để hiển thị ở bước 3
      setPaymentResult(callbackData);

      // Get pending payment info
      const pendingPaymentStr = sessionStorage.getItem('pendingPayment');

      const pendingPayment = pendingPaymentStr ? JSON.parse(pendingPaymentStr) : null;
      if (pendingPaymentStr) {
        sessionStorage.removeItem('pendingPayment');
      }

      // restorePaymentData function is now defined at the top of handleVNPayCallback

      // Payment success is already determined from VNPay response code
      if (callbackData.isSuccess) {
        // Update payment record with transaction info
        try {
          const amount = vnpAmount ? parseFloat(vnpAmount) / 100 : (pendingPayment?.amount || 0); // VNPay returns amount * 100
          
          // Update payment status if we have paymentId
          // Backend endpoint: PUT /payments/{id}/status
          if (pendingPayment?.paymentId) {
            await api.put(`/gateway/payments/${pendingPayment.paymentId}/status`, {
              Status: 'Success',
              TransactionCode: vnpTxnRef,
              TxnRef: vnpTxnRef
            });
          }

          // Update invoice/payment record status
          // Note: PaymentHistory loads from payment table, so we need to ensure payment record is updated
          if (pendingPayment?.paymentId) {
            try {
              // IMPORTANT: Update payment record with appointment link if available
              // This is critical for PaymentHistory to match payment with appointment
              const updatePayload = {
                Status: 'Success',
                TransactionCode: vnpTxnRef,
                TxnRef: vnpTxnRef,
                PaidAt: new Date().toISOString()
              };
              
              // Always include AppointmentId if available (even if it was set during creation)
              // This ensures the link is maintained after payment success
              if (pendingPayment.appointmentId) {
                updatePayload.AppointmentId = pendingPayment.appointmentId;
              }
              
              await api.put(`/gateway/payments/${pendingPayment.paymentId}`, updatePayload);
              
              // Verify the update was successful by checking the response
              // (Some backends return the updated record)
            } catch (updateError) {
              console.error('Error updating payment record with AppointmentId:', updateError);
              // Don't ignore - log the error but continue
              // Payment status was already updated above, but AppointmentId link might be missing
            }
          }

          // Update invoice status (if invoice exists)
          if (pendingPayment?.invoiceId) {
            await invoiceService.recordPayment(pendingPayment.invoiceId, {
              amount: amount,
              paymentMethod: 'vnpay',
              transactionCode: vnpTxnRef,
              paidAt: new Date().toISOString()
            });
          }

          // Update appointment status to 'confirmed' (Đặt lịch thành công)
          let appointmentStatusUpdateError = null;
          if (pendingPayment?.appointmentId) {
            try {
              const statusResult = await appointmentService.updateAppointmentStatus(pendingPayment.appointmentId, 'confirmed');
              
              if (!statusResult.success) {
                appointmentStatusUpdateError = new Error(statusResult.message || 'Failed to update appointment status');
              }
            } catch (statusError) {
              appointmentStatusUpdateError = statusError;
              // Don't throw - continue with other updates
            }
          }

          // Send confirmation email
          if (user?.email) {
            try {
              const appointment = appointments.find(a => a.id === pendingPayment.appointmentId);
              await emailService.sendPaymentConfirmation({
                email: user.email,
                appointmentCode: appointment?.appointmentCode || 'N/A',
                amount: amount
              });
            } catch (emailError) {
              // Ignore email errors
            }
          }

          // IMPORTANT: Wait a bit to ensure all backend updates are complete
          // before refreshing data and dispatching events
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Set refresh flag and dispatch events for auto-refresh
          setRefreshFlag('appointments');
          dispatchRefreshEvent('appointments', 'updated', { appointmentId: pendingPayment?.appointmentId });
          
          // Set refresh flag for payment history
          setRefreshFlag('payments');
          setRefreshFlag('paymentHistory'); // Also set alternative flag name
          sessionStorage.setItem('shouldRefreshPayments', 'true');
          sessionStorage.setItem('shouldRefreshPaymentHistory', 'true');
          
          // Dispatch event for payments
          dispatchRefreshEvent('payments', 'created', { 
            appointmentId: pendingPayment?.appointmentId,
            paymentId: pendingPayment?.paymentId 
          });
          
          // Reload data to get updated appointment status (force fresh fetch)
          const loadedAppointments = await loadData(true);
          
          // Restore payment data sau khi loadData() để có appointments list
          // Truyền loadedAppointments trực tiếp để tránh vấn đề state chưa cập nhật
          restorePaymentData(pendingPayment, loadedAppointments, true);
          
          // Show success/error messages
          if (appointmentStatusUpdateError) {
            // Payment succeeded but appointment status update failed
            showError('Thanh toán thành công nhưng có lỗi khi cập nhật trạng thái lịch hẹn');
            showSuccess('Thanh toán thành công!');
          } else {
            // Everything succeeded
            showSuccess('Thanh toán thành công! Lịch hẹn đã được xác nhận.');
          }
          
          // Dispatch event to notify PaymentHistory to refresh
          // Additional delay to ensure payment record is fully saved in database
          // Use longer delay to ensure backend has committed the transaction
          setTimeout(() => {
            console.log('MyAppointments: Dispatching paymentCompleted event', {
              appointmentId: pendingPayment?.appointmentId,
              paymentId: pendingPayment?.paymentId
            });
            window.dispatchEvent(new CustomEvent('paymentCompleted', {
              detail: {
                appointmentId: pendingPayment?.appointmentId,
                paymentId: pendingPayment?.paymentId,
                timestamp: new Date().toISOString()
              }
            }));
          }, 2000); // Increased delay to 2 seconds
          
          // Chuyển sang bước 3 để hiển thị kết quả thành công
          setPaymentStatus('success');
          setPaymentStep(3);
          
          // Mở lại modal nếu đã đóng (trong trường hợp user đóng modal trước khi callback)
          setShowPaymentModal(true);
          
          // Clean URL without callback params (không navigate, chỉ clean URL)
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        } catch (updateError) {
          // Show detailed error message
          const errorMessage = updateError.response?.data?.message || 
                              updateError.message || 
                              'Thanh toán thành công nhưng có lỗi khi cập nhật trạng thái';
          showError(errorMessage);
          
          // Still show success message for payment
          showSuccess('Thanh toán thành công!');
          
          // Set refresh flag and dispatch events for auto-refresh
          setRefreshFlag('appointments');
          dispatchRefreshEvent('appointments', 'updated', { appointmentId: pendingPayment?.appointmentId });
          
          // Reload data to show current state (force fresh fetch)
          try {
            const loadedAppointments = await loadData(true);
            // Restore payment data nếu có
            if (pendingPayment) {
              restorePaymentData(pendingPayment, loadedAppointments, true);
            }
          } catch (loadError) {
            // Ignore load errors
          }
          
          // Close modal and redirect
          // Set refresh flag before navigating to ensure data refreshes on the appointments page
          setRefreshFlag('appointments');
          dispatchRefreshEvent('appointments', 'updated', { appointmentId: pendingPayment?.appointmentId });
          
          setShowPaymentModal(false);
          setPaymentStatus('idle');
          setPaymentStep(1);
          navigate('/patient/appointments', { replace: true });
        }
      } else {
        // Payment failed or cancelled
        let errorMessage = 'Thanh toán thất bại. Vui lòng thử lại.';
        
        // Get detailed error message from backend response
        if (callbackData) {
          if (callbackData.paymentResponse?.description) {
            errorMessage = callbackData.paymentResponse.description;
          } else if (callbackData.transactionStatus?.description) {
            errorMessage = callbackData.transactionStatus.description;
          } else if (callbackData.description) {
            errorMessage = callbackData.description;
          }
        }
        
        // Check if payment was cancelled by user
        const isCancelled = callbackData?.paymentResponse?.code === 24 || 
                           callbackData?.paymentResponse?.description?.includes('hủy') ||
                           callbackData?.paymentResponse?.description?.includes('cancelled');
        
        if (isCancelled) {
          errorMessage = 'Giao dịch đã bị hủy bởi người dùng.';
        }
        
        // Update payment status to Failed if we have paymentId
        // Backend endpoint: PUT /payments/{id}/status
        if (pendingPayment?.paymentId) {
          try {
            await api.put(`/gateway/payments/${pendingPayment.paymentId}/status`, {
              Status: 'Failed',
              TransactionCode: null,
              TxnRef: null
            });
          } catch (updateError) {
            // Ignore update errors
          }
        }
        
        showError(errorMessage);
        setPaymentStatus('failed');
        setPaymentStep(3);
        
        // Reload data to refresh appointment list trước
        const loadedAppointments = await loadData();
        
        // Restore selectedInvoice and selectedAppointmentForPayment từ pendingPayment sau khi loadData()
        // Truyền loadedAppointments trực tiếp để tránh vấn đề state chưa cập nhật
        restorePaymentData(pendingPayment, loadedAppointments, false);
        
        // Mở lại modal và chuyển sang bước 3 để hiển thị kết quả thất bại
        setShowPaymentModal(true);
        
        // Clean URL without callback params (không navigate, chỉ clean URL)
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    } catch (error) {
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Lỗi xử lý kết quả thanh toán';
      showError(errorMessage);
      
      // Chuyển sang bước 3 để hiển thị lỗi
      setPaymentStatus('failed');
      setPaymentStep(3);
      
      // Reload data trước để có appointments list
      let loadedAppointments = [];
      try {
        loadedAppointments = await loadData() || [];
      } catch (loadError) {
        // Ignore load errors
      }
      
      // Try to restore data from sessionStorage if available
      try {
        const pendingPaymentStr = sessionStorage.getItem('pendingPayment');
        if (pendingPaymentStr) {
          const pendingPayment = JSON.parse(pendingPaymentStr);
          // Sử dụng loadedAppointments thay vì state appointments
          restorePaymentData(pendingPayment, loadedAppointments, false);
          sessionStorage.removeItem('pendingPayment');
        }
      } catch (restoreError) {
        // Ignore restore errors
      }
      
      setShowPaymentModal(true);
      
      // Clean URL without callback params
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  };

  /**
   * Initiates appointment cancellation process
   * 
   * This function is the entry point for cancelling an appointment. It determines
   * which confirmation dialog to show based on appointment status:
   * 
   * 1. **Pending/Pending Payment**: Shows simple confirmation dialog (no refund warning)
   *    - Status: 'pending_confirmation' or 'pending_payment'
   *    - User hasn't paid yet, so no refund concerns
   * 
   * 2. **Scheduled/Confirmed**: Shows warning dialog with no-refund checkbox
   *    - Status: 'scheduled' or 'confirmed'
   *    - User has paid, so must acknowledge no refund policy
   * 
   * 3. **Other statuses**: Shows error (cannot cancel)
   *    - Appointments that are checked-in, completed, or already cancelled
   * 
   * The actual cancellation is performed by confirmCancel() after user confirms.
   * 
   * @param {string|number} appointmentId - ID of the appointment to cancel
   * 
   * @returns {void} Does not return a value. Shows appropriate dialog or error message.
   * 
   * @example
   * // Cancel pending appointment
   * handleCancel('APT-123');
   * 
   * // Cancel paid appointment (shows refund warning)
   * handleCancel('APT-456');
   */
  const handleCancel = (appointmentId) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    // Normalize status để so sánh
    const normalizedStatus = normalizeStatus(appointment.status);
    
    setAppointmentToCancel(appointmentId);
    
    // Trường hợp 1: Chờ xác nhận (pending_confirmation) - chưa thanh toán
    if (normalizedStatus === 'pending_confirmation' || normalizedStatus === 'pending_payment') {
      setShowConfirmDialog(true);
      setShowCancelWithRefundWarning(false);
    } 
    // Trường hợp 2: Đã thanh toán thành công (scheduled/confirmed) - có cảnh báo không hoàn tiền
    else if (normalizedStatus === 'scheduled' || normalizedStatus === 'confirmed') {
      setShowCancelWithRefundWarning(true);
      setShowConfirmDialog(false);
      setConfirmNoRefund(false); // Reset checkbox
    } else {
      showError(`Không thể hủy lịch hẹn với trạng thái: ${appointment.status}`);
    }
  };

  /**
   * Confirms and executes appointment cancellation
   * 
   * This function performs the actual cancellation after user has confirmed.
   * It performs the following operations:
   * 1. Updates appointment status to 'cancelled' in backend
   * 2. Saves cancellation info to localStorage for Dashboard slot refresh
   * 3. Sets refresh flags to trigger data reload
   * 4. Dispatches 'appointmentCancelled' event for other components
   * 5. Forces fresh data fetch to update appointment list
   * 6. Closes confirmation dialogs and resets state
   * 
   * The function handles both paid and unpaid appointments:
   * - Paid appointments: User must have checked "no refund" checkbox
   * - Unpaid appointments: Simple cancellation without refund concerns
   * 
   * After cancellation, the appointment slot becomes available again for booking.
   * 
   * @returns {Promise<void>} Does not return a value. Updates backend, refreshes data,
   *                         and shows success/error notifications.
   * 
   * @example
   * // Called when user clicks "Xác nhận" in cancellation dialog
   * await confirmCancel();
   */
  const confirmCancel = async () => {
    if (!appointmentToCancel) return;
    
    setIsCancelling(true);
    try {
      // Lấy thông tin appointment trước khi hủy để cập nhật slot
      const appointment = appointments.find(a => a.id === appointmentToCancel);
      const appointmentDate = appointment?.appointmentDate || appointment?.appointment_date || appointment?.AppointmentDate;
      const shiftId = appointment?.doctorShiftId || appointment?.DoctorShiftId || appointment?.doctor_shift_id || appointment?.shiftId;
      
      // Update appointment status to cancelled
      const result = await appointmentService.updateAppointmentStatus(appointmentToCancel, 'cancelled');
      if (!result.success) {
        showError(result.message || 'Lỗi hủy lịch hẹn');
        return;
      }

      // Lưu thông tin appointment vừa hủy vào localStorage để Dashboard có thể refresh slot
      if (appointmentDate && shiftId) {
        try {
          const cancelledAppointmentInfo = {
            appointmentId: appointmentToCancel,
            appointmentDate: appointmentDate,
            shiftId: shiftId,
            cancelledAt: new Date().toISOString()
          };
          localStorage.setItem('lastCancelledAppointment', JSON.stringify(cancelledAppointmentInfo));
        } catch (err) {
          // Ignore save errors
        }
      }

      showSuccess('Hủy lịch hẹn thành công');
      
      // Set flag to trigger refresh (similar to booking)
      sessionStorage.setItem('shouldRefreshAppointments', 'true');
      
      // Dispatch custom event để notify other components (e.g., Dashboard) to refresh
      window.dispatchEvent(new CustomEvent('appointmentCancelled', {
        detail: {
          appointmentId: appointmentToCancel,
          appointmentDate: appointmentDate,
          shiftId: shiftId
        }
      }));
      
      // Force fresh fetch to get updated appointment list
      loadData(true);
      
      setShowConfirmDialog(false);
      setShowCancelWithRefundWarning(false);
      setAppointmentToCancel(null);
      setConfirmNoRefund(false);
    } catch (error) {
      showError('Lỗi hủy lịch hẹn: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setIsCancelling(false);
    }
  };

  // Removed handleUpdate function - patients can only cancel appointments

  /**
   * Normalizes appointment status string to consistent format
   * 
   * This utility function standardizes status strings by:
   * 1. Converting to lowercase
   * 2. Replacing spaces and hyphens with underscores
   * 
   * This ensures consistent status comparison regardless of how the backend
   * returns the status (e.g., "Pending Confirmation", "pending-confirmation",
   * "PENDING_CONFIRMATION" all become "pending_confirmation").
   * 
   * @param {string} s - Status string to normalize (can be any case/format)
   * @returns {string} Normalized status string in lowercase with underscores.
   *                  Returns empty string if input is falsy.
   * 
   * @example
   * normalizeStatus('Pending Confirmation') // Returns: 'pending_confirmation'
   * normalizeStatus('checked-in') // Returns: 'checked_in'
   * normalizeStatus('CONFIRMED') // Returns: 'confirmed'
   */
  const normalizeStatus = (s) => {
    if (!s) return '';
    // Normalize status: lowercase, replace spaces and hyphens with underscores
    const normalized = String(s).toLowerCase().replace(/[\s-]/g, '_');
    return normalized;
  };
  
  /**
   * Checks if an appointment can be cancelled by the patient
   * 
   * This function determines whether an appointment is in a cancellable state.
   * Appointments can only be cancelled if they haven't progressed too far in the workflow.
   * 
   * **Cancellable statuses:**
   * - pending_confirmation: Appointment created but not yet confirmed
   * - pending_payment: Appointment confirmed but payment not completed
   * - scheduled: Payment completed, appointment scheduled
   * - confirmed: Appointment confirmed and ready
   * 
   * **Non-cancellable statuses:**
   * - checked_in: Patient has checked in at reception
   * - sample_collected: Blood sample has been collected
   * - sample_processed: Sample is being processed
   * - result_pending: Waiting for test results
   * - waiting_review: Results waiting for doctor review
   * - completed: Appointment fully completed
   * - cancelled: Already cancelled
   * - no_show: Patient didn't show up
   * 
   * @param {Object} appointment - Appointment object to check
   * @returns {boolean} True if appointment can be cancelled, false otherwise
   * 
   * @example
   * // Check if appointment can be cancelled
   * if (canCancelAppointment(appointment)) {
   *   // Show cancel button
   * }
   */
  const canCancelAppointment = (appointment) => {
    if (!appointment) return false;
    const status = normalizeStatus(appointment.status);
    return !['cancelled', 'cancelled_by_patient', 'completed'].includes(status);
  };

  /**
   * Finds invoice associated with an appointment
   * 
   * This utility function searches the invoices array for an invoice
   * that matches the given appointment ID. Used to check payment status
   * and retrieve payment information for an appointment.
   * 
   * @param {string|number} appointmentId - ID of the appointment to find invoice for
   * @returns {Object|undefined} Invoice object if found, undefined otherwise
   * 
   * @example
   * const invoice = getInvoiceForAppointment('APT-123');
   * if (invoice) {
   *   console.log('Payment amount:', invoice.totalAmount);
   * }
   */
  const getInvoiceForAppointment = (appointmentId) => {
    return invoices.find(inv => inv.appointmentId === appointmentId);
  };

  /**
   * Opens payment modal and prepares payment data
   * 
   * This function prepares and opens the payment modal for an appointment.
   * It performs the following operations:
   * 1. Fetches latest service/test package information from backend
   * 2. Retrieves current price for the test package
   * 3. Creates or updates invoice object with correct service name and price
   * 4. Sets up payment modal state (invoice, appointment, payment method, etc.)
   * 5. Opens the payment modal for user interaction
   * 
   * The function always fetches fresh service data to ensure price accuracy,
   * even if invoice is already provided. This prevents displaying outdated prices.
   * 
   * @param {Object} [invoice] - Existing invoice object. If provided, will be updated
   *                            with latest service info. If not provided, creates new invoice.
   * @param {Object} appointment - Appointment object to create payment for. Required.
   * 
   * @returns {Promise<void>} Does not return a value. Opens payment modal and sets
   *                         component state for payment flow.
   * 
   * @example
   * // Open payment modal with existing invoice
   * await openPaymentModal(invoice, appointment);
   * 
   * // Open payment modal without invoice (creates new one)
   * await openPaymentModal(null, appointment);
   */
  const openPaymentModal = async (invoice, appointment) => {
    try {
      // Payment service doesn't require invoice - we can proceed with just appointment
      // If invoice is provided, use it; otherwise, we'll create payment record directly
      let invoiceToUse = invoice;
      
      // LUÔN fetch lại service và price từ appointment để đảm bảo đúng thông tin
      // Lấy appointment từ state nếu có (đã được enrich)
      const enrichedAppointment = appointments.find(a => a.id === appointment?.id) || appointment;
      const testPackageId = enrichedAppointment?.testPackageId || enrichedAppointment?.TestPackageId || enrichedAppointment?.test_package_id;
      
      let serviceName = enrichedAppointment?.service || enrichedAppointment?.testPackageName || enrichedAppointment?.TestPackageName || 'Xét nghiệm';
      let servicePrice = 500000; // Default price (sẽ được cập nhật nếu tìm thấy service)
      
      // Fetch service info từ testPackageId nếu có
      if (testPackageId) {
        try {
          const servicesResult = await medicalService.getAllServices();
          
          if (servicesResult.success && servicesResult.data) {
            const matchedService = servicesResult.data.find(s => {
              // Backend trả về PackageId (PascalCase) trong TestPackageDto
              // Match bằng PackageId trước (giống như trong Dashboard)
              const sId = s.PackageId || s.packageId || 
                         s.TestPackageId || s.testPackageId || 
                         s.id || s.Id;
              return String(sId) === String(testPackageId);
            });
            
            if (matchedService) {
              serviceName = matchedService.PackageName || matchedService.packageName || matchedService.name || matchedService.Name || serviceName;
              // Lấy price và đảm bảo là number
              const rawPrice = matchedService.Price || matchedService.price || matchedService.testPackagePrice || matchedService.TestPackagePrice;
              servicePrice = rawPrice ? parseFloat(rawPrice) : 500000;
            }
          }
        } catch (err) {
          // Ignore service fetch errors
        }
      }
      
      // Tạo hoặc cập nhật invoice object với thông tin đúng
      if (!invoiceToUse) {
        invoiceToUse = {
          id: `temp-${appointment?.id || Date.now()}`,
          appointmentId: appointment?.id,
          totalAmount: servicePrice,
          amount: servicePrice,
          items: [{
            serviceName: serviceName,
            price: servicePrice,
            quantity: 1
          }]
        };
      } else {
        // LUÔN cập nhật invoice với thông tin đúng từ service
        invoiceToUse.totalAmount = servicePrice;
        invoiceToUse.amount = servicePrice;
        invoiceToUse.items = [{
          serviceName: serviceName,
          price: servicePrice,
          quantity: 1
        }];
      }
      
      setSelectedInvoice(invoiceToUse);
      setSelectedAppointmentForPayment(appointment);
    setPaymentMethod('bank_transfer');
    setPaymentStep(1);
      setPaymentStatus('idle');
      setPaymentResult(null); // Reset payment result khi mở modal mới
    setShowPaymentModal(true);
    } catch (error) {
      showError('Lỗi mở form thanh toán');
    }
  };

  /**
   * Handles payment confirmation (legacy function, not used with VNPay)
   * 
   * This function was used for direct payment processing but is now deprecated
   * in favor of VNPay integration. It records payment and updates appointment
   * status, but VNPay flow uses handleVNPayPayment instead.
   * 
   * @deprecated Use handleVNPayPayment for VNPay integration
   * @returns {Promise<void>} Does not return a value
   */
  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    try {
      const paymentData = {
        amount: selectedInvoice.totalAmount,
        paymentMethod: 'vnpay',
        paidAt: new Date().toISOString()
      };
      const resp = await invoiceService.recordPayment(selectedInvoice.id, paymentData);
      if (!resp.success) {
        showError('Thanh toán thất bại');
        return;
      }
      try {
        await appointmentService.updateAppointmentStatus(selectedInvoice.appointmentId, 'scheduled');
      } catch (_) {}
      showSuccess('Thanh toán thành công!');
      setShowPaymentModal(false);
      loadData();
    } catch (e) {
      showError('Lỗi thanh toán');
    }
  };

  /**
   * Formats date string to Vietnamese locale format
   * 
   * Converts a date string (ISO format or any valid date string) to
   * Vietnamese locale format (dd/mm/yyyy).
   * 
   * @param {string} dateString - Date string to format (e.g., '2024-12-04', '2024-12-04T10:00:00Z')
   * @returns {string} Formatted date string in Vietnamese locale (e.g., '04/12/2024')
   * 
   * @example
   * formatDate('2024-12-04') // Returns: '04/12/2024'
   * formatDate('2024-12-04T10:00:00Z') // Returns: '04/12/2024'
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  /**
   * Formats appointment time for display
   * 
   * This function formats the appointment time in a user-friendly way:
   * - If shift has both start and end time: displays as "7h-11h" (time range)
   * - If only start time: displays as "7h" (single time)
   * - Handles backward compatibility with string input
   * 
   * The function extracts hour from time strings (HH:MM format) and formats
   * them without minutes for cleaner display.
   * 
   * @param {Object|string} appointment - Appointment object with appointmentTime and shiftEnd,
   *                                     or string for backward compatibility
   * @returns {string} Formatted time string (e.g., '7h-11h', '7h', 'Chưa xác định')
   * 
   * @example
   * // Appointment with time range
   * formatTime({ appointmentTime: '07:00', shiftEnd: '11:00' }) // Returns: '7h-11h'
   * 
   * // Appointment with single time
   * formatTime({ appointmentTime: '07:00' }) // Returns: '7h'
   * 
   * // Backward compatibility
   * formatTime('07:00') // Returns: '07:00'
   */
  const formatTime = (appointment) => {
    // Nếu appointment là string (backward compatibility), return luôn
    if (typeof appointment === 'string') {
      return appointment;
    }
    
    // Lấy thông tin từ appointment object
    const timeString = appointment?.appointmentTime || appointment?.time || '';
    const shiftEnd = appointment?.shiftEnd || appointment?.ShiftEnd || '';
    
    // Nếu có shiftEnd, hiển thị theo ca (7h-11h)
    if (timeString && shiftEnd) {
      // Format: "07:00" -> "7h", "11:00" -> "11h"
      const formatHour = (timeStr) => {
        if (!timeStr) return '';
        const match = timeStr.match(/^(\d{1,2}):/);
        if (match) {
          const hour = parseInt(match[1]);
          return `${hour}h`;
        }
        return timeStr;
      };
      
      const startHour = formatHour(timeString);
      const endHour = formatHour(shiftEnd);
      
      if (startHour && endHour) {
        return `${startHour}-${endHour}`;
      }
    }
    
    // Fallback: chỉ hiển thị giờ bắt đầu
    if (timeString) {
      const match = timeString.match(/^(\d{1,2}):/);
      if (match) {
        const hour = parseInt(match[1]);
        return `${hour}h`;
      }
      return timeString;
    }
    
    return 'Chưa xác định';
  };

  /**
   * Copies appointment code to clipboard
   * 
   * This utility function copies the appointment code to the user's clipboard
   * using the Clipboard API. Shows success notification on success, error
   * notification on failure.
   * 
   * @param {string} appointmentCode - Appointment code to copy to clipboard
   * @returns {Promise<void>} Does not return a value. Shows notification based on result.
   * 
   * @example
   * // Copy appointment code when user clicks copy button
   * await copyAppointmentCode('APT-123');
   */
  const copyAppointmentCode = async (appointmentCode) => {
    try {
      await navigator.clipboard.writeText(appointmentCode);
      showSuccess(`Đã copy mã lịch hẹn: ${appointmentCode}`);
    } catch (error) {
      showError('Không thể copy mã lịch hẹn');
    }
  };

  /**
   * Checks if appointment has been paid (QR code should be displayed)
   * 
   * This function determines if an appointment has been paid, which means
   * the QR code should be displayed for check-in. An appointment is considered
   * paid if its status is 'confirmed' or any later status in the workflow.
   * 
   * **Paid statuses (QR code shown):**
   * - confirmed: Payment completed, appointment confirmed
   * - checked_in: Patient checked in at reception
   * - sample_collected: Sample collected
   * - sample_processed: Sample being processed
   * - result_pending: Waiting for results
   * - waiting_review: Waiting for doctor review
   * - ready_for_consultation: Ready for consultation
   * - completed: Appointment completed
   * 
   * **Unpaid statuses (QR code not shown):**
   * - pending_confirmation: Not yet confirmed
   * - pending_payment: Payment not completed
   * 
   * @param {string|number} appointmentId - ID of the appointment to check
   * @returns {boolean} True if appointment is paid (QR code should be shown), false otherwise
   * 
   * @example
   * // Check if QR code should be displayed
   * if (isAppointmentPaid(appointment.id)) {
   *   // Show QR code component
   * }
   */
  const isAppointmentPaid = (appointmentId) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) {
      // Fallback: check invoice if appointment not found
    const invoice = invoices.find(inv => inv.appointmentId === appointmentId);
    return invoice && invoice.status === 'paid';
    }
    // Appointment is paid if status is 'confirmed' or later - QR code hiển thị để lễ tân quét check-in
    const paidStatuses = ['confirmed', 'checked_in', 'sample_collected', 'sample_processed', 
                          'result_pending', 'waiting_review', 'ready_for_consultation', 'completed'];
    return paidStatuses.includes(appointment.status?.toLowerCase());
  };
  
  /**
   * Checks if appointment has been checked in by receptionist
   * 
   * This function determines if a patient has already checked in at the reception
   * desk. An appointment is checked in when its status is exactly 'checked_in'.
   * 
   * This is used to display "(Đã check-in)" label next to QR code and prevent
   * duplicate check-in attempts.
   * 
   * @param {string|number} appointmentId - ID of the appointment to check
   * @returns {boolean} True if appointment status is 'checked_in', false otherwise
   * 
   * @example
   * // Check if already checked in
   * if (isAppointmentCheckedIn(appointment.id)) {
   *   // Show "Đã check-in" label
   * }
   */
  const isAppointmentCheckedIn = (appointmentId) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    return appointment && appointment.status === 'checked_in';
  };

  // Generate QR code data for appointment check-in
  // Dữ liệu rút gọn nhưng đầy đủ thông tin: bệnh nhân, gói xét nghiệm, ngày hẹn
  /**
   * Generates QR code data string for appointment check-in
   * 
   * This function creates a JSON string containing appointment information
   * that will be encoded in the QR code. The QR code is scanned by reception
   * staff to check in the patient.
   * 
   * The QR code data includes:
   * - Appointment ID
   * - Appointment code
   * - Patient ID
   * - Appointment date
   * - Timestamp for validation
   * 
   * The data is formatted as a JSON string that can be parsed by the reception
   * check-in system to verify and process the check-in.
   * 
   * @param {Object} appointment - Appointment object containing ID, code, patient info, etc.
   * @returns {string} JSON string containing appointment data for QR code encoding
   * 
   * @example
   * const qrData = generateQRCodeData(appointment);
   * // Returns: '{"appointmentId":"APT-123","appointmentCode":"APT-123",...}'
   */
  const generateQRCodeData = (appointment) => {
    return JSON.stringify({
      t: 'checkin', // type
      c: appointment.appointmentCode, // code
      id: appointment.id, // appointment ID
      n: appointment.patientName || user?.fullName || '', // patient name
      s: appointment.service || '', // service/gói xét nghiệm
      d: appointment.appointmentDate || '', // date (YYYY-MM-DD)
      tm: appointment.appointmentTime || '' // time (HH:MM)
    });
  };

  /**
   * Opens appointment detail modal with full appointment information
   * 
   * This function prepares and displays the appointment detail modal, which shows:
   * - QR code for check-in (if appointment is paid)
   * - Patient information (name, phone, email)
   * - Appointment details (date, time, service, doctor, room, status)
   * - Test package information (name, description, price, duration)
   * - Notes/reason for appointment
   * 
   * The function enriches the appointment data if needed before displaying,
   * ensuring all information is up-to-date and complete. It fetches service
   * information from backend if not already available in the appointment object.
   * 
   * @param {Object} appointment - Appointment object to display details for
   * @returns {Promise<void>} Does not return a value. Opens modal and sets selectedAppointment state.
   * 
   * @example
   * // Open detail modal for an appointment
   * await handleViewDetail(appointment);
   */
  const handleViewDetail = async (appointment) => {
    // Tạo một bản sao của appointment để không mutate state trực tiếp
    let appointmentToShow = { ...appointment };
    
    // Nếu chưa có service name, fetch lại từ testPackageId
    if (!appointmentToShow.service || appointmentToShow.service === 'Xét nghiệm máu' || appointmentToShow.service === 'Xét nghiệm') {
      const testPackageId = appointmentToShow.testPackageId || appointmentToShow.TestPackageId || appointmentToShow.test_package_id;
      
      if (testPackageId) {
        try {
          const servicesResult = await medicalService.getAllServices();
          if (servicesResult.success && servicesResult.data) {
            const matchedService = servicesResult.data.find(s => {
              const sId = s.PackageId || s.packageId || s.TestPackageId || s.testPackageId || s.id || s.Id;
              return String(sId) === String(testPackageId);
            });
            
            if (matchedService) {
              appointmentToShow.service = matchedService.PackageName || matchedService.packageName || matchedService.name || matchedService.Name || appointmentToShow.service;
            }
          }
        } catch (err) {
          // Ignore service fetch errors
        }
      }
    }
    
    setSelectedAppointment(appointmentToShow);
    setShowDetailModal(true);
  };

  // Filter logic
  /**
   * Filters appointments based on selected status filter
   * 
   * This memoized value filters the appointments array based on the current
   * filterStatus state. It handles the following filter options:
   * - 'all': Shows all appointments (no filtering)
   * - Specific status: Shows only appointments with that status
   * 
   * The filtering uses normalizeStatus to ensure consistent status comparison
   * regardless of how status is stored in the appointment object.
   * 
   * @type {Array<Object>} Filtered array of appointment objects
   * 
   * @example
   * // Filtered appointments update automatically when filterStatus changes
   * // If filterStatus = 'all', shows all appointments
   * // If filterStatus = 'confirmed', shows only confirmed appointments
   */
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(apt => {
        const s = normalizeStatus(apt.status);
        if (filterStatus === 'pending') return s.includes('pending') || s === 'dang_chờ';
        if (filterStatus === 'completed') return s === 'completed' || s === 'scheduled' || s === 'confirmed';
        if (filterStatus === 'cancelled') return s === 'cancelled' || s === 'cancelled_by_patient';
        return s === filterStatus;
      });
    }


    // Sort by date and time: newest first (most recent appointments at top)
    // Ưu tiên: 1) Ngày hẹn (mới nhất trước), 2) Giờ hẹn (mới nhất trước), 3) Thời gian tạo (mới nhất trước)
    filtered.sort((a, b) => {
      // Ưu tiên 1: So sánh theo ngày hẹn (appointmentDate) - ngày hẹn mới nhất lên đầu
      const dateA = a.appointmentDate ? new Date(a.appointmentDate) : null;
      const dateB = b.appointmentDate ? new Date(b.appointmentDate) : null;
      
      if (dateA && dateB) {
        // Normalize dates to start of day for accurate comparison
        const normalizedDateA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
        const normalizedDateB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
        const dateDiff = normalizedDateB.getTime() - normalizedDateA.getTime();
        
        if (dateDiff !== 0) {
          return dateDiff; // Mới nhất trước (descending)
        }
        
        // Nếu cùng ngày, so sánh theo giờ hẹn
        const timeA = a.appointmentTime || '';
        const timeB = b.appointmentTime || '';
        if (timeA && timeB) {
          // Parse time: "07:00" -> 700, "18:00" -> 1800
          const parseTime = (timeStr) => {
            const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
            if (match) {
              return parseInt(match[1]) * 100 + parseInt(match[2]);
            }
            return 0;
          };
          const timeDiff = parseTime(timeB) - parseTime(timeA);
          if (timeDiff !== 0) {
            return timeDiff; // Mới nhất trước (descending)
          }
        } else if (timeA && !timeB) {
          return -1; // a có giờ, b không có -> a lên trước
        } else if (!timeA && timeB) {
          return 1; // b có giờ, a không có -> b lên trước
        }
      } else if (dateA && !dateB) {
        return -1; // a có ngày, b không có -> a lên trước
      } else if (!dateA && dateB) {
        return 1; // b có ngày, a không có -> b lên trước
      }
      
      // Ưu tiên 2: Nếu không có appointmentDate hoặc cùng appointmentDate, so sánh theo thời gian tạo (createdAt)
      const createdA = a.CreatedAt || a.createdAt || a.created_at || '';
      const createdB = b.CreatedAt || b.createdAt || b.created_at || '';
      if (createdA && createdB) {
        const createdDateA = new Date(createdA);
        const createdDateB = new Date(createdB);
        if (!isNaN(createdDateA.getTime()) && !isNaN(createdDateB.getTime())) {
          const createdDiff = createdDateB.getTime() - createdDateA.getTime();
          if (createdDiff !== 0) {
            return createdDiff; // Mới nhất trước (descending)
          }
        }
      } else if (createdA && !createdB) {
        return -1; // a có createdAt, b không có -> a lên trước
      } else if (!createdA && createdB) {
        return 1; // b có createdAt, a không có -> b lên trước
      }
      
      // Fallback: giữ nguyên thứ tự
      return 0;
    });

    return filtered;
  }, [appointments, filterStatus]);

  // Pagination logic
  /**
   * Total number of pages for pagination
   * 
   * Calculates the total number of pages based on filtered appointments
   * and items per page. Used to display pagination controls.
   * 
   * @type {number} Total number of pages (rounded up)
   */
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  
  /**
   * Paginates filtered appointments for current page display
   * 
   * This memoized value slices the filtered appointments array to show only
   * the appointments for the current page. It calculates the start and end
   * indices based on currentPage and itemsPerPage.
   * 
   * The pagination ensures that only a limited number of appointments are
   * displayed at once, improving performance and user experience.
   * 
   * @type {Array<Object>} Array of appointment objects for current page
   * 
   * @example
   * // If currentPage = 2, itemsPerPage = 5
   * // Shows appointments at indices 5-9 (second page)
   */
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAppointments.slice(startIndex, endIndex);
  }, [filteredAppointments, currentPage, itemsPerPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // Reset filter
  /**
   * Resets appointment status filter to 'all'
   * 
   * This utility function resets the filter status back to 'all', which
   * displays all appointments regardless of their status. Also resets
   * pagination to first page.
   * 
   * @returns {void} Does not return a value. Updates filterStatus and currentPage state.
   * 
   * @example
   * // Reset filter when user clicks "Tất cả" button
   * handleResetFilter();
   */
  const handleResetFilter = () => {
    setFilterStatus('all');
  };

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
            {/* Decorative background elements */}
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
                  className="fas fa-calendar-alt"
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
                Lịch hẹn appointments
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
                Quản lý lịch hẹn xét nghiệm của bạn
              </motion.p>
            </motion.div>
          </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card 
          className="border-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '25px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <Card.Header 
            style={{
              background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
              color: 'white',
              borderRadius: '25px 25px 0 0',
              border: 'none',
              padding: '1.5rem 2rem'
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <h5 className="mb-0" style={{ fontSize: '1.3rem', fontWeight: '600' }}>
                <i className="fas fa-list me-3"></i>
                Danh sách lịch hẹn ({filteredAppointments.length} / {appointments.length})
              </h5>
              <Button variant="light" className="fw-bold" style={{ color: '#0d6efd', borderRadius: '12px' }} onClick={handleCrudCreateOpen}>
                  <i className="fas fa-plus me-2"></i>Tạo lịch hẹn mới
              </Button>
            </div>
          </Card.Header>

          {/* Filter Section */}
          <Card.Body style={{ 
            background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%)',
            borderBottom: '2px solid rgba(13, 110, 253, 0.1)',
            padding: '1.5rem 2rem'
          }}>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold text-primary">
                    <i className="fas fa-filter me-2"></i>
                    Trạng thái
                  </Form.Label>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #0d6efd',
                      padding: '10px'
                    }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="pending">Đang chờ</option>
                    <option value="completed">Đã khám</option>
                    <option value="cancelled">Đã hủy</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Button
                  variant="outline-secondary"
                  onClick={handleResetFilter}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: '600',
                    border: '2px solid #6c757d'
                  }}
                >
                  <i className="fas fa-redo me-2"></i>
                  Đặt lại
                </Button>
              </Col>
            </Row>
          </Card.Body>

          <Card.Body style={{ padding: '0' }}>
            {filteredAppointments.length > 0 ? (
              <div style={{ overflow: 'hidden', borderRadius: '0 0 25px 25px' }}>
                {/* Desktop Table View - Large screens */}
                <div className="d-none d-xl-block">
                  <Table responsive className="mb-0">
                    <thead 
                      style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        borderBottom: '3px solid #0d6efd'
                      }}
                    >
                      <tr>
                        <th style={{ 
                          padding: '1.5rem 2rem', 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          color: '#333',
                          border: 'none',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-barcode me-2" style={{ color: '#0d6efd' }}></i>
                          Mã lịch hẹn
                        </th>
                        <th style={{ 
                          padding: '1.5rem 2rem', 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          color: '#333',
                          border: 'none',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-calendar me-2" style={{ color: '#0d6efd' }}></i>
                          Ngày
                        </th>
                        <th style={{ 
                          padding: '1.5rem 2rem', 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          color: '#333',
                          border: 'none',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-clock me-2" style={{ color: '#0d6efd' }}></i>
                          Giờ
                        </th>
                        <th style={{ 
                          padding: '1.5rem 2rem', 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          color: '#333',
                          border: 'none',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-info-circle me-2" style={{ color: '#0d6efd' }}></i>
                          Trạng thái
                        </th>
                        <th style={{ 
                          padding: '1.5rem 2rem', 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          color: '#333',
                          border: 'none',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-cogs me-2" style={{ color: '#0d6efd' }}></i>
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAppointments.map((appointment, index) => (
                        <motion.tr 
                          key={appointment.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          style={{
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <td style={{ 
                            padding: '1.5rem 2rem',
                            border: 'none',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                          }}>
                            {true ? (
                              // Hiển thị QR code sau khi thanh toán thành công - bệnh nhân mang QR code đến để lễ tân quét check-in
                            <div className="d-flex align-items-center">
                                <HighResQRCode
                                  value={generateQRCodeData(appointment)}
                                  size={65}
                                  showActions={false}
                                  className="me-2"
                                />
                                <div className="ms-2">
                                  <small className="text-muted d-block">QR Code</small>
                                  <small className="text-primary fw-bold">
                                    {isAppointmentCheckedIn(appointment.id) ? 'Đã check-in' : 'Check-in'}
                                  </small>
                                </div>
                              </div>
                            ) : (
                              // Hiển thị banner thanh toán chỉ khi status = pending_confirmation (chờ xác nhận)
                              appointment.status === 'pending_confirmation' ? (
                              <div className="d-flex justify-content-center">
                                <div className="d-flex align-items-center">
                                  <i 
                                    className="fas fa-exclamation-triangle me-2" 
                                style={{
                                      color: '#ffc107', 
                                      fontSize: '1.5rem' 
                                    }}
                                  ></i>
                                  <span 
                                  style={{
                                      color: '#ffc107', 
                                      fontSize: '0.9rem', 
                                      fontWeight: 'bold' 
                                    }}
                                  >
                                      Vui lòng thanh toán để xác nhận
                                  </span>
                            </div>
                              </div>
                              ) : (
                                <span className="fw-bold" style={{ color: '#0d6efd', fontSize: '1.1rem' }}>
                                  {appointment.appointmentCode || appointment.id}
                                </span>
                              )
                            )}
                          </td>
                          <td style={{ 
                            padding: '1.5rem 2rem',
                            border: 'none',
                            verticalAlign: 'middle',
                            fontSize: '1rem',
                            fontWeight: '500',
                            textAlign: 'center'
                          }}>
                            {formatDate(appointment.appointmentDate)}
                          </td>
                          <td style={{ 
                            padding: '1.5rem 2rem',
                            border: 'none',
                            verticalAlign: 'middle',
                            fontSize: '1rem',
                            fontWeight: '500',
                            textAlign: 'center'
                          }}>
                            {formatTime(appointment)}
                          </td>
                          <td style={{ 
                            padding: '1.5rem 2rem',
                            border: 'none',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                          }}>
                            <StatusBadge entity="appointment" status={normalizeStatus(appointment.status)} />
                          </td>
                          <td style={{ 
                            padding: '1.5rem 2rem',
                            border: 'none',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                          }}>
                            <div className="d-flex gap-2 justify-content-center">
                              {/* Nút xem chi tiết - luôn hiển thị */}
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleViewDetail(appointment)}
                                style={{
                                  borderRadius: '15px',
                                  padding: '8px 16px',
                                  fontWeight: '600',
                                  background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                  border: 'none',
                                  boxShadow: '0 4px 10px rgba(13, 110, 253, 0.3)',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(13, 110, 253, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(13, 110, 253, 0.3)';
                                }}
                              >
                                <i className="fas fa-eye me-2"></i>
                                Chi tiết
                              </Button>
                              {/* Bỏ nút check-in - chỉ lễ tân mới check-in bằng QR code */}

                              {/* Nút Thanh toán nếu có invoice pending */}
                              {(() => {
                                const inv = getInvoiceForAppointment(appointment.id);
                                if (inv && inv.status !== 'paid') {
                                  return (
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => {
                                        const appointment = appointments.find(a => a.id === inv.appointmentId);
                                        openPaymentModal(inv, appointment);
                                      }}
                                      style={{
                                        borderRadius: '15px',
                                        padding: '8px 16px',
                                        fontWeight: '600',
                                        border: 'none'
                                      }}
                                    >
                                      <i className="fas fa-credit-card me-2"></i>
                                      Thanh toán
                                    </Button>
                                  );
                                }
                                return null;
                              })()}

                              {/* Nút hủy lịch - hiển thị khi có thể hủy */}
                              {canCancelAppointment(appointment) && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleCrudDelete(appointment)}
                                    style={{
                                      borderRadius: '15px',
                                      padding: '8px 16px',
                                      fontWeight: '600',
                                      border: '2px solid #dc3545',
                                      background: 'transparent',
                                      color: '#dc3545',
                                      transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#dc3545';
                                      e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = '#dc3545';
                                    }}
                                  >
                                    <i className="fas fa-times me-2"></i>
                                    Hủy lịch
                                  </Button>
                                </motion.div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Tablet View - Medium screens */}
                <div className="d-none d-lg-block d-xl-none">
                  <div className="p-3">
                    {paginatedAppointments.map((appointment, index) => (
                      <motion.div
                        key={appointment.id}
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
                            <Row>
                              {/* Left Column - Appointment Code */}
                              <Col lg={4}>
                                <div className="mb-3">
                                  {true ? (
                                    // Hiển thị QR code sau khi thanh toán thành công - bệnh nhân mang QR code đến để lễ tân quét check-in
                                    <div className="text-center">
                                      <div className="d-flex align-items-center justify-content-center mb-2">
                                        <i className="fas fa-qrcode me-2" style={{ color: '#0d6efd', fontSize: '1.1rem' }}></i>
                                        <span className="fw-bold" style={{ color: '#333', fontSize: '0.95rem' }}>
                                          QR Code Check-in{isAppointmentCheckedIn(appointment.id) ? ' (Đã check-in)' : ''}
                                        </span>
                                    </div>
                                      <HighResQRCode
                                        value={generateQRCodeData(appointment)}
                                        size={75}
                                        showActions={false}
                                        title=""
                                      />
                                      <small className="text-muted d-block mt-2">
                                        Mã: <code>{appointment.appointmentCode}</code>
                                      </small>
                                      {!isAppointmentCheckedIn(appointment.id) && (
                                        <small className="text-info d-block mt-1" style={{ fontSize: '0.8rem' }}>
                                          <i className="fas fa-info-circle me-1"></i>
                                          Mang QR code này đến phòng khám để lễ tân quét check-in
                                        </small>
                                      )}
                                    </div>
                                  ) : (
                                    // Hiển thị banner thanh toán chỉ khi status = pending_confirmation (chờ xác nhận)
                                    appointment.status === 'pending_confirmation' ? (
                                    <>
                                      <div className="text-center mb-3">
                                        <div className="d-flex align-items-center justify-content-center">
                                          <i 
                                            className="fas fa-exclamation-triangle me-2" 
                                        style={{
                                              color: '#ffc107', 
                                              fontSize: '1.8rem' 
                                            }}
                                          ></i>
                                          <span 
                                    style={{
                                              color: '#ffc107', 
                                      fontSize: '1rem',
                                              fontWeight: 'bold' 
                                            }}
                                          >
                                              Vui lòng thanh toán để xác nhận
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                    ) : null
                                  )}
                                </div>
                              </Col>

                              {/* Middle Column - Date and Time */}
                              <Col lg={4}>
                                <Row>
                                  <Col xs={6}>
                                    <div className="d-flex align-items-center mb-2">
                                      <i className="fas fa-calendar me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                      <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Ngày:</span>
                                    </div>
                                    <div style={{ color: '#666', fontSize: '0.95rem', fontWeight: '500' }}>
                                      {formatDate(appointment.appointmentDate)}
                                    </div>
                                  </Col>
                                  <Col xs={6}>
                                    <div className="d-flex align-items-center mb-2">
                                      <i className="fas fa-clock me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                      <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Giờ:</span>
                                    </div>
                                    <div style={{ color: '#666', fontSize: '0.95rem', fontWeight: '500' }}>
                                      {formatTime(appointment)}
                                    </div>
                                  </Col>
                                </Row>
                              </Col>

                              {/* Right Column - Status and Action */}
                              <Col lg={4}>
                                <div className="mb-3">
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-info-circle me-2" style={{ color: '#0d6efd', fontSize: '0.9rem' }}></i>
                                    <span className="fw-bold" style={{ color: '#333', fontSize: '0.85rem' }}>Trạng thái:</span>
                                  </div>
                                  <div>
                                    <StatusBadge entity="appointment" status={normalizeStatus(appointment.status)} />
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="d-flex gap-2 flex-wrap">
                                  {/* Nút Chi tiết - luôn hiển thị */}
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleViewDetail(appointment)}
                                    style={{
                                      borderRadius: '10px',
                                      padding: '5px 12px',
                                      fontWeight: '600',
                                      background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                      border: 'none',
                                      boxShadow: '0 4px 10px rgba(13, 110, 253, 0.3)',
                                      transition: 'all 0.3s ease',
                                      fontSize: '0.85rem'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 15px rgba(13, 110, 253, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(13, 110, 253, 0.3)';
                                    }}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    Chi tiết
                                  </Button>
                                  {/* Bỏ nút check-in - chỉ lễ tân mới check-in bằng QR code */}

                              {(() => {
                                const inv = getInvoiceForAppointment(appointment.id);
                                if (inv && inv.status !== 'paid') {
                                  return (
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => {
                                        const appointment = appointments.find(a => a.id === inv.appointmentId);
                                        openPaymentModal(inv, appointment);
                                      }}
                                      className="flex-grow-1"
                                      style={{
                                        borderRadius: '10px',
                                        padding: '5px 12px',
                                        fontWeight: '600',
                                        border: 'none'
                                      }}
                                    >
                                      <i className="fas fa-credit-card me-1"></i>
                                      Thanh toán
                                    </Button>
                                  );
                                }
                                return null;
                              })()}

                                  {/* Nút Hủy - khi có thể hủy */}
                                  {canCancelAppointment(appointment) && (
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleCrudDelete(appointment)}
                                        style={{
                                          borderRadius: '10px',
                                          padding: '5px 12px',
                                          fontWeight: '600',
                                          border: '2px solid #dc3545',
                                          background: 'transparent',
                                          color: '#dc3545',
                                          transition: 'all 0.3s ease',
                                          fontSize: '0.85rem'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#dc3545';
                                          e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                          e.currentTarget.style.color = '#dc3545';
                                        }}
                                      >
                                        <i className="fas fa-times me-1"></i>
                                        Hủy
                                      </Button>
                                    </motion.div>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Mobile Card View - Small screens */}
                <div className="d-lg-none">
                  <div className="p-3">
                    {paginatedAppointments.map((appointment, index) => (
                      <motion.div
                        key={appointment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="mb-3"
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
                            {/* Appointment Code Section */}
                            <div className="mb-3">
                              {true ? (
                                // Hiển thị QR code sau khi thanh toán thành công - bệnh nhân mang QR code đến để lễ tân quét check-in
                                <div className="text-center">
                                  <div className="d-flex align-items-center justify-content-center mb-2">
                                    <i className="fas fa-qrcode me-2" style={{ color: '#0d6efd', fontSize: '1.2rem' }}></i>
                                    <span className="fw-bold" style={{ color: '#333', fontSize: '1rem' }}>
                                      QR Code Check-in{isAppointmentCheckedIn(appointment.id) ? ' (Đã check-in)' : ''}
                                    </span>
                                </div>
                                  <HighResQRCode
                                    value={generateQRCodeData(appointment)}
                                    size={85}
                                    showActions={false}
                                    title=""
                                  />
                                  <small className="text-muted d-block mt-2">
                                    Mã: <code>{appointment.appointmentCode}</code>
                                  </small>
                                  {!isAppointmentCheckedIn(appointment.id) && (
                                    <small className="text-info d-block mt-1" style={{ fontSize: '0.85rem' }}>
                                      <i className="fas fa-info-circle me-1"></i>
                                      Mang QR code này đến phòng khám để lễ tân quét check-in
                                    </small>
                                  )}
                                </div>
                              ) : (
                                // Hiển thị banner thanh toán chỉ khi status = pending_confirmation (chờ xác nhận)
                                appointment.status === 'pending_confirmation' ? (
                                <>
                                  <div className="text-center mb-3">
                                    <div className="d-flex align-items-center justify-content-center">
                                      <i 
                                        className="fas fa-exclamation-triangle me-2" 
                                    style={{
                                          color: '#ffc107', 
                                          fontSize: '2rem' 
                                        }}
                                      ></i>
                                      <span 
                                style={{
                                          color: '#ffc107', 
                                  fontSize: '1.1rem',
                                          fontWeight: 'bold' 
                                        }}
                                      >
                                          Vui lòng thanh toán để xác nhận
                                      </span>
                                    </div>
                                  </div>
                                </>
                                ) : null
                              )}
                            </div>

                            {/* Date and Time Section */}
                            <Row className="mb-3">
                              <Col xs={6}>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="fas fa-calendar me-2" style={{ color: '#0d6efd' }}></i>
                                  <span className="fw-bold" style={{ color: '#333', fontSize: '0.9rem' }}>Ngày:</span>
                                </div>
                                <div style={{ color: '#666', fontSize: '1rem', fontWeight: '500' }}>
                                  {formatDate(appointment.appointmentDate)}
                                </div>
                              </Col>
                              <Col xs={6}>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="fas fa-clock me-2" style={{ color: '#0d6efd' }}></i>
                                  <span className="fw-bold" style={{ color: '#333', fontSize: '0.9rem' }}>Giờ:</span>
                                </div>
                                <div style={{ color: '#666', fontSize: '1rem', fontWeight: '500' }}>
                                  {formatTime(appointment)}
                                </div>
                              </Col>
                            </Row>

                            {/* Status Section */}
                            <div className="mb-3">
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-info-circle me-2" style={{ color: '#0d6efd' }}></i>
                                <span className="fw-bold" style={{ color: '#333', fontSize: '0.9rem' }}>Trạng thái:</span>
                              </div>
                              <div>
                                <StatusBadge entity="appointment" status={normalizeStatus(appointment.status)} />
                              </div>
                            </div>

                            {/* Action Buttons Section */}
                            <div className="d-flex gap-2 flex-wrap">
                              {/* Nút Chi tiết - luôn hiển thị */}
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleViewDetail(appointment)}
                                className="flex-grow-1"
                                style={{
                                  borderRadius: '12px',
                                  padding: '8px 15px',
                                  fontWeight: '600',
                                  background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                  border: 'none',
                                  boxShadow: '0 4px 10px rgba(13, 110, 253, 0.3)',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(13, 110, 253, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(13, 110, 253, 0.3)';
                                }}
                              >
                                <i className="fas fa-eye me-2"></i>
                                Chi tiết
                              </Button>
                                  {/* Bỏ nút check-in - chỉ lễ tân mới check-in bằng QR code */}

                              {(() => {
                                const inv = getInvoiceForAppointment(appointment.id);
                                if (inv && inv.status !== 'paid') {
                                  return (
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => {
                                        const appointment = appointments.find(a => a.id === inv.appointmentId);
                                        openPaymentModal(inv, appointment);
                                      }}
                                      className="w-100"
                                      style={{
                                        borderRadius: '12px',
                                        padding: '8px 15px',
                                        fontWeight: '600',
                                        border: 'none'
                                      }}
                                    >
                                      <i className="fas fa-credit-card me-1"></i>
                                      Thanh toán
                                    </Button>
                                  );
                                }
                                return null;
                              })()}

                              {/* Nút Sửa */}
                              {canCancelAppointment(appointment) && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-grow-1"
                                >
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleCrudDelete(appointment)}
                                    className="w-100 mb-2"
                                    style={{
                                      borderRadius: '8px',
                                      fontWeight: '600',
                                      boxShadow: '0 2px 4px rgba(220, 53, 69, 0.15)'
                                    }}
                                  >
                                    <i className="fas fa-ban me-2"></i>Hủy lịch
                                  </Button>
                                </motion.div>
                              )}
                              
                              {/* Nút Hủy - chỉ khi scheduled */}
                              {canCancelAppointment(appointment) && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-grow-1"
                                >
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleCrudDelete(appointment)}
                                    className="w-100"
                                    style={{
                                      borderRadius: '12px',
                                      padding: '8px 15px',
                                      fontWeight: '600',
                                      border: '2px solid #dc3545',
                                      background: 'transparent',
                                      color: '#dc3545',
                                      transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#dc3545';
                                      e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = '#dc3545';
                                    }}
                                  >
                                    <i className="fas fa-times me-1"></i>
                                    Hủy
                                  </Button>
                                </motion.div>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <motion.div 
                className="text-center py-5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                style={{ padding: '3rem 2rem' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 2rem auto',
                    boxShadow: '0 15px 35px rgba(13, 110, 253, 0.3)'
                  }}
                >
                  <i className="fas fa-calendar-times fa-3x text-white"></i>
                </motion.div>
                <h5 className="text-muted mb-3" style={{ fontSize: '1.3rem', fontWeight: '600' }}>
                  Chưa có lịch hẹn nào
                </h5>
                <p className="text-muted" style={{ fontSize: '1.1rem' }}>
                  Hãy đặt lịch hẹn xét nghiệm để bắt đầu
                </p>
              </motion.div>
            )}

            {/* Pagination */}
            {filteredAppointments.length > 0 && totalPages > 1 && (
              <div className="mt-4">
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
                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAppointments.length)} trong tổng số {filteredAppointments.length} lịch hẹn
                  </small>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </motion.div>
        </Container>

      {/* Appointment Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
        fullscreen="md-down"
        style={{ zIndex: 9999 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <Modal.Header
            closeButton
            style={{
              background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
              border: 'none',
              color: 'white'
            }}
          >
            <Modal.Title className="text-white fw-bold">
              <i className="fas fa-calendar-check me-2"></i>
              Chi tiết lịch hẹn
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            className="appointment-detail-modal-body"
            style={{
              background: '#f8f9fa',
              padding: '2rem'
            }}
          >
            {selectedAppointment && (
              <div>
                {/* Mã lịch hẹn hoặc QR Code (tạm ẩn theo yêu cầu) */}
                {/* 
                {isAppointmentPaid(selectedAppointment.id) ? (
                  ...
                ) : (
                  ...
                )} 
                */}

                                {/* Mã QR Code Check-in */}
                <div className="mb-4 text-center p-3" style={{
                  background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(13, 110, 253, 0.3)'
                }}>
                  <div className="d-flex align-items-center justify-content-center mb-2">
                    <i className="fas fa-qrcode me-2" style={{ color: '#0d6efd', fontSize: '1.2rem' }}></i>
                    <span className="fw-bold" style={{ color: '#333', fontSize: '1rem' }}>
                      QR Code Check-in{isAppointmentCheckedIn(selectedAppointment.id) ? ' (Đã check-in)' : ''}
                    </span>
                  </div>
                  <HighResQRCode
                    value={generateQRCodeData(selectedAppointment)}
                    size={120}
                    showActions={false}
                    title=""
                  />
                  <div className="mt-3">
                    <span className="text-muted">Mã nhập thủ công: </span>
                    <code style={{ fontSize: '1.2rem', padding: '4px 8px', background: '#e9ecef', borderRadius: '4px' }}>
                      {selectedAppointment.appointmentCode}
                    </code>
                  </div>
                  {!isAppointmentCheckedIn(selectedAppointment.id) && (
                    <small className="text-info d-block mt-2" style={{ fontSize: '0.85rem' }}>
                      <i className="fas fa-info-circle me-1"></i>
                      Đưa mã QR hoặc mã thủ công này cho lễ tân để check-in nhanh chóng
                    </small>
                  )}
                </div>

                {/* Thông tin bệnh nhân */}
                <div className="mb-4 p-3" style={{
                  background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(13, 110, 253, 0.1)'
                }}>
                  <h6 className="fw-bold mb-3 text-primary">
                    <i className="fas fa-user-circle me-2"></i>
                    Thông tin bệnh nhân
                  </h6>
                  <Row>
                    <Col md={6} className="mb-2">
                      <p className="mb-1">
                        <i className="fas fa-user me-2 text-muted"></i>
                        <strong>Họ và tên:</strong>
                      </p>
                      <p className="ms-4 text-dark">{selectedAppointment.patientName}</p>
                    </Col>
                    <Col md={6} className="mb-2">
                      <p className="mb-1">
                        <i className="fas fa-phone me-2 text-muted"></i>
                        <strong>Số điện thoại:</strong>
                      </p>
                      <p className="ms-4 text-dark">{selectedAppointment.patientPhone}</p>
                    </Col>
                    <Col md={12} className="mb-0">
                      <p className="mb-1">
                        <i className="fas fa-envelope me-2 text-muted"></i>
                        <strong>Email:</strong>
                      </p>
                      <p className="ms-4 text-dark">{selectedAppointment.patientEmail}</p>
                    </Col>
                  </Row>
                </div>

                {/* Thông tin lịch hẹn */}
                <div className="mb-4 p-3" style={{
                  background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(32, 201, 151, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(40, 167, 69, 0.1)'
                }}>
                  <h6 className="fw-bold mb-3 text-success">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Thông tin lịch hẹn
                  </h6>
                  <Row>
                    <Col md={6} className="mb-2">
                      <p className="mb-1">
                        <i className="fas fa-calendar-day me-2 text-muted"></i>
                        <strong>Ngày hẹn:</strong>
                      </p>
                      <p className="ms-4 text-dark">{formatDate(selectedAppointment.appointmentDate)}</p>
                    </Col>
                    <Col md={6} className="mb-2">
                      <p className="mb-1">
                        <i className="fas fa-clock me-2 text-muted"></i>
                        <strong>Giờ hẹn:</strong>
                      </p>
                      <p className="ms-4 text-dark">{formatTime(selectedAppointment)}</p>
                    </Col>
                    <Col md={6} className="mb-2">
                      <p className="mb-1">
                        <i className="fas fa-flask me-2 text-muted"></i>
                        <strong>Dịch vụ:</strong>
                      </p>
                      <p className="ms-4 text-dark">{selectedAppointment.service}</p>
                    </Col>
                    <Col md={6} className="mb-2">
                      <p className="mb-1">
                        <i className="fas fa-info-circle me-2 text-muted"></i>
                        <strong>Trạng thái:</strong>
                      </p>
                      <div className="ms-4">
                        <StatusBadge entity="appointment" status={normalizeStatus(selectedAppointment.status)} />
                        {selectedAppointment.status?.includes('cancel') && selectedAppointment.reasonForRescheduling && (
                            <div className="mt-2 text-danger">
                                <strong>Lý do hủy: </strong>
                                <span>{selectedAppointment.reasonForRescheduling}</span>
                            </div>
                        )}
                      </div>
                    </Col>
                    <Col md={6} className="mb-2">
                      <p className="mb-1">
                        <i className="fas fa-door-open me-2 text-muted"></i>
                        <strong>Phòng khám:</strong>
                      </p>
                      <p className="ms-4 text-dark">
                        {selectedAppointment.room || (
                          <span className="text-muted fst-italic">Chưa phân bổ phòng</span>
                        )}
                      </p>
                    </Col>
                    <Col md={6} className="mb-0">
                      <p className="mb-1">
                        <i className="fas fa-user-md me-2 text-muted"></i>
                        <strong>Bác sĩ phụ trách:</strong>
                      </p>
                      <p className="ms-4 text-dark">
                        {selectedAppointment.doctorName 
                          ? selectedAppointment.doctorName
                          : (selectedAppointment.doctorId 
                            ? (() => {
                                const doctor = doctors.find(d => {
                                  const dId = d.DoctorId || d.doctorId || d.id;
                                  return String(dId) === String(selectedAppointment.doctorId);
                                });
                                return doctor ? (doctor.FullName || doctor.fullName || doctor.name || doctor.Name || 'Chưa phân công') : 'Chưa phân công';
                              })()
                          : <span className="text-muted fst-italic">Chưa phân công bác sĩ</span>
                          )
                        }
                      </p>
                    </Col>
                  </Row>
                </div>

                {/* Thông tin gói xét nghiệm */}
                {(() => {
                  const testPackageId = selectedAppointment.TestPackageId || selectedAppointment.testPackageId || selectedAppointment.test_package_id;
                  const testPackage = testPackageId && services.length > 0 
                    ? services.find(s => {
                        const sId = s.PackageId || s.packageId || s.TestPackageId || s.testPackageId || s.id || s.Id;
                        return String(sId) === String(testPackageId);
                      })
                    : null;
                  
                  if (testPackage) {
                    return (
                      <div className="mb-4 p-3" style={{
                        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 152, 0, 0.05) 100%)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 193, 7, 0.2)',
                        borderLeft: '4px solid #ffc107'
                      }}>
                        <h6 className="fw-bold mb-3 text-warning">
                          <i className="fas fa-vial me-2"></i>
                          Thông tin gói xét nghiệm
                        </h6>
                        <Row>
                          <Col md={12} className="mb-2">
                            <p className="mb-1">
                              <i className="fas fa-flask me-2 text-muted"></i>
                              <strong>Tên gói:</strong>
                            </p>
                            <p className="ms-4 text-dark fw-bold" style={{ fontSize: '1.05rem' }}>
                              {testPackage.PackageName || testPackage.packageName || testPackage.name || testPackage.Name || selectedAppointment.service}
                            </p>
                          </Col>
                          {testPackage.Description || testPackage.description ? (
                            <Col md={12} className="mb-2">
                              <p className="mb-1">
                                <i className="fas fa-info-circle me-2 text-muted"></i>
                                <strong>Mô tả:</strong>
                              </p>
                              <p className="ms-4 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                                {testPackage.Description || testPackage.description}
                              </p>
                            </Col>
                          ) : null}
                          {testPackage.Price || testPackage.price ? (
                            <Col md={6} className="mb-2">
                              <p className="mb-1">
                                <i className="fas fa-money-bill-wave me-2 text-muted"></i>
                                <strong>Giá:</strong>
                              </p>
                              <p className="ms-4 text-dark fw-bold" style={{ color: '#28a745', fontSize: '1.1rem' }}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(testPackage.Price || testPackage.price)}
                              </p>
                            </Col>
                          ) : null}
                          {testPackage.Duration || testPackage.duration ? (
                            <Col md={6} className="mb-2">
                              <p className="mb-1">
                                <i className="fas fa-clock me-2 text-muted"></i>
                                <strong>Thời gian xử lý:</strong>
                              </p>
                              <p className="ms-4 text-dark">
                                {testPackage.Duration || testPackage.duration} {testPackage.DurationUnit || testPackage.durationUnit || 'ngày'}
                              </p>
                            </Col>
                          ) : null}
                        </Row>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Ghi chú */}
                {selectedAppointment.notes && (
                  <div className="mb-0 p-3" style={{
                    background: 'linear-gradient(135deg, rgba(108, 117, 125, 0.05) 0%, rgba(73, 80, 87, 0.05) 100%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(108, 117, 125, 0.2)',
                    borderLeft: '4px solid #6c757d'
                  }}>
                    <h6 className="fw-bold mb-2 text-secondary">
                      <i className="fas fa-notes-medical me-2"></i>
                      Ghi chú / Lý do khám
                    </h6>
                    <p className="mb-0 ms-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}

                {!selectedAppointment.notes && (
                  <div className="text-center p-3" style={{
                    background: 'rgba(108, 117, 125, 0.05)',
                    borderRadius: '12px',
                    border: '1px dashed #dee2e6'
                  }}>
                    <i className="fas fa-info-circle text-muted me-2"></i>
                    <small className="text-muted">Không có ghi chú</small>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer
            style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              border: 'none',
              padding: '1.5rem 2rem'
            }}
          >
              <div className="d-flex w-100 justify-content-between">
                <Button
                  variant="outline-warning"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleCrudEditOpen(selectedAppointment);
                  }}
                  style={{
                    borderRadius: '25px',
                    padding: '10px 25px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className="fas fa-edit me-2"></i>
                  Chỉnh sửa
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    borderRadius: '25px',
                    padding: '10px 25px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    border: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(108, 117, 125, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(108, 117, 125, 0.3)';
                  }}
                >
                  <i className="fas fa-times me-2"></i>
                  Đóng
                </Button>
              </div>
          </Modal.Footer>
        </motion.div>
      </Modal>

      {/* Payment Modal - Enhanced UI */}
      <Modal 
        show={showPaymentModal} 
        onHide={() => setShowPaymentModal(false)} 
        centered 
        size="lg"
        style={{
          backdropFilter: 'blur(5px)'
        }}
      >
        <Modal.Header 
          closeButton
          style={{
            background: 'linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)',
            color: 'white',
            padding: '1.5rem 2rem',
            border: 'none'
          }}
        >
          <Modal.Title style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            <i className="fas fa-credit-card me-3"></i>
            Thanh toán đơn xét nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {/* Thanh tiến trình thanh toán - Enhanced */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0" style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0d6efd' }}>
                <i className="fas fa-tasks me-2"></i>
                Tiến trình thanh toán
              </h6>
              <Badge 
                bg="primary" 
                style={{ 
                  fontSize: '0.9rem', 
                  padding: '0.5rem 1rem',
                  borderRadius: '20px'
                }}
              >
                Bước {paymentStep}/3
              </Badge>
            </div>
            <div className="progress" style={{ height: '12px', borderRadius: '10px', background: '#e9ecef' }}>
              <div
                className={`progress-bar ${paymentStatus==='processing' ? 'progress-bar-striped progress-bar-animated' : ''}`}
                role="progressbar"
                style={{ 
                  width: `${(paymentStep-1) * 50}%`,
                  background: 'linear-gradient(90deg, #0d6efd 0%, #0dcaf0 100%)',
                  transition: 'width 0.5s ease'
                }}
                aria-valuenow={(paymentStep-1)*50}
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
            </div>
            <div className="d-flex justify-content-between mt-3 gap-2">
              {[
                { icon: 'fas fa-file-invoice', label: 'Chi tiết', color: '#0d6efd' },
                { icon: 'fas fa-wallet', label: 'Phương thức', color: '#198754' },
                { icon: 'fas fa-check-circle', label: 'Xác nhận', color: '#20c997' }
              ].map((item, idx) => {
                const stepNum = idx+1;
                const active = paymentStep === stepNum;
                const completed = paymentStep > stepNum;
                const canClick = stepNum < paymentStep && paymentStatus !== 'processing';
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`btn flex-fill ${active ? 'btn-primary' : completed ? 'btn-success' : 'btn-outline-secondary'}`}
                    style={{ 
                      borderRadius: '12px', 
                      padding: '0.8rem',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      border: active ? 'none' : completed ? 'none' : '2px solid #dee2e6',
                      boxShadow: active ? '0 4px 15px rgba(13, 110, 253, 0.3)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                    disabled={!canClick}
                    onClick={() => canClick && setPaymentStep(stepNum)}
                  >
                    <i className={`${item.icon} me-2`}></i>
                    <span className="d-none d-sm-inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Bước 1 và 2 chỉ hiển thị khi có selectedInvoice hoặc selectedAppointmentForPayment */}
          {paymentStep < 3 && (selectedInvoice || selectedAppointmentForPayment) && (
            <div>
              {paymentStep === 1 && (
                <div>
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(13, 202, 240, 0.05) 100%)',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      border: '2px solid rgba(13, 110, 253, 0.1)'
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h5 className="mb-0" style={{ fontSize: '1.3rem', fontWeight: '700', color: '#0d6efd' }}>
                        <i className="fas fa-file-invoice me-2"></i>
                        Chi tiết hóa đơn
                      </h5>
                      <Badge 
                        bg={selectedInvoice?.status==='paid'?'success':'warning'}
                        style={{
                          fontSize: '0.95rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '20px'
                        }}
                      >
                        <i className={`fas ${selectedInvoice?.status==='paid'?'fa-check-circle':'fa-clock'} me-2`}></i>
                        {selectedInvoice?.status==='paid'?'Đã thanh toán':'Chờ thanh toán'}
                      </Badge>
                  </div>
                    
                    <div 
                      className="p-4 rounded mb-3"
                      style={{
                        background: 'white',
                        border: '1px solid #dee2e6',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3" style={{ borderBottom: '2px dashed #dee2e6' }}>
                        <span style={{ fontSize: '0.95rem', color: '#6c757d' }}>
                          <i className="fas fa-barcode me-2"></i>
                          Mã đơn
                        </span>
                        <code style={{ 
                          fontSize: '1.1rem', 
                          background: '#f8f9fa', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '8px',
                          fontWeight: '700',
                          color: '#0d6efd'
                        }}>
                          {selectedInvoice ? `XN-${String(selectedInvoice.id).padStart(5, '0')}` : (selectedAppointmentForPayment?.appointmentCode || 'Tạm thời')}
                        </code>
                    </div>
                      
                    {(() => {
                      // Use selectedInvoice.appointmentId if available, otherwise use selectedAppointmentForPayment
                      const appointmentId = selectedInvoice?.appointmentId || selectedAppointmentForPayment?.id;
                      const apt = appointments.find(a => a.id === appointmentId) || selectedAppointmentForPayment;
                      const item = selectedInvoice ? (selectedInvoice.items || [])[0] : null;
                      return (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span style={{ fontSize: '1rem', color: '#495057' }}>
                                <i className="fas fa-user me-2" style={{ color: '#0d6efd' }}></i>
                                Bệnh nhân
                              </span>
                              <strong style={{ fontSize: '1.05rem' }}>{apt?.patientName || user?.fullName || user?.username || 'N/A'}</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span style={{ fontSize: '1rem', color: '#495057' }}>
                                <i className="fas fa-envelope me-2" style={{ color: '#0d6efd' }}></i>
                                Email
                              </span>
                              <span style={{ fontSize: '0.95rem' }}>{apt?.patientEmail || user?.email || 'N/A'}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span style={{ fontSize: '1rem', color: '#495057' }}>
                                <i className="fas fa-flask me-2" style={{ color: '#0d6efd' }}></i>
                                Gói dịch vụ
                              </span>
                              <strong style={{ fontSize: '1.05rem', color: '#198754' }}>{item?.serviceName || apt?.service || 'Xét nghiệm máu'}</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3 pb-3" style={{ borderBottom: '2px dashed #dee2e6' }}>
                              <span style={{ fontSize: '1rem', color: '#495057' }}>
                                <i className="fas fa-calendar-alt me-2" style={{ color: '#0d6efd' }}></i>
                                Ngày/giờ hẹn
                              </span>
                              <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                                {apt?.appointmentDate ? `${formatDate(apt.appointmentDate)} • ${formatTime(apt)}` : 'N/A'}
                              </span>
                            </div>
                        </>
                      );
                    })()}
                      
                      <div 
                        className="d-flex justify-content-between align-items-center p-3 rounded"
                        style={{
                          background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.1) 0%, rgba(32, 201, 151, 0.1) 100%)',
                          border: '2px solid rgba(25, 135, 84, 0.2)'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#198754' }}>
                          <i className="fas fa-money-bill-wave me-2"></i>
                          Tổng tiền
                        </span>
                        <strong style={{ fontSize: '1.5rem', color: '#198754', fontWeight: '700' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedInvoice?.totalAmount || 500000)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {paymentStep === 2 && (
                <div>
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.05) 0%, rgba(32, 201, 151, 0.05) 100%)',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      border: '2px solid rgba(25, 135, 84, 0.1)'
                    }}
                  >
                    <h5 className="mb-4" style={{ fontSize: '1.3rem', fontWeight: '700', color: '#198754' }}>
                      <i className="fas fa-wallet me-2"></i>
                      Chọn phương thức thanh toán
                    </h5>
                    
                    <div className="mb-4">
                      <div 
                        className={`p-4 mb-3 rounded ${paymentMethod === 'bank_transfer' ? 'border-primary' : ''}`}
                        style={{
                          cursor: 'pointer',
                          border: paymentMethod === 'bank_transfer' ? '3px solid #0d6efd' : '2px solid #dee2e6',
                          background: paymentMethod === 'bank_transfer' ? 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 202, 240, 0.1) 100%)' : 'white',
                          transition: 'all 0.3s ease',
                          boxShadow: paymentMethod === 'bank_transfer' ? '0 4px 15px rgba(13, 110, 253, 0.2)' : 'none'
                        }}
                        onClick={() => setPaymentMethod('bank_transfer')}
                      >
                        <div className="d-flex align-items-center">
                          <div 
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: `3px solid ${paymentMethod === 'bank_transfer' ? '#0d6efd' : '#dee2e6'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '1rem',
                              background: paymentMethod === 'bank_transfer' ? '#0d6efd' : 'white'
                            }}
                          >
                            {paymentMethod === 'bank_transfer' && (
                              <i className="fas fa-check text-white" style={{ fontSize: '0.9rem' }}></i>
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center">
                              <i className="fas fa-qrcode me-2" style={{ fontSize: '1.5rem', color: '#0d6efd' }}></i>
                              <strong style={{ fontSize: '1.1rem' }}>Chuyển khoản (QR VNPay)</strong>
                            </div>
                            <small className="text-muted">Quét mã QR để thanh toán nhanh chóng</small>
                          </div>
                        </div>
                      </div>

                          </div>
                            </div>
                  {paymentMethod === 'bank_transfer' && (
                    <div className="text-center p-3 border rounded">
                      <div className="mb-3">
                        <i className="fas fa-qrcode me-2" style={{ fontSize: '1.5rem', color: '#0d6efd' }}></i>
                        <strong style={{ fontSize: '1.1rem' }}>Thanh toán qua VNPay</strong>
                          </div>
                      <div className="alert alert-info mb-3" style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>Hướng dẫn:</strong>
                        <ol className="mb-0 mt-2" style={{ paddingLeft: '1.2rem' }}>
                          <li>Nhấn nút "Thanh toán VNPay" bên dưới</li>
                          <li>Bạn sẽ được chuyển đến trang thanh toán VNPay</li>
                          <li>Chọn phương thức thanh toán (QR Code, Thẻ ATM, Internet Banking...)</li>
                          <li>Hoàn tất thanh toán trên VNPay</li>
                          <li>Hệ thống sẽ tự động cập nhật trạng thái sau khi thanh toán thành công</li>
                        </ol>
                        </div>
                      <div className="small text-muted mb-3">
                        <i className="fas fa-shield-alt me-2"></i>
                        Thanh toán được bảo mật bởi VNPay
                      </div>
                      <Button 
                        variant="primary" 
                        size="lg"
                        onClick={async () => {
                          // Get appointment from invoice or use selectedAppointmentForPayment
                          let appointment = null;
                          if (selectedInvoice?.appointmentId) {
                            appointment = appointments.find(a => a.id === selectedInvoice.appointmentId);
                          }
                          if (!appointment) {
                            appointment = selectedAppointmentForPayment || appointments.find(a => a.id === selectedAppointmentForPayment?.id);
                          }
                          await handleVNPayPayment(selectedInvoice, appointment);
                        }} 
                        disabled={paymentStatus === 'processing'}
                        style={{ 
                          minWidth: '200px',
                          padding: '0.75rem 2rem',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}
                      >
                        {paymentStatus === 'processing' ? (
                          <>
                            <i className="fas fa-spinner fa-spin me-2"></i>
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-credit-card me-2"></i>
                            Thanh toán VNPay
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}
          
          {/* Bước 3 luôn hiển thị để show kết quả thanh toán */}
              {paymentStep === 3 && (
                <div>
                  <h6 className="fw-bold mb-3">3) Xác nhận</h6>
                  {paymentStatus === 'success' ? (
                    <div className="text-center mb-3">
                      <div className="d-inline-flex align-items-center justify-content-center mb-2" style={{width: 64, height: 64, borderRadius: '50%', background: '#e6f4ea'}}>
                        <i className="fas fa-check text-success" style={{ fontSize: '26px' }}></i>
                      </div>
                      <h5 className="text-success mb-1">Thanh toán thành công</h5>
                      <div className="text-muted">Đơn hàng của bạn đã được thanh toán thành công.</div>
                    </div>
                  ) : (
                    <div className="text-center mb-3">
                      <div className="d-inline-flex align-items-center justify-content-center mb-2" style={{width: 64, height: 64, borderRadius: '50%', background: '#fdecea'}}>
                        <i className="fas fa-times text-danger" style={{ fontSize: '26px' }}></i>
                      </div>
                      <h5 className="text-danger mb-1">Thanh toán thất bại</h5>
                      <div className="text-muted">Giao dịch không thành công, vui lòng thử lại.</div>
                    </div>
                  )}

                  {(() => {
                    // Safely get appointment ID from selectedInvoice or selectedAppointmentForPayment
                    const appointmentId = selectedInvoice?.appointmentId || selectedAppointmentForPayment?.id;
                    const apt = appointmentId ? appointments.find(a => a.id === appointmentId) : selectedAppointmentForPayment;
                    const item = selectedInvoice ? (selectedInvoice.items || [])[0] : null;
                    const statusBadge = paymentStatus === 'success' ? <Badge bg="success">Đã thanh toán</Badge> : <Badge bg="danger">Thất bại</Badge>;
                    const totalAmount = selectedInvoice?.totalAmount || selectedAppointmentForPayment?.amount || 500000;
                    
                    // Nếu không có dữ liệu, vẫn hiển thị với thông tin cơ bản
                    if (!apt && !selectedInvoice && !selectedAppointmentForPayment) {
                    return (
                      <div className="p-3 bg-light rounded">
                          <div className="alert alert-info mb-0">
                            <i className="fas fa-info-circle me-2"></i>
                            Đang tải thông tin chi tiết...
                          </div>
                      </div>
                    );
                    }
                    
                    return (
                      <div className="p-3 bg-light rounded">
                        <h6 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600', color: '#0d6efd' }}>
                          <i className="fas fa-info-circle me-2"></i>
                          Thông tin lịch hẹn
                        </h6>
                        <div className="d-flex justify-content-between mb-2"><span>Bệnh nhân</span><strong>{apt?.patientName || user?.fullName || 'N/A'}</strong></div>
                        <div className="d-flex justify-content-between mb-2"><span>Email</span><span>{apt?.patientEmail || user?.email || 'N/A'}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span>Mã lịch hẹn</span><code>{apt?.appointmentCode || apt?.id || selectedInvoice?.appointmentId || 'N/A'}</code></div>
                        {apt?.appointmentDate && (
                          <div className="d-flex justify-content-between mb-2"><span>Ngày/giờ hẹn</span><span>{`${new Date(apt.appointmentDate).toLocaleDateString('vi-VN')}${formatTime(apt) !== 'Chưa xác định' ? ` • ${formatTime(apt)}` : ''}`}</span></div>
                        )}
                        <div className="d-flex justify-content-between mb-2">
                          <span>Gói dịch vụ</span>
                          <span>
                            {(() => {
                              // Ưu tiên lấy từ item.serviceName (invoice), sau đó từ apt.service (appointment đã enrich)
                              let serviceName = item?.serviceName || apt?.service || apt?.testPackageName || apt?.TestPackageName;
                              
                              // Nếu vẫn chưa có hoặc là giá trị mặc định, thử fetch từ testPackageId
                              if (!serviceName || serviceName === 'Xét nghiệm' || serviceName === 'Xét nghiệm máu') {
                                const testPackageId = apt?.testPackageId || apt?.TestPackageId || apt?.test_package_id;
                                if (testPackageId) {
                                  // Thử tìm trong services state trước
                                  if (services.length > 0) {
                                    const matchedService = services.find(s => {
                                      const sId = s.PackageId || s.packageId || s.TestPackageId || s.testPackageId || s.id || s.Id;
                                      return String(sId) === String(testPackageId);
                                    });
                                    if (matchedService) {
                                      serviceName = matchedService.PackageName || matchedService.packageName || matchedService.name || matchedService.Name;
                                    }
                                  }
                                  
                                  // Nếu vẫn chưa có, sử dụng tên mặc định
                                  if (!serviceName || serviceName === 'Xét nghiệm' || serviceName === 'Xét nghiệm máu') {
                                    serviceName = 'Xét nghiệm';
                                  }
                                }
                              }
                              
                              return serviceName || 'Xét nghiệm';
                            })()}
                          </span>
                        </div>
                        
                        <hr className="my-3" />
                        
                        <h6 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600', color: '#0d6efd' }}>
                          <i className="fas fa-credit-card me-2"></i>
                          Thông tin thanh toán
                        </h6>
                        <div className="d-flex justify-content-between mb-2"><span>Phương thức</span><span>Chuyển khoản (QR VNPay)</span></div>
                        <div className="d-flex justify-content-between mb-2"><span>Tổng tiền</span><strong className="text-success">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}</strong></div>
                        <div className="d-flex justify-content-between mb-2"><span>Trạng thái</span>{statusBadge}</div>
                        
                        {/* Thông tin chi tiết từ VNPay */}
                        {paymentResult && (
                          <>
                            <hr className="my-3" />
                            <h6 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600', color: '#0d6efd' }}>
                              <i className="fas fa-receipt me-2"></i>
                              Chi tiết giao dịch VNPay
                            </h6>
                            {paymentResult.transactionCode && (
                              <div className="d-flex justify-content-between mb-2">
                                <span>Mã giao dịch VNPay</span>
                                <code style={{ fontSize: '0.9rem', background: '#f8f9fa', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                  {paymentResult.transactionCode}
                                </code>
                </div>
              )}
                            {paymentResult.vnpayTransactionId > 0 && (
                              <div className="d-flex justify-content-between mb-2">
                                <span>Mã tham chiếu VNPay</span>
                                <code style={{ fontSize: '0.9rem', background: '#f8f9fa', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                  {paymentResult.vnpayTransactionId}
                                </code>
                              </div>
                            )}
                            {paymentResult.bankCode && paymentResult.bankCode !== 'N/A' && (
                              <div className="d-flex justify-content-between mb-2">
                                <span>Ngân hàng</span>
                                <strong>{paymentResult.bankCode}</strong>
                              </div>
                            )}
                            {paymentResult.cardType && paymentResult.cardType !== 'ATM' && (
                              <div className="d-flex justify-content-between mb-2">
                                <span>Loại thẻ</span>
                                <strong>{paymentResult.cardType}</strong>
                              </div>
                            )}
                            {paymentResult.timestamp && (
                              <div className="d-flex justify-content-between mb-2">
                                <span>Thời gian thanh toán</span>
                                <span>{new Date(paymentResult.timestamp).toLocaleString('vi-VN', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}</span>
                              </div>
                            )}
                            {paymentResult.paymentResponse?.description && (
                              <div className="d-flex justify-content-between">
                                <span>Mô tả</span>
                                <span className={paymentStatus === 'success' ? 'text-success' : 'text-danger'}>
                                  {paymentResult.paymentResponse.description}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Đóng</Button>
          {paymentStep > 1 && paymentStep < 3 && paymentStatus!=='processing' && <Button variant="outline-primary" onClick={() => setPaymentStep(paymentStep - 1)}>Quay lại</Button>}
          {paymentStep === 1 && <Button variant="primary" onClick={() => setPaymentStep(2)}>Tiếp tục</Button>}
          {paymentStep === 3 && paymentStatus === 'failed' && <Button variant="warning" onClick={() => setPaymentStep(2)}>Thử lại</Button>}
        </Modal.Footer>
      </Modal>

      {/* Confirm Cancel Dialog - Trường hợp 1: Chờ xác nhận (chưa thanh toán) */}
      <ConfirmDialog
        show={showConfirmDialog}
        onHide={() => {
          setShowConfirmDialog(false);
          setAppointmentToCancel(null);
        }}
        onConfirm={confirmCancel}
        title="Xác nhận hủy lịch hẹn"
        message="Bạn có chắc chắn muốn hủy lịch hẹn này? Hành động này không thể hoàn tác."
        confirmText="Hủy lịch hẹn"
        cancelText="Không"
        variant="warning"
        isLoading={isCancelling}
      />

      {/* Custom Cancel Dialog - Trường hợp 2: Đã thanh toán (có cảnh báo không hoàn tiền) */}
      <Modal 
        show={showCancelWithRefundWarning} 
        onHide={() => {
          setShowCancelWithRefundWarning(false);
          setAppointmentToCancel(null);
          setConfirmNoRefund(false);
        }} 
        centered 
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-warning text-dark">
          <Modal.Title>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Xác nhận hủy lịch hẹn đã thanh toán
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-start mb-3">
            <i className="fas fa-exclamation-circle text-danger me-3 mt-1" style={{ fontSize: '2rem' }}></i>
            <div className="flex-grow-1">
              <p className="mb-3" style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                Cảnh báo quan trọng về việc hủy lịch hẹn đã thanh toán
              </p>
              <div className="alert alert-danger" role="alert">
                <i className="fas fa-ban me-2"></i>
                <strong>Khi bạn hủy lịch hẹn đã thanh toán, bạn sẽ không được hoàn tiền dưới bất kỳ hình thức nào.</strong>
              </div>
              <p className="mt-3 mb-3">
                Nếu bạn chắc chắn muốn hủy lịch hẹn này, vui lòng tích vào ô xác nhận bên dưới.
              </p>
              <Form.Check
                type="checkbox"
                id="confirmNoRefund"
                label="Tôi hiểu và xác nhận rằng tôi sẽ không được hoàn tiền khi hủy lịch hẹn này"
                checked={confirmNoRefund}
                onChange={(e) => setConfirmNoRefund(e.target.checked)}
                className="mt-3"
                style={{ fontSize: '1rem' }}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              setShowCancelWithRefundWarning(false);
              setAppointmentToCancel(null);
              setConfirmNoRefund(false);
            }}
            disabled={isCancelling}
          >
            <i className="fas fa-times me-2"></i>
            Không hủy
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmCancel}
            disabled={isCancelling || !confirmNoRefund}
          >
            {isCancelling ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang xử lý...
              </>
            ) : (
              <>
                <i className="fas fa-times-circle me-2"></i>
                Hủy lịch hẹn
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCrudCreate} onHide={() => setShowCrudCreate(false)} centered>
          <Modal.Header closeButton className="bg-primary text-white border-0">
              <Modal.Title><i className="fas fa-calendar-plus me-2"></i>Tạo lịch hẹn mới</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
              <Form>
                  <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Thời gian hẹn</Form.Label>
                      <Form.Control type="datetime-local" value={crudFormData.appointmentTime} onChange={(e) => setCrudFormData({...crudFormData, appointmentTime: e.target.value})} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                      <Form.Label className="fw-bold d-block">Đăng ký khám / Tái khám</Form.Label>
                      <Form.Check inline type="radio" label="Khám" name="crudType" checked={crudFormData.appointmentType === 'Khám'} onChange={() => setCrudFormData({...crudFormData, appointmentType: 'Khám'})} />
                      <Form.Check inline type="radio" label="Tái khám" name="crudType" checked={crudFormData.appointmentType === 'Tái khám'} onChange={() => setCrudFormData({...crudFormData, appointmentType: 'Tái khám'})} />
                  </Form.Group>
              </Form>
          </Modal.Body>
          <Modal.Footer className="border-0 bg-light">
              <Button variant="secondary" onClick={() => setShowCrudCreate(false)}>Hủy</Button>
              <Button variant="primary" onClick={handleCrudCreateSubmit}>Lưu</Button>
          </Modal.Footer>
      </Modal>

      <Modal show={showCrudEdit} onHide={() => setShowCrudEdit(false)} centered>
          <Modal.Header closeButton className="bg-warning border-0">
              <Modal.Title><i className="fas fa-edit me-2"></i>Chỉnh sửa lịch hẹn</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
              <Form>
                  <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Đặt lại thời gian hẹn</Form.Label>
                      <Form.Control type="datetime-local" value={crudFormData.appointmentTime} onChange={(e) => setCrudFormData({...crudFormData, appointmentTime: e.target.value})} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                      <Form.Label className="fw-bold d-block">Đăng ký khám / Tái khám</Form.Label>
                      <Form.Check inline type="radio" label="Khám" name="crudEditType" checked={crudFormData.appointmentType === 'Khám'} onChange={() => setCrudFormData({...crudFormData, appointmentType: 'Khám'})} />
                      <Form.Check inline type="radio" label="Tái khám" name="crudEditType" checked={crudFormData.appointmentType === 'Tái khám'} onChange={() => setCrudFormData({...crudFormData, appointmentType: 'Tái khám'})} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Ghi chú thêm lý do vì sao (Không bắt buộc)</Form.Label>
                      <Form.Control as="textarea" rows={2} value={crudFormData.reasonForRescheduling} onChange={(e) => setCrudFormData({...crudFormData, reasonForRescheduling: e.target.value})} />
                  </Form.Group>
              </Form>
          </Modal.Body>
          <Modal.Footer className="border-0 bg-light">
              <Button variant="secondary" onClick={() => setShowCrudEdit(false)}>Hủy chỉnh sửa</Button>
              <Button variant="warning" onClick={handleCrudEditSubmit}>Lưu chỉnh sửa</Button>
          </Modal.Footer>
      </Modal>

        {!hideHeader && <GuestFooter />}
      </motion.div>
  );
};

export default MyAppointments;