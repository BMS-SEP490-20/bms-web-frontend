/**
 * Manager Dashboard Page
 * 
 * Main dashboard page for managers in the Blood Laboratory Management System.
 * Provides comprehensive overview of business operations including appointments,
 * patient statistics, revenue tracking, and inventory management.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';
import { useAccessDenied } from '../../shared/hooks/useAccessDenied';
import { appointmentService } from '../../../services/appointmentService';
import { patientService } from '../../../services/patientService';
import { invoiceService } from '../../../services/invoiceService';
import { inventoryService } from '../../services/inventoryService';
import { shiftService } from '../../services/shiftService';
import { sampleService } from '../../../services/sampleService';
import { labTestService } from '../../../services/labTestService';
import api from '../../services/api';
import BarcodeDisplay from '../../shared/components/QRBarcode/BarcodeDisplay';
import { getAdminData } from '../../services/adminDataPrefetchService';
import { StatusBadge } from '../../shared/utils/status/statusHelper';
import { FaTachometerAlt, FaCalendarAlt, FaClock, FaUsers, FaExclamationTriangle, FaChartLine, FaCheckCircle, FaCalendarCheck, FaUserMd, FaBoxes, FaChartBar, FaFlask, FaUser, FaDollarSign, FaArrowUp, FaArrowDown, FaEye, FaCheck, FaFileMedical } from 'react-icons/fa';
import useResponsive from '../../shared/hooks/useResponsive';
import { useAutoRefresh } from '../../shared/hooks/useAutoRefresh';

/**
 * Manager Dashboard Component
 * 
 * Dashboard for managers showing business statistics, recent appointments,
 * patient data, revenue information, and inventory status.
 * 
 * @returns {React.ReactNode} Manager dashboard component
 */
const ManagerDashboard = () => {
  const { showError, showSuccess } = useNotificationContext();
  const { accessDeniedMessage, setAccessDeniedMessage } = useAccessDenied();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    totalPatients: 0,
    totalRevenue: 0,
    lowStockItems: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [pendingTestResults, setPendingTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState(null);

  // States for Approve Test Results (Lab Manager)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedTestResult, setSelectedTestResult] = useState(null);
  const [resultParameters, setResultParameters] = useState([]);
  const [approvingResult, setApprovingResult] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');

  const handleOpenBarcodeModal = (appointment) => {
    setSelectedBarcodeItem(appointment);
    setShowBarcodeModal(true);
  };

  const handleCloseBarcodeModal = () => {
    setShowBarcodeModal(false);
    setSelectedBarcodeItem(null);
  };

  const handleOpenApproveModal = async (result) => {
    setSelectedTestResult(result);
    setApprovalNotes('');
    setDigitalSignature(`MGR-SIG-${Date.now().toString(36).toUpperCase()}`);
    setShowApproveModal(true);
    setResultParameters([]);

    try {
      const res = await api.get(`/gateway/testorder/testparameter/by-testresult/${result.testResultId}`);
      const params = res.data?.data || res.data || [];
      setResultParameters(Array.isArray(params) ? params : []);
    } catch (e) {
      setResultParameters([]);
    }
  };

  const handleCloseApproveModal = () => {
    setShowApproveModal(false);
    setSelectedTestResult(null);
    setResultParameters([]);
  };

  const handleConfirmApprove = async () => {
    if (!selectedTestResult) return;
    try {
      setApprovingResult(true);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        approvedBy: currentUser.id || 'Manager',
        doctorName: currentUser.fullName || currentUser.username || 'Trưởng phòng xét nghiệm',
        approverRole: 'LabManager',
        digitalSignature: digitalSignature || `MGR-SIG-${Date.now().toString(36).toUpperCase()}`,
        doctorNotes: approvalNotes || 'Đã kiểm tra, đối chiếu thông số máy phân tích và duyệt kết quả xét nghiệm.',
        deviceId: selectedTestResult.deviceId || '',
        quantity: selectedTestResult.quantity || 1,
        appointmentId: selectedTestResult.appointmentId
      };

      const res = await labTestService.approveTestResult(selectedTestResult.testResultId, payload);
      if (res.success) {
        showSuccess('✅ Duyệt kết quả xét nghiệm thành công (Đã xuất bản cho bệnh nhân)');
        handleCloseApproveModal();
        loadDashboardData(true);
      } else {
        showError(res.message || 'Lỗi khi duyệt kết quả xét nghiệm');
      }
    } catch (err) {
      showError(err.message || 'Lỗi hệ thống khi duyệt kết quả');
    } finally {
      setApprovingResult(false);
    }
  };

  /**
   * Handles showing appointment detail modal
   * 
   * This function is called when user clicks to view details of an appointment.
   * It sets the selected appointment and opens the detail modal.
   * 
   * @param {Object} appointment - Appointment object to view
   * @returns {void} Does not return a value. Opens detail modal.
   * 
   * @example
   * // Show appointment details
   * handleShowDetail(appointment);
   */
  const handleShowDetail = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  /**
   * Handles closing appointment detail modal
   * 
   * This function is called when user closes the appointment detail modal.
   * It clears the selected appointment and closes the modal.
   * 
   * @returns {void} Does not return a value. Closes detail modal.
   * 
   * @example
   * // Close appointment detail modal
   * handleCloseDetail();
   */
  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedAppointment(null);
  };

  /**
   * Loads all manager dashboard data
   * 
   * This function is the core data fetching function for the manager dashboard.
   * It performs the following operations:
   * 1. Fetches appointments, patients, and invoices (with caching support)
   * 2. Fetches inventory low stock items and shifts
   * 3. Enriches appointments with shift and patient information
   * 4. Calculates statistics (total appointments, pending, completed, revenue)
   * 5. Gets recent appointments (latest 5)
   * 6. Updates dashboard stats
   * 
   * **Caching:**
   * - Uses cached data if available and forceFresh is false
   * - Fetches fresh data if cache is unavailable or forceFresh is true
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and fetches fresh data
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load dashboard data with cache
   * await loadDashboardData();
   * 
   * // Load dashboard data without cache
   * await loadDashboardData(true);
   */
  const loadDashboardData = useCallback(async (forceFresh = false) => {
    try {
      setLoading(true);
      
      // Try to get from cache first for faster loading (unless forceFresh is true)
      const [appointmentsCached, patientsCached, invoicesCached] = forceFresh
        ? [null, null, null]
        : await Promise.all([
            getAdminData('appointments', false),
            getAdminData('patients', false),
            getAdminData('invoices', false)
          ]);

      // Use cached data if available, otherwise fetch fresh
      const appointmentsResult = (!forceFresh && appointmentsCached?.success && appointmentsCached.data)
        ? { success: true, data: appointmentsCached.data }
        : await appointmentService.getAllAppointments({ fetchAll: false });
      
      const patientsResult = patientsCached.success && patientsCached.data
        ? { success: true, data: patientsCached.data }
        : await patientService.getAllPatients({ fetchAll: false });
      
      const invoicesResult = invoicesCached.success && invoicesCached.data
        ? { success: true, data: invoicesCached.data }
        : await invoiceService.getAllInvoices({ fetchAll: false });

      // Load shifts, inventory, and samples (for barcode info)
      const [inventoryResult, shiftsResult, samplesResult] = await Promise.all([
        inventoryService.getLowStockItems(),
        shiftService.getAllShifts(), // Fetch doctor shifts for date/time information
        sampleService.getAllSamples({ fetchAll: false })
      ]);

      // Process appointments data
      if (appointmentsResult.success) {
        const appointments = appointmentsResult.data || [];
        const shifts = shiftsResult.success ? (shiftsResult.data || []) : [];
        const patients = patientsResult.success ? (patientsResult.data || []) : [];
        const samples = samplesResult.success ? (samplesResult.data || []) : [];
        
        // Join appointments with doctor shifts and patient names
        const appointmentsWithShifts = appointments.map(apt => {
          let updatedApt = { ...apt };
          
          // Join with doctor shift
          const shiftId = apt.doctor_shift_id || apt.doctorShiftId || apt.DoctorShiftId;
          if (shiftId && shifts.length > 0) {
            const shift = shifts.find(s => 
              String(s.shift_id || s.shiftId || s.ShiftId) === String(shiftId)
            );
            if (shift) {
              updatedApt.doctorShift = {
                shift_id: shift.shift_id || shift.shiftId || shift.ShiftId,
                shift_date: shift.shift_date || shift.shiftDate || shift.ShiftDate,
                shift_start: shift.shift_start || shift.shiftStart || shift.ShiftStart,
                shift_end: shift.shift_end || shift.shiftEnd || shift.ShiftEnd,
                doctor_id: shift.doctor_id || shift.doctorId || shift.DoctorId,
                status: shift.status || shift.Status
              };
            }
          }
          
          // Join with patient name
          const patientId = apt.created_by || apt.createdBy || apt.CreatedBy || apt.patient_id || apt.patientId || apt.PatientId;
          if (patientId && patients.length > 0) {
            const patient = patients.find(p => 
              String(p.patient_id || p.patientId || p.PatientId || p.id) === String(patientId)
            );
            if (patient) {
              const patientName = patient.full_name || patient.fullName || patient.FullName || patient.name || patient.Name;
              if (patientName) {
                updatedApt.patientName = patientName;
              }
            }
          }

          // Join with blood sample / barcode
          const aptId = String(apt.id || apt.appointmentId || apt.AppointmentId || apt.appointment_id || '');
          if (aptId && samples.length > 0) {
            const matchedSample = samples.find(s => 
              String(s.appointmentId || s.appointment_id || s.AppointmentId) === aptId
            );
            if (matchedSample) {
              updatedApt.sampleId = matchedSample.sampleId || matchedSample.SampleId || matchedSample.id;
              updatedApt.barcode = matchedSample.barcode || matchedSample.sampleId || matchedSample.SampleId || matchedSample.id;
              updatedApt.sample = matchedSample;
            }
          }
          
          return updatedApt;
        });
        
        // Calculate stats based on appointment status
        const pending = appointmentsWithShifts.filter(apt => {
          const status = (apt.status || '').toLowerCase();
          return status === 'scheduled' || 
                 status === 'confirmed' || 
                 status === 'checked_in' ||
                 status === 'ready_for_consultation' ||
                 status === 'sẵn sàng tư vấn';
        }).length;
        
        const completed = appointmentsWithShifts.filter(apt => {
          const status = (apt.status || '').toLowerCase();
          return status === 'completed' || status === 'hoàn thành';
        }).length;
        
        setStats(prev => ({
          ...prev,
          totalAppointments: appointmentsWithShifts.length,
          pendingAppointments: pending,
          completedAppointments: completed
        }));
        
        // Get recent appointments (latest 5)
        const sortedAppointments = [...appointmentsWithShifts].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.CreatedAt || 0);
          const dateB = new Date(b.createdAt || b.CreatedAt || 0);
          return dateB - dateA;
        });
        setRecentAppointments(sortedAppointments.slice(0, 5));
      }
      
      // Process patients data
      if (patientsResult.success) {
        setStats(prev => ({
          ...prev,
          totalPatients: (patientsResult.data || []).length
        }));
      }

      // Process invoices data - calculate today's revenue
      if (invoicesResult.success) {
        const invoices = invoicesResult.data || [];
        const today = new Date().toISOString().split('T')[0];
        
        const todayRevenue = invoices
          .filter(invoice => {
            const invoiceDate = invoice.invoiceDate || invoice.createdAt;
            if (!invoiceDate) return false;
            
            const dateStr = new Date(invoiceDate).toISOString().split('T')[0];
            const isPaid = (invoice.status || '').toLowerCase() === 'paid';
            
            return dateStr === today && isPaid;
          })
          .reduce((sum, invoice) => sum + (invoice.paidAmount || invoice.totalAmount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalRevenue: todayRevenue
        }));
      }

      // Process inventory data - low stock items
      if (inventoryResult.success) {
        setStats(prev => ({
          ...prev,
          lowStockItems: (inventoryResult.data || []).length
        }));
      }

      // Fetch test results for Lab Manager approval
      try {
        const testResultsResp = await api.get('/gateway/testorder/testresult');
        const resultsList = Array.isArray(testResultsResp.data?.data)
          ? testResultsResp.data.data
          : (Array.isArray(testResultsResp.data) ? testResultsResp.data : []);
        setPendingTestResults(resultsList);
      } catch (err) {
        setPendingTestResults([]);
      }
    } catch (error) {
      showError('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Effect hook: Loads dashboard data on mount and when loadDashboardData changes
   * 
   * This effect automatically loads dashboard data when the component mounts
   * or when the loadDashboardData function reference changes.
   * 
   * @effect
   * @dependencies {Function} loadDashboardData - Data loading function
   * 
   * @example
   * // Automatically loads data on mount
   * useEffect(() => {
   *   loadDashboardData();
   * }, [loadDashboardData]);
   */
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  /**
   * Auto-refresh hook for dashboard data
   * 
   * This hook automatically refreshes dashboard data when custom events
   * are dispatched or when sessionStorage flags are set.
   * 
   * @hook
   * @param {Function} loadDashboardData - Data loading function
   * @param {Object} options - Hook options
   * @param {string} options.eventName - Custom event name to listen for
   * @param {string} options.flagKey - SessionStorage flag key to check
   */
  // Auto-refresh hook
  useAutoRefresh(loadDashboardData, {
    eventName: 'dashboardDataChanged',
    flagKey: 'shouldRefreshDashboard'
  });


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

  /**
   * Formats amount to Vietnamese currency format
   * 
   * This helper function formats a numeric amount to Vietnamese currency format (VND)
   * for display in the UI.
   * 
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string (e.g., "1.000.000 ₫")
   * 
   * @example
   * // Format currency for display
   * const formatted = formatCurrency(1000000);
   * // Returns: "1.000.000 ₫"
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  /**
   * Formats date string to Vietnamese locale format
   * 
   * This helper function formats a date string to Vietnamese locale format
   * for display in the UI. Returns 'Chưa có' if date is invalid or missing.
   * 
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date string in Vietnamese locale or 'Chưa có'
   * 
   * @example
   * // Format date for display
   * const formatted = formatDate('2024-12-04');
   * // Returns: '04/12/2024'
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Chưa có';
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Chưa có';
    }
  };

  /**
   * Formats time string for display
   * 
   * This helper function formats a time string for display in the UI.
   * Returns 'N/A' if time is missing.
   * 
   * @param {string} timeString - Time string to format
   * @returns {string} Formatted time string or 'N/A'
   * 
   * @example
   * // Format time for display
   * const formatted = formatTime('13:00:00');
   * // Returns: '13:00:00'
   */
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return String(timeString);
  };

  /**
   * Gets formatted shift time from shift name
   * 
   * This helper function maps shift names to their time ranges.
   * Supports both Vietnamese and English shift names.
   * 
   * **Shift mappings:**
   * - Morning/Morning: '08:00 - 12:00'
   * - Afternoon/Afternoon: '13:00 - 17:00'
   * - Evening/Evening: '17:00 - 21:00'
   * 
   * @param {string} shift - Shift name (morning, afternoon, evening)
   * @returns {string} Formatted time range or original shift value
   * 
   * @example
   * // Get shift time
   * const time = getShiftTime('morning');
   * // Returns: '08:00 - 12:00'
   */
  const getShiftTime = (shift) => {
    const shiftMap = {
      morning: '08:00 - 12:00',
      afternoon: '13:00 - 17:00',
      evening: '17:00 - 21:00',
      Morning: '08:00 - 12:00',
      Afternoon: '13:00 - 17:00',
      Evening: '17:00 - 21:00'
    };
    return shiftMap[shift] || shift || 'N/A';
  };

  /**
   * Formats shift start and end times to a readable range
   * 
   * This helper function formats shift start and end times into a readable
   * time range string (e.g., "08:00 - 12:00"). Handles various time formats
   * and returns 'N/A' if times are missing.
   * 
   * @param {string} shiftStart - Shift start time
   * @param {string} shiftEnd - Shift end time
   * @returns {string} Formatted time range or 'N/A'
   * 
   * @example
   * // Format shift time range
   * const range = formatShiftTime('08:00:00', '12:00:00');
   * // Returns: '08:00 - 12:00'
   */
  const formatShiftTime = (shiftStart, shiftEnd) => {
    if (!shiftStart || !shiftEnd) return 'N/A';
    
    try {
      const formatTime = (timeStr) => {
        if (!timeStr) return '';
        // Handle TimeSpan format from SQL Server (HH:mm:ss)
        const parts = String(timeStr).split(':');
        if (parts.length >= 2) {
          return `${parts[0]}:${parts[1]}`;
        }
        return timeStr;
      };
      
      const start = formatTime(shiftStart);
      const end = formatTime(shiftEnd);
      
      return start && end ? `${start} - ${end}` : 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <Card className="stat-card h-100">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className={`stat-icon stat-icon-${color}`}>
            <Icon />
          </div>
          {trend && (
            <div className={`trend-indicator ${trend > 0 ? 'trend-up' : 'trend-down'}`} style={{ color: '#ffffff' }}>
              {trend > 0 ? <FaArrowUp style={{ color: '#ffffff' }} /> : <FaArrowDown style={{ color: '#ffffff' }} />}
              <span style={{ color: '#ffffff' }}>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <h3 className="stat-value mb-1" style={{ color: '#ffffff', fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>{value}</h3>
        <p className="stat-title mb-0" style={{ color: '#ffffff', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{title}</p>
        {subtitle && <small style={{ color: '#ffffff', opacity: 0.9 }}>{subtitle}</small>}
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <Container className="py-4" style={{ 
        overflowX: 'hidden', 
        maxWidth: '100%', 
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-3 text-muted">Đang tải dữ liệu dashboard...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4" style={{ 
      overflowX: 'hidden', 
      maxWidth: '100%', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Stat Cards Styling */}
      <style>{`
        .stat-card {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 12px !important;
        }
        .stat-card .card-body {
          color: #ffffff !important;
        }
        .stat-card .stat-value {
          color: #ffffff !important;
          font-weight: 700;
        }
        .stat-card .stat-title {
          color: #ffffff !important;
          opacity: 0.95;
        }
        .stat-card .text-muted {
          color: #ffffff !important;
          opacity: 0.9;
        }
        .stat-card .trend-indicator {
          color: #ffffff !important;
        }
        .stat-card .trend-indicator svg {
          color: #ffffff !important;
        }
        .stat-card .trend-indicator span {
          color: #ffffff !important;
        }
        .stat-card .stat-icon {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }
        .stat-card .stat-icon svg {
          color: #ffffff !important;
        }
      `}</style>
      {/* Access Denied Alert */}
      {accessDeniedMessage && (
        <Alert variant="danger" dismissible onClose={() => setAccessDeniedMessage(null)} className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {accessDeniedMessage}
        </Alert>
      )}
      
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h2 className="mb-1 text-primary" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                <FaTachometerAlt className="me-2" />
                Dashboard Quản lý
              </h2>
              <p className="text-muted mb-0 d-none d-md-block">Tổng quan hệ thống phòng xét nghiệm</p>
            </div>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => navigate('/admin/reports')}
              className="w-100 w-md-auto"
            >
              <FaChartLine className="me-2" />
              <span className="d-none d-sm-inline">Xem báo cáo chi tiết</span>
              <span className="d-sm-none">Báo cáo</span>
            </Button>
          </div>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Tổng lịch hẹn"
            value={stats.totalAppointments}
            icon={FaCalendarAlt}
            color="primary"
            trend={8}
            subtitle="Có 8 lịch hẹn mới"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Lịch hẹn hoàn thành"
            value={stats.completedAppointments}
            icon={FaCheckCircle}
            color="success"
            trend={12}
            subtitle="Tăng 12% so với hôm qua"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Tổng bệnh nhân"
            value={stats.totalPatients}
            icon={FaUsers}
            color="info"
            trend={5}
            subtitle="Tăng 5% so với tháng trước"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Doanh thu hôm nay"
            value={formatCurrency(stats.totalRevenue)}
            icon={FaDollarSign}
            color="warning"
            trend={15}
            subtitle="Tăng 15% so với hôm qua"
          />
        </Col>
      </Row>

            {/* Nhóm chức năng Quản lý Lab (Manager Dashbar Hub) */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                <i className="fas fa-th-large"></i>
              </span>
              <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                Nhóm chức năng Quản lý Phòng Lab (Lab Manager Hub)
              </h5>
            </div>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 fw-semibold">
              <i className="fas fa-user-shield me-1"></i> Quản lý / Trưởng Lab
            </span>
          </div>

          <Row className="g-3">
            {/* 1. Duyệt kết quả xét nghiệm */}
            <Col xs={12} sm={6} lg={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => {
                  const section = document.getElementById('manager-test-results-section');
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #ffc107' }}
              >
                <div className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                  <i className="fas fa-file-signature fa-lg"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Duyệt kết quả</div>
                  <small className="text-muted d-block text-truncate">Ký số điện tử Lab Manager</small>
                </div>
              </div>
            </Col>

            {/* 2. Validate Sample */}
            <Col xs={12} sm={6} lg={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/lab-user/validate-sample')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #dc3545' }}
              >
                <div className="rounded-3 bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                  <i className="fas fa-vial fa-lg"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Validate Sample</div>
                  <small className="text-muted d-block text-truncate">Kiểm chuẩn mẫu xét nghiệm</small>
                </div>
              </div>
            </Col>

            {/* 3. Phòng Lab */}
            <Col xs={12} sm={6} lg={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/lab-rooms')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #0d6efd' }}
              >
                <div className="rounded-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                  <i className="fas fa-door-open fa-lg"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Phòng Lab</div>
                  <small className="text-muted d-block text-truncate">Quản lý cơ sở vật chất phòng</small>
                </div>
              </div>
            </Col>

            {/* 4. Phân ca trực */}
            <Col xs={12} sm={6} lg={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/manager/shift-assignment')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #198754' }}
              >
                <div className="rounded-3 bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                  <i className="fas fa-clock fa-lg"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Phân ca trực</div>
                  <small className="text-muted d-block text-truncate">Phân công bác sĩ & kỹ thuật viên</small>
                </div>
              </div>
            </Col>

            {/* 5. Thông báo notify */}
            <Col xs={12} sm={6} lg={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/notifications')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #fd7e14' }}
              >
                <div className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                  <i className="fas fa-bell fa-lg"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Thông báo notify</div>
                  <small className="text-muted d-block text-truncate">Báo cáo check-in, duyệt mẫu & kho</small>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Recent Appointments */}
      <Row className="mb-4">
        <Col>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <FaCalendarAlt className="me-2" />
                <span className="d-none d-sm-inline">Lịch hẹn gần đây</span>
                <span className="d-sm-none">Lịch hẹn</span>
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {recentAppointments.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="d-none d-md-table-cell" style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Mã lịch hẹn</th>
                        <th style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Bệnh nhân</th>
                        <th style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Mã Barcode</th>
                        <th className="d-none d-lg-table-cell" style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Dịch vụ</th>
                        <th style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Ngày</th>
                        <th className="d-none d-md-table-cell" style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Giờ</th>
                        <th style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Trạng thái</th>
                        <th style={{ padding: '16px 12px', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontWeight: '600', color: '#4a5568' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppointments.map((appointment) => {
                        // Extract patient info with multiple fallbacks
                        const patientName = appointment.patientName || 
                                          appointment.patient?.fullname || 
                                          appointment.patient?.fullName || 
                                          appointment.patient?.name || 
                                          (appointment.patientId ? `BN-${String(appointment.patientId).substring(0, 8)}...` : 'Chưa xác định');
                        
                        // Extract service/package info with multiple fallbacks
                        const serviceName = appointment.packageName || 
                                          appointment.TestPackageName ||
                                          appointment.testPackageName ||
                                          appointment.testPackage?.name ||
                                          appointment.testPackage?.packageName ||
                                          appointment.service || 
                                          appointment.serviceName ||
                                          appointment.department || 
                                          'Chưa xác định';
                        
                        // Extract appointment code
                        const appointmentCode = appointment.appointmentCode || 
                                               appointment.code || 
                                               (appointment.id ? `APT-${String(appointment.id).substring(0, 8).toUpperCase()}` : 'N/A');
                        
                        // Extract date and time from doctorShift
                        let appointmentDate = null;
                        let shiftTime = 'N/A';
                        
                        if (appointment.doctorShift) {
                          // Get date from shift_date field
                          appointmentDate = appointment.doctorShift.shift_date || 
                                          appointment.doctorShift.shiftDate || 
                                          appointment.doctorShift.ShiftDate ||
                                          appointment.doctorShift.date;
                          
                          // Get time from shift_start and shift_end fields (TimeSpan format: HH:mm:ss)
                          const shiftStart = appointment.doctorShift.shift_start || 
                                           appointment.doctorShift.shiftStart || 
                                           appointment.doctorShift.ShiftStart;
                          const shiftEnd = appointment.doctorShift.shift_end || 
                                         appointment.doctorShift.shiftEnd || 
                                         appointment.doctorShift.ShiftEnd;
                          
                          if (shiftStart && shiftEnd) {
                            shiftTime = formatShiftTime(shiftStart, shiftEnd);
                          } else {
                            // Fallback to shift type if no time range
                            const shift = appointment.doctorShift.shift || appointment.doctorShift.shiftType;
                            shiftTime = getShiftTime(shift);
                          }
                        } else if (appointment.DoctorShift) {
                          // Handle PascalCase format
                          appointmentDate = appointment.DoctorShift.ShiftDate || appointment.DoctorShift.shift_date;
                          
                          const shiftStart = appointment.DoctorShift.ShiftStart || appointment.DoctorShift.shift_start;
                          const shiftEnd = appointment.DoctorShift.ShiftEnd || appointment.DoctorShift.shift_end;
                          
                          if (shiftStart && shiftEnd) {
                            shiftTime = formatShiftTime(shiftStart, shiftEnd);
                          }
                        } else {
                          // Fallback to appointment fields if no doctorShift
                          appointmentDate = appointment.appointmentDate || appointment.date;
                          shiftTime = getShiftTime(appointment.shift);
                        }
                        
                        return (
                          <tr key={appointment.id || Math.random()} style={{ borderLeft: '4px solid #667eea' }}>
                            <td className="d-none d-md-table-cell" style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <code style={{ 
                                background: 'rgba(102, 126, 234, 0.1)',
                                color: '#667eea',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
                                fontWeight: '600'
                              }}>{appointmentCode}</code>
                            </td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <div className="d-flex align-items-center">
                                <div className="d-none d-sm-block" style={{ 
                                  width: 'clamp(28px, 5vw, 32px)', 
                                  height: 'clamp(28px, 5vw, 32px)', 
                                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: '10px'
                                }}>
                                  <FaUser style={{ color: '#667eea', fontSize: 'clamp(0.7rem, 2vw, 0.75rem)' }} />
                                </div>
                                <span style={{ fontSize: 'clamp(0.875rem, 2vw, 0.9rem)', color: '#2d3748', fontWeight: '500' }}>{patientName}</span>
                              </div>
                            </td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              {appointment.barcode || appointment.sampleId ? (
                                <div className="d-flex align-items-center gap-1">
                                  <span 
                                    className="badge bg-light text-primary border border-primary font-monospace px-2 py-1"
                                    style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', cursor: 'pointer' }}
                                    onClick={() => handleOpenBarcodeModal(appointment)}
                                    title="Nhấn để xem và in mã vạch"
                                  >
                                    <i className="fas fa-barcode me-1"></i>
                                    {appointment.barcode || appointment.sampleId}
                                  </span>
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm" 
                                    className="p-1 px-2"
                                    onClick={() => handleOpenBarcodeModal(appointment)}
                                    title="In mã vạch cho mẫu xét nghiệm này"
                                  >
                                    <i className="fas fa-print" style={{ fontSize: '0.75rem' }}></i>
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                  Chưa cấp mã
                                </span>
                              )}
                            </td>
                            <td className="d-none d-lg-table-cell" style={{ padding: '16px 12px', verticalAlign: 'middle', fontSize: 'clamp(0.875rem, 2vw, 0.9rem)', color: '#4a5568' }}>{serviceName}</td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <div className="d-flex align-items-center">
                                <FaCalendarAlt className="d-none d-sm-inline" style={{ color: '#667eea', marginRight: '8px', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }} />
                                <span style={{ fontSize: 'clamp(0.875rem, 2vw, 0.9rem)', color: '#2d3748', fontWeight: '500' }}>{formatDate(appointmentDate)}</span>
                              </div>
                            </td>
                            <td className="d-none d-md-table-cell" style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <div style={{ 
                                background: 'rgba(102, 126, 234, 0.1)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                <FaClock style={{ color: '#667eea', marginRight: '6px', fontSize: 'clamp(0.75rem, 2vw, 0.8rem)' }} />
                                <span style={{ color: '#667eea', fontSize: 'clamp(0.8rem, 2vw, 0.85rem)', fontWeight: '600' }}>{shiftTime}</span>
                              </div>
                            </td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>{getStatusBadge(appointment.status)}</td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handleShowDetail(appointment)}
                                title="Xem chi tiết"
                                style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                              >
                                <FaEye />
                                <span className="d-none d-lg-inline ms-1">Xem</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaCalendarAlt className="text-muted mb-3" style={{fontSize: '3rem'}} />
                  <p className="text-muted">Không có lịch hẹn nào</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Approve Test Results Section (Lab Manager) */}
      <Row className="mb-4">
        <Col>
          <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <FaFlask className="me-2" />
                Duyệt Kết Quả Xét Nghiệm (Approve Blood Test Results)
              </h5>
              <Badge bg="light" text="dark">
                {pendingTestResults.length} kết quả
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {pendingTestResults.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ padding: '16px 12px', fontWeight: '600', color: '#4a5568' }}>Mã KQ</th>
                        <th style={{ padding: '16px 12px', fontWeight: '600', color: '#4a5568' }}>Mã Lịch Hẹn</th>
                        <th style={{ padding: '16px 12px', fontWeight: '600', color: '#4a5568' }}>Mã Mẫu</th>
                        <th style={{ padding: '16px 12px', fontWeight: '600', color: '#4a5568' }}>Thiết bị</th>
                        <th style={{ padding: '16px 12px', fontWeight: '600', color: '#4a5568' }}>Trạng thái</th>
                        <th style={{ padding: '16px 12px', fontWeight: '600', color: '#4a5568' }}>Người duyệt</th>
                        <th style={{ padding: '16px 12px', fontWeight: '600', color: '#4a5568' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTestResults.map((result) => {
                        const isApproved = String(result.status).toLowerCase() === 'completed';
                        return (
                          <tr key={result.testResultId || Math.random()}>
                            <td className="fw-bold text-primary">{result.testResultId}</td>
                            <td>{result.appointmentId || 'N/A'}</td>
                            <td>{result.sampleId || 'N/A'}</td>
                            <td>
                              <Badge bg="secondary">{result.deviceId || 'Analyzer'}</Badge>
                            </td>
                            <td>
                              <Badge bg={isApproved ? 'success' : 'warning'}>
                                {isApproved ? 'Đã duyệt (Completed)' : (result.status || 'Chờ duyệt')}
                              </Badge>
                            </td>
                            <td>{result.reviewedBy || 'Chưa duyệt'}</td>
                            <td>
                              <Button
                                variant={isApproved ? 'outline-secondary' : 'success'}
                                size="sm"
                                onClick={() => handleOpenApproveModal(result)}
                                className="d-flex align-items-center gap-1"
                              >
                                <FaCheck />
                                <span>{isApproved ? 'Xem & Cập nhật duyệt' : 'Kiểm tra & Duyệt'}</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaFlask className="text-muted mb-2" style={{ fontSize: '2.5rem' }} />
                  <p className="text-muted mb-0">Hiện chưa có kết quả xét nghiệm nào cần duyệt.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Lab Manager Test Result Digital Approval Modal */}
      <Modal show={showApproveModal} onHide={handleCloseApproveModal} size="lg" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaFileMedical />
            Xác nhận & Ký duyệt kết quả xét nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '24px' }}>
          {selectedTestResult && (
            <div>
              <Alert variant="info" className="mb-3">
                <strong>Quy trình phê duyệt (Lab Manager / Doctor):</strong> Kiểm tra các thông số phân tích máu đã nhập hoặc truyền tự động từ máy xét nghiệm trước khi chính thức xuất bản cho bệnh nhân.
              </Alert>

              <Row className="mb-3">
                <Col md={6}>
                  <label className="text-muted small fw-bold">Mã kết quả xét nghiệm</label>
                  <div className="fw-bold text-primary fs-5">{selectedTestResult.testResultId}</div>
                </Col>
                <Col md={6}>
                  <label className="text-muted small fw-bold">Mã lịch hẹn / Bệnh nhân</label>
                  <div className="fw-bold">{selectedTestResult.appointmentId || 'N/A'}</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <label className="text-muted small fw-bold">Mã ống mẫu (Sample ID)</label>
                  <div>{selectedTestResult.sampleId || 'N/A'}</div>
                </Col>
                <Col md={6}>
                  <label className="text-muted small fw-bold">Thiết bị phân tích</label>
                  <div>{selectedTestResult.deviceId || 'Máy phân tích huyết học tự động'}</div>
                </Col>
              </Row>

              <h6 className="fw-bold mt-4 mb-2 text-secondary">Chi tiết thông số xét nghiệm</h6>
              {resultParameters.length > 0 ? (
                <Table size="sm" bordered hover className="mb-3">
                  <thead className="table-light">
                    <tr>
                      <th>Thông số</th>
                      <th>Ký hiệu</th>
                      <th>Giá trị đo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultParameters.map((param, idx) => (
                      <tr key={param.paramId || idx}>
                        <td>{param.paramName}</td>
                        <td><Badge bg="light" text="dark">{param.abbreviation}</Badge></td>
                        <td className="fw-bold text-primary">{param.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-muted small fst-italic mb-3">
                  Dữ liệu thông số được liên kết trực tiếp từ thiết bị phân tích tự động.
                </div>
              )}

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Chữ ký số điện tử (Digital Signature Stamp)</Form.Label>
                <Form.Control
                  type="text"
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                  placeholder="Mã dấu ký điện tử"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Ghi chú duyệt kết quả</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Nhập nhận xét hoặc kết luận kiểm duyệt..."
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseApproveModal} disabled={approvingResult}>
            Đóng
          </Button>
          <Button variant="success" onClick={handleConfirmApprove} disabled={approvingResult}>
            {approvingResult ? 'Đang duyệt...' : 'Xác nhận ký số & Duyệt kết quả'}
          </Button>
        </Modal.Footer>
      </Modal>


      {/* Appointment Detail Modal */}
      <Modal show={showDetailModal} onHide={handleCloseDetail} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaCalendarAlt className="me-2" />
            Chi tiết lịch hẹn
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '24px' }}>
          {selectedAppointment && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <div className="mb-3">
                    <label style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      Mã lịch hẹn
                    </label>
                    <div style={{ fontSize: '1rem', color: '#2d3748', fontWeight: '500' }}>
                      {selectedAppointment.appointment_id || selectedAppointment.appointmentId || selectedAppointment.id || 'N/A'}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <label style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      Trạng thái
                    </label>
                    <div>{getStatusBadge(selectedAppointment.status)}</div>
                  </div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <div className="mb-3">
                    <label style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      <FaUser className="me-2" />
                      Bệnh nhân
                    </label>
                    <div style={{ fontSize: '1rem', color: '#2d3748', fontWeight: '500' }}>
                      {selectedAppointment.patientName || 
                       `BN-${String(selectedAppointment.created_by || selectedAppointment.createdBy || selectedAppointment.patientId || '').substring(0, 10)}...`}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <label style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      <FaFlask className="me-2" />
                      Gói xét nghiệm
                    </label>
                    <div style={{ fontSize: '1rem', color: '#2d3748', fontWeight: '500' }}>
                      {selectedAppointment.packageName || 
                       selectedAppointment.TestPackageName || 
                       selectedAppointment.test_package_name || 
                       'N/A'}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <div className="mb-3">
                    <label style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      <FaCalendarAlt className="me-2" />
                      Ngày hẹn
                    </label>
                    <div style={{ fontSize: '1rem', color: '#2d3748', fontWeight: '500' }}>
                      {(() => {
                        const shift = selectedAppointment.doctorShift;
                        if (shift && shift.shift_date) {
                          try {
                            return new Date(shift.shift_date).toLocaleDateString('vi-VN');
                          } catch (e) {
                            return shift.shift_date;
                          }
                        }
                        return selectedAppointment.appointmentDate || 'N/A';
                      })()}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <label style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      <FaClock className="me-2" />
                      Giờ hẹn
                    </label>
                    <div style={{ fontSize: '1rem', color: '#2d3748', fontWeight: '500' }}>
                      {(() => {
                        const shift = selectedAppointment.doctorShift;
                        if (shift && shift.shift_start && shift.shift_end) {
                          const formatTime = (timeStr) => {
                            const parts = String(timeStr).split(':');
                            return `${parts[0]}:${parts[1]}`;
                          };
                          return `${formatTime(shift.shift_start)} - ${formatTime(shift.shift_end)}`;
                        }
                        return selectedAppointment.appointmentTime || 'N/A';
                      })()}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <div className="mb-3">
                    <label style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      Ngày tạo
                    </label>
                    <div style={{ fontSize: '1rem', color: '#2d3748', fontWeight: '500' }}>
                      {(() => {
                        const createdAt = selectedAppointment.created_at || selectedAppointment.createdAt || selectedAppointment.CreatedAt;
                        if (createdAt) {
                          try {
                            return new Date(createdAt).toLocaleString('vi-VN');
                          } catch (e) {
                            return createdAt;
                          }
                        }
                        return 'N/A';
                      })()}
                    </div>
                  </div>
                </Col>
              </Row>

              {selectedAppointment.lab_assignment_id && (
                <Row className="mb-3">
                  <Col md={12}>
                    <div className="mb-3" style={{ 
                      padding: '12px', 
                      background: 'rgba(102, 126, 234, 0.1)', 
                      borderRadius: '8px',
                      borderLeft: '4px solid #667eea'
                    }}>
                      <label style={{ fontSize: '0.85rem', color: '#667eea', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                        Mã phân công Lab
                      </label>
                      <div style={{ fontSize: '0.95rem', color: '#2d3748', fontWeight: '500' }}>
                        {selectedAppointment.lab_assignment_id || selectedAppointment.labAssignmentId}
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
              {/* Barcode details in modal */}
              {(selectedAppointment.barcode || selectedAppointment.sampleId) && (
                <div className="mt-4 p-3 bg-light rounded border border-primary text-center">
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="fas fa-barcode me-2"></i>Mã Vạch Mẫu Xét Nghiệm
                  </h6>
                  <BarcodeDisplay
                    value={selectedAppointment.barcode || selectedAppointment.sampleId}
                    sampleId={selectedAppointment.barcode || selectedAppointment.sampleId}
                    patientName={selectedAppointment.patientName}
                    patientId={selectedAppointment.patientId || ''}
                    testCodes={selectedAppointment.testCodes || selectedAppointment.packageName || selectedAppointment.serviceName || selectedAppointment.testPackageName || ''}
                    collectionTimestamp={selectedAppointment.collectedAt || selectedAppointment.createdAt || selectedAppointment.appointmentDate || ''}
                    showActions={true}
                    className="text-center"
                  />
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '2px solid #f7fafc' }}>
          <Button variant="secondary" onClick={handleCloseDetail} style={{ borderRadius: '8px', padding: '8px 20px' }}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Dedicated Barcode Print Modal for Manager */}
      <Modal show={showBarcodeModal} onHide={handleCloseBarcodeModal} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            <i className="fas fa-barcode me-2"></i>In Nhãn Mã Vạch Mẫu Xét Nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedBarcodeItem ? (
            <div>
              <Alert variant="info" className="py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-info-circle me-1"></i>
                Nhãn in bao gồm: <strong>Chữ cái đầu tên (Initials)</strong>, <strong>Mã mẫu (Sample ID)</strong>, <strong>Mã xét nghiệm (Test Codes)</strong> và <strong>Thời gian lấy mẫu</strong>.
              </Alert>
              <BarcodeDisplay
                value={selectedBarcodeItem.barcode || selectedBarcodeItem.sampleId}
                sampleId={selectedBarcodeItem.barcode || selectedBarcodeItem.sampleId}
                patientName={selectedBarcodeItem.patientName}
                patientId={selectedBarcodeItem.patientId || ''}
                testCodes={selectedBarcodeItem.testCodes || selectedBarcodeItem.packageName || selectedBarcodeItem.serviceName || selectedBarcodeItem.testPackageName || ''}
                collectionTimestamp={selectedBarcodeItem.collectedAt || selectedBarcodeItem.createdAt || selectedBarcodeItem.appointmentDate || ''}
                showActions={true}
                className="text-center"
              />
            </div>
          ) : (
            <p className="text-muted text-center mb-0">Không tìm thấy thông tin mẫu xét nghiệm</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseBarcodeModal}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManagerDashboard;
