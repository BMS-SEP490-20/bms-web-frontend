/**
 * @file App.jsx
 * @description Main application routing configuration for BMS Web Frontend.
 * Integrates Public Landing Page, Authentication Workflows, Role-based Medical Modules,
 * QC Flags, Audit Logs, and Laboratory Information Management System (LIS).
 * Conforms to: Production Medical Standards ISO 15189 & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

// Layouts & Providers
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import { AuthProvider, useAuth } from "./shared/contexts/AuthContext";
import { NotificationProvider as NotificationContextProvider, useNotificationContext } from "./shared/contexts/NotificationContext";
import NotificationProvider from "./shared/components/Notification/NotificationProvider";
import ErrorBoundary from "./shared/components/ErrorBoundary/ErrorBoundary";

// Auth & Errors
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import Register from "./features/auth/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword.jsx";
import ChangePassword from "./features/auth/ChangePassword";
import NotFound404 from "./components/errors/NotFound404";
import Forbidden403 from "./pages/errors/Forbidden403";

// Clinical, Doctor & Reception Pages
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

// Laboratory, QC & Inventory Pages
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

// Patient & Appointment Pages
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

// Administration & Management Pages
import UserManagementPage from "./features/users/pages/UserManagementPage.jsx";
import DoctorManagement from "./features/users/pages/DoctorManagementPage";
import RolesManagementPage from "./features/user-management/pages/RolesManagementPage";
import ServicePackagesPage from "./features/admin/pages/ServicePackagesPage.jsx";
import ScheduleManagementPage from "./features/schedule/pages/ManageSchedulePage.jsx";
import BackupManagementPage from "./features/backup/pages/BackupManagementPage.jsx";
import AuditLogPage from "./pages/audit/AuditLogPage";

// Utilities & Assets
import { fetchServiceCatalog } from "./features/catalog/api/catalogApi";
import api from "./config/api";
import {
  FaVial, FaPhoneAlt, FaClock, FaCheckCircle, FaSearch, FaArrowRight, FaShieldAlt,
  FaFileMedicalAlt, FaMicroscope, FaCalendarCheck, FaHospital, FaLock, FaUserMd,
  FaUserCircle, FaSignOutAlt, FaFileInvoiceDollar, FaHistory, FaTimes
} from "react-icons/fa";
import "./app.css";

// ==========================================
// 1. ROUTE GUARDS (BẢO VỆ PHÂN QUYỀN)
// ==========================================

const ROLE_ID_TO_ROLE = { 1: "ADMIN", 2: "MANAGER", 3: "DOCTOR", 4: "LABTECH", 5: "PATIENT", 6: "RECEPTIONIST" };

const normalize = (r) => {
  if (!r) return "PATIENT";
  if (ROLE_ID_TO_ROLE[r]) return ROLE_ID_TO_ROLE[r];
  const s = r.toString().toUpperCase();
  if (s.includes("ADMIN")) return "ADMIN";
  if (s.includes("MANAGER")) return "MANAGER";
  if (s.includes("DOCTOR") || s.includes("BACSI")) return "DOCTOR";
  if (s.includes("HEAD") || s.includes("TRUONGPHONG")) return "LABHEAD";
  if (s.includes("TECH") || s.includes("LAB") || s.includes("KTV")) return "LABTECH";
  if (s.includes("RECEPT") || s.includes("LETAN")) return "RECEPTIONIST";
  if (s.includes("NURSE")) return "NURSE";
  if (s.includes("WAREHOUSE")) return "WAREHOUSESTAFF";
  if (s.includes("CASHIER")) return "CASHIER";
  return "PATIENT";
};

/**
 * Enhanced Protected Route: Hỗ trợ cả Role String lẫn Role ID, tự động điều hướng 403/Login
 */
function ProtectedRoute({ children, allowedRoles = [], allowedRoleIds = [] }) {
  const { user, isAuthenticated, loading, userRole, userRoleId } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Đang tải...</span></div>
      </div>
    );
  }

  // Fallback đọc token từ storage nếu auth context chưa khởi tạo xong
  const token = localStorage.getItem("bms_token") || sessionStorage.getItem("bms_token");
  if (!isAuthenticated && !token) return <Navigate to="/login" replace />;

  const currentRole = normalize(userRoleId || userRole || user?.role || user?.roleName);
  const currentRoleId = userRoleId || (user?.roleId ? Number(user?.roleId) : null);

  const hasRoleMatch = allowedRoles.length === 0 || allowedRoles.map(r => r.toUpperCase()).includes(currentRole);
  const hasIdMatch = allowedRoleIds.length === 0 || (currentRoleId && allowedRoleIds.includes(currentRoleId));

  if (!hasRoleMatch && !hasIdMatch) {
    if (currentRole === "PATIENT") return <Navigate to="/403" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children || <React.Fragment />;
}

// ==========================================
// 2. PUBLIC CLINICAL HOMEPAGE (LANDING PAGE)
// ==========================================

function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [featuredPackages, setFeaturedPackages] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
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
    patientName: "", phoneNumber: "", identityCard: "", address: "",
    bookingDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    bookingSlot: "07:00 - 08:30", notes: ""
  });

  useEffect(() => {
    fetchServiceCatalog()
      .then(res => res?.packages?.length && setFeaturedPackages(res.packages.slice(0, 4)))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    ["bms_token", "bms_access_token", "bms_user"].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setUser(null);
    window.location.href = "/";
  };

  const handleBookPackage = (pkg) => {
    setBookingPackage(pkg);
    setBookingSuccess(false);
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
    setBookingCode(`ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setBookingSuccess(true);
  };

  return (
    <div className="bms-landing-wrapper">
      {/* Top Contact Bar */}
      <div className="bms-topbar">
        <div className="bms-topbar-container">
          <div className="bms-topbar-info">
            <div className="bms-topbar-item"><FaPhoneAlt /><span>Hotline Đặt Lịch & Tư Vấn: <strong>1900 6868</strong></span></div>
            <div className="bms-topbar-item"><FaClock /><span>Giờ nhận mẫu: 06:00 - 20:00 (Thứ 2 - CN)</span></div>
          </div>
          <div className="bms-topbar-badge">Giấy phép BYT: 08892/BYT-GPHĐ</div>
        </div>
      </div>

      {/* Main Navbar */}
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
                <li><button type="button" className="bms-nav-btn" onClick={() => setShowResultsModal(true)}><FaHistory className="text-primary" /> Lịch Sử KQ</button></li>
                <li><button type="button" className="bms-nav-btn" onClick={() => setShowPaymentModal(true)}><FaFileInvoiceDollar className="text-success" /> Thanh Toán</button></li>
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
                <a className="bms-btn bms-btn-outline bms-btn-sm" href="/dashboard">Bảng điều khiển</a>
                <button type="button" className="bms-btn bms-btn-danger-outline bms-btn-sm" onClick={handleLogout}><FaSignOutAlt /> Đăng Xuất</button>
              </div>
            ) : (
              <a className="bms-btn bms-btn-primary" href="/login">Đăng Nhập <FaArrowRight /></a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bms-hero-section">
        <div className="bms-hero-container">
          <div className="bms-hero-content">
            <div className="bms-hero-badge"><FaShieldAlt /> TIÊU CHUẨN ISO 15189 & CHỨNG NHẬN CAP</div>
            <h2 className="bms-hero-title">Xét Nghiệm Máu Nhanh Chóng, <span>Chính Xác & Tin Cậy</span></h2>
            <p className="bms-hero-desc">Phòng Lab tự động hóa hoàn toàn với 80+ chỉ số. Thẩm định bởi Bác sĩ Chuyên khoa, trả kết quả điện tử sau 90 phút.</p>
            <form className="bms-search-bar" onSubmit={(e) => { e.preventDefault(); window.location.href = `/services?search=${encodeURIComponent(searchTerm)}`; }}>
              <FaSearch className="bms-search-icon" />
              <input type="text" className="bms-search-input" placeholder="Tìm gói xét nghiệm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <button type="submit" className="bms-search-btn">Tìm Kiếm</button>
            </form>
          </div>

          {/* Quick Tracking Widget */}
          <div className="bms-utility-card" id="tra-cuu">
            <div className="bms-utility-header">
              <h3><FaFileMedicalAlt className="text-primary" /> Tra Cứu Kết Quả</h3>
              <p>Dành cho bệnh nhân đã lấy mẫu tại viện hoặc tại nhà</p>
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

      {/* Featured Packages */}
      <section className="bms-section bms-section-alt">
        <div className="bms-container">
          <div className="bms-section-header">
            <div className="bms-section-subtitle">DANH MỤC GÓI KHÁM ĐIỂN HÌNH</div>
            <h3 className="bms-section-title">Gói Xét Nghiệm Máu Tiêu Biểu</h3>
          </div>
          <div className="bms-packages-grid">
            {featuredPackages.map((pkg, idx) => (
              <div key={pkg.id || idx} className={`bms-package-card ${idx === 0 ? 'featured' : ''}`}>
                <div className="bms-package-body">
                  <h4 className="bms-package-title">{pkg.packageName}</h4>
                  <p className="bms-package-summary">{pkg.description || 'Xét nghiệm đạt chuẩn ISO 15189.'}</p>
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

      {/* Booking Modal */}
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
                  <h4>Đăng Ký Đặt Lịch Thành Công!</h4>
                  <p>Mã phiếu hẹn: <strong className="text-primary font-monospace fs-5">{bookingCode}</strong></p>
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
                    <div className="col-6"><input type="text" className="bms-form-control" required placeholder="Họ tên" value={bookingForm.patientName} onChange={e => setBookingForm({...bookingForm, patientName: e.target.value})} /></div>
                    <div className="col-6"><input type="tel" className="bms-form-control" required placeholder="Số điện thoại" value={bookingForm.phoneNumber} onChange={e => setBookingForm({...bookingForm, phoneNumber: e.target.value})} /></div>
                  </div>
                  <button type="submit" className="bms-btn bms-btn-primary w-100 py-2">Xác Nhận Đặt Lịch</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bms-footer p-4 bg-dark text-white text-center">
        <p className="m-0 small text-muted">&copy; 2026 BMS Health - Blood Laboratory Management System. ISO 15189 Certified.</p>
      </footer>
    </div>
  );
}

// ==========================================
// 3. MASTER ROUTER HIERARCHY
// ==========================================

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationContextProvider>
          <Router>
            <Routes>
              {/* === PUBLIC & AUTH === */}
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/services" element={<ServiceCatalogPage />} />
              <Route path="/catalog" element={<ServiceCatalogPage />} />

              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* Kiosk Màn hình hàng đợi phòng khám */}
              <Route path="/reception/queue-board" element={<PublicQueueBoardPage />} />
              <Route path="/queue-board" element={<PublicQueueBoardPage />} />

              {/* === AUTHENTICATED SYSTEM MODULES === */}
              <Route element={<MainLayout />}>
                {/* 1. Mọi User đã xác thực */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "DOCTOR", "LABHEAD", "LABTECH", "NURSE", "WAREHOUSESTAFF", "RECEPTIONIST", "CASHIER", "PATIENT"]} />}>
                  <Route path="/dashboard" element={<RoleBasedDashboard />} />
                  <Route path="/profile" element={<UserProfilePage />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/notifications" element={<NotificationsHistoryPage />} />
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

                {/* 2. Bệnh nhân & Thanh toán */}
                <Route element={<ProtectedRoute allowedRoles={["PATIENT", "ADMIN", "MANAGER", "CASHIER", "RECEPTIONIST"]} />}>
                  <Route path="/patient/test-history" element={<TestHistoryPage />} />
                  <Route path="/patient/results" element={<ExportTestResultPdfPage />} />
                  <Route path="/payments/checkout" element={<ProcessPaymentPage />} />
                  <Route path="/payments/checkout/:invoiceId" element={<ProcessPaymentPage />} />
                </Route>

                {/* 3. Lễ tân & Tiếp nhận bệnh nhân */}
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

                {/* 4. Khám bệnh, Hồ sơ y tế & Bác sĩ */}
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

                {/* 5. Phòng Lab & Kỹ thuật viên (LIS) */}
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

                {/* 6. Kho hóa chất, Ca trực & Thiết bị IoT */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "WAREHOUSESTAFF", "LABHEAD", "LABTECH"]} />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/manager/inventory-management" element={<InventoryPage />} />
                  <Route path="/admin/inventory-management" element={<InventoryPage />} />
                  <Route path="/manage/schedule" element={<ScheduleManagementPage />} />
                  <Route path="/admin/shift-assignment" element={<ShiftAssignment />} />
                  <Route path="/manager/shift-assignment" element={<ShiftAssignment />} />
                  <Route path="/manager/iot-thresholds" element={<ConfigureIotThresholdsPage />} />
                </Route>

                {/* 7. Quản trị hệ thống & Audit (Admin / Manager) */}
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

                {/* 8. Super Admin Only */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} allowedRoleIds={[1]} />}>
                  <Route path="/roles" element={<RolesManagementPage />} />
                  <Route path="/admin/role-management" element={<RolesManagementPage />} />
                </Route>
              </Route>

              {/* === ERROR HANDLING === */}
              <Route path="/403" element={<Forbidden403 />} />
              <Route path="/404" element={<NotFound404 />} />
              <Route path="*" element={<NotFound404 />} />
            </Routes>
          </Router>
          {/* Notification Toast Stack */}
          <NotificationProvider />
        </NotificationContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}