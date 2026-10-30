/**
 * Admin Dashboard Page
 * 
 * Main dashboard page for administrators in the Blood Laboratory Management System.
 * Provides comprehensive overview of system statistics, recent activities,
 * and quick access to management functions.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAccessDenied } from '../../shared/hooks/useAccessDenied';
import { 
  FaUsers, 
  FaCalendarAlt, 
  FaFlask, 
  FaDollarSign,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaEdit,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserMd,
  FaVial,
  FaFileMedicalAlt,
  FaReceipt,
  FaTachometerAlt,
  FaCogs,
  FaBell
} from 'react-icons/fa';
import { patientService } from '../../../services/patientService';
import { appointmentService } from '../../../services/appointmentService';
import { labTestService } from '../../../services/labTestService';
import { invoiceService } from '../../../services/invoiceService';
import { medicalService } from '../../services/medicalService';
import { adminService } from '../../services/adminService';
import { getAdminData } from '../../services/adminDataPrefetchService';
import { authService } from '../../../services/authService';
import { StatusBadge } from '../../shared/utils/status/statusHelper';
import useResponsive from '../../shared/hooks/useResponsive';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { accessDeniedMessage, setAccessDeniedMessage } = useAccessDenied();
  const { isMobile, isTablet } = useResponsive();
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingTests: 0,
    todayRevenue: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enforce admin role for this page
    const user = authService.getCurrentUser();
    const isAdmin = user && (String(user.role || '').toLowerCase().includes('admin') || Number(user.roleId) === 1);
    if (!isAdmin) {
      setAccessDeniedMessage('Bạn không có quyền truy cập trang quản trị.');
      // optionally redirect or leave user on page with message
      return;
    }

    loadDashboardData();
  }, []);

  /**
   * Loads all admin dashboard data
   * 
   * This function is the core data fetching function for the admin dashboard.
   * It performs the following operations:
   * 1. Fetches appointments, tests, invoices, patients, and services (with caching)
   * 2. Loads dashboard statistics from API or calculates from data
   * 3. Creates patient, appointment, and service maps for enrichment
   * 4. Enriches appointments with patient names
   * 5. Enriches test results with appointment and service information
   * 6. Gets recent appointments and tests (latest 5 each)
   * 7. Updates dashboard stats
   * 
   * **Caching:**
   * - Uses cached data if available for faster loading
   * - Falls back to fresh API calls if cache is unavailable
   * 
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load admin dashboard data
   * await loadDashboardData();
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Try to get from cache first for faster loading
      const [appointmentsCached, testsCached, invoicesCached, patientsCached, servicesCached] = await Promise.all([
        getAdminData('appointments', false),
        getAdminData('labTests', false),
        getAdminData('invoices', false),
        getAdminData('patients', false),
        getAdminData('services', false)
      ]);

      // Load stats
      const statsResult = await adminService.getDashboardStats().catch(() => ({ success: false }));

      // Use cached data if available, otherwise fetch fresh
      const appointmentsResult = appointmentsCached.success && appointmentsCached.data 
        ? { success: true, data: appointmentsCached.data.slice(0, 10) }
        : await appointmentService.getAllAppointments({ fetchAll: false, pageSize: 10 }).catch(() => ({ success: false }));
      
      const testsResult = testsCached.success && testsCached.data
        ? { success: true, data: testsCached.data.slice(0, 10) }
        : await labTestService.getAllLabTests({ fetchAll: false, pageSize: 10 }).catch(() => ({ success: false }));
      
      const invoicesResult = invoicesCached.success && invoicesCached.data
        ? { success: true, data: invoicesCached.data.slice(0, 100) }
        : await invoiceService.getAllInvoices({ fetchAll: false, pageSize: 100 }).catch(() => ({ success: false }));
      
      const patientsResult = patientsCached.success && patientsCached.data
        ? { success: true, data: patientsCached.data }
        : await patientService.getAllPatients({ fetchAll: false, pageSize: 1 }).catch(() => ({ success: false }));
      
      const servicesResult = servicesCached.success && servicesCached.data
        ? { success: true, data: servicesCached.data }
        : await medicalService.getAllServices({ fetchAll: true }).catch(() => ({ success: false }));

      // Process stats
      if (statsResult.success) {
        const d = statsResult.data || {};
        setStats({
          totalPatients: d.totalPatients || 0,
          todayAppointments: d.todayAppointments || 0,
          pendingTests: d.pendingTests || 0,
          todayRevenue: d.todayRevenue || 0
        });
      } else {
        // Calculate stats from loaded data
        const today = new Date().toISOString().split('T')[0];
        const allInvoices = invoicesResult.success && Array.isArray(invoicesResult.data) ? invoicesResult.data : [];
        const todayInvoices = allInvoices.filter(inv => {
          const invDate = inv.invoiceDate || inv.createdAt;
          return invDate && invDate.startsWith(today);
        });
        const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || Number(inv.amount) || 0), 0);
        
        const allAppointments = appointmentsResult.success && Array.isArray(appointmentsResult.data) ? appointmentsResult.data : [];
        const todayAppointments = allAppointments.filter(apt => {
          const aptDate = apt.appointmentDate || apt.AppointmentDate;
          return aptDate && aptDate.startsWith(today);
        });

        const allTests = testsResult.success && Array.isArray(testsResult.data) ? testsResult.data : [];
        const pendingTests = allTests.filter(test => {
          const status = (test.status || test.Status || '').toLowerCase();
          return status === 'pending' || status === 'chờ xử lý' || status === 'processing';
        });

        const totalPatients = patientsResult.success && Array.isArray(patientsResult.data) ? patientsResult.data.length : 0;

        setStats({
          totalPatients,
          todayAppointments: todayAppointments.length,
          pendingTests: pendingTests.length,
          todayRevenue
        });
      }

      // Load all patients once for mapping
      const allPatientsResult = await patientService.getAllPatients({ fetchAll: true, pageSize: 1000 }).catch(() => ({ success: false }));
      const allPatients = allPatientsResult.success && Array.isArray(allPatientsResult.data) ? allPatientsResult.data : [];
      const patientMap = new Map();
      allPatients.forEach(patient => {
        const patientId = patient.id || patient.patientId || patient.Id;
        if (patientId) {
          const name = patient.fullName || patient.name || patient.full_name || patient.fullName;
          patientMap.set(String(patientId), name);
        }
      });

      // Load all appointments and services for test type mapping
      const allAppointments = appointmentsResult.success && Array.isArray(appointmentsResult.data) ? appointmentsResult.data : [];
      const appointmentMap = new Map();
      allAppointments.forEach(apt => {
        const aptId = apt.id || apt.appointmentId || apt.Id;
        if (aptId) {
          appointmentMap.set(String(aptId), apt);
        }
      });

      const allServices = servicesResult.success && Array.isArray(servicesResult.data) ? servicesResult.data : [];
      const serviceMap = new Map();
      allServices.forEach(service => {
        const serviceId = service.PackageId || service.packageId || service.TestPackageId || service.testPackageId || service.id || service.Id;
        if (serviceId) {
          const serviceName = service.PackageName || service.packageName || service.name || service.Name;
          serviceMap.set(String(serviceId), serviceName);
        }
      });

      // Process recent appointments
      if (appointmentsResult.success && Array.isArray(appointmentsResult.data)) {
        const appointments = appointmentsResult.data.slice(0, 5);
        const enrichedAppointments = appointments.map((apt) => {
          const patientId = apt.patientId || apt.PatientId || apt.patient_id;
          const patientName = patientId && patientMap.has(String(patientId)) 
            ? patientMap.get(String(patientId))
            : `Bệnh nhân #${patientId || 'N/A'}`;
          
          return {
            ...apt,
            patientName,
            appointmentDate: apt.appointmentDate || apt.AppointmentDate || apt.appointment_date || apt.date || apt.createdAt
          };
        });
        setRecentAppointments(enrichedAppointments);
      } else {
        setRecentAppointments([]);
      }

      // Process recent tests
      if (testsResult.success && Array.isArray(testsResult.data)) {
        const tests = testsResult.data.slice(0, 5);
        const enrichedTests = tests.map((test) => {
          // Get patient name
          const patientId = test.patientId || test.PatientId || test.patient_id;
          let patientName = `Bệnh nhân #${patientId || 'N/A'}`;
          if (patientId && patientMap.has(String(patientId))) {
            patientName = patientMap.get(String(patientId));
          }

          // Get test type - try multiple sources
          let testType = test.testType || test.testPackage || test.packageName || 
                        test.TestType || test.TestPackage || test.PackageName ||
                        test.serviceName || test.ServiceName ||
                        test.testPackageName || test.TestPackageName;

          // If not found, try to get from appointment
          if (!testType || testType === 'N/A') {
            const appointmentId = test.appointmentId || test.AppointmentId || test.appointment_id;
            if (appointmentId && appointmentMap.has(String(appointmentId))) {
              const appointment = appointmentMap.get(String(appointmentId));
              testType = appointment.TestPackageName || appointment.testPackageName || 
                        appointment.serviceName || appointment.service ||
                        appointment.ServiceName || appointment.Service;
              
              // If still not found, try to match with services using TestPackageId
              if (!testType || testType === 'N/A') {
                const testPackageId = appointment.TestPackageId || appointment.testPackageId || 
                                    appointment.test_package_id || appointment.Test_Package_Id;
                if (testPackageId && serviceMap.has(String(testPackageId))) {
                  testType = serviceMap.get(String(testPackageId));
                }
              }
            }
          }

          // Final fallback
          if (!testType || testType === 'N/A') {
            testType = `#LT-${String(test.id || test.testId || '').slice(-8)}`;
          }

          return {
            ...test,
            patientName,
            testType
          };
        });
        setRecentTests(enrichedTests);
      } else {
        setRecentTests([]);
      }
    } catch (error) {
      // Error loading dashboard data
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets status badge component for entity status
   * 
   * This helper function returns a StatusBadge component for displaying
   * entity status (appointment, test, etc.) with appropriate styling and colors.
   * 
   * @param {string} status - Status string
   * @param {string} [entity='appointment'] - Entity type ('appointment', 'test', etc.)
   * @returns {React.ReactNode} StatusBadge component
   * 
   * @example
   * // Get status badge for appointment
   * const badge = getStatusBadge('confirmed', 'appointment');
   */
  const getStatusBadge = (status, entity = 'appointment') => {
    return <StatusBadge entity={entity} status={status} showIcon={true} />;
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
        <h3 className="stat-value mb-1" style={{ color: '#ffffff' }}>{value}</h3>
        <p className="stat-title mb-0" style={{ color: '#ffffff' }}>{title}</p>
        {subtitle && <small style={{ color: '#ffffff', opacity: 0.9 }}>{subtitle}</small>}
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <Container className="py-4">
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
                Dashboard Quản trị
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
            title="Tổng bệnh nhân"
            value={stats.totalPatients}
            icon={FaUsers}
            color="primary"
            trend={12}
            subtitle="Tăng 12% so với tháng trước"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Lịch hẹn hôm nay"
            value={stats.todayAppointments}
            icon={FaCalendarAlt}
            color="success"
            trend={8}
            subtitle="Có 8 lịch hẹn mới"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Xét nghiệm chờ xử lý"
            value={stats.pendingTests}
            icon={FaFlask}
            color="warning"
            trend={-5}
            subtitle="Giảm 5% so với hôm qua"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Doanh thu hôm nay"
            value={formatCurrency(stats.todayRevenue)}
            icon={FaDollarSign}
            color="info"
            trend={15}
            subtitle="Tăng 15% so với hôm qua"
          />
        </Col>
      </Row>

      {/* Nhóm chức năng Quản trị hệ thống (Admin Hub Dashbar) */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                <i className="fas fa-th-large"></i>
              </span>
              <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                Nhóm chức năng Quản trị hệ thống (Admin Functional Hub)
              </h5>
            </div>
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-2 fw-semibold">
              <i className="fas fa-user-shield me-1"></i> Quản trị viên cao cấp
            </span>
          </div>

          <Row className="g-3">
            {/* 1. Quản lý bệnh nhân */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/patients')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #198754' }}
              >
                <div className="rounded-3 bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaUsers size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Bệnh nhân</div>
                  <small className="text-muted d-block text-truncate">Quản lý hồ sơ</small>
                </div>
              </div>
            </Col>

            {/* 2. Quản lý lịch hẹn */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/appointments')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #0d6efd' }}
              >
                <div className="rounded-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaCalendarAlt size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Lịch hẹn</div>
                  <small className="text-muted d-block text-truncate">Điều phối lịch</small>
                </div>
              </div>
            </Col>

            {/* 3. Mẫu xét nghiệm */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/sample-management')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #dc3545' }}
              >
                <div className="rounded-3 bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaVial size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Mẫu & Barcode</div>
                  <small className="text-muted d-block text-truncate">In mã & quản lý mẫu</small>
                </div>
              </div>
            </Col>

            {/* 4. Phòng Lab */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/lab-rooms')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #0dcaf0' }}
              >
                <div className="rounded-3 bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <i className="fas fa-door-open fa-lg"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Phòng Lab</div>
                  <small className="text-muted d-block text-truncate">Quản lý cơ sở phòng</small>
                </div>
              </div>
            </Col>

            {/* 5. Gói dịch vụ */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/services')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #6610f2' }}
              >
                <div className="rounded-3 bg-purple bg-opacity-10 text-primary d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaCogs size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Gói dịch vụ</div>
                  <small className="text-muted d-block text-truncate">Bảng giá xét nghiệm</small>
                </div>
              </div>
            </Col>

            {/* 6. Hóa đơn */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/invoices')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #ffc107' }}
              >
                <div className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaReceipt size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Hóa đơn & Biên lai</div>
                  <small className="text-muted d-block text-truncate">Quản lý thu ngân</small>
                </div>
              </div>
            </Col>

            {/* 7. Báo cáo thống kê */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/reports')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #0d6efd' }}
              >
                <div className="rounded-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaChartLine size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Báo cáo</div>
                  <small className="text-muted d-block text-truncate">Doanh thu & mẫu</small>
                </div>
              </div>
            </Col>

            {/* 8. Quản lý người dùng */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/admin/user-management')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #20c997' }}
              >
                <div className="rounded-3 bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaUserMd size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Người dùng & Phân quyền</div>
                  <small className="text-muted d-block text-truncate">Tài khoản & vai trò</small>
                </div>
              </div>
            </Col>

            {/* 9. Thông báo notify */}
            <Col xs={6} md={3}>
              <div 
                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                onClick={() => navigate('/notifications')}
                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #fd7e14' }}
              >
                <div className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center p-3" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <FaBell size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate">Thông báo notify</div>
                  <small className="text-muted d-block text-truncate">Audit log & sự kiện</small>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Charts and Tables Row */}
      <Row>
        {/* Recent Appointments */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <FaCalendarAlt className="me-2" />
                Lịch hẹn gần đây
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {recentAppointments.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="d-none d-md-table-cell">Bệnh nhân</th>
                        <th className="d-md-none">Bệnh nhân</th>
                        <th className="d-none d-lg-table-cell">Ngày hẹn</th>
                        <th className="d-lg-none">Ngày</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppointments.map((appointment, index) => (
                        <tr key={appointment.id || appointment.appointmentId || `appointment-${index}`}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="patient-avatar me-2 d-none d-md-block">
                                <FaUserMd />
                              </div>
                              <div>
                                <div className="fw-bold" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{appointment.patientName || `Bệnh nhân #${appointment.patientId || 'N/A'}`}</div>
                                <small className="text-muted d-none d-md-inline">ID: {appointment.id || appointment.appointmentId || 'N/A'}</small>
                              </div>
                            </div>
                          </td>
                          <td className="d-none d-lg-table-cell">
                            <FaCalendarAlt className="me-1 text-muted" />
                            {formatDate(appointment.appointmentDate)}
                          </td>
                          <td className="d-lg-none">
                            {formatDate(appointment.appointmentDate)}
                          </td>
                          <td>{getStatusBadge(appointment.status, 'appointment')}</td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => navigate(`/admin/appointments?view=${appointment.id || appointment.appointmentId}`)}
                              title="Xem chi tiết"
                              className="w-100 w-md-auto"
                            >
                              <FaEye />
                              <span className="d-none d-md-inline ms-1">Xem</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
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

        {/* Recent Lab Tests */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                <FaFlask className="me-2" />
                Xét nghiệm gần đây
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {recentTests.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="d-none d-md-table-cell">Loại xét nghiệm</th>
                        <th className="d-md-none">Loại</th>
                        <th className="d-none d-lg-table-cell">Bệnh nhân</th>
                        <th className="d-lg-none">BN</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTests.map((test, index) => (
                        <tr key={test.id || test.testId || `test-${index}`}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="test-icon me-2 d-none d-md-block">
                                <FaVial />
                              </div>
                              <div>
                                <div className="fw-bold" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{test.testType || `#LT-${String(test.id || test.testId || '').slice(-8)}`}</div>
                                <small className="text-muted d-none d-md-inline">ID: {test.id || test.testId || 'N/A'}</small>
                              </div>
                            </div>
                          </td>
                          <td className="d-none d-lg-table-cell">
                            <div className="d-flex align-items-center">
                              <FaUserMd className="me-1 text-muted" />
                              {test.patientName || `Bệnh nhân #${test.patientId || 'N/A'}`}
                            </div>
                          </td>
                          <td className="d-lg-none">
                            {test.patientName ? test.patientName.split(' ').pop() : `#${test.patientId || 'N/A'}`}
                          </td>
                          <td>{getStatusBadge(test.status, 'labTest')}</td>
                          <td>
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              onClick={() => navigate(`/lab-user/results?testId=${test.id || test.testId}`)}
                              title="Xem kết quả"
                              className="w-100 w-md-auto"
                            >
                              <FaFileMedicalAlt />
                              <span className="d-none d-md-inline ms-1">Xem</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaFlask className="text-muted mb-3" style={{fontSize: '3rem'}} />
                  <p className="text-muted">Không có xét nghiệm nào</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </Container>
  );
};

export default AdminDashboard;
