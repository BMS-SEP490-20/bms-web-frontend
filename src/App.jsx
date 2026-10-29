/**
 * @file App.jsx
 * @description Master client-side routing hierarchy for BMS Laboratory Management Portal.
 * Integrates public patient portals, ISO 15189 clinical service catalogs (UC01),
 * authentication flows (UC02-UC10), and role-protected clinical/administrative workflows.
 * 
 * SECURITY BOUNDARY NOTICE:
 * Client-side route protections (ProtectedRoute) serve purely as UX routing guards to prevent
 * unauthorized navigation and layout flashing. Server-side API gateway and controllers
 * remain the sole authoritative security boundary enforcing JWT validation and claims.
 * 
 * Conforms to: Production Medical Standards ISO 15189, HIPAA Privacy, & AGENTS-CODE.md.
 */

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

// Layouts, Global State Providers & Error Boundaries
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import { AuthProvider, useAuth } from "./shared/contexts/AuthContext";
import { NotificationProvider as NotificationContextProvider, useNotificationContext } from "./shared/contexts/NotificationContext";
import NotificationProvider from "./shared/components/Notification/NotificationProvider";
import ErrorBoundary from "./shared/components/ErrorBoundary/ErrorBoundary";

// Authentication & Http Error Views
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import Register from "./features/auth/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword.jsx";
import ChangePassword from "./features/auth/ChangePassword";
import NotFound404 from "./components/errors/NotFound404";
import Forbidden403 from "./pages/errors/Forbidden403";

// Clinical, Consultation & Receptionist Views
import RoleBasedDashboard from "./features/manager-dashboard/pages/RoleDashboard";
import UserProfilePage from "./features/patient/pages/UserProfilePage";
import CheckInPage from "./features/reception/pages/CheckInPage.jsx";
import RegisterWalkInPatientPage from "./features/walkin/pages/RegisterWalkInPage.jsx";
import QueueBoardPage from "./features/reception/pages/QueueBoardPage.jsx";
import PublicQueueBoardPage from "./features/reception/pages/PublicQueueBoardPage.jsx";
import ReceptionistCheckInPage from "./pages/receptionist/CheckIn";
import ReceptionistCreatePatientPage from "./pages/receptionist/CreatePatient";
import DoctorConsolePage from "./features/doctor/pages/DoctorConsolePage.jsx";
import MedicalRecordPage from "./features/doctor/pages/MedicalRecordPage.jsx";
import AddMedicalNotesPage from "./features/doctor/pages/AddMedicalNotesPage.jsx";
import MedicalAssessmentListPage from "./features/doctor/pages/MedicalAssessmentListPage.jsx";
import AddMedicalAssessmentPage from "./features/doctor/pages/AddMedicalAssessmentPage.jsx";
import CreateTestOrderPage from "./features/doctor/pages/CreateTestOrderPage.jsx";
import DoctorSchedulePage from "./features/doctor-schedule/pages/DoctorSchedulePage";
import ViewShiftsPage from "./features/view-shifts/pages/ViewShiftsPage.jsx";
import ShiftAssignment from "./features/appointments/components/ShiftAssignment/ShiftAssignment";

// Laboratory Operations, QC, IoT & Inventory Views
import SampleQueuePage from "./features/laboratory/pages/SampleQueuePage";
import CheckInSamplePage from "./features/sample-checkin/pages/CheckInSamplePage.jsx";
import SampleTimelinePage from "./features/laboratory/pages/SampleTimelinePage.jsx";
import TestBatchManagementPage from "./features/laboratory/pages/TestBatchManagementPage.jsx";
import SampleListPage from "./features/laboratory/pages/SampleListPage.jsx";
import SampleRerunPage from "./features/laboratory/pages/SampleRerunPage.jsx";
import AddTestNotePage from "./features/laboratory/pages/AddTestNotePage.jsx";
import VerifyTestResultsPage from "./features/laboratory/pages/VerifyTestResultsPage.jsx";
import EnterTestResultsPage from "./features/test-results/pages/EnterTestResultsPage.jsx";
import TraceSampleOriginPage from "./features/laboratory/pages/TraceSampleOriginPage.jsx";
import SpecimenHistoryPage from "./features/laboratory/pages/SpecimenHistoryPage.jsx";
import NotifyTestResultsPage from "./features/laboratory/pages/NotifyTestResultsPage.jsx";
import TestCriteriaPage from "./features/laboratory/pages/TestCriteriaPage";
import ConfigureReferenceIntervalsPage from "./features/laboratory/pages/ConfigureReferenceIntervalsPage.jsx";
import LabProfilesPage from "./features/lab-profiles/pages/LabProfilesPage.jsx";
import LabRoomManagement from "./features/facilities/pages/LabRoomManagementPage";
import ValidateSample from "./pages/lab-user/ValidateSample";
import QcFlagsPage from "./pages/qc/QcFlagsPage";
import InventoryPage from "./features/inventory/pages/InventoryPage.jsx";
import ConfigureIotThresholdsPage from "./features/manager-dashboard/pages/ConfigureIotThresholdsPage.jsx";

// Patient Services, Scheduling & Billing Views
import ServiceCatalogPage from "./features/catalog/pages/ServiceCatalogPage";
import BookAppointmentPage from "./features/appointment/pages/BookAppointmentPage.jsx";
import AppointmentListPage from "./features/appointment/pages/AppointmentListPage.jsx";
import AppointmentConfirmationPage from "./features/appointment/pages/AppointmentConfirmationPage";
import TestHistoryPage from "./features/patient/pages/TestHistoryPage.jsx";
import TestReportPage from "./features/patient/pages/TestReportPage.jsx";
import ExportTestResultPdfPage from "./features/patient/pages/ExportTestResultPdfPage.jsx";
import BillingInvoicesPage from "./features/billing/pages/BillingInvoicesPage.jsx";
import ProcessPaymentPage from "./features/billing/pages/ProcessPaymentPage.jsx";
import FeedbackHubPage from "./pages/feedback/FeedbackHubPage";
import NotificationsHistoryPage from "./pages/notifications/NotificationsHistoryPage";

// System Administration, Notifications Center & Security Views
import UserManagementPage from "./features/users/pages/UserManagementPage.jsx";
import DoctorManagement from "./features/users/pages/DoctorManagementPage";
import RolesManagementPage from "./features/user-management/pages/RolesManagementPage";
import ServicePackagesPage from "./features/admin/pages/ServicePackagesPage.jsx";
import ScheduleManagementPage from "./features/schedule/pages/ManageSchedulePage.jsx";
import BackupManagementPage from "./features/backup/pages/BackupManagementPage.jsx";
import AuditLogPage from "./pages/audit/AuditLogPage";
import TatStatisticsDashboardPage from "./features/reports/pages/TatStatisticsDashboardPage.jsx";
import PushNotificationCenterPage from "./features/notifications/pages/PushNotificationCenterPage.jsx";

// API Clients & UI Icons
import { fetchServiceCatalog } from "./features/catalog/api/catalogApi";
import api from "./config/api";
import {
  FaVial, FaPhoneAlt, FaClock, FaCheckCircle, FaSearch, FaArrowRight, FaShieldAlt,
  FaFileMedicalAlt, FaMicroscope, FaCalendarCheck, FaHospital, FaLock, FaUserMd,
  FaUserCircle, FaSignOutAlt, FaFileInvoiceDollar, FaHistory, FaTimes
} from "react-icons/fa";
import "./app.css";

// =============================================================================
// AUTHORIZATION & CLIENT-SIDE ACCESS CONTROL
// =============================================================================

/**
 * Mapping legacy numerical IDs to canonical role keys for backward compatibility.
 */
const ROLE_ID_MAP = {
  1: "ADMIN",
  2: "MANAGER",
  3: "DOCTOR",
  4: "LABTECH",
  5: "PATIENT",
  6: "RECEPTIONIST"
};

/**
 * Resolves heterogeneous role representations (string or numeric ID) to a canonical key.
 *
 * @param {string|number|null|undefined} role - Raw role indicator
 * @returns {string} Normalized uppercase role key; defaults to 'PATIENT' for least privilege
 */
function resolveRole(role) {
  if (!role && role !== 0) return "PATIENT";
  if (ROLE_ID_MAP[role]) return ROLE_ID_MAP[role];

  const normalized = role.toString().toUpperCase();
  if (normalized.includes("ADMIN")) return "ADMIN";
  if (normalized.includes("MANAGER")) return "MANAGER";
  if (normalized.includes("DOCTOR") || normalized.includes("BACSI")) return "DOCTOR";
  if (normalized.includes("HEAD") || normalized.includes("TRUONGPHONG")) return "LABHEAD";
  if (normalized.includes("TECH") || normalized.includes("LAB") || normalized.includes("KTV")) return "LABTECH";
  if (normalized.includes("RECEPT") || normalized.includes("LETAN")) return "RECEPTIONIST";
  if (normalized.includes("NURSE")) return "NURSE";
  if (normalized.includes("WAREHOUSE")) return "WAREHOUSESTAFF";
  if (normalized.includes("CASHIER")) return "CASHIER";
  return "PATIENT";
}

/**
 * Route guard component enforcing client-side permission checks.
 *
 * Intercepts unauthorized navigation, saves user-friendly denial notices to sessionStorage
 * for display by notification toasts, and redirects to the appropriate role-based landing page.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Protected child route hierarchy
 * @param {string[]} [props.allowedRoles=[]] - Permitted role keys
 * @param {number[]} [props.allowedRoleIds=[]] - Permitted legacy numeric role IDs
 */
function ProtectedRoute({ children, allowedRoles = [], allowedRoleIds = [] }) {
  const { user, isAuthenticated, loading, userRole, userRoleId } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  // Fallback to storage token check during cold reloads before context hydration finishes
  const hasToken = localStorage.getItem("bms_token") || sessionStorage.getItem("bms_token");
  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = resolveRole(userRoleId || userRole || user?.role || user?.roleName);
  const currentRoleId = userRoleId || (user?.roleId ? Number(user?.roleId) : null);

  const roleMatches = allowedRoles.length === 0 || allowedRoles.map(r => r.toUpperCase()).includes(currentRole);
  const idMatches = allowedRoleIds.length === 0 || (currentRoleId && allowedRoleIds.includes(currentRoleId));

  if (!roleMatches && !idMatches) {
    // Store access-denied reason for toast notifications on target dashboard
    sessionStorage.setItem("bms_access_denied", JSON.stringify({
      timestamp: Date.now(),
      message: "Bạn không có quyền truy cập vào phân hệ này."
    }));

    // Prevent patients from viewing operational back-office dashboards entirely
    if (currentRole === "PATIENT") {
      return <Navigate to="/403" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children || <React.Fragment />;
}

// =============================================================================
// PUBLIC CLINICAL PORTAL & LANDING PAGE (UC01 / UC81)
// =============================================================================

/**
 * Public Clinical Landing Page.
 * Conforms to ISO 15189 public reporting guidelines and clinical UX requirements.
 */
function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [featuredPackages, setFeaturedPackages] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
      return raw ? JSON.parse(raw) : null;
    } catch { 
      return null; 
    }
  });

  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRequireLoginModal, setShowRequireLoginModal] = useState(false);
  const [bookingPackage, setBookingPackage] = useState(null);
  const [collectionType, setCollectionType] = useState("clinic");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [bookingForm, setBookingForm] = useState({
    patientName: "", 
    phoneNumber: "", 
    address: "",
    bookingDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    bookingSlot: "07:00 - 08:30", 
    notes: ""
  });

  useEffect(() => {
    fetchServiceCatalog()
      .then(res => res?.packages?.length && setFeaturedPackages(res.packages.slice(0, 4)))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    ["bms_token", "bms_access_token", "bms_user"].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    setUser(null);
    window.location.href = "/";
  };

  const handleBookPackage = (pkg) => {
    setBookingPackage(pkg);
    setBookingSuccess(false);

    // Business rule: Anonymous bookings are restricted under medical ISO compliance
    if (!user) {
      setShowRequireLoginModal(true);
      return;
    }

    setBookingForm(prev => ({
      ...prev,
      patientName: user.fullName || user.username || "",
      phoneNumber: user.phone || user.phoneNumber || "",
      address: user.address || ""
    }));
    setShowBookingModal(true);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    // Generate human-readable intake reference code for quick desk intake
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setBookingCode(`ORD-${year}${month}-${randomSuffix}`);
    setBookingSuccess(true);
  };

  return (
    <div className="bms-landing-wrapper">
      <div className="bms-topbar">
        <div className="bms-topbar-container">
          <div className="bms-topbar-info">
            <div className="bms-topbar-item">
              <FaPhoneAlt />
              <span>Hotline Đặt Lịch & Tư Vấn: <strong>1900 6868</strong></span>
            </div>
            <div className="bms-topbar-item">
              <FaClock />
              <span>Tiếp nhận mẫu: 06:00 - 20:00 (Thứ 2 - CN)</span>
            </div>
          </div>
          <div className="bms-topbar-badge">Giấy phép BYT: 08892/BYT-GPHĐ</div>
        </div>
      </div>

      <header className="bms-navbar">
        <div className="bms-navbar-container">
          <a className="bms-brand" href="/">
            <div className="bms-brand-logo"><img src="/assets/bms-logo.png" alt="BMS Logo" /></div>
            <div className="bms-brand-text">
              <h1>BMS CLINICAL LABORATORY</h1>
              <p>Hệ Thống Xét Nghiệm Tiêu Chuẩn Quốc Tế ISO 15189</p>
            </div>
          </a>

          <ul className="bms-nav-links">
            <li><a className="bms-nav-link" href="/services">Gói Xét Nghiệm</a></li>
            {user && (
              <>
                <li>
                  <button type="button" className="bms-nav-btn" onClick={() => setShowResultsModal(true)}>
                    <FaHistory className="text-primary" /> Lịch Sử KQ
                  </button>
                </li>
                <li>
                  <button type="button" className="bms-nav-btn" onClick={() => setShowPaymentModal(true)}>
                    <FaFileInvoiceDollar className="text-success" /> Thanh Toán
                  </button>
                </li>
              </>
            )}
            <li><a className="bms-nav-link" href="#tra-cuu">Tra Cứu Online</a></li>
          </ul>

          <div className="bms-header-actions">
            {user ? (
              <div className="bms-user-nav-dropdown">
                <a className="bms-user-pill" href="/dashboard">
                  <div className="bms-user-avatar">{user.fullName ? user.fullName[0].toUpperCase() : 'U'}</div>
                  <div className="bms-user-meta"><span className="bms-user-name">{user.fullName || user.username}</span></div>
                </a>
                <a className="bms-btn bms-btn-outline bms-btn-sm" href="/dashboard">Bảng Điều Khiển</a>
                <button type="button" className="bms-btn bms-btn-danger-outline bms-btn-sm" onClick={handleLogout}>
                  <FaSignOutAlt /> Đăng Xuất
                </button>
              </div>
            ) : (
              <a className="bms-btn bms-btn-primary" href="/login">Đăng Nhập <FaArrowRight /></a>
            )}
          </div>
        </div>
      </header>

      <section className="bms-hero-section">
        <div className="bms-hero-container">
          <div className="bms-hero-content">
            <div className="bms-hero-badge"><FaShieldAlt /> TIÊU CHUẨN ISO 15189 & CHỨNG NHẬN CAP</div>
            <h2 className="bms-hero-title">Xét Nghiệm Máu Nhanh Chóng, <span>Chính Xác & Tin Cậy</span></h2>
            <p className="bms-hero-desc">
              Phòng Lab tự động hóa hoàn toàn với 80+ chỉ số huyết học, sinh hóa. Kết quả được thẩm định
              bởi Bác sĩ Chuyên khoa, trả trực tuyến có chữ ký số sau 90-120 phút.
            </p>
            <form className="bms-search-bar" onSubmit={(e) => { e.preventDefault(); window.location.href = `/services?search=${encodeURIComponent(searchTerm)}`; }}>
              <FaSearch className="bms-search-icon" />
              <input type="text" className="bms-search-input" placeholder="Tìm gói xét nghiệm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <button type="submit" className="bms-search-btn">Tìm Kiếm</button>
            </form>
          </div>

          <div className="bms-utility-card" id="tra-cuu">
            <div className="bms-utility-header">
              <h3><FaFileMedicalAlt className="text-primary" /> Tra Cứu Kết Quả</h3>
              <p>Dành cho bệnh nhân đã lấy mẫu tại phòng khám hoặc tại nhà</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); window.location.href = `/login?redirect=results&code=${encodeURIComponent(lookupCode)}&phone=${encodeURIComponent(lookupPhone)}`; }}>
              <div className="bms-form-group">
                <label className="bms-form-label">Mã phiếu hẹn / Barcode *</label>
                <input type="text" className="bms-form-control" required placeholder="Ví dụ: ORD-2026-0881" value={lookupCode} onChange={e => setLookupCode(e.target.value)} />
              </div>
              <div className="bms-form-group">
                <label className="bms-form-label">Số điện thoại *</label>
                <input type="tel" className="bms-form-control" required placeholder="Ví dụ: 0912 345 678" value={lookupPhone} onChange={e => setLookupPhone(e.target.value)} />
              </div>
              <button type="submit" className="bms-btn bms-btn-primary w-100 py-2.5 mt-2"><FaSearch /> Tra Cứu Ngay</button>
            </form>
          </div>
        </div>
      </section>

      <section className="bms-section bms-section-alt">
        <div className="bms-container">
          <div className="bms-section-header">
            <div className="bms-section-subtitle">DANH MỤC DỊCH VỤ NIÊM YẾT</div>
            <h3 className="bms-section-title">Gói Xét Nghiệm Máu Tiêu Biểu</h3>
          </div>
          <div className="bms-packages-grid">
            {featuredPackages.map((pkg, idx) => (
              <div key={pkg.id || idx} className={`bms-package-card ${idx === 0 ? 'featured' : ''}`}>
                <div className="bms-package-body">
                  <h4 className="bms-package-title">{pkg.packageName}</h4>
                  <p className="bms-package-summary">{pkg.description || 'Xét nghiệm đạt chuẩn y tế ISO 15189.'}</p>
                  <div className="bms-package-price">
                    <span className="bms-price-val">{new Intl.NumberFormat('vi-VN').format(pkg.price || 0)}</span>
                    <span className="bms-price-unit">VNĐ</span>
                  </div>
                  <button type="button" className="bms-btn bms-btn-primary w-100 mt-3" onClick={() => handleBookPackage(pkg)}>
                    <FaCalendarCheck /> Đặt Lịch Xét Nghiệm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal: Patient Login Requirement Notice */}
      {showRequireLoginModal && (
        <div className="bms-modal-backdrop" onClick={() => setShowRequireLoginModal(false)}>
          <div className="bms-modal-card bms-modal-card-sm" onClick={e => e.stopPropagation()}>
            <div className="bms-modal-head">
              <h3 className="bms-modal-title"><FaLock className="text-primary" /> Yêu Cầu Đăng Nhập</h3>
              <button type="button" className="bms-modal-close" onClick={() => setShowRequireLoginModal(false)}><FaTimes /></button>
            </div>
            <div className="bms-modal-body text-center py-3">
              <p className="small text-muted mb-3">
                Tuân thủ quy chuẩn bảo mật hồ sơ bệnh án ISO 15189, quý khách vui lòng đăng nhập tài khoản bệnh nhân để tiếp tục đặt lịch.
              </p>
              <a className="bms-btn bms-btn-primary w-100 py-2 mb-2" href={`/login?redirect=booking&pkg=${encodeURIComponent(bookingPackage?.packageName || "")}`}>
                Đăng Nhập Cổng Y Tế <FaArrowRight />
              </a>
              <a className="bms-btn bms-btn-outline w-100 py-2" href="/register">Tạo Hồ Sơ Mới</a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clinical Appointment Booking Form */}
      {showBookingModal && (
        <div className="bms-modal-backdrop" onClick={() => setShowBookingModal(false)}>
          <div className="bms-modal-card bms-modal-card-md" onClick={e => e.stopPropagation()}>
            <div className="bms-modal-head">
              <h3 className="bms-modal-title"><FaCalendarCheck className="text-primary" /> Đặt Lịch Hẹn Xét Nghiệm</h3>
              <button type="button" className="bms-modal-close" onClick={() => setShowBookingModal(false)}><FaTimes /></button>
            </div>
            <div className="bms-modal-body">
              {bookingSuccess ? (
                <div className="text-center py-3">
                  <FaCheckCircle className="text-success fs-1 mb-2" />
                  <h4>Đăng Ký Thành Công!</h4>
                  <p>Mã phiếu hẹn tiếp nhận: <strong className="text-primary font-monospace fs-5">{bookingCode}</strong></p>
                  <button type="button" className="bms-btn bms-btn-primary mt-3" onClick={() => setShowBookingModal(false)}>Hoàn Tất</button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit}>
                  <div className="mb-3">
                    <label className="bms-form-label">Hình thức lấy mẫu *</label>
                    <div className="d-flex gap-2">
                      <button type="button" className={`btn btn-sm ${collectionType === 'clinic' ? 'btn-primary' : 'btn-outline-secondary'} flex-grow-1`} onClick={() => setCollectionType('clinic')}>Tại viện BMS</button>
                      <button type="button" className={`btn btn-sm ${collectionType === 'home' ? 'btn-primary' : 'btn-outline-secondary'} flex-grow-1`} onClick={() => setCollectionType('home')}>Tại nhà (+150.000đ)</button>
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6"><input type="text" className="bms-form-control" required placeholder="Họ và tên" value={bookingForm.patientName} onChange={e => setBookingForm({...bookingForm, patientName: e.target.value})} /></div>
                    <div className="col-6"><input type="tel" className="bms-form-control" required placeholder="Số điện thoại" value={bookingForm.phoneNumber} onChange={e => setBookingForm({...bookingForm, phoneNumber: e.target.value})} /></div>
                  </div>
                  <button type="submit" className="bms-btn bms-btn-primary w-100 py-2">Xác Nhận Đặt Lịch</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="bms-footer p-4 bg-dark text-white text-center">
        <p className="m-0 small text-muted">&copy; 2026 BMS Health - Blood Laboratory Management System. ISO 15189 Certified.</p>
      </footer>
    </div>
  );
}

// =============================================================================
// ROOT APPLICATION ROUTER
// =============================================================================

/**
 * Top-level application component assembling security providers and nested route tables.
 * Nested grouping minimizes route declarations while preserving atomic role permissions.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationContextProvider>
          <Router>
            <Routes>
              {/* --- 1. Public Portals & Catalogs --- */}
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/services" element={<ServiceCatalogPage />} />
              <Route path="/catalog" element={<ServiceCatalogPage />} />

              {/* --- 2. Authentication Workflows (AuthLayout) --- */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* --- 3. Standalone Public Kiosk Displays --- */}
              <Route path="/reception/queue-board" element={<PublicQueueBoardPage />} />
              <Route path="/queue-board" element={<PublicQueueBoardPage />} />

              {/* --- 4. Authenticated Medical Modules (MainLayout) --- */}
              <Route element={<MainLayout />}>

                {/* Common Authenticated Features: Dashboard, Profiles, Notifications & Feedback */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "DOCTOR", "LABHEAD", "LABTECH", "NURSE", "WAREHOUSESTAFF", "RECEPTIONIST", "CASHIER", "PATIENT"]} />}>
                  <Route path="/dashboard" element={<RoleBasedDashboard />} />
                  <Route path="/profile" element={<UserProfilePage />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/notifications" element={<PushNotificationCenterPage />} />
                  <Route path="/feedback" element={<FeedbackHubPage />} />
                  <Route path="/patient/feedback" element={<FeedbackHubPage />} />
                  <Route path="/doctor/feedback" element={<FeedbackHubPage />} />
                  <Route path="/receptionist/feedback" element={<FeedbackHubPage />} />
                  <Route path="/manager/feedback" element={<FeedbackHubPage />} />
                  <Route path="/admin/feedback" element={<FeedbackHubPage />} />
                  <Route path="/appointments" element={<AppointmentListPage />} />
                  <Route path="/appointments/book" element={<BookAppointmentPage />} />
                  <Route path="/appointments/confirmation" element={<AppointmentConfirmationPage />} />
                  <Route path="/shifts/view" element={<ViewShiftsPage />} />
                  <Route path="/reports/:orderId" element={<TestReportPage />} />
                  <Route path="/results/:orderId/report" element={<TestReportPage />} />
                  <Route path="/results/export/:orderId" element={<ExportTestResultPdfPage />} />
                </Route>

                {/* Patient Results & Payment Gateway Workflows */}
                <Route element={<ProtectedRoute allowedRoles={["PATIENT", "ADMIN", "MANAGER", "CASHIER", "RECEPTIONIST"]} />}>
                  <Route path="/patient/test-history" element={<TestHistoryPage />} />
                  <Route path="/patient/results" element={<ExportTestResultPdfPage />} />
                  <Route path="/payments/checkout" element={<ProcessPaymentPage />} />
                  <Route path="/payments/checkout/:invoiceId" element={<ProcessPaymentPage />} />
                </Route>

                {/* Front-Desk Reception, Patient Intake & Billing POS */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "RECEPTIONIST", "CASHIER", "DOCTOR", "NURSE"]} />}>
                  <Route path="/patients" element={<CheckInPage />} />
                  <Route path="/reception/checkin" element={<CheckInPage />} />
                  <Route path="/reception/check-in" element={<ReceptionistCheckInPage />} />
                  <Route path="/receptionist/check-in" element={<ReceptionistCheckInPage />} />
                  <Route path="/reception/create-patient" element={<ReceptionistCreatePatientPage />} />
                  <Route path="/receptionist/create-patient" element={<ReceptionistCreatePatientPage />} />
                  <Route path="/reception/register-walkin" element={<RegisterWalkInPatientPage />} />
                  <Route path="/reception/queue" element={<QueueBoardPage />} />
                  <Route path="/queue" element={<QueueBoardPage />} />
                  <Route path="/invoices" element={<BillingInvoicesPage />} />
                  <Route path="/billing/invoices" element={<BillingInvoicesPage />} />
                  <Route path="/admin/invoices" element={<BillingInvoicesPage />} />
                  <Route path="/packages" element={<ServicePackagesPage />} />
                  <Route path="/admin/packages" element={<ServicePackagesPage />} />
                </Route>

                {/* Doctor Consultations, EMR, Diagnostic Notes & Order Creation */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "DOCTOR"]} />}>
                  <Route path="/doctor/console" element={<DoctorConsolePage />} />
                  <Route path="/doctor/emr" element={<MedicalRecordPage />} />
                  <Route path="/medical-records" element={<MedicalRecordPage />} />
                  <Route path="/doctor/medical-notes" element={<AddMedicalNotesPage />} />
                  <Route path="/medical-assessments" element={<MedicalAssessmentListPage />} />
                  <Route path="/doctor/assessments" element={<MedicalAssessmentListPage />} />
                  <Route path="/medical-assessments/add" element={<AddMedicalAssessmentPage />} />
                  <Route path="/doctor/orders/create" element={<CreateTestOrderPage />} />
                  <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
                  <Route path="/schedule" element={<DoctorSchedulePage />} />
                </Route>

                {/* Laboratory Operations, Quality Control Flags & Instrument Rooms */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "LABHEAD", "LABTECH", "DOCTOR"]} />}>
                  <Route path="/lab/queue" element={<SampleQueuePage />} />
                  <Route path="/laboratory/samples" element={<SampleQueuePage />} />
                  <Route path="/lab-user/validate-sample" element={<ValidateSample />} />
                  <Route path="/laboratory/checkinsample" element={<CheckInSamplePage />} />
                  <Route path="/laboratory/enter-test-results" element={<EnterTestResultsPage />} />
                  <Route path="/laboratory/batches" element={<TestBatchManagementPage />} />
                  <Route path="/laboratory/sample-list" element={<SampleListPage />} />
                  <Route path="/laboratory/rerun-requests" element={<SampleRerunPage />} />
                  <Route path="/laboratory/test-notes" element={<AddTestNotePage />} />
                  <Route path="/laboratory/verify-results" element={<VerifyTestResultsPage />} />
                  <Route path="/laboratory/sample-timeline" element={<SampleTimelinePage />} />
                  <Route path="/laboratory/specimens/history" element={<SpecimenHistoryPage />} />
                  <Route path="/laboratory/trace" element={<TraceSampleOriginPage />} />
                  <Route path="/laboratory/notifications" element={<NotifyTestResultsPage />} />
                  <Route path="/laboratory/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/lab-user/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/manager/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/admin/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/laboratory/rooms" element={<LabRoomManagement />} />
                  <Route path="/lab-user/lab-rooms" element={<LabRoomManagement />} />
                  <Route path="/admin/lab-rooms" element={<LabRoomManagement />} />
                  <Route path="/criteria" element={<TestCriteriaPage />} />
                  <Route path="/laboratory/criteria" element={<TestCriteriaPage />} />
                  <Route path="/laboratory/reference-intervals" element={<ConfigureReferenceIntervalsPage />} />
                  <Route path="/laboratory/lab-profiles" element={<LabProfilesPage />} />
                </Route>

                {/* Reagent Inventory, Shift Rostering & Cold-Chain IoT Monitoring */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "WAREHOUSESTAFF", "LABHEAD", "LABTECH"]} />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/manager/inventory-management" element={<InventoryPage />} />
                  <Route path="/admin/inventory-management" element={<InventoryPage />} />
                  <Route path="/manage/schedule" element={<ScheduleManagementPage />} />
                  <Route path="/admin/shift-assignment" element={<ShiftAssignment />} />
                  <Route path="/manager/shift-assignment" element={<ShiftAssignment />} />
                  <Route path="/manager/iot-thresholds" element={<ConfigureIotThresholdsPage />} />
                </Route>

                {/* System Administration, Personnel Management, Audit Logs & Disaster Recovery */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]} />}>
                  <Route path="/admin/employees" element={<UserManagementPage />} />
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/admin/user-management" element={<UserManagementPage />} />
                  <Route path="/admin/doctor-management" element={<DoctorManagement />} />
                  <Route path="/admin/audit-logs" element={<AuditLogPage />} />
                  <Route path="/manager/audit-logs" element={<AuditLogPage />} />
                  <Route path="/admin/backup" element={<BackupManagementPage />} />
                  <Route path="/backup" element={<BackupManagementPage />} />
                </Route>

                {/* Turnaround Time (TAT) Analytics & SLA Dashboard (UC63) */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "DOCTOR", "LABHEAD", "LABTECH"]} />}>
                  <Route path="/reports/tat" element={<TatStatisticsDashboardPage />} />
                  <Route path="/reports/tat-statistics" element={<TatStatisticsDashboardPage />} />
                  <Route path="/laboratory/tat" element={<TatStatisticsDashboardPage />} />
                  <Route path="/laboratory/tat-statistics" element={<TatStatisticsDashboardPage />} />
                  <Route path="/admin/tat-statistics" element={<TatStatisticsDashboardPage />} />
                </Route>

                {/* Multi-Channel Push Notifications & Audit Trail (UC58) */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "DOCTOR", "LABHEAD", "LABTECH", "RECEPTIONIST", "CASHIER", "PATIENT"]} />}>
                  <Route path="/notifications/center" element={<PushNotificationCenterPage />} />
                  <Route path="/notifications/dispatch" element={<PushNotificationCenterPage />} />
                  <Route path="/admin/notifications" element={<PushNotificationCenterPage />} />
                </Route>

                {/* Root Security Authority - Role Privilege Matrix (Role ID 1 Only) */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} allowedRoleIds={[1]} />}>
                  <Route path="/roles" element={<RolesManagementPage />} />
                  <Route path="/admin/role-management" element={<RolesManagementPage />} />
                </Route>
              </Route>

              {/* --- 5. Error & Fallback Routes --- */}
              <Route path="/403" element={<Forbidden403 />} />
              <Route path="/404" element={<NotFound404 />} />
              <Route path="*" element={<NotFound404 />} />
            </Routes>
          </Router>
          <NotificationProvider />
        </NotificationContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}