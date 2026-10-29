/**
 * Patient Dashboard Page
 * 
 * Main dashboard page for patients in the Blood Laboratory Management System.
 * Provides personalized view of appointments, test results, and health information
 * with interactive features and real-time updates.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Carousel, Alert } from 'react-bootstrap';
import { useAccessDenied } from '../../shared/hooks/useAccessDenied';
import { StatusBadge } from '../../shared/utils/status/statusHelper';
import { APPOINTMENT_STATUS, LAB_TEST_STATUS } from '../../shared/constants/status';
import { motion } from 'framer-motion';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../shared/contexts/NotificationContext';
import { appointmentService } from '../../services/appointmentService';
import { useNavigate } from 'react-router-dom';
import { testOrderService } from '../../services/testOrderService';
import { invoiceService } from '../../services/invoiceService';
import { medicalService } from '../../services/medicalService';
import { sampleService } from '../../services/sampleService';
import { shiftService } from '../../services/shiftService';
import { patientService } from '../../services/patientService';
import { doctorService } from '../../services/doctorService';
import PatientHeader from '../../components/Layout/PatientHeader';
import GuestFooter from '../../components/Layout/GuestFooter';
import MyAppointments from '../../features/patient/components/MyAppointments/MyAppointmentsLegacy';
import MyResults from '../../features/lab-results/components/MyResults/MyResults';
// MyConsultations component removed — feature unsupported by backend

import html2pdf from 'html2pdf.js';
import signatureImg from '../../assets/chukyao.png';
import stampImg from '../../assets/condauao.png';
import PaymentHistory from '../../features/patient/components/PaymentHistory/PaymentHistory';
import LazyLoad from 'react-lazyload';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../../shared/styles/calendar-custom.css';
import '../../features/patient/components/MyAppointments/MyAppointments.css';
import api from '../../services/api';
import useResponsive from '../../shared/hooks/useResponsive';

/**
 * Patient Dashboard Component
 * 
 * Comprehensive dashboard for patients showing their appointments, test results,
 * health statistics, and quick access to services.
 * 
 * @returns {React.ReactNode} Patient dashboard component
 */
const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const { accessDeniedMessage, setAccessDeniedMessage } = useAccessDenied();
  const { isMobile, isTablet } = useResponsive();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [samples, setSamples] = useState([]);
  const [enrichedTestResult, setEnrichedTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showResultDetailModal, setShowResultDetailModal] = useState(false);
  const [selectedTestResult, setSelectedTestResult] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [doctors, setDoctors] = useState([]);
  const [rooms, setRooms] = useState([]); // Room list state
  const [bookingData, setBookingData] = useState({
    service: '',
    date: '',
    shift: '',
    doctor: '',
    room: '',
    shiftId: '', // Shift ID
    notes: ''
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [displayServices, setDisplayServices] = useState([]); // Featured packages for home display
  const [spotsLeft, setSpotsLeft] = useState(null);
  const [hasExistingSameDay, setHasExistingSameDay] = useState(false);
  const [dailySlotsLeft, setDailySlotsLeft] = useState(null); // Remaining daily appointment capacity (max 36)
  const [availableShifts, setAvailableShifts] = useState([]); // Active working shifts
  const [selectedShiftInfo, setSelectedShiftInfo] = useState(null); // Selected shift metadata
  const [showShiftModal, setShowShiftModal] = useState(false); // Shift selection modal (mobile view)
  const [showServiceModal, setShowServiceModal] = useState(false); // Service package modal

  // Pagination states for dashboard sections
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);
  const itemsPerPage = 5;

  // Guide popup state
  const [showGuideBanner, setShowGuideBanner] = useState(false);

  const bannerImages = [
    {
      id: 1,
      title: 'Chào mừng, ' + (user?.fullName || user?.username || 'Bệnh nhân'),
      subtitle: 'Quản lý sức khỏe thông minh',
      description: 'Quản lý lịch hẹn và kết quả xét nghiệm của bạn. Đặt lịch hẹn dễ dàng và theo dõi kết quả xét nghiệm.',
      image: require('../../assets/banner1.jpg'),
      buttonAction: () => setActiveTab('dashboard')
    },
    {
      id: 2,
      title: 'Lịch hẹn của bạn',
      subtitle: 'Theo dõi lịch hẹn dễ dàng',
      description: 'Xem và quản lý tất cả lịch hẹn xét nghiệm của bạn. Đặt lịch mới hoặc thay đổi lịch hiện có.',
      image: require('../../assets/banner2.jpg'),
      buttonAction: () => setActiveTab('appointments')
    },
    {
      id: 3,
      title: 'Kết quả xét nghiệm',
      subtitle: 'Nhận kết quả nhanh chóng',
      description: 'Xem kết quả xét nghiệm của bạn ngay khi có. Tải xuống báo cáo chi tiết và chia sẻ với bác sĩ.',
      image: require('../../assets/banner3.jpg'),
      buttonAction: () => setActiveTab('results')
    }
  ];

  useEffect(() => {
    // Load patient data when component mounts or when user changes (login/logout)
    if (user?.email) {
      loadPatientData();
    }
  }, [user?.email]); // Reload when user email changes (login/logout)

  // Note: isMobile is now provided by useResponsive hook, no need for manual resize handler

  // Reload patient data when booking modal opens to ensure latest data
  useEffect(() => {
    if (showBookingModal && user?.email) {
      loadPatientData();
    }
  }, [showBookingModal]); // Reload when booking modal opens

  // Show guide banner when user is loaded
  useEffect(() => {
    if (!user?.id) return; // Wait for user to be loaded

    // Show guide banner for new users, after profile update, or regular login
    // Check if this is a new user, just updated profile, or regular login
    const hasSeenGuide = localStorage.getItem(`guideBanner_${user.id}`);
    const isNewUser = localStorage.getItem(`isNewUser_${user.id}`) === 'true';
    const justUpdatedProfile = localStorage.getItem(`profileUpdated_${user.id}`) === 'true';
    const isRegularLogin = localStorage.getItem(`regularLogin_${user.id}`) === 'true';


    if ((isNewUser || justUpdatedProfile || isRegularLogin) && !hasSeenGuide && activeTab === 'dashboard') {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        setShowGuideBanner(true);
      }, 1000);
    }
  }, [user, activeTab]); // Run when user or activeTab changes

  // Route navigation based on URL hash or location state
  useEffect(() => {
    if (!location) return;

    // Check navigation state first
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear state after setting activeTab
      window.history.replaceState({}, document.title);
      return;
    }

    // Check URL hash parameter
    const hash = location.hash?.toLowerCase();
    if (hash === '#appointments') setActiveTab('appointments');
    // invoices tab removed
    else if (hash === '#results') setActiveTab('results');
    else if (hash === '#checkin') setActiveTab('checkin');
    else if (hash === '#payment-history') setActiveTab('payment-history');
  }, [location]);

  // Listen for appointment cancellation events to refresh slots
  useEffect(() => {
    const handleAppointmentCancelled = (event) => {
      const cancelledInfo = event.detail;

      // Refresh slot availability when booking tab has active date/shift
      if (activeTab === 'dashboard' && bookingData.date && bookingData.shift) {
        const cancelledDate = cancelledInfo.appointmentDate;
        const cancelledShiftId = cancelledInfo.shiftId;

        // Check if cancelled appointment matches current selected date/shift
        const dateMatches = cancelledDate === bookingData.date;
        const shiftMatches = cancelledShiftId && (
          String(cancelledShiftId).toLowerCase() === String(bookingData.shift).toLowerCase() ||
          String(cancelledShiftId).toLowerCase() === String(bookingData.shiftId).toLowerCase()
        );

        if (dateMatches && shiftMatches) {
          updateSpotsLeft(bookingData.date, bookingData.shift);
          updateDailySlotsLeft(bookingData.date);
        } else if (dateMatches) {
          // Refresh daily slots if date matches
          updateDailySlotsLeft(bookingData.date);
        }
      }

      // Clear localStorage after processing
      localStorage.removeItem('lastCancelledAppointment');
    };

    // Listen for custom event
    window.addEventListener('appointmentCancelled', handleAppointmentCancelled);

    // Also check localStorage on mount/update (in case event was missed)
    const checkCancelledAppointment = () => {
      try {
        const lastCancelled = localStorage.getItem('lastCancelledAppointment');
        if (lastCancelled) {
          const cancelledInfo = JSON.parse(lastCancelled);
          const cancelledDate = cancelledInfo.appointmentDate;

          // Refresh slot counts when booking tab has date selected
          if (activeTab === 'dashboard' && bookingData.date) {
            if (cancelledDate === bookingData.date) {
              if (bookingData.shift) {
                updateSpotsLeft(bookingData.date, bookingData.shift);
              }
              updateDailySlotsLeft(bookingData.date);
            }
          }

          // Clear after processing
          localStorage.removeItem('lastCancelledAppointment');
        }
      } catch (err) {
      }
    };

    // Check on mount and when activeTab/bookingData changes
    checkCancelledAppointment();

    return () => {
      window.removeEventListener('appointmentCancelled', handleAppointmentCancelled);
    };
  }, [activeTab, bookingData.date, bookingData.shift, bookingData.shiftId]);

  /**
   * Closes the guide banner and marks it as seen
   * 
   * This function closes the welcome guide banner and saves the state to localStorage
   * so it won't show again for this user. It also clears all trigger flags.
   * 
   * @returns {void} Does not return a value. Updates localStorage and closes banner.
   * 
   * @example
   * // Close guide banner when user clicks close button
   * handleCloseGuideBanner();
   */
  const handleCloseGuideBanner = () => {
    setShowGuideBanner(false);
    // Mark as seen in localStorage
    localStorage.setItem(`guideBanner_${user?.id}`, 'true');
    // Clear all trigger flags
    localStorage.removeItem(`isNewUser_${user?.id}`);
    localStorage.removeItem(`profileUpdated_${user?.id}`);
    localStorage.removeItem(`regularLogin_${user?.id}`);
  };


  /**
   * Loads all patient dashboard data
   * 
   * This function is the core data fetching function for the patient dashboard.
   * It performs the following operations:
   * 1. Gets patient ID from email (user.id is Account ID, not Patient ID)
   * 2. Updates user context with patient information
   * 3. Loads doctors and rooms (independent of patientId)
   * 4. Loads patient appointments and enriches with shift data
   * 5. Loads test packages (services) for booking
   * 6. Loads test results and samples
   * 7. Enriches test results with appointment and sample data
   * 
   * The function handles cases where patient record doesn't exist yet gracefully.
   * 
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load data when component mounts or user changes
   * await loadPatientData();
   */
  const loadPatientData = async () => {
    try {
      setLoading(true);

      // Get Patient ID from email (user.id is Account ID, not Patient ID)
      let patientId = null;
      if (user?.email) {
        try {
          const patientResult = await patientService.getPatientByEmail(user.email);

          if (patientResult.success && patientResult.data) {
            patientId = patientResult.data.id || patientResult.data.Id;

            // Update user context with patient metadata for booking form accuracy
            const patientData = patientResult.data;
            const updatedUser = {
              ...user,
              phone: patientData.phone || patientData.Phone || user.phone,
              fullName: patientData.fullName || patientData.FullName || patientData.name || patientData.Name || user.fullName,
              dateOfBirth: patientData.dateOfBirth || patientData.DateOfBirth || user.dateOfBirth
            };

            // Update only on value changes
            if (updatedUser.phone !== user.phone || updatedUser.fullName !== user.fullName) {
              updateUser(updatedUser);
            }
          } else {
            // Patient record does not exist yet - this is OK, will be created when user saves profile
            // Do NOT create patient record here - only create when user explicitly saves profile
          }
        } catch (err) {
          // Do NOT use account ID as fallback - they are different entities
          // patientId will remain null until patient record is created
        }
      }

      // Pre-load doctors and rooms independently of patient ID
      // Retrieve doctors from TestOrder service
      try {
        const doctorsResponse = await api.get('/gateway/testorder/doctor');

        let doctorsData = [];
        if (Array.isArray(doctorsResponse.data)) {
          doctorsData = doctorsResponse.data;
        } else if (doctorsResponse.data?.data && Array.isArray(doctorsResponse.data.data)) {
          doctorsData = doctorsResponse.data.data;
        } else {
          doctorsData = [];
        }

        setDoctors(doctorsData);
      } catch (error) {
        setDoctors([]);
      }

      // Retrieve rooms from TestOrder service
      // Backend manages Doctor Rooms and Lab Rooms
      // Correct gateway endpoint: /gateway/testorder/doctorroom
      try {
        // Retrieve doctor rooms using doctorService
        const roomsResult = await doctorService.getAllDoctorRooms({ page: 1, pageSize: 100 });

        if (roomsResult.success && roomsResult.data) {
          const roomsData = Array.isArray(roomsResult.data) ? roomsResult.data : [];
          setRooms(roomsData);
        } else {
          setRooms([]);
        }
      } catch (error) {
        setRooms([]);
      }

      // Load patient-specific datasets when patientId exists
      if (!patientId) {
        setLoading(false);
        return;
      }

      // Fetch appointments for authenticated patient
      let patientAppointments = [];
      const appointmentsResult = await appointmentService.getAppointmentsByPatient(patientId);

      if (appointmentsResult.success && appointmentsResult.data) {
        const rawAppointments = appointmentsResult.data || [];
        // Load shifts for enrichment
        const shiftsResult = await shiftService.getAllShifts().catch(() => ({ success: false, data: [] }));
        const shifts = shiftsResult.success ? shiftsResult.data : [];

        // Enrich appointments with shift data
        const enrichedAppointments = rawAppointments.map(appointment => {
          const enriched = { ...appointment };

          // Get shift data
          const shiftId = appointment.DoctorShiftId || appointment.doctorShiftId;
          if (shiftId && shifts.length > 0) {
            const shift = shifts.find(s => {
              const sId = s.ShiftId || s.shiftId || s.id;
              return String(sId) === String(shiftId);
            });

            if (shift) {
              // Get appointment date from shift
              enriched.appointmentDate = shift.ShiftDate || shift.shiftDate || shift.date;

              // Get appointment time from shift
              const shiftStart = shift.ShiftStart || shift.shiftStart || shift.start;
              if (shiftStart && typeof shiftStart === 'string') {
                enriched.appointmentTime = shiftStart.substring(0, 5); // HH:MM
              }

            }
          }

          return enriched;
        });

        // Sort by date: newest first
        const sortedAppointments = enrichedAppointments.sort((a, b) => {
          const dateA = new Date(a.appointmentDate || a.createdAt);
          const dateB = new Date(b.appointmentDate || b.createdAt);
          return dateB - dateA;
        });

        patientAppointments = sortedAppointments;
        setAppointments(sortedAppointments);
      }

      // Pre-load test packages for data enrichment
      let allTestPackages = [];
      try {
        const servicesResp = await medicalService.getAllServices();
        if (servicesResp.success) {
          const allServices = servicesResp.data || [];
          allTestPackages = allServices;
          setAvailableServices(allServices);

          // Select first 6 active packages for homepage featured view
          const activeServices = allServices
            .filter(s => {
              const status = s.Status || s.status || '';
              return status.toLowerCase() === 'active' || status === '';
            })
            .slice(0, 6) // Take first 6 packages
            .map((s, index) => {
              // Format numeric price to currency string
              const price = s.Price || s.price || 0;
              const formattedPrice = new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(price);

              // Map to package display schema
              return {
                id: s.PackageId || s.packageId || s.id || `service-${index}`,
                packageId: s.PackageId || s.packageId, // Package ID for booking
                name: s.PackageName || s.packageName || s.name || 'Xét nghiệm',
                description: s.Description || s.description || 'Mô tả dịch vụ xét nghiệm',
                icon: 'fas fa-heartbeat', // Default icon
                color: ['primary', 'success', 'info', 'warning', 'danger', 'secondary'][index % 6], // Rotate colors
                price: formattedPrice,
                rawPrice: price // Raw numeric price for calculation
              };
            });

          setDisplayServices(activeServices);
        }
      } catch (error) {
        // Fallback to default packages if DB fetch fails
        setDisplayServices([]);
      }

      // Retrieve test results from TestOrder Service
      let allResults = [];
      let allSamples = [];

      try {
        // Fetch samples for collection dates
        const samplesRes = await sampleService.getAllSamples();
        if (samplesRes.success && samplesRes.data) {
          allSamples = samplesRes.data;
          setSamples(allSamples);
        }
      } catch (e) {
      }

      try {
        // Fetch results for each appointment
        if (patientAppointments.length > 0) {
          const appointmentIds = patientAppointments.map(a => a.id || a.appointmentId);

          const resultsPromises = appointmentIds.map(aptId =>
            testOrderService.getResultsByAppointment(aptId).catch(() => ({ success: false, data: [] }))
          );

          const resultsArrays = await Promise.all(resultsPromises);
          const flatResults = resultsArrays.flatMap(r => r.data || []);


          // Enrich results with sample dates, doctor names, and service names
          allResults = flatResults.map(res => {
            // Find related sample
            const relatedSample = allSamples.find(s =>
              String(s.sampleId || s.id) === String(res.sampleId)
            );

            // Find doctor name
            let doctorName = 'Chưa phân bổ';
            if (res.reviewedBy && doctors.length > 0) {
              const doctor = doctors.find(d =>
                String(d.id) === String(res.reviewedBy) ||
                String(d.doctorId) === String(res.reviewedBy) ||
                String(d.userId) === String(res.reviewedBy)
              );
              if (doctor) {
                doctorName = doctor.fullName || doctor.name || doctorName;
              }
            }

            // Find service name from appointment
            let serviceName = 'Blood Test'; // Default
            const resAppointmentId = res.appointmentId || res.appointment_id;

            if (resAppointmentId && patientAppointments.length > 0) {
              const relatedAppointment = patientAppointments.find(apt =>
                String(apt.id || apt.appointmentId) === String(resAppointmentId)
              );


              if (relatedAppointment) {
                // Get test_package_id from appointment
                const testPackageId = relatedAppointment.TestPackageId ||
                  relatedAppointment.testPackageId ||
                  relatedAppointment.test_package_id;


                // Find package name from test packages
                if (testPackageId && allTestPackages.length > 0) {
                  const testPackage = allTestPackages.find(pkg => {
                    const pkgId = pkg.PackageId || pkg.packageId || pkg.package_id || pkg.id;
                    return String(pkgId) === String(testPackageId);
                  });

                  if (testPackage) {
                    serviceName = testPackage.PackageName || testPackage.packageName || testPackage.package_name || testPackage.name || serviceName;
                  }
                }
              }
            }

            return {
              ...res,
              id: res.testResultId || res.id,
              sampleDate: relatedSample?.collectedAt || relatedSample?.collected_at || res.createdAt,
              testDate: res.reviewedAt || res.updatedAt || res.createdAt,
              doctorName: doctorName,
              testPackage: serviceName,
              testType: serviceName,
              status: res.status || 'pending'
            };
          });

          // Filter: Only show completed results
          const visibleResults = allResults.filter(test => {
            const status = (test.status || '').toLowerCase();
            return status !== 'pending' && status !== 'cancelled';
          });

          setTestResults(visibleResults);
        }
      } catch (e) {
        setTestResults([]);
      }

      // Load samples to obtain collection timestamps
      // NOTE: /samples endpoint may not exist - handle gracefully
      try {
        const samplesResult = await sampleService.getAllSamples();
        if (samplesResult.success) {
          setSamples(samplesResult.data || []);
        }
      } catch (error) {
        setSamples([]); // Set empty array instead of crashing
      }

    } catch (error) {
    } finally {
      setLoading(false);
    }
  };


  /**
   * Handles service selection for appointment booking
   * 
   * This function is called when user selects a test package/service to book.
   * It sets the selected service in booking data and opens the booking modal.
   * If a date is already selected, it loads available shifts for that date.
   * 
   * @param {string} serviceName - Name of the selected service/test package
   * @returns {void} Does not return a value. Opens booking modal and updates state.
   * 
   * @example
   * // Select a service to book
   * handleServiceSelect('General Health Panel');
   */
  const handleServiceSelect = (serviceName) => {
    setBookingData({
      ...bookingData,
      service: serviceName
    });
    setShowBookingModal(true);
    // Load shifts for selected date
    if (bookingData.date) {
      loadShiftsForDate(bookingData.date);
    }
  };

  // Load shifts upon modal open when date is selected
  useEffect(() => {
    if (showBookingModal && bookingData.date) {
      loadShiftsForDate(bookingData.date);
    }
  }, [showBookingModal, bookingData.date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-map shifts when doctor or room state updates
  useEffect(() => {
    if (availableShifts.length > 0 && (doctors.length > 0 || rooms.length > 0)) {
      const mappedShifts = availableShifts.map(shift => {
        const doctorId = shift.DoctorId || shift.doctorId;
        const roomId = shift.RoomId || shift.roomId;

        // Shallow copy shifts to avoid mutation
        const updatedShift = { ...shift };

        // Resolve DoctorName from doctors list if missing
        if (!updatedShift.DoctorName && !updatedShift.doctorName && doctorId && doctors.length > 0) {
          const doctor = doctors.find(d => {
            const dId = d.DoctorId || d.doctorId || d.id || d.Id;
            return String(dId) === String(doctorId);
          });
          if (doctor) {
            updatedShift.DoctorName = doctor.FullName || doctor.fullName || doctor.Fullname || doctor.name;
          }
        }

        // Resolve RoomName from rooms list if missing
        if (!updatedShift.RoomName && !updatedShift.roomName && roomId && rooms.length > 0) {
          const room = rooms.find(r => {
            const rId = r.RoomId || r.roomId || r.id || r.Id;
            return String(rId) === String(roomId);
          });
          if (room) {
            updatedShift.RoomName = room.RoomName || room.roomName || room.name;
          }
        }

        return updatedShift;
      });

      // Update only on value changes
      const hasChanges = mappedShifts.some((shift, index) => {
        const original = availableShifts[index];
        return (shift.DoctorName !== original.DoctorName) || (shift.RoomName !== original.RoomName);
      });

      if (hasChanges) {
        setAvailableShifts(mappedShifts);
        // Re-synchronize selected shift metadata
        if (bookingData.shift) {
          updateShiftInfo(bookingData.shift, mappedShifts);
        }
      }
    }
  }, [doctors, rooms]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Updates the number of available slots left for a specific date
   * 
   * This function calculates how many appointment slots are still available
   * for a given date. The maximum is 36 patients per day. It performs:
   * 1. Fetches all appointments from API
   * 2. Enriches appointments with date from DoctorShift if needed
   * 3. Counts appointments for the target date
   * 4. Calculates remaining slots (36 - count)
   * 
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {Promise<void>} Does not return a value. Updates dailySlotsLeft state.
   * 
   * @example
   * // Update slots for a specific date
   * await updateDailySlotsLeft('2024-12-04');
   */
  const updateDailySlotsLeft = async (dateStr) => {
    try {
      // Retrieve all appointments from API
      const resp = await appointmentService.getAllAppointments();
      if (!resp.success) {
        setDailySlotsLeft(null);
        return;
      }

      let allAppointments = resp.data || [];

      // Enrich appointments with shift date if absent
      try {
        const shiftsResult = await shiftService.getShiftsByDate(dateStr);
        const shifts = shiftsResult.success ? (shiftsResult.data || []) : [];

        // Enrich appointments with shift date
        allAppointments = allAppointments.map(apt => {
          const aptShiftId = apt.shiftId || apt.doctorShiftId || apt.DoctorShiftId || apt.doctor_shift_id;

          // Retrieve appointmentDate from shift if absent
          if (!apt.appointmentDate && aptShiftId) {
            const relatedShift = shifts.find(s => {
              const sId = s.ShiftId || s.shiftId || s.Id || s.id;
              return sId && String(sId).toLowerCase() === String(aptShiftId).toLowerCase();
            });

            if (relatedShift) {
              const shiftDate = relatedShift.ShiftDate || relatedShift.shiftDate || relatedShift.date;
              if (shiftDate) {
                // Format date to YYYY-MM-DD
                const date = new Date(shiftDate);
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                apt.appointmentDate = formattedDate;
              }
            }
          }

          return apt;
        });
      } catch (err) {
      }

      // Filter appointments by date regardless of shift
      const appointmentsInDay = allAppointments.filter(a => {
        const aptDate = a.appointmentDate || a.appointment_date || a.AppointmentDate;
        const aptStatus = a.status || a.Status || '';
        return aptDate === dateStr && aptStatus.toLowerCase() !== 'cancelled';
      });

      const count = appointmentsInDay.length;
      const MAX_SLOTS_PER_DAY = 36; // Bottleneck capacity: Lab maximum 36 patients/day (12/shift × 3 shifts)
      const dailyLeft = Math.max(0, MAX_SLOTS_PER_DAY - count);
      setDailySlotsLeft(dailyLeft);
    } catch (error) {
      setDailySlotsLeft(null);
    }
  };

  /**
   * Handles date selection change in booking form
   * 
   * This function is called when user selects a date for appointment booking.
   * It performs:
   * 1. Formats date to YYYY-MM-DD format
   * 2. Updates booking data with selected date
   * 3. Checks if patient already has appointment on that date (1 appointment/day limit)
   * 4. Updates daily slots left for the date
   * 5. Loads available shifts for the selected date
   * 6. Updates spots left if shift is already selected
   * 
   * @param {Date} date - Selected date object
   * @returns {void} Does not return a value. Updates booking state and loads shifts.
   * 
   * @example
   * // Handle date change in calendar
   * handleDateChange(new Date('2024-12-04'));
   */
  const handleDateChange = (date) => {
    setSelectedDate(date);
    // Format date correctly to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    setBookingData({
      ...bookingData,
      date: formattedDate
    });

    // Verify one appointment per day constraint per patient
    const exists = appointments.some(a => {
      const aptDate = a.appointmentDate || a.appointment_date || a.AppointmentDate;
      const aptStatus = a.status || a.Status || '';
      return aptDate === formattedDate && aptStatus.toLowerCase() !== 'cancelled';
    });
    setHasExistingSameDay(exists);

    // Calculate remaining daily slots from fresh API data
    updateDailySlotsLeft(formattedDate);

    // Fetch shifts for selected date
    loadShiftsForDate(formattedDate);

    // Update remaining capacity for selected shift
    if (bookingData.shift) {
      updateSpotsLeft(formattedDate, bookingData.shift);
    } else {
      setSpotsLeft(null);
    }
  };

  /**
   * Loads available shifts for a specific date
   * 
   * This function fetches and enriches doctor shifts for a given date. It performs:
   * 1. Fetches shifts from API for the specified date
   * 2. Filters shifts by status (scheduled/active)
   * 3. Enriches shifts with doctor names and room names from local data
   * 4. Sets available shifts for booking selection
   * 
   * **Enrichment:**
   * - Maps doctor IDs to doctor names from doctors array
   * - Maps room IDs to room names from rooms array
   * 
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {Promise<void>} Does not return a value. Updates availableShifts state.
   * 
   * @example
   * // Load shifts for a date
   * await loadShiftsForDate('2024-12-04');
   */
  const loadShiftsForDate = async (dateStr) => {
    if (!dateStr) {
      setAvailableShifts([]);
      setSelectedShiftInfo(null);
      return;
    }

    try {
      const result = await shiftService.getShiftsByDate(dateStr);

      if (result.success && result.data && result.data.length > 0) {
        // Filter by status if available, but don't filter if status field doesn't exist
        let shifts = result.data.filter(s => {
          const status = s.Status || s.status;
          return !status || status === 'scheduled' || status === 'active' || status === 'Scheduled' || status === 'Active';
        });

        // Map DoctorName and RoomName if missing from backend
        shifts = shifts.map(shift => {
          const doctorId = shift.DoctorId || shift.doctorId;
          const roomId = shift.RoomId || shift.roomId;

          // Shallow copy shifts to avoid mutation
          const updatedShift = { ...shift };

          // Resolve DoctorName from doctors list if missing
          if (!updatedShift.DoctorName && !updatedShift.doctorName && doctorId && doctors.length > 0) {
            const doctor = doctors.find(d => {
              const dId = d.DoctorId || d.doctorId || d.id || d.Id;
              return String(dId) === String(doctorId);
            });
            if (doctor) {
              updatedShift.DoctorName = doctor.FullName || doctor.fullName || doctor.Fullname || doctor.name;
            }
          }

          // Resolve RoomName from rooms list if missing
          if (!updatedShift.RoomName && !updatedShift.roomName && roomId && rooms.length > 0) {
            const room = rooms.find(r => {
              const rId = r.RoomId || r.roomId || r.id || r.Id;
              return String(rId) === String(roomId);
            });
            if (room) {
              updatedShift.RoomName = room.RoomName || room.roomName || room.name;
            }
          }

          return updatedShift;
        });

        setAvailableShifts(shifts);

        // Update selected shift metadata if already chosen
        if (bookingData.shift) {
          updateShiftInfo(bookingData.shift, shifts);
        }
      } else {
        setAvailableShifts([]);
        setSelectedShiftInfo(null);
      }
    } catch (error) {
      setAvailableShifts([]);
      setSelectedShiftInfo(null);
      // Clear selected shift on error
      if (bookingData.shift) {
        setBookingData(prev => ({ ...prev, shift: '', doctor: '', room: '', shiftId: '' }));
      }
    }
  };

  /**
   * Groups shifts by time period (morning, afternoon, evening)
   * 
   * This helper function organizes available shifts into time-based groups
   * for better display. It filters active shifts, sorts them by start time,
   * and groups them into morning (5-12), afternoon (12-17), and evening (17-22) periods.
   * 
   * **Time periods:**
   * - Morning: 05:00 - 12:00
   * - Afternoon: 12:00 - 17:00
   * - Evening: 17:00 - 22:00
   * 
   * @returns {Object|null} Object with morning, afternoon, evening groups or null if no shifts
   * 
   * @example
   * const groups = getGroupedShifts();
   * // Returns: { morning: { label: '...', shifts: [...] }, afternoon: {...}, evening: {...} }
   */
  const getGroupedShifts = () => {
    if (!availableShifts || availableShifts.length === 0) return null;

    const filteredShifts = availableShifts
      .filter(s => {
        const status = s.Status || s.status;
        return !status || status === 'scheduled' || status === 'active' || status === 'Scheduled' || status === 'Active';
      })
      .sort((a, b) => {
        const getStartTime = (shift) => {
          const timeStr = shift.ShiftStart || shift.shiftStart || shift.StartTime || shift.startTime || '';
          const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
          if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
          }
          return 0;
        };
        return getStartTime(a) - getStartTime(b);
      });

    const groups = {
      morning: { label: '🌅 Ca Sáng (07:00 - 12:00)', shifts: [], color: '#0d6efd', bgColor: '#e7f1ff' },
      afternoon: { label: '☀️ Ca Chiều (13:00 - 17:00)', shifts: [], color: '#fd7e14', bgColor: '#fff4e6' },
      evening: { label: '🌙 Ca Tối (18:00 - 21:00)', shifts: [], color: '#6f42c1', bgColor: '#f3e8ff' }
    };

    filteredShifts.forEach(shift => {
      const startTimeRaw = shift.ShiftStart || shift.shiftStart || shift.StartTime || shift.startTime || '';
      const match = String(startTimeRaw).match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const hour = parseInt(match[1]);
        if (hour >= 5 && hour < 12) {
          groups.morning.shifts.push(shift);
        } else if (hour >= 12 && hour < 17) {
          groups.afternoon.shifts.push(shift);
        } else if (hour >= 17 && hour < 22) {
          groups.evening.shifts.push(shift);
        }
      }
    });

    return groups;
  };

  /**
   * Formats shift information for display
   * 
   * This helper function formats shift data into a readable string format
   * for display in the UI. It extracts time, doctor name, and room name
   * from the shift object.
   * 
   * @param {Object} shift - Shift object to format
   * @returns {string} Formatted shift information string
   * 
   * @example
   * const info = formatShiftInfo(shift);
   * // Returns: '07:00 - 12:00 | Dr. John Smith | Room 101'
   */
  const formatShiftInfo = (shift) => {
    const shiftId = shift.ShiftId || shift.shiftId || shift.Id || shift.id;

    const normalizeTimeForDisplay = (timeStr) => {
      if (!timeStr) return null;
      const time = String(timeStr);
      const match = time.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const hours = match[1].padStart(2, '0');
        const minutes = match[2];
        return `${hours}:${minutes}`;
      }
      return time;
    };

    const startTimeRaw = shift.ShiftStart || shift.shiftStart || shift.StartTime || shift.startTime ||
      shift.shiftTime || shift.ShiftTime || shift.time || shift.Time;
    const endTimeRaw = shift.ShiftEnd || shift.shiftEnd || shift.EndTime || shift.endTime ||
      shift.endShiftTime || shift.EndShiftTime;

    const startTime = normalizeTimeForDisplay(startTimeRaw);
    const endTime = normalizeTimeForDisplay(endTimeRaw);

    const doctorName = shift.DoctorName || shift.doctorName ||
      shift.doctor?.name || shift.Doctor?.Name ||
      shift.userName || shift.UserName || 'Chưa có bác sĩ';
    const roomName = shift.RoomName || shift.roomName ||
      shift.room?.name || shift.Room?.Name ||
      shift.roomId || shift.RoomId || 'Chưa xác định';

    const timeDisplay = startTime && endTime
      ? `${startTime} - ${endTime}`
      : startTime
        ? startTime
        : 'Chưa xác định';

    // Classify shift interval (morning, afternoon, evening)
    let shiftType = 'morning';
    let shiftTypeLabel = 'Ca Sáng';
    let shiftTypeColor = '#0d6efd';
    if (startTime) {
      const hour = parseInt(startTime.split(':')[0]);
      if (hour >= 12 && hour < 17) {
        shiftType = 'afternoon';
        shiftTypeLabel = 'Ca Chiều';
        shiftTypeColor = '#fd7e14';
      } else if (hour >= 17 && hour < 22) {
        shiftType = 'evening';
        shiftTypeLabel = 'Ca Tối';
        shiftTypeColor = '#6f42c1';
      }
    }

    return {
      shiftId: String(shiftId),
      timeDisplay,
      doctorName,
      roomName,
      startTime,
      endTime,
      shiftType,
      shiftTypeLabel,
      shiftTypeColor
    };
  };

  /**
   * Gets detailed shift information from selected shift value
   * 
   * This function extracts comprehensive information about a selected shift
   * including doctor, room, time, and shift ID. It handles multiple field name
   * variations and matches shifts by ID or time.
   * 
   * **Information extracted:**
   * - Doctor ID and name
   * - Room ID and name (with fallback mapping)
   * - Shift ID
   * - Start and end times
   * 
   * @param {string} selectedValue - Selected shift value (shiftId or time string)
   * @param {Array<Object>} [shifts=availableShifts] - Array of shifts to search in
   * @returns {Object|null} Shift information object or null if not found
   * 
   * @example
   * const info = getShiftInfo('07:00', availableShifts);
   * // Returns: { doctor: { id: '...', name: '...' }, room: '...', shiftId: '...', ... }
   */
  const getShiftInfo = (selectedValue, shifts = availableShifts) => {
    if (!selectedValue || !shifts || shifts.length === 0) return null;

    // Helper function to normalize time for comparison
    const normalizeTime = (timeStr) => {
      if (!timeStr) return null;
      // Handle TimeOnly format from backend (e.g., "13:00:00" or "13:00")
      const time = String(timeStr);
      // Extract HH:MM format
      const match = time.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const hours = match[1].padStart(2, '0');
        const minutes = match[2];
        return `${hours}:${minutes}`;
      }
      return time;
    };

    // Handle both PascalCase and camelCase from BE
    // Backend returns: ShiftStart (TimeOnly), ShiftId, DoctorId, DoctorName, RoomId, RoomName
    const shiftsAtTime = shifts.filter(s => {
      const sStatus = s.Status || s.status;
      const isActive = !sStatus || sStatus === 'scheduled' || sStatus === 'active' ||
        sStatus === 'Scheduled' || sStatus === 'Active';

      // Prioritize matching by shiftId
      const shiftId = s.ShiftId || s.shiftId || s.Id || s.id;
      const matchesId = shiftId && String(shiftId) === String(selectedValue);

      // Fallback: match by startTime if string
      if (!matchesId) {
        const sStartTime = s.ShiftStart || s.shiftStart || s.StartTime || s.startTime ||
          s.shiftTime || s.ShiftTime || s.time || s.Time;
        const normalizedShiftTime = normalizeTime(sStartTime);
        const normalizedSelectedTime = normalizeTime(selectedValue);
        const matchesTime = normalizedShiftTime && normalizedSelectedTime &&
          normalizedShiftTime === normalizedSelectedTime;
        return matchesTime && isActive;
      }

      return matchesId && isActive;
    });

    if (shiftsAtTime.length === 0) return null;

    // DoctorShift is always for doctors, so use the first shift found
    const doctorShift = shiftsAtTime[0];

    // Helper function to get field value with multiple fallbacks
    const getShiftField = (shift, ...fieldNames) => {
      if (!shift) return null;
      for (const field of fieldNames) {
        // Try exact field name
        if (shift[field] !== undefined && shift[field] !== null) {
          return shift[field];
        }
        // Try PascalCase
        const pascalCase = field.charAt(0).toUpperCase() + field.slice(1);
        if (shift[pascalCase] !== undefined && shift[pascalCase] !== null) {
          return shift[pascalCase];
        }
        // Try camelCase
        const camelCase = field.charAt(0).toLowerCase() + field.slice(1);
        if (shift[camelCase] !== undefined && shift[camelCase] !== null) {
          return shift[camelCase];
        }
      }
      return null;
    };

    // Get doctor information
    const doctorId = getShiftField(doctorShift, 'DoctorId', 'doctorId', 'UserId', 'userId');
    const doctorName = getShiftField(doctorShift, 'DoctorName', 'doctorName', 'UserName', 'userName', 'FullName', 'fullName');
    const shiftId = getShiftField(doctorShift, 'ShiftId', 'shiftId', 'Id', 'id');

    // Get room information - prefer RoomName from backend, fallback to RoomId mapping
    const roomId = getShiftField(doctorShift, 'RoomId', 'roomId', 'Room', 'room');
    const roomNameFromBackend = getShiftField(doctorShift, 'RoomName', 'roomName');

    // Resolve room name: prioritize backend RoomName, then mapped RoomId
    const getRoomName = (roomIdValue, roomNameValue) => {
      if (roomNameValue) return roomNameValue;
      if (!roomIdValue) return 'Chưa xác định';
      const roomNames = {
        'room_101': 'Phòng 101',
        'room_102': 'Phòng 102',
        'room_103': 'Phòng 103',
        'room_201': 'Phòng 201',
        'room_202': 'Phòng 202',
        'lab_room_1': 'Phòng Lab 1',
        'lab_room_2': 'Phòng Lab 2'
      };
      return roomNames[roomIdValue] || roomIdValue;
    };

    const roomName = getRoomName(roomId, roomNameFromBackend);

    // Get time information
    const startTime = getShiftField(doctorShift, 'ShiftStart', 'shiftStart', 'StartTime', 'startTime', 'shiftTime', 'ShiftTime');
    const endTime = getShiftField(doctorShift, 'ShiftEnd', 'shiftEnd', 'EndTime', 'endTime', 'endShiftTime', 'EndShiftTime');

    return {
      doctor: doctorShift ? {
        id: doctorId,
        name: doctorName || 'Bác sĩ',
        shiftId: shiftId
      } : null,
      labUser: null, // DoctorShift doesn't have lab user info
      receptionist: null, // DoctorShift doesn't have receptionist info
      room: roomName,
      roomId: roomId,
      shiftId: shiftId,
      startTime: startTime,
      endTime: endTime
    };
  };

  /**
   * Updates shift information when user selects a shift
   * 
   * This function is called when user selects a shift from the dropdown.
   * It extracts shift information and updates booking data with doctor ID,
   * room ID, and shift ID for appointment creation.
   * 
   * @param {string} shiftTime - Selected shift time or shift ID
   * @param {Array<Object>} [shifts=availableShifts] - Array of shifts to search in
   * @returns {void} Does not return a value. Updates selectedShiftInfo and bookingData state.
   * 
   * @example
   * // Update shift info when user selects a shift
   * updateShiftInfo('07:00', availableShifts);
   */
  const updateShiftInfo = (shiftTime, shifts = availableShifts) => {
    const info = getShiftInfo(shiftTime, shifts);
    setSelectedShiftInfo(info);

    // Update bookingData with shiftId from DB
    setBookingData(prev => ({
      ...prev,
      shift: shiftTime || '', // Retain shift time for UI display
      doctor: info?.doctor?.id || '',
      room: info?.roomId || '',
      shiftId: info?.shiftId || shiftTime || '' // Store shiftId for appointment assignment
    }));
  };

  /**
   * Handles shift selection change in booking form
   * 
   * This function is called when user selects or changes a shift in the booking form.
   * It performs:
   * 1. Clears shift data if empty value selected
   * 2. Updates shift information if valid shift selected
   * 3. Updates available spots left for the selected shift
   * 
   * @param {string} selectedShift - Selected shift value (shiftId or time string)
   * @returns {void} Does not return a value. Updates booking state and spots left.
   * 
   * @example
   * // Handle shift change in dropdown
   * handleShiftChange('07:00');
   */
  const handleShiftChange = (selectedShift) => {
    if (!selectedShift) {
      // Clear shift if empty value selected
      setBookingData(prev => ({
        ...prev,
        shift: '',
        doctor: '',
        room: '',
        shiftId: ''
      }));
      setSelectedShiftInfo(null);
      setSpotsLeft(null);
      return;
    }

    updateShiftInfo(selectedShift);
    if (bookingData.date) {
      updateSpotsLeft(bookingData.date, selectedShift);
    }
  };

  /**
   * Calculates remaining shift slots based on lab capacity constraint
   * 
   * BOOKING CAPACITY CONSTRAINT LOGIC:
   * ===========================
   * 
   * 1. LAB ROOM CAPACITY (Bottleneck):
   *    - Duration per patient: 60 minutes
   *    - Shift duration: 240 minutes (4 hours)
   *    - Max capacity per lab room/shift = 240 / 60 = 4 patients
   *    - Total lab capacity (3 rooms) = 4 * 3 = 12 patients/shift
   * 
   * 2. CONSULTATION ROOM CAPACITY:
   *    - Duration per patient: 30 minutes
   *    - Shift duration: 240 minutes (4 hours)
   *    - Max capacity per doctor room/shift = 240 / 30 = 8 patients
   *    - Total doctor capacity (3 rooms) = 8 * 3 = 24 patients/shift
   * 
   * 3. BOTTLENECK ANALYSIS:
   *    - Patient workflow requires both lab and consultation
   *    - Lab processes maximum 12 patients/shift
   *    - Doctor can process up to 24 patients/shift
   *    - System bottleneck is Lab capacity
   *    - Effective maximum capacity = 12 patients/shift
   * 
   * 4. DAILY CAPACITY LIMIT:
   *    - Daily maximum capacity (3 shifts) = 12 * 3 = 36 patients/day
   * 
   * @param {string} dateStr - Booking date (YYYY-MM-DD)
   * @param {string} shiftStr - Shift identifier or start time
   */
  const updateSpotsLeft = async (dateStr, shiftStr) => {
    try {
      // Fetch appointments for date calculation
      const resp = await appointmentService.getAllAppointments();
      if (!resp.success) {
        setSpotsLeft(null);
        return;
      }

      let allAppointments = resp.data || [];

      // Enrich appointments with shift date if absent
      // Fetch shifts to resolve date
      try {
        const shiftsResult = await shiftService.getShiftsByDate(dateStr);
        const shifts = shiftsResult.success ? (shiftsResult.data || []) : [];

        // Enrich appointments with shift date
        allAppointments = allAppointments.map(apt => {
          const aptShiftId = apt.shiftId || apt.doctorShiftId || apt.DoctorShiftId || apt.doctor_shift_id;

          // Retrieve appointmentDate from shift if absent
          if (!apt.appointmentDate && aptShiftId) {
            const relatedShift = shifts.find(s => {
              const sId = s.ShiftId || s.shiftId || s.Id || s.id;
              return sId && String(sId).toLowerCase() === String(aptShiftId).toLowerCase();
            });

            if (relatedShift) {
              const shiftDate = relatedShift.ShiftDate || relatedShift.shiftDate || relatedShift.date;
              if (shiftDate) {
                // Format date to YYYY-MM-DD
                const date = new Date(shiftDate);
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                apt.appointmentDate = formattedDate;
              }
            }
          }

          return apt;
        });
      } catch (err) {
      }

      // Filter appointments by date and shiftId
      const appointmentsInShift = allAppointments.filter(apt => {
        // Match by date
        const aptDate = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate;
        const dateMatches = aptDate === dateStr;

        if (!dateMatches) return false;

        // Match by shiftId
        const aptShiftId = apt.shiftId ||
          apt.doctorShiftId ||
          apt.DoctorShiftId ||
          apt.doctor_shift_id ||
          apt.doctorShift_id;

        const matchesShiftId = aptShiftId && String(aptShiftId).toLowerCase() === String(shiftStr).toLowerCase();

        // Match by startTime (fallback)
        const aptStartTime = apt.appointmentTime ||
          apt.startTime ||
          apt.AppointmentTime ||
          apt.StartTime;
        const matchesStartTime = aptStartTime && String(aptStartTime) === String(shiftStr);

        const aptStatus = apt.status || apt.Status || '';
        const isActive = aptStatus.toLowerCase() !== 'cancelled';

        const matches = matchesShiftId || matchesStartTime;

        return matches && isActive;
      });

      const count = appointmentsInShift.length;

      // Max slots per shift based on lab bottleneck: 12
      const MAX_SLOTS_PER_SHIFT = 12; // Bottleneck: Lab maximum 12 patients/shift

      // Compute remaining available slots
      const left = Math.max(0, MAX_SLOTS_PER_SHIFT - count);
      setSpotsLeft(left);
    } catch (error) {
      setSpotsLeft(null);
    }
  };

  /**
   * Checks if a date is allowed for appointment booking
   * 
   * This function validates if a selected date is within the allowed booking range.
   * Dates must be:
   * 1. Not in the past
   * 2. Within one month from today
   * 
   * @param {Date} dateObj - Date object to check
   * @returns {boolean} True if date is allowed, false otherwise
   * 
   * @example
   * // Check if date is allowed
   * const allowed = isDateAllowed(new Date('2024-12-04'));
   */
  const isDateAllowed = (dateObj) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
    const withinOneMonth = diffDays >= 0 && diffDays <= 30;
    // Booking permitted from D+1 to D+30
    return withinOneMonth && (diffDays >= 1 && diffDays <= 30);
  };

  /**
   * Checks if a date is within one month from today
   * 
   * This helper function validates that a date is not more than one month
   * in the future from today's date.
   * 
   * @param {Date} dateObj - Date object to check
   * @returns {boolean} True if date is within one month, false otherwise
   * 
   * @example
   * // Check if date is within one month
   * const withinMonth = isWithinOneMonth(new Date('2024-12-04'));
   */
  const isWithinOneMonth = (dateObj) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  /**
   * Handles viewing appointment details
   * 
   * This function is called when user clicks to view details of an appointment.
   * It sets the selected appointment and opens the detail modal.
   * 
   * @param {Object} appointment - Appointment object to view
   * @returns {void} Does not return a value. Opens detail modal.
   * 
   * @example
   * // View appointment details
   * handleViewDetail(appointment);
   */
  const handleViewDetail = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  /**
   * Handles appointment booking form submission
   * 
   * This function is called when user submits the appointment booking form.
   * It performs:
   * 1. Validates form data (date, service, shift)
   * 2. Checks for existing appointments on the same date
   * 3. Checks available spots for the selected shift
   * 4. Creates appointment via API
   * 5. Handles VNPay payment if required
   * 6. Refreshes data and shows success notification
   * 
   * **Validation rules:**
   * - Date must be selected and allowed
   * - Service must be selected
   * - Shift must be selected
   * - Patient cannot have more than 1 appointment per day
   * - Shift must have available spots
   * 
   * @param {Event} e - Form submit event
   * @returns {Promise<void>} Does not return a value. Creates appointment and handles payment.
   * 
   * @example
   * // Submit booking form
   * <Form onSubmit={handleBookingSubmit}>
   */
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!bookingData.service) {
        showError('Vui lòng chọn gói xét nghiệm');
        return;
      }
      if (!bookingData.date) {
        showError('Vui lòng chọn ngày khám');
        return;
      }
      if (!bookingData.shift) {
        showError('Vui lòng chọn ca khám');
        return;
      }

      // VALIDATION: Check if shift has already expired
      const selectedDate = new Date(bookingData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      // Check if booking date is in the past
      if (selectedDate < today) {
        showError('Khung giờ bạn chọn đã kết thúc. Vui lòng chọn ca làm việc còn hiệu lực.');
        return;
      }

      // If today, verify shift end time has not passed
      if (selectedDate.getTime() === today.getTime()) {
        let endTime = selectedShiftInfo?.endTime;
        
        // Fallback: locate endTime from availableShifts
        if (!endTime && bookingData.shiftId) {
          const shift = availableShifts.find(s => {
            const shiftId = String(s.shiftId || s.id || s.Id || '');
            return shiftId === String(bookingData.shiftId);
          });
          if (shift) {
            endTime = shift.ShiftEnd || shift.shiftEnd || shift.EndTime || shift.endTime ||
              shift.endShiftTime || shift.EndShiftTime;
          }
        }
        
        if (endTime) {
          // Parse endTime string (HH:MM or HH:MM:SS)
          const timeMatch = String(endTime).match(/^(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            const endHour = parseInt(timeMatch[1]);
            const endMinute = parseInt(timeMatch[2]);
            
            // Construct Date object for shift end time today
            const shiftEndDateTime = new Date();
            shiftEndDateTime.setHours(endHour, endMinute, 0, 0);
            
            // Compare with current timestamp
            const now = new Date();
            if (now > shiftEndDateTime) {
              showError('Khung giờ bạn chọn đã kết thúc. Vui lòng chọn ca làm việc còn hiệu lực.');
              return;
            }
          }
        }
      }

      // VALIDATION: Limit 1 appointment per patient per calendar day
      // Retrieve Patient ID for uniqueness check
      let patientId = null;
      if (user?.email) {
        try {
          const patientResult = await patientService.getPatientByEmail(user.email);
          if (patientResult.success && patientResult.data) {
            patientId = patientResult.data.id || patientResult.data.Id;
          }
        } catch (err) {
        }
      }

      // Fetch fresh appointments from API for accurate validation
      let existingAppointmentInDay = null;
      if (patientId) {
        try {
          // Fetch patient appointments from API
          const patientAppointmentsResult = await appointmentService.getAppointmentsByPatient(patientId);
          if (patientAppointmentsResult.success && patientAppointmentsResult.data) {
            const patientAppointments = Array.isArray(patientAppointmentsResult.data)
              ? patientAppointmentsResult.data
              : [];

            // Verify patient has no existing appointment on selected date
            existingAppointmentInDay = patientAppointments.find(apt => {
              const aptDate = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate;
              const aptStatus = apt.status || apt.Status;
              const isActive = aptStatus !== 'cancelled' && aptStatus !== 'CANCELLED';

              // Match active appointment on same date
              return aptDate === bookingData.date && isActive;
            });
          }
        } catch (err) {
          // Fallback to state check if API fails
          existingAppointmentInDay = appointments.find(apt => {
            const aptDate = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate;
            const aptPatientId = apt.patientId || apt.patient_id || apt.PatientId;
            const aptCreatedBy = apt.createdBy || apt.created_by || apt.CreatedBy;
            const aptStatus = apt.status || apt.Status;

            const dateMatches = aptDate === bookingData.date;
            const patientMatches = (patientId && (aptPatientId === patientId || aptCreatedBy === patientId)) ||
              (user?.id && aptCreatedBy === user.id);
            const isActive = aptStatus !== 'cancelled' && aptStatus !== 'CANCELLED';

            return dateMatches && patientMatches && isActive;
          });
        }
      } else {
        // Fallback: check createdBy if patientId is absent
        existingAppointmentInDay = appointments.find(apt => {
          const aptDate = apt.appointmentDate || apt.appointment_date || apt.AppointmentDate;
          const aptCreatedBy = apt.createdBy || apt.created_by || apt.CreatedBy;
          const aptStatus = apt.status || apt.Status;

          const dateMatches = aptDate === bookingData.date;
          const patientMatches = user?.id && aptCreatedBy === user.id;
          const isActive = aptStatus !== 'cancelled' && aptStatus !== 'CANCELLED';

          return dateMatches && patientMatches && isActive;
        });
      }

      if (existingAppointmentInDay) {
        showError('Bạn đã có lịch hẹn trong ngày này. Mỗi bệnh nhân chỉ được đặt tối đa 1 lịch hẹn trong 1 ngày.');
        return;
      }

      // Resolve TestPackageId from service name
      // Resolve TestPackageId for booking submission
      let testPackageId = null;
      if (bookingData.service && availableServices.length > 0) {
        // Backend DTO returns PackageName in PascalCase
        // Match package by selected name
        const matchedService = availableServices.find(s => {
          // Case-insensitive match on service name
          const packageName = s.PackageName || s.packageName || s.name || s.Name || s.testPackageName || s.TestPackageName;
          const selectedService = String(bookingData.service || '').trim();
          const serviceName = String(packageName || '').trim();

          // Exact match (case-sensitive)
          if (serviceName === selectedService) return true;

          // Case-insensitive match
          if (serviceName.toLowerCase() === selectedService.toLowerCase()) return true;

          return false;
        });

        if (matchedService) {
          // Backend DTO returns PackageId in PascalCase
          // Prioritize PackageId property
          testPackageId = matchedService.PackageId || matchedService.packageId ||
            matchedService.id || matchedService.Id ||
            matchedService.testPackageId || matchedService.TestPackageId ||
            matchedService.package_id || matchedService.Package_id ||
            matchedService.serviceId || matchedService.ServiceId ||
            matchedService.code || null;
        }
      }

      // Validation: TestPackageId must not be null
      if (!testPackageId) {
        showError('Không tìm thấy thông tin gói dịch vụ. Vui lòng chọn lại gói dịch vụ và thử lại.');
        return;
      }

      // Resolve DoctorShiftId from shiftId
      const doctorShiftId = bookingData.shiftId || null;

      // CreatedBy: prioritize Patient ID over Account ID
      const createdBy = patientId || user.id;

      // Retrieve working shift info if available
      const shiftInfo = selectedShiftInfo || getShiftInfo(bookingData.shift);

      // Backend DTO requires: TestPackageId, DoctorShiftId, Status, CreatedBy
      const result = await appointmentService.createAppointment({
        TestPackageId: testPackageId,
        DoctorShiftId: doctorShiftId,
        Status: 'pending_confirmation',
        CreatedBy: createdBy
      });

      if (result.success) {
        // Handle both response formats: { data: { AppointmentId, ... } } or direct object
        const appointmentData = result.data?.data || result.data;
        const appointmentId = appointmentData?.AppointmentId || appointmentData?.appointmentId || appointmentData?.id || 'N/A';
        const appointmentCode = appointmentData?.AppointmentCode || appointmentData?.appointmentCode || appointmentId;

        // Auto-generate pending invoice for newly booked appointment
        try {
          const servicesResp = await medicalService.getAllServices();
          let price = 0;
          let itemName = bookingData.service || 'Xét nghiệm';
          let serviceId = '0';
          if (servicesResp.success) {
            // Handle both PascalCase and camelCase from BE
            const matched = servicesResp.data.find((s) =>
              (s.name || s.Name || s.testPackageName || s.TestPackageName || s.packageName || s.PackageName) === bookingData.service
            );
            if (matched) {
              price = matched.price || matched.Price || matched.testPackagePrice || matched.TestPackagePrice || 0;
              itemName = matched.name || matched.Name || matched.testPackageName || matched.TestPackageName || matched.packageName || matched.PackageName;
              serviceId = String(matched.id || matched.Id || matched.testPackageId || matched.TestPackageId || '0');
            }
          }
          // Skip invoice creation for now as payments service is not ready
          // await invoiceService.createInvoice({ ... });
        } catch (err) {
        }

        showSuccess(`Đặt lịch hẹn thành công! Mã lịch hẹn: ${appointmentCode}. Vui lòng lưu mã này để check-in khi đến phòng xét nghiệm.`);
        
        // Set flag to trigger refresh when navigating to appointments page
        sessionStorage.setItem('shouldRefreshAppointments', 'true');
        
        // Dispatch event to notify other components (e.g., MyAppointments) to refresh
        window.dispatchEvent(new CustomEvent('appointmentCreated', {
          detail: {
            appointmentId: appointmentId,
            appointmentCode: appointmentCode
          }
        }));
        
        setShowBookingModal(false);
        setBookingData({
          service: '',
          date: '',
          shift: '',
          doctor: '',
          room: '',
          shiftId: '',
          notes: ''
        });
        // Preserve date and shift from bookingData before reset
        const bookedDate = bookingData.date;
        const bookedShift = bookingData.shift || bookingData.shiftId;

        // Reset form data
        setSelectedShiftInfo(null);
        setAvailableShifts([]);
        setSelectedDate(new Date());
        setBookingData({
          service: '',
          date: '',
          shift: '',
          doctor: '',
          room: '',
          shiftId: '',
          notes: ''
        });

        // Reload data to refresh appointments list
        await loadPatientData();

        // Refresh remaining slot capacity post booking
        if (bookedDate && bookedShift) {
          // Brief delay to ensure database persistence
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Re-fetch appointments from API for fresh data
          try {
            const freshAppointments = await appointmentService.getAppointmentsByDate(bookedDate);
            if (freshAppointments.success) {
            }
          } catch (err) {
          }

          // Update remaining slots for booked shift
          // bookedShift identifier (GUID or start time)
          await updateSpotsLeft(bookedDate, bookedShift);

          // Update remaining daily slots count
          await updateDailySlotsLeft(bookedDate);
        }

        setActiveTab('appointments');
      } else {
        const errorMessage = result.message || 'Có lỗi xảy ra khi đặt lịch hẹn';
        showError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.title ||
        error.response?.data?.detail ||
        error.message ||
        'Có lỗi xảy ra khi đặt lịch hẹn. Vui lòng thử lại.';
      showError(errorMessage);
    }
  };

  /**
   * Gets status badge component for appointment status
   * 
   * This helper function returns a StatusBadge component for displaying
   * appointment status with appropriate styling and colors.
   * 
   * @param {string} status - Appointment status string
   * @returns {React.ReactNode} StatusBadge component
   * 
   * @example
   * // Get status badge for appointment
   * const badge = getStatusBadge('confirmed');
   */
  const getStatusBadge = (status) => {
    return <StatusBadge entity="appointment" status={status} />;
  };

  const getFormControlStyle = () => ({
    border: '2px solid #dee2e6',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '16px',
    transition: 'all 0.3s ease'
  });

  const getFormLabelStyle = (icon) => ({
    fontWeight: 'bold',
    color: '#0d6efd',
    marginBottom: '8px'
  });

  /**
   * Formats date string to Vietnamese locale format
   * 
   * This helper function formats a date string to Vietnamese locale format
   * for display in the UI.
   * 
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date string in Vietnamese locale
   * 
   * @example
   * // Format date for display
   * const formatted = formatDate('2024-12-04');
   * // Returns: '04/12/2024'
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Safe render function to prevent object rendering errors
  const safeRender = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    if (typeof value === 'object') {
      // If it's an object with a 'value' property, render that
      if (value.hasOwnProperty('value')) return String(value.value || '');
      // Otherwise, render as [Object]
      return '[Object]';
    }
    return String(value);
  };

  // View test result details handler
  const handleViewResultDetail = async (testResult) => {
    try {
      // Find related sample for lab test
      const relatedSample = samples.find(s =>
        String(s.appointmentId) === String(testResult.appointmentId)
      );

      // Find associated appointment
      const relatedAppointment = appointments.find(apt =>
        String(apt.id) === String(testResult.appointmentId)
      );

      // Fallback to API if not in state
      let appointmentData = relatedAppointment;
      if (!appointmentData && testResult.appointmentId) {
        const aptResult = await appointmentService.getAppointmentById(testResult.appointmentId);
        if (aptResult.success) {
          appointmentData = aptResult.data;
        }
      }

      // Resolve service name from appointment or lab test
      let serviceName = testResult.testPackage || testResult.testType || 'N/A';
      if (appointmentData) {
        if (appointmentData.serviceId) {
          // Handle both PascalCase and camelCase from BE
          const service = availableServices.find(s => {
            const sId = s.id || s.Id || s.testPackageId || s.TestPackageId;
            return String(sId) === String(appointmentData.serviceId);
          });
          if (service) {
            serviceName = service.name || service.Name || service.testPackageName || service.TestPackageName || service.packageName || service.PackageName;
          }
        } else if (appointmentData.service || appointmentData.serviceName) {
          serviceName = appointmentData.service || appointmentData.serviceName;
        }
      }

      // Resolve doctor from appointment
      let doctorName = testResult.doctorName || 'Chưa phân bổ';
      if (appointmentData && appointmentData.doctorId) {
        const doctor = doctors.find(d => String(d.id) === String(appointmentData.doctorId));
        if (doctor) {
          doctorName = doctor.fullName || doctor.name || 'Chưa phân bổ';
        }
      }

      // Sample collection date from sample entity
      const sampleDate = relatedSample?.collectedAt ||
        testResult.sampleDate ||
        (relatedSample?.createdAt ? new Date(relatedSample.createdAt) : null);

      // Test execution date
      const testDate = testResult.completedAt ? new Date(testResult.completedAt) :
        (testResult.resultDate ? new Date(testResult.resultDate) :
          (testResult.testDate ? new Date(testResult.testDate) :
            (testResult.createdAt ? new Date(testResult.createdAt) : null)));

      // Enrich test result with complete metadata
      const enriched = {
        ...testResult,
        id: testResult.id || 'N/A',
        testType: serviceName,
        testPackage: serviceName,
        sampleDate: sampleDate,
        testDate: testDate,
        doctorName: doctorName,
        appointment: appointmentData
      };

      setEnrichedTestResult(enriched);
      setSelectedTestResult(enriched);
      setShowResultDetailModal(true);
    } catch (error) {
      // Fallback to baseline data display
      setSelectedTestResult(testResult);
      setShowResultDetailModal(true);
    }
  };

  // Export test result report to PDF
  /**
   * Handles downloading test result as PDF
   * 
   * This function generates and downloads a PDF report of the test result.
   * It uses html2pdf.js to convert the result detail HTML to PDF format.
   * 
   * **PDF includes:**
   * - Patient information
   * - Test package information
   * - Test results with reference ranges
   * - Doctor signature and stamp
   * - Test dates
   * 
   * @param {Object} labTest - Lab test result object to download
   * @returns {Promise<void>} Does not return a value. Downloads PDF file.
   * 
   * @example
   * // Download test result as PDF
   * await handleDownloadResult(labTest);
   */
  const handleDownloadResult = async (labTest) => {
    try {
      const parsedResults = typeof labTest.results === 'string'
        ? JSON.parse(labTest.results)
        : (labTest.results || {});

      const buildRows = (data) => {
        if (!data) return '';
        const entries = Object.entries(data);
        return entries.map(([key, value], idx) => {
          // Add key prop for React
          const uniqueKey = `result-${key}-${idx}`;
          const statusText = value.status === 'normal' ? 'Bình thường' : value.status === 'high' ? 'Cao' : value.status === 'low' ? 'Thấp' : 'N/A';
          const zebra = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
          const statusBg = value.status === 'normal' ? '#d1e7dd' : value.status === 'high' ? '#f8d7da' : value.status === 'low' ? '#fff3cd' : '#e9ecef';
          const statusColor = value.status === 'normal' ? '#0f5132' : value.status === 'high' ? '#842029' : value.status === 'low' ? '#664d03' : '#495057';
          return `
            <tr style="background:${zebra}">
              <td style="padding:10px;border:1px solid #dee2e6;font-weight:600">${key}</td>
              <td style="padding:10px;border:1px solid #dee2e6;text-align:right">${value.value ?? ''}</td>
              <td style="padding:10px;border:1px solid #dee2e6;text-align:center">${value.unit ?? ''}</td>
              <td style="padding:10px;border:1px solid #dee2e6;text-align:center">${value.normal ?? ''}</td>
              <td style="padding:6px 10px;border:1px solid #dee2e6;text-align:center;">
                <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${statusBg};color:${statusColor};font-weight:700;font-size:11px;">${statusText}</span>
              </td>
            </tr>
          `;
        }).join('');
      };

      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color:#212529;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
            <img src="/logo1.png" alt="Logo" crossorigin="anonymous" style="width:56px;height:56px;border-radius:50%;object-fit:cover;box-shadow:0 3px 10px rgba(0,0,0,.15)"/>
            <div>
              <div style="font-weight:800; font-size:18px; letter-spacing:.3px">PHÒNG XÉT NGHIỆM MÁU</div>
              <div style="font-size:12px; color:#6c757d">Báo cáo xét nghiệm</div>
            </div>
          </div>
          <div style="text-align:center; margin-bottom:12px; font-weight:800; font-size:18px;">KẾT QUẢ XÉT NGHIỆM</div>
          <hr/>

          <table style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:12px;">
            <tr>
              <td style="width:50%; vertical-align:top;">
                <div style="border:1px solid #e9ecef; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,.06); overflow:hidden">
                  <div style="font-weight:700; padding:8px 12px; background:#0d6efd; color:white">THÔNG TIN BỆNH NHÂN</div>
                  <div style="padding:10px;">
                    <div style="margin-bottom:6px;"><strong>Họ và tên:</strong> ${user.fullName || ''}</div>
                    <div style="margin-bottom:6px;"><strong>Giới tính:</strong> ${user.gender || ''}</div>
                    <div style="margin-bottom:6px;"><strong>Ngày sinh:</strong> ${formatDate(user.dateOfBirth)}</div>
                    <div style="margin-bottom:6px;"><strong>Số điện thoại:</strong> ${user.phone || ''}</div>
                    <div style="margin-bottom:6px;"><strong>Địa chỉ:</strong> ${user.address || ''}</div>
                  </div>
                </div>
              </td>
              <td style="width:50%; vertical-align:top;">
                <div style="border:1px solid #e9ecef; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,.06); overflow:hidden">
                  <div style="font-weight:700; padding:8px 12px; background:#0d6efd; color:white">THÔNG TIN XÉT NGHIỆM</div>
                  <div style="padding:10px;">
                    <div style="margin-bottom:6px;"><strong>Mã xét nghiệm:</strong> ${labTest.id || ''}</div>
                    <div style="margin-bottom:6px;"><strong>Loại xét nghiệm:</strong> ${labTest.testPackage || ''}</div>
                    <div style="margin-bottom:6px;"><strong>Ngày lấy mẫu:</strong> ${formatDate(labTest.sampleDate)}</div>
                    <div style="margin-bottom:6px;"><strong>Ngày xét nghiệm:</strong> ${formatDate(labTest.testDate)}</div>
                    <div style="margin-bottom:6px;"><strong>Trạng thái:</strong> ${labTest.status || ''}</div>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-top:20px;">
            <div style="border:1px solid #e9ecef; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,.06); overflow:hidden">
              <div style="font-weight:700; padding:8px 12px; background:#0d6efd; color:white">KẾT QUẢ XÉT NGHIỆM</div>
              <div style="padding:10px;">
                <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                  <thead>
                    <tr style="background:#f8f9fa; font-weight:700;">
                      <td style="padding:10px;border:1px solid #dee2e6;text-align:center">Chỉ số</td>
                      <td style="padding:10px;border:1px solid #dee2e6;text-align:center">Giá trị</td>
                      <td style="padding:10px;border:1px solid #dee2e6;text-align:center">Đơn vị</td>
                      <td style="padding:10px;border:1px solid #dee2e6;text-align:center">Khoảng bình thường</td>
                      <td style="padding:10px;border:1px solid #dee2e6;text-align:center">Trạng thái</td>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildRows(parsedResults)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style="margin-top:20px;">
            <table style="width:100%; border-collapse:separate; border-spacing:12px;">
              <tr>
                <td style="width:30%; text-align:center;">
                  <div><strong>Kỹ thuật viên:</strong></div>
                  <div style="margin-top:6px;">${labTest.technicianName || ''}</div>
                </td>
                <td style="width:40%; text-align:center;">
                  <div><strong>Ngày báo cáo:</strong></div>
                  <div style="margin-top:6px;">${formatDate(labTest.reportDate)}</div>
                  <div style="margin-top:8px; font-style:italic; color:#6c757d;">(Chữ ký và dấu)</div>
                  <div style="position:relative; height:120px; margin-top:6px;">
                    <img src="${stampImg}" alt="Con dấu" style="position:absolute; right:40px; bottom:-10px; width:120px; opacity:0.65; z-index:3;"/>
                    <img src="${signatureImg}" alt="Chữ ký" style="position:absolute; right:0; bottom:0; width:220px; opacity:0.9; z-index:1;"/>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
      `;

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

  if (loading) {
    return (
      <div className="min-vh-100">
        <PatientHeader />
        <Container className="py-4">
          {/* Access Denied Alert */}
          {accessDeniedMessage && (
            <Alert variant="danger" dismissible onClose={() => setAccessDeniedMessage(null)} className="mb-4">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {accessDeniedMessage}
            </Alert>
          )}
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        </Container>
        <GuestFooter />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return <MyAppointments key="appointments" hideHeader={true} />;
      // invoices tab removed
      case 'results':
        return <MyResults key="results" hideHeader={true} />;
      /* 'consultations' tab removed */
      case 'payment-history':
        return <PaymentHistory key="payment-history" />;
      default:
        return (
          <>
            {/* Hero Banner Carousel */}
            <motion.section
              className="hero-banner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <Carousel
                activeIndex={currentSlide}
                onSelect={setCurrentSlide}
                interval={5000}
                fade
              >
                {bannerImages.map((banner, index) => (
                  <Carousel.Item key={`banner-${banner.id}-${index}`}>
                    <div
                      className="hero-slide"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${banner.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        minHeight: 'clamp(500px, 100vh, 700px)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 'clamp(2rem, 5vw, 4rem) 0'
                      }}
                    >
                      <Container>
                        <Row className="align-items-center text-white">
                          {/* Text Content - Responsive */}
                          <Col xs={12} md={6} lg={6} className="order-2 order-md-1">
                            <motion.h1
                              className="fw-bold mb-3 mb-md-4"
                              style={{
                                fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                                lineHeight: '1.2'
                              }}
                              initial={{ opacity: 0, x: -50 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                            >
                              <i className="fas fa-user me-2 me-md-3"></i>
                              {banner.title}
                            </motion.h1>
                            <motion.h3
                              className="mb-3 mb-md-4 text-light"
                              style={{
                                fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                                lineHeight: '1.3'
                              }}
                              initial={{ opacity: 0, x: -50 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.8, delay: 0.4 }}
                            >
                              {banner.subtitle}
                            </motion.h3>
                            <motion.p
                              className="mb-3 mb-md-4 lead"
                              style={{
                                fontSize: 'clamp(0.9rem, 2vw, 1.25rem)',
                                lineHeight: '1.5'
                              }}
                              initial={{ opacity: 0, x: -50 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.8, delay: 0.6 }}
                            >
                              {banner.description}
                            </motion.p>
                            <motion.div
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.8, delay: 0.8 }}
                            >
                              <Button
                                variant="primary"
                                size="lg"
                                onClick={banner.buttonAction}
                                className="px-3 px-md-4"
                                style={{
                                  background: '#0d6efd',
                                  border: 'none',
                                  color: '#333333',
                                  fontWeight: '600',
                                  boxShadow: '0 8px 20px rgba(13, 110, 253, 0.3)',
                                  transition: 'all 0.3s ease',
                                  fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                                  padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-3px)';
                                  e.currentTarget.style.boxShadow = '0 12px 25px rgba(13, 110, 253, 0.4)';
                                  e.currentTarget.style.background = '#0b5ed7';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(13, 110, 253, 0.3)';
                                  e.currentTarget.style.background = '#0d6efd';
                                }}
                              >
                                <i className="fas fa-info-circle me-2"></i>
                                Tìm hiểu thêm
                              </Button>
                            </motion.div>
                          </Col>

                          {/* Image Content - Responsive */}
                          <Col xs={12} md={6} lg={6} className="text-center order-1 order-md-2 mb-4 mb-md-0">
                            <motion.div
                              className="hero-image-container"
                              initial={{ opacity: 0, x: 50 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                            >
                              <img
                                src={banner.image}
                                alt={banner.title}
                                className="img-fluid"
                                style={{
                                  width: '100%',
                                  maxWidth: 'clamp(500px, 60vw, 900px)',
                                  height: 'auto',
                                  aspectRatio: '4/3',
                                  objectFit: 'cover',
                                  borderRadius: '20px',
                                  boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.3)';
                                }}
                              />
                            </motion.div>
                          </Col>
                        </Row>
                      </Container>
                    </div>
                  </Carousel.Item>
                ))}
              </Carousel>
            </motion.section>

            {/* Quick Guide Modal */}
            <Modal
              show={showGuideBanner}
              onHide={handleCloseGuideBanner}
              centered
              size="xl"
              backdrop="static"
              keyboard={false}
              style={{ zIndex: 9999 }}
            >
              <Modal.Body
                style={{
                  padding: 0,
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderRadius: '25px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '3px solid #0d6efd',
                  boxShadow: '0 10px 30px rgba(13, 110, 253, 0.3)'
                }}
              >
                {/* Decorative elements */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '200px',
                  height: '200px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  zIndex: 1
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  zIndex: 1
                }}></div>

                <div style={{ padding: '2.5rem', position: 'relative', zIndex: 2 }}>
                  <Button
                    variant="link"
                    onClick={handleCloseGuideBanner}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      color: '#dc3545',
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      zIndex: 3,
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: '50%',
                      width: '45px',
                      height: '45px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #dc3545',
                      boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    className="p-0"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc3545';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                      e.currentTarget.style.color = '#dc3545';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </Button>

                  <Row className="align-items-center">
                    <Col lg={6} className="mb-4 mb-lg-0">
                      <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="d-flex align-items-center mb-3">
                          <div style={{
                            width: '60px',
                            height: '60px',
                            background: 'rgba(13, 110, 253, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '1rem',
                            border: '2px solid #0d6efd'
                          }}>
                            <i className="fas fa-lightbulb" style={{ fontSize: '2rem', color: '#ffd700' }}></i>
                          </div>
                          <h3 className="text-dark mb-0" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                            Chào mừng bạn đến với dịch vụ xét nghiệm!
                          </h3>
                        </div>
                        <p className="text-dark mb-4" style={{ fontSize: '1.1rem', lineHeight: '1.8', opacity: 0.8 }}>
                          Chúng tôi giúp bạn đặt lịch xét nghiệm và nhận kết quả nhanh chóng, tiện lợi.
                          Hãy bắt đầu hành trình chăm sóc sức khỏe của bạn ngay hôm nay!
                        </p>
                      </motion.div>
                    </Col>

                    <Col lg={6}>
                      <Row>
                        <Col md={6} className="mb-3">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <Card
                              style={{
                                background: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '2px solid #0d6efd',
                                borderRadius: '15px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(13, 110, 253, 0.2)'
                              }}
                              onClick={() => {
                                setShowBookingModal(true);
                                handleCloseGuideBanner();
                              }}
                            >
                              <div className="text-center">
                                <div style={{
                                  width: '50px',
                                  height: '50px',
                                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 1rem'
                                }}>
                                  <i className="fas fa-calendar-plus" style={{ fontSize: '1.5rem', color: 'white' }}></i>
                                </div>
                                <h5 className="text-dark mb-2" style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                  Bước 1
                                </h5>
                                <p className="text-dark mb-0" style={{ fontSize: '0.95rem', opacity: 0.8 }}>
                                  Đặt lịch hẹn xét nghiệm
                                </p>
                              </div>
                            </Card>
                          </motion.div>
                        </Col>

                        <Col md={6} className="mb-3">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <Card
                              style={{
                                background: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '2px solid #0d6efd',
                                borderRadius: '15px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(13, 110, 253, 0.2)'
                              }}
                              onClick={() => {
                                setActiveTab('appointments');
                                handleCloseGuideBanner();
                              }}
                            >
                              <div className="text-center">
                                <div style={{
                                  width: '50px',
                                  height: '50px',
                                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 1rem'
                                }}>
                                  <i className="fas fa-credit-card" style={{ fontSize: '1.5rem', color: 'white' }}></i>
                                </div>
                                <h5 className="text-dark mb-2" style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                  Bước 2
                                </h5>
                                <p className="text-dark mb-0" style={{ fontSize: '0.95rem', opacity: 0.8 }}>
                                  Thanh toán đơn hàng
                                </p>
                              </div>
                            </Card>
                          </motion.div>
                        </Col>

                        <Col md={6} className="mb-3">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <Card
                              style={{
                                background: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '2px solid #0d6efd',
                                borderRadius: '15px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(13, 110, 253, 0.2)'
                              }}
                              onClick={() => {
                                setActiveTab('checkin');
                                handleCloseGuideBanner();
                              }}
                            >
                              <div className="text-center">
                                <div style={{
                                  width: '50px',
                                  height: '50px',
                                  background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 1rem'
                                }}>
                                  <i className="fas fa-sign-in-alt" style={{ fontSize: '1.5rem', color: '#d35400' }}></i>
                                </div>
                                <h5 className="text-dark mb-2" style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                  Bước 3
                                </h5>
                                <p className="text-dark mb-0" style={{ fontSize: '0.95rem', opacity: 0.8 }}>
                                  Check-in khi đến
                                </p>
                              </div>
                            </Card>
                          </motion.div>
                        </Col>

                        <Col md={6} className="mb-3">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <Card
                              style={{
                                background: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '2px solid #0d6efd',
                                borderRadius: '15px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(13, 110, 253, 0.2)'
                              }}
                              onClick={() => {
                                setActiveTab('results');
                                handleCloseGuideBanner();
                              }}
                            >
                              <div className="text-center">
                                <div style={{
                                  width: '50px',
                                  height: '50px',
                                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 1rem'
                                }}>
                                  <i className="fas fa-flask" style={{ fontSize: '1.5rem', color: '#16a085' }}></i>
                                </div>
                                <h5 className="text-dark mb-2" style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                  Bước 4
                                </h5>
                                <p className="text-dark mb-0" style={{ fontSize: '0.95rem', opacity: 0.8 }}>
                                  Nhận kết quả xét nghiệm
                                </p>
                              </div>
                            </Card>
                          </motion.div>
                        </Col>
                      </Row>
                    </Col>
                  </Row>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center mt-4"
                  >
                    <p className="text-dark mb-0" style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                      <i className="fas fa-info-circle me-2"></i>
                      Nhấn vào các bước để bắt đầu hoặc đóng thông báo này để xem dịch vụ
                    </p>
                  </motion.div>
                </div>
              </Modal.Body>
            </Modal>

            {/* Services Section */}
            <LazyLoad height={800} offset={100}>
              <motion.section
                id="services"
                className="services-section py-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%)',
                  position: 'relative',
                  minHeight: '100vh',
                  padding: '6rem 0'
                }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
              >
                {/* Background Image */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'url(' + require('../../assets/background2.jpg') + ')',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.3,
                  zIndex: 0
                }}></div>

                <Container style={{ position: 'relative', zIndex: 1 }}>
                  {/* Section Header */}
                  <motion.div
                    className="text-center mb-5"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <div className="medical-section-header" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,248,255,0.95) 100%)',
                      borderRadius: '20px',
                      padding: '3rem 2rem',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                      border: '2px solid rgba(13, 110, 253, 0.2)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div className="medical-icon-bg" style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        fontSize: '8rem',
                        color: 'rgba(13, 110, 253, 0.1)',
                        zIndex: 1
                      }}>
                        <i className="fas fa-stethoscope"></i>
                      </div>
                      <div style={{ position: 'relative', zIndex: 2 }}>
                        <h2 className="display-5 fw-bold text-primary mb-3" style={{
                          background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          textShadow: '0 4px 8px rgba(13, 110, 253, 0.3)'
                        }}>
                          <i className="fas fa-stethoscope me-3" style={{
                            background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}></i>
                          Dịch vụ xét nghiệm
                        </h2>
                        <p className="lead text-muted mb-4" style={{ fontSize: '1.2rem', fontWeight: '500' }}>
                          Chọn dịch vụ xét nghiệm và đặt lịch hẹn ngay
                        </p>
                        <div className="medical-stats" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                          <motion.div
                            className="stat-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <div style={{ fontSize: '2rem', color: '#0d6efd', fontWeight: 'bold' }}>99.9%</div>
                            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Độ chính xác</div>
                          </motion.div>
                          <motion.div
                            className="stat-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <div style={{ fontSize: '2rem', color: '#0d6efd', fontWeight: 'bold' }}>2-4h</div>
                            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Thời gian</div>
                          </motion.div>
                          <motion.div
                            className="stat-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <div style={{ fontSize: '2rem', color: '#0d6efd', fontWeight: 'bold' }}>24/7</div>
                            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Hỗ trợ</div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Services Grid */}
                  <Row className="g-4">
                    {displayServices.length > 0 ? (
                      displayServices.map((service, index) => (
                        <Col lg={4} md={6} xs={12} key={service.id}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.5,
                              delay: index * 0.2,
                              type: "spring",
                              stiffness: 100,
                              damping: 15
                            }}
                            whileHover={{
                              y: -10,
                              scale: 1.05,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Card
                              className="h-100 service-card border-0"
                              style={{
                                background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%)',
                                borderRadius: '20px',
                                boxShadow: '0 10px 30px rgba(13, 110, 253, 0.2)',
                                border: '3px solid rgba(13, 110, 253, 0.2)',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-15px) scale(1.02) rotate(2deg)';
                                e.currentTarget.style.boxShadow = '0 25px 50px rgba(13, 110, 253, 0.4)';
                                e.currentTarget.style.border = '3px solid rgba(13, 110, 253, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1) rotate(0deg)';
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(13, 110, 253, 0.2)';
                                e.currentTarget.style.border = '3px solid rgba(13, 110, 253, 0.2)';
                              }}
                            >
                              <Card.Body className="text-center p-4">
                                <div className="service-image mb-3" style={{
                                  width: 'calc(100% + 12px)',
                                  height: '280px',
                                  borderRadius: '15px',
                                  overflow: 'hidden',
                                  marginBottom: '1rem',
                                  marginLeft: '-6px',
                                  marginTop: '-6px',
                                  position: 'relative',
                                  zIndex: 1
                                }}>
                                  <motion.img
                                    src={require(`../../assets/card${(index % 6) + 1}.jpg`)}
                                    alt={service.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: index * 0.2 + 0.3,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.08,
                                      transition: { duration: 0.2 }
                                    }}
                                  />
                                </div>

                                <div className="medical-service-info">
                                  <h5 className="fw-bold mb-3" style={{
                                    color: '#0d6efd',
                                    fontSize: '1.3rem',
                                    textShadow: '0 2px 4px rgba(13, 110, 253, 0.2)'
                                  }}>
                                    <i className="fas fa-heartbeat me-2" style={{ color: '#dc3545' }}></i>
                                    {service.name}
                                  </h5>
                                  <p className="text-muted mb-3" style={{
                                    fontSize: '1rem',
                                    lineHeight: '1.6',
                                    color: '#6c757d'
                                  }}>
                                    {service.description}
                                  </p>

                                  <motion.div
                                    className="medical-badge mb-3"
                                    style={{
                                      background: '#0d6efd',
                                      color: '#333333',
                                      padding: '4px 12px',
                                      borderRadius: '25px',
                                      fontSize: '0.85rem',
                                      fontWeight: '600',
                                      boxShadow: '0 3px 10px rgba(13, 110, 253, 0.3)',
                                      display: 'inline-block'
                                    }}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      duration: 0.3,
                                      delay: index * 0.2 + 0.5,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.05,
                                      y: -2,
                                      transition: { duration: 0.2 }
                                    }}
                                  >
                                    {service.price}
                                  </motion.div>

                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: index * 0.2 + 0.7,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      y: -3,
                                      transition: { duration: 0.2 }
                                    }}
                                  >
                                    <Button
                                      variant="primary"
                                      className="w-100 medical-btn"
                                      onClick={() => handleServiceSelect(service.name)}
                                      style={{
                                        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                        border: 'none',
                                        borderRadius: '25px',
                                        padding: '12px 24px',
                                        fontWeight: '600',
                                        fontSize: '1rem',
                                        boxShadow: '0 8px 20px rgba(13, 110, 253, 0.3)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 12px 25px rgba(13, 110, 253, 0.4)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(13, 110, 253, 0.3)';
                                      }}
                                    >
                                      <i className="fas fa-calendar-plus me-2"></i>
                                      Đặt lịch hẹn
                                    </Button>
                                  </motion.div>
                                </div>
                              </Card.Body>
                            </Card>
                          </motion.div>
                        </Col>
                      ))
                    ) : (
                      // Loading or empty state rendering
                      <Col xs={12}>
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Đang tải dịch vụ...</span>
                          </div>
                          <p className="mt-3 text-muted">Đang tải danh sách dịch vụ...</p>
                        </div>
                      </Col>
                    )}
                  </Row>
                </Container>
              </motion.section>
            </LazyLoad>

            {/* My Appointments & Results Section */}
            <LazyLoad height={600} offset={100}>
              <motion.section
                className="py-5"
                style={{
                  background: `linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%), url('/assets/ảnh nền quy trình y tế.jpg')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundAttachment: 'scroll',
                  backgroundRepeat: 'no-repeat',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '80vh'
                }}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Container>
                  <motion.div
                    className="text-center mb-5"
                    style={{
                      backgroundColor: 'white !important',
                      padding: '2rem !important',
                      borderRadius: '20px !important',
                      boxShadow: '0 15px 40px rgba(0,0,0,0.1) !important',
                      margin: '0 1rem !important',
                      position: 'relative !important',
                      zIndex: 1
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: true }}
                  >
                    <motion.h2
                      className="display-6 fw-bold mb-3"
                      style={{
                        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      viewport={{ once: true }}
                    >
                      <i className="fas fa-calendar-check me-3" style={{ color: '#0d6efd' }}></i>
                      Lịch hẹn & Kết quả của tôi
                    </motion.h2>
                    <motion.p
                      className="lead text-muted"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      viewport={{ once: true }}
                    >
                      Quản lý lịch hẹn và xem kết quả xét nghiệm của bạn
                    </motion.p>
                  </motion.div>

                  <Row>
                    {/* Patient Appointments Section */}
                    <Col md={6} className="mb-4">
                      <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -5 }}
                      >
                        <Card
                          style={{
                            borderRadius: '20px !important',
                            border: 'none !important',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.1) !important',
                            overflow: 'hidden !important',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important'
                          }}
                        >
                          <Card.Header
                            style={{
                              background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%) !important',
                              border: 'none !important',
                              padding: '1.5rem !important'
                            }}
                          >
                            <h5 className="mb-0 text-white">
                              <i className="fas fa-calendar-alt me-2"></i>
                              Lịch hẹn của tôi
                            </h5>
                          </Card.Header>
                          <Card.Body style={{ padding: '2rem' }}>
                            {appointments.length > 0 ? (
                              <div style={{ overflow: 'hidden', borderRadius: '15px' }}>
                                <Table
                                  responsive
                                  style={{
                                    margin: 0,
                                    borderCollapse: 'separate',
                                    borderSpacing: 0
                                  }}
                                >
                                  <thead>
                                    <tr style={{
                                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                      borderRadius: '15px 15px 0 0'
                                    }}>
                                      <th style={{
                                        padding: '1rem',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        color: '#495057',
                                        fontSize: '16px',
                                        textAlign: 'center',
                                        borderBottom: '2px solid #dee2e6'
                                      }}>
                                        <i className="fas fa-calendar me-2"></i>
                                        Ngày hẹn
                                      </th>
                                      <th style={{
                                        padding: '1rem',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        color: '#495057',
                                        fontSize: '16px',
                                        textAlign: 'center',
                                        borderBottom: '2px solid #dee2e6'
                                      }}>
                                        <i className="fas fa-clock me-2"></i>
                                        Thời gian
                                      </th>
                                      <th style={{
                                        padding: '1rem',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        color: '#495057',
                                        fontSize: '16px',
                                        textAlign: 'center',
                                        borderBottom: '2px solid #dee2e6'
                                      }}>
                                        <i className="fas fa-info-circle me-2"></i>
                                        Trạng thái
                                      </th>
                                      <th style={{
                                        padding: '1rem',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        color: '#495057',
                                        fontSize: '16px',
                                        textAlign: 'center',
                                        borderBottom: '2px solid #dee2e6'
                                      }}>
                                        <i className="fas fa-cog me-2"></i>
                                        Thao tác
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {appointments.slice((appointmentPage - 1) * itemsPerPage, appointmentPage * itemsPerPage).map((appointment, index) => (
                                      <motion.tr
                                        key={appointment.id || appointment.appointmentId || `appointment-${index}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        style={{
                                          background: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                                          borderBottom: '1px solid #e9ecef',
                                          transition: 'all 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)';
                                          e.currentTarget.style.transform = 'translateX(5px)';
                                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                                          e.currentTarget.style.transform = 'translateX(0)';
                                          e.currentTarget.style.boxShadow = 'none';
                                        }}
                                      >
                                        <td style={{
                                          padding: '1rem',
                                          border: 'none',
                                          textAlign: 'center',
                                          fontWeight: '500',
                                          color: '#495057',
                                          fontSize: '15px'
                                        }}>
                                          <i className="fas fa-calendar-day me-2 text-primary"></i>
                                          {formatDate(appointment.appointmentDate)}
                                        </td>
                                        <td style={{
                                          padding: '1rem',
                                          border: 'none',
                                          textAlign: 'center',
                                          fontWeight: '500',
                                          color: '#495057',
                                          fontSize: '15px'
                                        }}>
                                          <i className="fas fa-clock me-2 text-success"></i>
                                          {appointment.appointmentTime}
                                        </td>
                                        <td style={{
                                          padding: '1rem',
                                          border: 'none',
                                          textAlign: 'center'
                                        }}>
                                          {getStatusBadge(appointment.status)}
                                        </td>
                                        <td style={{
                                          padding: '1rem',
                                          border: 'none',
                                          textAlign: 'center'
                                        }}>
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => navigate('/patient/appointments')}
                                            style={{
                                              borderRadius: '20px',
                                              padding: '6px 16px',
                                              fontWeight: '600',
                                              fontSize: '13px',
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
                                            Xem chi tiết
                                          </Button>
                                        </td>
                                      </motion.tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                            ) : (
                              <motion.div
                                className="text-center py-5"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                style={{
                                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                  borderRadius: '15px',
                                  padding: '3rem 2rem',
                                  border: '2px dashed #dee2e6'
                                }}
                              >
                                <motion.i
                                  className="fas fa-calendar-times fa-4x text-muted mb-4"
                                  animate={{
                                    rotate: [0, -10, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 3
                                  }}
                                ></motion.i>
                                <h5 className="text-muted mb-2">Chưa có lịch hẹn nào</h5>
                                <p className="text-muted mb-0">Hãy đặt lịch hẹn để sử dụng dịch vụ xét nghiệm</p>
                              </motion.div>
                            )}

                            {/* Pagination for Appointments */}
                            {appointments.length > itemsPerPage && (
                              <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  disabled={appointmentPage === 1}
                                  onClick={() => setAppointmentPage(appointmentPage - 1)}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <i className="fas fa-chevron-left"></i>
                                </Button>
                                <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                  {appointmentPage} / {Math.ceil(appointments.length / itemsPerPage)}
                                </span>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  disabled={appointmentPage >= Math.ceil(appointments.length / itemsPerPage)}
                                  onClick={() => setAppointmentPage(appointmentPage + 1)}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <i className="fas fa-chevron-right"></i>
                                </Button>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </motion.div>
                    </Col>

                    {/* Lab Test Results Section */}
                    <Col md={6} className="mb-4">
                      <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -5 }}
                      >
                        <Card
                          style={{
                            borderRadius: '20px !important',
                            border: 'none !important',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.1) !important',
                            overflow: 'hidden !important',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important'
                          }}
                        >
                          <Card.Header
                            style={{
                              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%) !important',
                              border: 'none !important',
                              padding: '1.5rem !important'
                            }}
                          >
                            <h5 className="mb-0 text-white">
                              <i className="fas fa-flask me-2"></i>
                              Kết quả xét nghiệm
                            </h5>
                          </Card.Header>
                          <Card.Body>
                            {/* New Result Notification */}
                            {testResults.length > 0 && (
                              <div className="alert alert-success mb-3" role="alert">
                                <i className="fas fa-check-circle me-2"></i>
                                <strong>Kết quả xét nghiệm đã sẵn sàng!</strong> Bác sĩ đã duyệt và gửi kết quả xét nghiệm của bạn.
                                Bạn có thể xem chi tiết.
                              </div>
                            )}

                            {testResults.length > 0 ? (
                              <Table responsive>
                                <thead>
                                  <tr>
                                    <th>Loại xét nghiệm</th>
                                    <th>Ngày thực hiện</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {testResults.slice((resultPage - 1) * itemsPerPage, resultPage * itemsPerPage).map((test, index) => (
                                    <tr key={test.id || test.testId || test.labTestId || `test-${index}`}>
                                      <td>{test.testType || test.testPackage}</td>
                                      <td>{formatDate(test.testDate || test.createdAt)}</td>
                                      <td>{getStatusBadge(test.status)}</td>
                                      <td>
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => navigate('/patient/results')}
                                          style={{ fontSize: '0.8rem' }}
                                        >
                                          <i className="fas fa-eye me-1"></i>
                                          Xem chi tiết
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : (
                              <div className="text-center py-3">
                                <i className="fas fa-flask fa-3x text-muted mb-3"></i>
                                <p className="text-muted">Chưa có kết quả xét nghiệm nào</p>
                              </div>
                            )}

                            {/* Pagination for Test Results */}
                            {testResults.length > itemsPerPage && (
                              <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  disabled={resultPage === 1}
                                  onClick={() => setResultPage(resultPage - 1)}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <i className="fas fa-chevron-left"></i>
                                </Button>
                                <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                  {resultPage} / {Math.ceil(testResults.length / itemsPerPage)}
                                </span>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  disabled={resultPage >= Math.ceil(testResults.length / itemsPerPage)}
                                  onClick={() => setResultPage(resultPage + 1)}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <i className="fas fa-chevron-right"></i>
                                </Button>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </motion.div>
                    </Col>
                  </Row>
                </Container>
              </motion.section>
            </LazyLoad>

            {/* Booking Modal */}
            <Modal
              show={showBookingModal}
              onHide={() => setShowBookingModal(false)}
              size="xl"
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
                    color: 'white',
                    padding: '1.5rem 2rem',
                    boxShadow: '0 4px 20px rgba(13, 110, 253, 0.3)'
                  }}
                >
                  <Modal.Title className="text-white fw-bold d-flex align-items-center" style={{ fontSize: '1.5rem' }}>
                    <div style={{
                      width: '45px',
                      height: '45px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <i className="fas fa-calendar-plus" style={{ fontSize: '1.3rem' }}></i>
                    </div>
                    <div>
                      <div>Đặt lịch hẹn mới</div>
                      <small style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: '400' }}>
                        Chọn ngày, giờ và gói xét nghiệm
                      </small>
                    </div>
                  </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleBookingSubmit}>
                  <Modal.Body
                    className="booking-modal-body"
                    style={{
                      background: '#f8f9fa',
                      padding: '0'
                    }}
                  >
                    <Row className="g-0">
                      {/* Left Column - Calendar */}
                      <Col xs={12} md={5} className="calendar-modal-container" style={{
                        borderRight: '1px solid #dee2e6',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        padding: '2rem 1.5rem'
                      }}>
                        <div className="mb-4">
                          <h6 className="fw-bold mb-2 d-flex align-items-center" style={{
                            fontSize: '1.1rem',
                            color: '#0d6efd'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(102, 16, 242, 0.1) 100%)',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px'
                            }}>
                              <i className="fas fa-calendar-alt text-primary"></i>
                            </div>
                            Chọn ngày khám
                          </h6>
                          <p className="text-muted mb-0" style={{ fontSize: '0.85rem', marginLeft: '52px' }}>
                            Chọn ngày trong vòng 30 ngày tới
                          </p>
                        </div>
                        <Calendar
                          onChange={handleDateChange}
                          value={selectedDate}
                          locale="vi-VN"
                          className="w-100"
                          style={{
                            border: 'none',
                            width: '100%'
                          }}
                          minDate={new Date()}
                        // 30-day limit hidden per specification
                        // maxDate={new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)}
                        // tileDisabled={({ date, view }) => view === 'month' && !isWithinOneMonth(date)}
                        />
                      </Col>

                      {/* Right Column - Booking Info */}
                      <Col xs={12} md={7} className="booking-form-container" style={{
                        padding: '2rem',
                        background: 'white',
                        maxHeight: 'calc(100vh - 200px)',
                        overflowY: 'auto'
                      }}>
                        <div className="mb-4">
                          <h6 className="fw-bold mb-2 d-flex align-items-center" style={{
                            fontSize: '1.1rem',
                            color: '#0d6efd'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(102, 16, 242, 0.1) 100%)',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px'
                            }}>
                              <i className="fas fa-clipboard-list text-primary"></i>
                            </div>
                            Thông tin lịch hẹn
                          </h6>
                        </div>

                        {/* Patient Information */}
                        <div className="mb-4 p-4" style={{
                          background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%)',
                          borderRadius: '16px',
                          border: '1px solid rgba(13, 110, 253, 0.15)',
                          boxShadow: '0 2px 10px rgba(13, 110, 253, 0.08)'
                        }}>
                          <h6 className="fw-semibold mb-3 text-primary d-flex align-items-center">
                            <i className="fas fa-user-circle me-2" style={{ fontSize: '1.2rem' }}></i>
                            Thông tin bệnh nhân
                          </h6>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                  <i className="fas fa-user me-2 text-muted"></i>
                                  Họ và tên
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  value={user?.fullName || user?.username || ''}
                                  readOnly
                                  style={{
                                    backgroundColor: '#ffffff',
                                    border: '2px solid #e9ecef',
                                    borderRadius: '10px',
                                    fontWeight: '500',
                                    color: '#495057',
                                    padding: '0.75rem 1rem',
                                    transition: 'all 0.3s ease'
                                  }}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-0">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                  <i className="fas fa-phone me-2 text-muted"></i>
                                  Số điện thoại
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  value={user?.phone || 'Chưa cập nhật'}
                                  readOnly
                                  style={{
                                    backgroundColor: '#ffffff',
                                    border: '2px solid #e9ecef',
                                    borderRadius: '10px',
                                    fontWeight: '500',
                                    color: '#495057',
                                    padding: '0.75rem 1rem',
                                    transition: 'all 0.3s ease'
                                  }}
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>

                        {/* Appointment Date & Time */}
                        <div className="mb-4 p-4" style={{
                          background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(32, 201, 151, 0.05) 100%)',
                          borderRadius: '16px',
                          border: '1px solid rgba(40, 167, 69, 0.15)',
                          boxShadow: '0 2px 10px rgba(40, 167, 69, 0.08)'
                        }}>
                          <h6 className="fw-semibold mb-3 text-success d-flex align-items-center">
                            <i className="fas fa-calendar-check me-2" style={{ fontSize: '1.2rem' }}></i>
                            Chọn ngày và giờ khám
                          </h6>
                          {availableShifts.length > 0 && (
                            <div className="mb-3">
                              <small className="text-muted d-flex align-items-center">
                                <i className="fas fa-info-circle me-1"></i>
                                <span>Có {availableShifts.length} ca khám khả dụng trong ngày này</span>
                              </small>
                            </div>
                          )}
                          {dailySlotsLeft !== null && (
                            <div className="mb-3">
                              <small className="text-muted d-flex align-items-center">
                                <i className="fas fa-calendar-day me-1"></i>
                                <span>Chỗ còn lại trong ngày: </span>
                                <Badge
                                  bg={dailySlotsLeft > 10 ? 'success' : dailySlotsLeft > 0 ? 'warning' : 'danger'}
                                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginLeft: '0.5rem' }}
                                >
                                  {dailySlotsLeft > 0 ? `${dailySlotsLeft}/36 chỗ` : 'Đã đầy (36/36)'}
                                </Badge>
                              </small>
                            </div>
                          )}

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                  <i className="fas fa-calendar-day me-2 text-muted"></i>
                                  Ngày khám
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  value={bookingData.date ? new Date(bookingData.date).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  }) : 'Chưa chọn ngày'}
                                  readOnly
                                  style={{
                                    backgroundColor: '#ffffff',
                                    border: '2px solid #e9ecef',
                                    borderRadius: '10px',
                                    fontWeight: '500',
                                    padding: '0.75rem 1rem',
                                    color: bookingData.date ? '#28a745' : '#6c757d'
                                  }}
                                />
                                {/* Validation message hidden per specification */}
                                {/* {bookingData.date && !isDateAllowed(new Date(bookingData.date)) && (
                          <small className="text-danger">Chỉ được đặt trước từ 1 đến 30 ngày.</small>
                        )} */}
                                {hasExistingSameDay && (
                                  <small className="text-danger ms-2">Bạn đã có lịch trong ngày này.</small>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-0">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                  <i className="fas fa-clock me-2 text-muted"></i>
                                  Ca khám <span className="text-danger">*</span>
                                </Form.Label>

                                {/* Shift Selection Modal Trigger */}
                                <Button
                                  variant={bookingData.shift ? "outline-primary" : "primary"}
                                  className="w-100 d-flex justify-content-between align-items-center"
                                  onClick={() => {
                                    if (bookingData.date && availableShifts.length > 0) {
                                      setShowShiftModal(true);
                                    }
                                  }}
                                  disabled={!bookingData.date || availableShifts.length === 0}
                                  style={{
                                    minHeight: '48px',
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    borderRadius: '12px',
                                    border: bookingData.shift ? '2px solid #0d6efd' : 'none',
                                    padding: '0.875rem 1.125rem',
                                    backgroundColor: bookingData.shift ? '#ffffff' : '#0d6efd',
                                    color: bookingData.shift ? '#0d6efd' : '#ffffff',
                                    transition: 'all 0.3s ease',
                                    boxShadow: bookingData.date && availableShifts.length > 0 ? '0 2px 10px rgba(13, 110, 253, 0.12)' : 'none',
                                    textAlign: 'left',
                                    opacity: (!bookingData.date || availableShifts.length === 0) ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (bookingData.date && availableShifts.length > 0) {
                                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(13, 110, 253, 0.2)';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = bookingData.date && availableShifts.length > 0 ? '0 2px 10px rgba(13, 110, 253, 0.12)' : 'none';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                >
                                  <span>
                                    {bookingData.shift && selectedShiftInfo ? (
                                      <>
                                        <i className="fas fa-check-circle me-2"></i>
                                        {selectedShiftInfo.timeDisplay} - {selectedShiftInfo.doctor?.name || 'Bác sĩ'}
                                      </>
                                    ) : !bookingData.date ? (
                                      <>
                                        <i className="fas fa-calendar-times me-2"></i>
                                        Chọn ngày trước
                                      </>
                                    ) : availableShifts.length === 0 ? (
                                      <>
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        Không có ca khám
                                      </>
                                    ) : (
                                      <>
                                        <i className="fas fa-clock me-2"></i>
                                        Chọn ca khám
                                      </>
                                    )}
                                  </span>
                                  <i className="fas fa-chevron-down"></i>
                                </Button>
                                {bookingData.shift && (
                                  <div className="mt-2 d-flex align-items-center gap-2">
                                    <small className="text-muted d-flex align-items-center">
                                      <i className="fas fa-users me-1"></i>
                                      Số chỗ còn lại:
                                    </small>
                                    <Badge
                                      bg={spotsLeft === null ? 'secondary' : spotsLeft > 5 ? 'success' : spotsLeft > 0 ? 'warning' : 'danger'}
                                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}
                                    >
                                      {spotsLeft === null ? '...' : spotsLeft > 0 ? `${spotsLeft} chỗ` : 'Đã đầy'}
                                    </Badge>
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>


                        {/* Auto-assignment Details */}
                        {bookingData.shift && (
                          <div className="mb-4 p-4" style={{
                            background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.08) 0%, rgba(32, 201, 151, 0.08) 100%)',
                            borderRadius: '16px',
                            border: '2px solid rgba(40, 167, 69, 0.25)',
                            borderLeft: '5px solid #28a745',
                            boxShadow: '0 4px 15px rgba(40, 167, 69, 0.15)'
                          }}>
                            <h6 className="fw-semibold mb-3 text-success d-flex align-items-center">
                              <div style={{
                                width: '35px',
                                height: '35px',
                                background: 'rgba(40, 167, 69, 0.15)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '10px'
                              }}>
                                <i className="fas fa-check-circle"></i>
                              </div>
                              Thông tin phân bổ tự động
                            </h6>

                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                    <i className="fas fa-user-md me-2 text-muted"></i>
                                    Bác sĩ được phân công
                                  </Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={selectedShiftInfo?.doctor?.name || 'Chưa có bác sĩ trong ca này'}
                                    readOnly
                                    style={{
                                      backgroundColor: '#ffffff',
                                      border: '2px solid #e9ecef',
                                      borderRadius: '10px',
                                      fontWeight: '500',
                                      color: selectedShiftInfo?.doctor ? '#28a745' : '#6c757d',
                                      padding: '0.75rem 1rem',
                                      borderColor: selectedShiftInfo?.doctor ? 'rgba(40, 167, 69, 0.3)' : '#e9ecef'
                                    }}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-0">
                                  <Form.Label className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                    <i className="fas fa-door-open me-2 text-muted"></i>
                                    Phòng khám
                                  </Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={selectedShiftInfo?.room || 'Chưa xác định'}
                                    readOnly
                                    style={{
                                      backgroundColor: '#ffffff',
                                      border: '2px solid #e9ecef',
                                      borderRadius: '10px',
                                      fontWeight: '500',
                                      color: selectedShiftInfo?.room ? '#28a745' : '#6c757d',
                                      padding: '0.75rem 1rem',
                                      borderColor: selectedShiftInfo?.room ? 'rgba(40, 167, 69, 0.3)' : '#e9ecef'
                                    }}
                                  />
                                </Form.Group>
                              </Col>
                            </Row>

                            <div className="mt-3 p-2" style={{
                              background: 'rgba(40, 167, 69, 0.1)',
                              borderRadius: '8px'
                            }}>
                              <small className="text-muted d-block">
                                <i className="fas fa-info-circle me-2"></i>
                                Thông tin được lấy từ ca làm việc thực tế
                                {selectedShiftInfo?.labUser && (
                                  <span className="d-block mt-1">
                                    <i className="fas fa-user-nurse me-1"></i>
                                    Lab User: {selectedShiftInfo.labUser.name}
                                  </span>
                                )}
                                {!selectedShiftInfo && availableShifts.length === 0 && bookingData.date && (
                                  <span className="d-block mt-1 text-warning">
                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                    Chưa có ca làm việc cho ngày này. Vui lòng chọn ngày khác.
                                  </span>
                                )}
                              </small>
                            </div>
                          </div>
                        )}

                        {/* Test Package Selection */}
                        <div className="mb-4">
                          <h6 className="fw-semibold mb-3 text-primary d-flex align-items-center">
                            <i className="fas fa-vials me-2" style={{ fontSize: '1.2rem' }}></i>
                            Chọn gói xét nghiệm
                          </h6>
                          <Form.Group className="mb-2">
                            <Form.Label className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                              <i className="fas fa-list-ul me-2 text-muted"></i>
                              Gói xét nghiệm <span className="text-danger">*</span>
                            </Form.Label>
                            {(() => {
                              const selectedService = availableServices.find(s =>
                                (s.name || s.Name || s.testPackageName || s.TestPackageName || s.packageName || s.PackageName) === bookingData.service
                              );
                              const displayText = selectedService
                                ? `${selectedService.name || selectedService.Name || selectedService.testPackageName || selectedService.TestPackageName || selectedService.packageName || selectedService.PackageName}${selectedService.price || selectedService.Price ? ` - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(selectedService.price || selectedService.Price)}` : ''}`
                                : 'Chọn gói xét nghiệm';

                              return (
                                <Button
                                  variant={bookingData.service ? "outline-primary" : "primary"}
                                  onClick={() => setShowServiceModal(true)}
                                  className="w-100 d-flex justify-content-between align-items-center"
                                  style={{
                                    border: '2px solid #0d6efd',
                                    borderRadius: '12px',
                                    fontWeight: '500',
                                    padding: '0.875rem 1.125rem',
                                    backgroundColor: bookingData.service ? '#ffffff' : '#0d6efd',
                                    color: bookingData.service ? '#0d6efd' : '#ffffff',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 2px 10px rgba(13, 110, 253, 0.12)',
                                    fontSize: '0.95rem',
                                    textAlign: 'left'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(13, 110, 253, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(13, 110, 253, 0.12)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                >
                                  <span>
                                    <i className="fas fa-vials me-2"></i>
                                    {displayText}
                                  </span>
                                  <i className="fas fa-chevron-down"></i>
                                </Button>
                              );
                            })()}
                          </Form.Group>
                          {bookingData.service && (
                            <div className="p-4 mt-3" style={{
                              background: 'linear-gradient(135deg, rgba(13,110,253,0.08) 0%, rgba(102, 16, 242, 0.08) 100%)',
                              borderRadius: '16px',
                              border: '2px solid rgba(13,110,253,0.2)',
                              boxShadow: '0 2px 10px rgba(13, 110, 253, 0.1)'
                            }}>
                              {(() => {
                                // Handle both PascalCase and camelCase from BE
                                const svc = availableServices.find(s =>
                                  (s.name || s.Name || s.testPackageName || s.TestPackageName || s.packageName || s.PackageName) === bookingData.service
                                );
                                if (!svc) return null;
                                const packageName = svc.name || svc.Name || svc.testPackageName || svc.TestPackageName || svc.packageName || svc.PackageName;
                                const packagePrice = svc.price || svc.Price || svc.testPackagePrice || svc.TestPackagePrice || 0;
                                const packageDescription = svc.description || svc.Description || svc.testPackageDescription || svc.TestPackageDescription || 'Chi tiết gói sẽ được tư vấn bởi bác sĩ.';
                                return (
                                  <>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <strong>{packageName}</strong>
                                      <span className="badge bg-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(packagePrice)}</span>
                                    </div>
                                    <small className="text-muted d-block">{packageDescription}</small>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Reason for Appointment */}
                        <Form.Group className="mb-0">
                          <Form.Label className="fw-semibold d-flex align-items-center">
                            <i className="fas fa-notes-medical me-2 text-muted"></i>
                            Lý do khám / Ghi chú
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={bookingData.notes}
                            onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                            placeholder="Mô tả triệu chứng hoặc lý do khám bệnh (không bắt buộc)..."
                            style={{
                              border: '2px solid #e9ecef',
                              borderRadius: '10px',
                              resize: 'none',
                              padding: '0.75rem 1rem',
                              transition: 'all 0.3s ease'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0d6efd';
                              e.target.style.boxShadow = '0 0 0 0.2rem rgba(13, 110, 253, 0.15)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e9ecef';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Modal.Body>
                  <Modal.Footer
                    style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      border: 'none',
                      padding: '1.5rem 2rem'
                    }}
                  >
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowBookingModal(false)}
                      style={{
                        borderRadius: '25px',
                        padding: '10px 25px',
                        fontWeight: '600',
                        border: '2px solid #6c757d',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#6c757d';
                        e.target.style.color = 'white';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#6c757d';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <i className="fas fa-times me-2"></i>
                      Hủy
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={
                        !bookingData.date ||
                        !bookingData.shift ||
                        !bookingData.service ||
                        hasExistingSameDay ||
                        // Validation window hidden per specification
                        // (bookingData.date && !isDateAllowed(new Date(bookingData.date))) ||
                        (spotsLeft !== null && spotsLeft <= 0) ||
                        (dailySlotsLeft !== null && dailySlotsLeft <= 0) // Check 36 patients/day limit
                      }
                      style={{
                        borderRadius: '25px',
                        padding: '10px 25px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                        border: 'none',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(13, 110, 253, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(13, 110, 253, 0.3)';
                      }}
                    >
                      Đặt lịch hẹn
                    </Button>
                  </Modal.Footer>
                </Form>
              </motion.div>
            </Modal>

            {/* Shift Selection Modal */}
            <Modal
              show={showShiftModal}
              onHide={() => setShowShiftModal(false)}
              size="lg"
              fullscreen="md-down"
              centered
              style={{ zIndex: 10000 }} // Higher than booking modal (9999)
            >
              <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                  <i className="fas fa-clock me-2"></i>
                  Chọn ca khám
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {(() => {
                  const groupedShifts = getGroupedShifts();
                  if (!groupedShifts) {
                    return (
                      <Alert variant="info" className="text-center">
                        <i className="fas fa-info-circle fa-2x mb-2"></i>
                        <p>Chưa có ca khám nào cho ngày này</p>
                      </Alert>
                    );
                  }

                  const handleSelectShift = (shift) => {
                    const shiftInfo = formatShiftInfo(shift);
                    handleShiftChange(shiftInfo.shiftId);
                    setShowShiftModal(false);
                  };

                  return (
                    <div>
                      {/* Morning Shift */}
                      {groupedShifts.morning.shifts.length > 0 && (
                        <div className="mb-4">
                          <h6
                            className="mb-3 p-2 rounded"
                            style={{
                              backgroundColor: groupedShifts.morning.bgColor,
                              color: groupedShifts.morning.color,
                              fontWeight: '600',
                              fontSize: '1rem'
                            }}
                          >
                            {groupedShifts.morning.label}
                          </h6>
                          <div className="d-flex flex-column gap-2">
                            {groupedShifts.morning.shifts.map((shift, idx) => {
                              const shiftInfo = formatShiftInfo(shift);
                              const isSelected = bookingData.shift && String(bookingData.shift) === shiftInfo.shiftId;
                              return (
                                <Card
                                  key={`morning-${shiftInfo.shiftId}-${idx}`}
                                  className="border-0 shadow-sm"
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: isSelected ? `2px solid ${groupedShifts.morning.color}` : '1px solid #dee2e6',
                                    backgroundColor: isSelected ? groupedShifts.morning.bgColor : '#ffffff'
                                  }}
                                  onClick={() => handleSelectShift(shift)}
                                >
                                  <Card.Body className="p-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-2">
                                          <i className="fas fa-clock me-2" style={{ color: groupedShifts.morning.color }}></i>
                                          <strong style={{ fontSize: '1rem', color: groupedShifts.morning.color }}>
                                            {shiftInfo.timeDisplay}
                                          </strong>
                                        </div>
                                        <div className="ms-4">
                                          <small className="text-muted d-block">
                                            <i className="fas fa-user-md me-1"></i>
                                            {shiftInfo.doctorName}
                                          </small>
                                          <small className="text-muted d-block mt-1">
                                            <i className="fas fa-door-open me-1"></i>
                                            {shiftInfo.roomName}
                                          </small>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div>
                                          <Badge bg="success" style={{ fontSize: '0.9rem', padding: '0.5rem' }}>
                                            <i className="fas fa-check me-1"></i>
                                            Đã chọn
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </Card.Body>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Afternoon Shift */}
                      {groupedShifts.afternoon.shifts.length > 0 && (
                        <div className="mb-4">
                          <h6
                            className="mb-3 p-2 rounded"
                            style={{
                              backgroundColor: groupedShifts.afternoon.bgColor,
                              color: groupedShifts.afternoon.color,
                              fontWeight: '600',
                              fontSize: '1rem'
                            }}
                          >
                            {groupedShifts.afternoon.label}
                          </h6>
                          <div className="d-flex flex-column gap-2">
                            {groupedShifts.afternoon.shifts.map((shift, idx) => {
                              const shiftInfo = formatShiftInfo(shift);
                              const isSelected = bookingData.shift && String(bookingData.shift) === shiftInfo.shiftId;
                              return (
                                <Card
                                  key={`afternoon-${shiftInfo.shiftId}-${idx}`}
                                  className="border-0 shadow-sm"
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: isSelected ? `2px solid ${groupedShifts.afternoon.color}` : '1px solid #dee2e6',
                                    backgroundColor: isSelected ? groupedShifts.afternoon.bgColor : '#ffffff'
                                  }}
                                  onClick={() => handleSelectShift(shift)}
                                >
                                  <Card.Body className="p-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-2">
                                          <i className="fas fa-clock me-2" style={{ color: groupedShifts.afternoon.color }}></i>
                                          <strong style={{ fontSize: '1rem', color: groupedShifts.afternoon.color }}>
                                            {shiftInfo.timeDisplay}
                                          </strong>
                                        </div>
                                        <div className="ms-4">
                                          <small className="text-muted d-block">
                                            <i className="fas fa-user-md me-1"></i>
                                            {shiftInfo.doctorName}
                                          </small>
                                          <small className="text-muted d-block mt-1">
                                            <i className="fas fa-door-open me-1"></i>
                                            {shiftInfo.roomName}
                                          </small>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div>
                                          <Badge bg="success" style={{ fontSize: '0.9rem', padding: '0.5rem' }}>
                                            <i className="fas fa-check me-1"></i>
                                            Đã chọn
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </Card.Body>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Evening Shift */}
                      {groupedShifts.evening.shifts.length > 0 && (
                        <div className="mb-4">
                          <h6
                            className="mb-3 p-2 rounded"
                            style={{
                              backgroundColor: groupedShifts.evening.bgColor,
                              color: groupedShifts.evening.color,
                              fontWeight: '600',
                              fontSize: '1rem'
                            }}
                          >
                            {groupedShifts.evening.label}
                          </h6>
                          <div className="d-flex flex-column gap-2">
                            {groupedShifts.evening.shifts.map((shift, idx) => {
                              const shiftInfo = formatShiftInfo(shift);
                              const isSelected = bookingData.shift && String(bookingData.shift) === shiftInfo.shiftId;
                              return (
                                <Card
                                  key={`evening-${shiftInfo.shiftId}-${idx}`}
                                  className="border-0 shadow-sm"
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: isSelected ? `2px solid ${groupedShifts.evening.color}` : '1px solid #dee2e6',
                                    backgroundColor: isSelected ? groupedShifts.evening.bgColor : '#ffffff'
                                  }}
                                  onClick={() => handleSelectShift(shift)}
                                >
                                  <Card.Body className="p-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-2">
                                          <i className="fas fa-clock me-2" style={{ color: groupedShifts.evening.color }}></i>
                                          <strong style={{ fontSize: '1rem', color: groupedShifts.evening.color }}>
                                            {shiftInfo.timeDisplay}
                                          </strong>
                                        </div>
                                        <div className="ms-4">
                                          <small className="text-muted d-block">
                                            <i className="fas fa-user-md me-1"></i>
                                            {shiftInfo.doctorName}
                                          </small>
                                          <small className="text-muted d-block mt-1">
                                            <i className="fas fa-door-open me-1"></i>
                                            {shiftInfo.roomName}
                                          </small>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div>
                                          <Badge bg="success" style={{ fontSize: '0.9rem', padding: '0.5rem' }}>
                                            <i className="fas fa-check me-1"></i>
                                            Đã chọn
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </Card.Body>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowShiftModal(false)} className="w-100">
                  <i className="fas fa-times me-2"></i>
                  Đóng
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Service Package Modal */}
            <Modal
              show={showServiceModal}
              onHide={() => setShowServiceModal(false)}
              size="lg"
              fullscreen="md-down"
              centered
              style={{ zIndex: 10001 }} // Higher than shift modal (10000)
            >
              <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title>
                  <i className="fas fa-vials me-2"></i>
                  Chọn gói xét nghiệm
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {availableServices.length === 0 ? (
                  <Alert variant="info" className="text-center">
                    <i className="fas fa-info-circle fa-2x mb-2"></i>
                    <p>Chưa có gói xét nghiệm nào</p>
                  </Alert>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {availableServices.map((service, index) => {
                      const packageId = service.id || service.Id || service.testPackageId || service.TestPackageId;
                      const packageName = service.name || service.Name || service.testPackageName || service.TestPackageName || service.packageName || service.PackageName;
                      const packagePrice = service.price || service.Price || service.testPackagePrice || service.TestPackagePrice || 0;
                      const packageDescription = service.description || service.Description || service.testPackageDescription || service.TestPackageDescription || 'Chi tiết gói sẽ được tư vấn bởi bác sĩ.';

                      const formattedPrice = packagePrice > 0
                        ? new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                          maximumFractionDigits: 0
                        }).format(packagePrice)
                        : 'Liên hệ';

                      const isSelected = bookingData.service === packageName;

                      return (
                        <Card
                          key={packageId || `service-${index}`}
                          className="border-0 shadow-sm"
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: isSelected ? '2px solid #28a745' : '1px solid #dee2e6',
                            backgroundColor: isSelected ? 'rgba(40, 167, 69, 0.1)' : '#ffffff'
                          }}
                          onClick={() => {
                            setBookingData({ ...bookingData, service: packageName });
                            setShowServiceModal(false);
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              e.currentTarget.style.borderColor = '#28a745';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                              e.currentTarget.style.borderColor = '#dee2e6';
                            }
                          }}
                        >
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center mb-2">
                                  <i className="fas fa-vials me-2" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                                  <strong style={{ fontSize: '1.1rem', color: '#212529' }}>
                                    {packageName}
                                  </strong>
                                </div>
                                <div className="ms-4 mb-2">
                                  <small className="text-muted d-block" style={{ lineHeight: '1.5' }}>
                                    {packageDescription}
                                  </small>
                                </div>
                                <div className="ms-4">
                                  <Badge
                                    bg={isSelected ? "success" : "primary"}
                                    style={{
                                      fontSize: '0.95rem',
                                      padding: '0.5rem 0.75rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <i className="fas fa-tag me-1"></i>
                                    {formattedPrice}
                                  </Badge>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="ms-3">
                                  <Badge bg="success" style={{ fontSize: '0.9rem', padding: '0.5rem' }}>
                                    <i className="fas fa-check me-1"></i>
                                    Đã chọn
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowServiceModal(false)} className="w-100">
                  <i className="fas fa-times me-2"></i>
                  Đóng
                </Button>
              </Modal.Footer>
            </Modal>

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
                      {/* Appointment Code */}
                      <div className="mb-4 p-3" style={{
                        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)',
                        borderRadius: '12px',
                        border: '2px solid rgba(255, 193, 7, 0.3)',
                        borderLeft: '4px solid #ffc107'
                      }}>
                        <h6 className="fw-bold mb-2 text-warning">
                          <i className="fas fa-barcode me-2"></i>
                          Mã lịch hẹn
                        </h6>
                        <code style={{
                          fontSize: '1.2rem',
                          color: '#fd7e14',
                          fontWeight: '700',
                          padding: '8px 16px',
                          background: 'rgba(255, 193, 7, 0.2)',
                          borderRadius: '8px',
                          display: 'inline-block'
                        }}>
                          {selectedAppointment.appointmentCode}
                        </code>
                      </div>

                      {/* Patient Information */}
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

                      {/* Appointment Information */}
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
                            <p className="ms-4 text-dark">{selectedAppointment.appointmentTime}</p>
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
                              {getStatusBadge(selectedAppointment.status)}
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
                              {selectedAppointment.doctorId
                                ? (doctors.find(d => d.id === parseInt(selectedAppointment.doctorId))?.fullName || 'Chưa phân công')
                                : <span className="text-muted fst-italic">Chưa phân công bác sĩ</span>
                              }
                            </p>
                          </Col>
                        </Row>
                      </div>

                      {/* Notes */}
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
                </Modal.Footer>
              </motion.div>
            </Modal>

            <GuestFooter />
          </>
        );
    }
  };

  return (
    <div className="min-vh-100">
      <PatientHeader setActiveTab={setActiveTab} />
      {renderContent()}

      {/* Lab Test Result Detail Modal */}
      <Modal show={showResultDetailModal} onHide={() => setShowResultDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-flask me-2 text-primary"></i>
            Chi tiết kết quả xét nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTestResult && (
            <div>
              {/* Basic Information */}
              <Row className="mb-4">
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-primary text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-user me-2"></i>
                        Thông tin bệnh nhân
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Họ và tên:</strong> {user.fullName}</p>
                      <p><strong>Giới tính:</strong> {user.gender}</p>
                      <p><strong>Ngày sinh:</strong> {formatDate(user.dateOfBirth)}</p>
                      <p><strong>Số điện thoại:</strong> {user.phone}</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-success text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-vial me-2"></i>
                        Thông tin xét nghiệm
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Mã xét nghiệm:</strong> {selectedTestResult.id || 'N/A'}</p>
                      <p><strong>Loại xét nghiệm:</strong> {selectedTestResult.testType || selectedTestResult.testPackage || 'N/A'}</p>
                      <p><strong>Ngày lấy mẫu:</strong> {selectedTestResult.sampleDate ? formatDate(selectedTestResult.sampleDate) : 'Chưa có'}</p>
                      <p><strong>Ngày xét nghiệm:</strong> {selectedTestResult.testDate ? formatDate(selectedTestResult.testDate) : 'Chưa có'}</p>
                      <p><strong>Bác sĩ chỉ định:</strong> {selectedTestResult.doctorName || 'Chưa phân bổ'}</p>
                      <p><strong>Trạng thái:</strong> {getStatusBadge(selectedTestResult.status)}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Detailed Test Results */}
              {selectedTestResult.results && (() => {
                // Parse results JSON string if needed
                let parsedResults = selectedTestResult.results;
                if (typeof parsedResults === 'string') {
                  try {
                    parsedResults = JSON.parse(parsedResults);
                  } catch (e) {
                    parsedResults = {};
                  }
                }

                // If results contain nested category structure
                if (parsedResults && typeof parsedResults === 'object') {
                  // Flatten category hierarchy
                  const flattenedResults = {};
                  Object.entries(parsedResults).forEach(([category, indicators]) => {
                    if (typeof indicators === 'object' && indicators !== null) {
                      Object.entries(indicators).forEach(([key, value]) => {
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                          flattenedResults[key] = value;
                        } else {
                          flattenedResults[key] = { value: value };
                        }
                      });
                    }
                  });

                  // Flat result structure fallback
                  const resultsToDisplay = Object.keys(flattenedResults).length > 0 ? flattenedResults : parsedResults;

                  return (
                    <Card className="mb-4">
                      <Card.Header className="bg-info text-white">
                        <h6 className="mb-0">
                          <i className="fas fa-chart-line me-2"></i>
                          Kết quả xét nghiệm chi tiết
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <Table responsive striped>
                          <thead>
                            <tr>
                              <th>Chỉ số</th>
                              <th>Giá trị</th>
                              <th>Đơn vị</th>
                              <th>Khoảng bình thường</th>
                              <th>Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(resultsToDisplay)
                              .filter(([key]) => {
                                // Filter out metadata fields
                                const metadataFields = ['doctorNotes', 'approvedBy', 'approvedAt', 'technicianNotes', 'enteredBy', 'confirmedBy'];
                                return !metadataFields.includes(key);
                              })
                              .map(([key, value]) => {
                                // Extract result value and reference interval
                                const indicatorValue = typeof value === 'object' && value !== null ? (value.value || value.value === 0 ? value.value : '') : value;
                                const unit = typeof value === 'object' && value !== null ? (value.unit || '') : '';
                                const normal = typeof value === 'object' && value !== null ? (value.normal || value.normalRange || '') : '';
                                const status = typeof value === 'object' && value !== null ? (value.status || '') : '';

                                return (
                                  <tr key={key}>
                                    <td><strong>{safeRender(key)}</strong></td>
                                    <td>
                                      {safeRender(indicatorValue)}
                                    </td>
                                    <td>{safeRender(unit)}</td>
                                    <td>{safeRender(normal)}</td>
                                    <td>
                                      <Badge bg={status === 'normal' ? 'success' : status === 'high' || status === 'low' ? 'danger' : 'secondary'}>
                                        {status === 'normal' ? 'Bình thường' :
                                          status === 'high' ? 'Cao' :
                                            status === 'low' ? 'Thấp' :
                                              status === 'abnormal' ? 'Bất thường' : 'N/A'}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  );
                }

                return null;
              })()}

              {/* Technician Notes */}
              {selectedTestResult.technicianNotes && (
                <Card className="mb-4">
                  <Card.Header className="bg-warning text-dark">
                    <h6 className="mb-0">
                      <i className="fas fa-sticky-note me-2"></i>
                      Ghi chú kỹ thuật viên
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>{selectedTestResult.technicianNotes}</p>
                  </Card.Body>
                </Card>
              )}

              {/* Doctor Notes */}
              {selectedTestResult.doctorNotes && (
                <Card className="mb-4">
                  <Card.Header className="bg-danger text-white">
                    <h6 className="mb-0">
                      <i className="fas fa-user-md me-2"></i>
                      Ghi chú bác sĩ
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>{selectedTestResult.doctorNotes}</p>
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResultDetailModal(false)}>
            Đóng
          </Button>
          {selectedTestResult && (
            <Button variant="success" onClick={() => handleDownloadResult(selectedTestResult)}>
              <i className="fas fa-download me-2"></i>
              Tải PDF
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PatientDashboard;
