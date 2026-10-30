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
import { AuthProvider } from "./shared/contexts/AuthContext";
import { NotificationProvider as NotificationContextProvider, useNotificationContext } from "./shared/contexts/NotificationContext";
import NotificationProvider from "./shared/components/Notification/NotificationProvider";
import ErrorBoundary from "./shared/components/ErrorBoundary/ErrorBoundary";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ROLES, ALL_ROLES } from "./constants/roles";

// Authentication & Http Error Views
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import Register from "./features/auth/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword.jsx";
import ChangePassword from "./features/auth/ChangePassword";
import NotFound404 from "./components/errors/NotFound404";
import Forbidden403 from "./components/errors/Forbidden403";

// Clinical, Consultation & Receptionist Views
import RoleBasedDashboard from "./features/manager-dashboard/pages/RoleDashboard";
import UserProfilePage from "./features/patient/pages/UserProfilePage";
import CheckInPage from "./features/reception/pages/CheckInPage.jsx";
import RegisterWalkInPatientPage from "./features/walkin/pages/RegisterWalkInPage.jsx";
import QueueBoardPage from "./features/reception/pages/QueueBoardPage.jsx";
import PublicQueueBoardPage from "./features/reception/pages/PublicQueueBoardPage.jsx";
import DoctorConsolePage from "./features/doctor/pages/DoctorConsolePage.jsx";
import MedicalRecordPage from "./features/doctor/pages/MedicalRecordPage.jsx";
import AddMedicalNotesPage from "./features/doctor/pages/AddMedicalNotesPage.jsx";
import MedicalAssessmentListPage from "./features/doctor/pages/MedicalAssessmentListPage.jsx";
import AddMedicalAssessmentPage from "./features/doctor/pages/AddMedicalAssessmentPage.jsx";
import CreateTestOrderPage from "./features/doctor/pages/CreateTestOrderPage.jsx";
import DoctorSchedulePage from "./features/doctor-schedule/pages/DoctorSchedulePage";
import ViewShiftsPage from "./features/view-shifts/pages/ViewShiftsPage.jsx";

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
import LookupBiochemicalResultsPage from "./features/laboratory/pages/LookupBiochemicalResultsPage.jsx";
import NotifyTestResultsPage from "./features/laboratory/pages/NotifyTestResultsPage.jsx";
import TestCriteriaPage from "./features/laboratory/pages/TestCriteriaPage";
import ConfigureReferenceIntervalsPage from "./features/laboratory/pages/ConfigureReferenceIntervalsPage.jsx";
import LabProfilesPage from "./features/lab-profiles/pages/LabProfilesPage.jsx";
import LabRoomManagement from "./features/facilities/pages/LabRoomManagementPage";
import ValidateSample from "./features/lab-user/pages/ValidateSample.jsx";
import QcFlagsPage from "./features/qc/pages/QcFlagsPage.jsx";
import QualityControlManagementPage from "./features/qc/pages/QualityControlManagementPage.jsx";
import InventoryPage from "./features/inventory/pages/InventoryPage.jsx";
import ConfigureIotThresholdsPage from "./features/manager-dashboard/pages/ConfigureIotThresholdsPage.jsx";
import AlertThresholdViolationPage from "./features/iot/pages/AlertThresholdViolationPage.jsx";

// Patient Services, Scheduling & Billing Views
import ServiceCatalogPage from "./features/catalog/pages/ServiceCatalogPage";
import BookAppointmentPage from "./features/appointment/pages/BookAppointmentPage.jsx";
import AppointmentListPage from "./features/appointment/pages/AppointmentListPage.jsx";
import AppointmentConfirmationPage from "./features/appointment/pages/AppointmentConfirmationPage";
import TestHistoryPage from "./features/patient/pages/TestHistoryPage.jsx";
import TestReportPage from "./features/patient/pages/TestReportPage.jsx";
import ExportTestResultPdfPage from "./features/patient/pages/ExportTestResultPdfPage.jsx";
import TrackTestProgressPage from "./features/patient/pages/TrackTestProgressPage.jsx";
import BillingInvoicesPage from "./features/billing/pages/BillingInvoicesPage.jsx";
import ProcessPaymentPage from "./features/billing/pages/ProcessPaymentPage.jsx";
import CalculateFeesPage from "./features/billing/pages/CalculateFeesPage.jsx";
import FeedbackHubPage from "./features/feedback/pages/FeedbackHubPage.jsx";

// System Administration, Notifications Center & Security Views
import UserManagementPage from "./features/users/pages/UserManagementPage.jsx";
import RolesManagementPage from "./features/user-management/pages/RolesManagementPage";
import ServicePackagesPage from "./features/admin/pages/ServicePackagesPage.jsx";
import ScheduleManagementPage from "./features/schedule/pages/ManageSchedulePage.jsx";
import BackupManagementPage from "./features/backup/pages/BackupManagementPage.jsx";
import AuditLogPage from "./features/audit/pages/AuditLogPage.jsx";
import TatStatisticsDashboardPage from "./features/reports/pages/TatStatisticsDashboardPage.jsx";
import RevenueReportPage from "./features/reports/pages/RevenueReportPage.jsx";
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
// WHY: one guard (src/routes/ProtectedRoute.jsx) and one role table (src/constants/roles.js). The copy that used
// to live here mapped 3 = Doctor / 4 = LabTech / 5 = Patient and turned unknown roles into PATIENT.
const { ADMIN, MANAGER, LAB, DOCTOR, RECEPTIONIST, PATIENT } = ROLES;

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
            <li><a className="bms-nav-link" href="/tracking"><FaVial className="text-primary me-1" /> Lộ Trình Mẫu (UC48)</a></li>
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
            {/* WHY: UC53 fee calculation is Receptionist-only (matrix §1.8), so the public header no longer links to it. */}
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
              {/* --- 1. Public Portals & Catalogs (UC01, UC15/UC20 view, UC48 lookup by code with PII masked) --- */}
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/services" element={<ServiceCatalogPage />} />
              <Route path="/catalog" element={<ServiceCatalogPage />} />
              <Route path="/tracking" element={<TrackTestProgressPage />} />
              <Route path="/tracking/:identifier" element={<TrackTestProgressPage />} />
              <Route path="/patient" element={<Navigate to="/" replace />} />

              {/* --- 2. Authentication Workflows (AuthLayout) --- */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* --- 3. Queue board displays: login required until Phát approves a public board (TIEU-CHI C3) --- */}
              <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST]} />}>
                <Route path="/reception/queue-board" element={<PublicQueueBoardPage />} />
                <Route path="/queue-board" element={<PublicQueueBoardPage />} />
              </Route>

              {/* --- 4. Authenticated Medical Modules (MainLayout). Role lists follow ROLE-PERMISSION-MATRIX §1. --- */}
              <Route element={<MainLayout />}>

                {/* Any signed-in role: dashboard (UC12), own profile/password (UC07-UC09), own notifications (UC58/UC59) */}
                <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
                  <Route path="/dashboard" element={<RoleBasedDashboard />} />
                  <Route path="/profile" element={<UserProfilePage />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/notifications" element={<PushNotificationCenterPage />} />
                  <Route path="/notifications/center" element={<PushNotificationCenterPage />} />
                  <Route path="/admin/notifications" element={<PushNotificationCenterPage />} />
                </Route>

                {/* UC58 dispatch: Lab, Manager, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER, RECEPTIONIST]} />}>
                  <Route path="/notifications/dispatch" element={<PushNotificationCenterPage />} />
                </Route>

                {/* UC79 feedback: Patient (own) submits, Manager reads/responds */}
                <Route element={<ProtectedRoute allowedRoles={[MANAGER, PATIENT]} />}>
                  <Route path="/feedback" element={<FeedbackHubPage />} />
                  <Route path="/patient/feedback" element={<FeedbackHubPage />} />
                  <Route path="/manager/feedback" element={<FeedbackHubPage />} />
                </Route>

                {/* UC23 view appointments: Receptionist, Manager, Doctor (assigned), Patient (own) */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST, MANAGER, DOCTOR, PATIENT]} />}>
                  <Route path="/appointments" element={<AppointmentListPage />} />
                </Route>

                {/* UC21/UC22 book + confirmation: Patient (own), Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, RECEPTIONIST]} />}>
                  <Route path="/appointments/book" element={<BookAppointmentPage />} />
                  <Route path="/appointments/confirmation" element={<AppointmentConfirmationPage />} />
                  <Route path="/appointments/:id/confirmation" element={<AppointmentConfirmationPage />} />
                  {/* Patient pays own invoice by VNPay; Receptionist takes counter payment (ruling 30/10) */}
                  <Route path="/payments/checkout" element={<ProcessPaymentPage />} />
                  <Route path="/payments/checkout/:invoiceId" element={<ProcessPaymentPage />} />
                </Route>

                {/* UC36 view shifts: Admin, Manager, Doctor, Lab, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER, DOCTOR, LAB, RECEPTIONIST]} />}>
                  <Route path="/shifts/view" element={<ViewShiftsPage />} />
                </Route>

                {/* UC35/UC16 shift schedule view: Admin, Manager, Doctor, Lab, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[DOCTOR, MANAGER, ADMIN, LAB, RECEPTIONIST]} />}>
                  <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
                  <Route path="/schedule" element={<DoctorSchedulePage />} />
                </Route>

                {/* UC42 view/download report: Patient (own), Doctor, Lab, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, DOCTOR, LAB, MANAGER]} />}>
                  <Route path="/reports/:orderId" element={<TestReportPage />} />
                  <Route path="/results/:orderId/report" element={<TestReportPage />} />
                  <Route path="/patient/results/:orderId" element={<TestReportPage />} />
                </Route>

                {/* UC62 export result PDF: Patient (own), Doctor */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, DOCTOR]} />}>
                  <Route path="/results/export/:orderId" element={<ExportTestResultPdfPage />} />
                  <Route path="/patient/results" element={<ExportTestResultPdfPage />} />
                  <Route path="/patient/results/export/:orderId" element={<ExportTestResultPdfPage />} />
                </Route>

                {/* UC48 tracking list/search: Patient (own), Receptionist, Doctor, Lab, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, RECEPTIONIST, DOCTOR, LAB, MANAGER]} />}>
                  <Route path="/patient/tracking" element={<TrackTestProgressPage />} />
                  <Route path="/patient/tracking/:identifier" element={<TrackTestProgressPage />} />
                </Route>

                {/* UC76 test history: Manager, Lab, Doctor, Patient (own). Admin and Receptionist denied (decision 10). */}
                <Route element={<ProtectedRoute allowedRoles={[MANAGER, LAB, DOCTOR, PATIENT]} />}>
                  <Route path="/patient/test-history" element={<TestHistoryPage />} />
                </Route>

                {/* UC30 view patient information: Receptionist, Doctor, Lab, Manager. Admin denied (decision 10). */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST, DOCTOR, LAB, MANAGER]} />}>
                  <Route path="/patients" element={<CheckInPage />} />
                </Route>

                {/* Front desk: check-in, guest/walk-in (UC25-UC29), queue (UC27/UC28), fees (UC53) - Receptionist only */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST]} />}>
                  <Route path="/reception/checkin" element={<CheckInPage />} />
                  {/* WHY: the legacy "pages/receptionist/CheckIn|CreatePatient" modules were never committed.
                      Keep the URLs the Sidebar links to, served by the team's existing check-in and
                      walk-in registration pages. TODO(senior-dev, Đợt 3): decide whether to wire the
                      QR-based features/reception/components/Receptionist/ReceptionistCheckIn.jsx instead. */}
                  <Route path="/reception/check-in" element={<CheckInPage />} />
                  <Route path="/receptionist/check-in" element={<CheckInPage />} />
                  <Route path="/reception/create-patient" element={<RegisterWalkInPatientPage />} />
                  <Route path="/receptionist/create-patient" element={<RegisterWalkInPatientPage />} />
                  <Route path="/reception/register-walkin" element={<RegisterWalkInPatientPage />} />
                  <Route path="/reception/queue" element={<QueueBoardPage />} />
                  <Route path="/queue" element={<QueueBoardPage />} />
                  {/* WHY: UC53 is Receptionist-only (matrix §1.8, §3.3); these URLs used to be public. */}
                  <Route path="/calculate-fees" element={<CalculateFeesPage />} />
                  <Route path="/fee-calculator" element={<CalculateFeesPage />} />
                  <Route path="/billing/calculate-fee" element={<CalculateFeesPage />} />
                  <Route path="/patient/fee-calculator" element={<CalculateFeesPage />} />
                </Route>

                {/* UC54 invoices: Receptionist; Manager view only */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST, MANAGER]} />}>
                  <Route path="/invoices" element={<BillingInvoicesPage />} />
                  <Route path="/billing/invoices" element={<BillingInvoicesPage />} />
                </Route>

                {/* Doctor work: console, notes (UC51), orders (UC32), new assessment (UC50) */}
                <Route element={<ProtectedRoute allowedRoles={[DOCTOR]} />}>
                  <Route path="/doctor/console" element={<DoctorConsolePage />} />
                  <Route path="/doctor/medical-notes" element={<AddMedicalNotesPage />} />
                  <Route path="/medical-assessments/add" element={<AddMedicalAssessmentPage />} />
                  <Route path="/doctor/assessments/:id/edit" element={<AddMedicalAssessmentPage />} />
                  <Route path="/medical-assessments/:id/edit" element={<AddMedicalAssessmentPage />} />
                  <Route path="/doctor/orders/create" element={<CreateTestOrderPage />} />
                </Route>

                {/* UC33/UC50 view EMR + assessments: Doctor; Manager view. Admin denied (decision 10). */}
                <Route element={<ProtectedRoute allowedRoles={[DOCTOR, MANAGER]} />}>
                  <Route path="/doctor/emr" element={<MedicalRecordPage />} />
                  <Route path="/medical-records" element={<MedicalRecordPage />} />
                  <Route path="/medical-assessments" element={<MedicalAssessmentListPage />} />
                  <Route path="/doctor/assessments" element={<MedicalAssessmentListPage />} />
                  <Route path="/medical-assessments/:id" element={<AddMedicalAssessmentPage />} />
                </Route>

                {/* Lab bench work owned by Lab: sample list (UC37), result entry (UC46) */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER]} />}>
                  <Route path="/lab/queue" element={<SampleQueuePage />} />
                  <Route path="/laboratory/samples" element={<SampleQueuePage />} />
                  <Route path="/lab-user/validate-sample" element={<ValidateSample />} />
                  <Route path="/laboratory/enter-test-results" element={<EnterTestResultsPage />} />
                  <Route path="/laboratory/batches" element={<TestBatchManagementPage />} />
                  <Route path="/laboratory/verify-results" element={<VerifyTestResultsPage />} />
                  <Route path="/laboratory/verify-results/:specimenId" element={<VerifyTestResultsPage />} />
                  <Route path="/laboratory/notifications" element={<NotifyTestResultsPage />} />
                  <Route path="/laboratory/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/lab-user/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/manager/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/qc/management" element={<QualityControlManagementPage />} />
                  <Route path="/laboratory/qc" element={<QualityControlManagementPage />} />
                  <Route path="/laboratory/quality-control" element={<QualityControlManagementPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={[LAB]} />}>
                  <Route path="/laboratory/sample-list" element={<SampleListPage />} />
                </Route>

                {/* UC41 sample check-in: Lab, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, RECEPTIONIST]} />}>
                  <Route path="/laboratory/checkinsample" element={<CheckInSamplePage />} />
                </Route>

                {/* Lab chain views: Lab, Manager, Doctor (UC47 rerun view, UC52 notes, UC70, UC71, UC77, UC18/UC57 view) */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER, DOCTOR]} />}>
                  <Route path="/laboratory/rerun-requests" element={<SampleRerunPage />} />
                  <Route path="/laboratory/samples/:id/rerun" element={<SampleRerunPage />} />
                  <Route path="/laboratory/test-notes" element={<AddTestNotePage />} />
                  <Route path="/laboratory/specimens/:specimenId/notes" element={<AddTestNotePage />} />
                  <Route path="/laboratory/sample-timeline" element={<SampleTimelinePage />} />
                  <Route path="/laboratory/specimens/history" element={<SpecimenHistoryPage />} />
                  <Route path="/laboratory/biochemical-results" element={<LookupBiochemicalResultsPage />} />
                  <Route path="/laboratory/lookup-results" element={<LookupBiochemicalResultsPage />} />
                  <Route path="/laboratory/trace" element={<TraceSampleOriginPage />} />
                  <Route path="/laboratory/trace/:specimenId" element={<TraceSampleOriginPage />} />
                  <Route path="/criteria" element={<TestCriteriaPage />} />
                  <Route path="/laboratory/criteria" element={<TestCriteriaPage />} />
                  <Route path="/laboratory/reference-intervals" element={<ConfigureReferenceIntervalsPage />} />
                </Route>

                {/* UC34 lab rooms, UC61 lab profiles: Manager, Admin */}
                <Route element={<ProtectedRoute allowedRoles={[MANAGER, ADMIN]} />}>
                  <Route path="/laboratory/rooms" element={<LabRoomManagement />} />
                  <Route path="/admin/lab-rooms" element={<LabRoomManagement />} />
                  <Route path="/laboratory/lab-profiles" element={<LabProfilesPage />} />
                </Route>

                {/* UC56 inventory: Admin, Manager, Lab (Doctor denied, decision 10). UC67 IoT thresholds view: same set. */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER, LAB]} />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/manager/inventory-management" element={<InventoryPage />} />
                  <Route path="/admin/inventory-management" element={<InventoryPage />} />
                  <Route path="/manager/iot-thresholds" element={<ConfigureIotThresholdsPage />} />
                </Route>

                {/* UC35 shift rostering (View/Create/Update/Delete Shifts): Manager */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER]} />}>
                  <Route path="/manage/schedule" element={<DoctorSchedulePage />} />
                  <Route path="/manager/shift-assignment" element={<DoctorSchedulePage />} />
                  <Route path="/schedule/personal" element={<ScheduleManagementPage />} />
                </Route>

                {/* UC68 IoT alerts: Lab, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER]} />}>
                  <Route path="/iot/alerts" element={<AlertThresholdViolationPage />} />
                  <Route path="/laboratory/iot-alerts" element={<AlertThresholdViolationPage />} />
                </Route>

                {/* UC63 TAT, UC78 revenue (Manager view only): Admin, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER]} />}>
                  <Route path="/reports/revenue" element={<RevenueReportPage />} />
                  <Route path="/admin/revenue-report" element={<RevenueReportPage />} />
                  <Route path="/manager/revenue" element={<RevenueReportPage />} />
                  <Route path="/reports/tat" element={<TatStatisticsDashboardPage />} />
                  <Route path="/reports/tat-statistics" element={<TatStatisticsDashboardPage />} />
                  <Route path="/laboratory/tat" element={<TatStatisticsDashboardPage />} />
                  <Route path="/laboratory/tat-statistics" element={<TatStatisticsDashboardPage />} />
                  <Route path="/admin/tat-statistics" element={<TatStatisticsDashboardPage />} />
                </Route>

                {/* UC15/UC19 package management: Admin + Manager (Quy trình DOT2 follow-up 2, pending Phát).
                    WHY: UC19 test packages are edited through the same service-packages screen and API. */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER]} />}>
                  <Route path="/packages" element={<ServicePackagesPage />} />
                  <Route path="/admin/packages" element={<ServicePackagesPage />} />
                </Route>

                {/* Admin only: accounts (UC14), roles (UC13), audit (UC64, C5), backup (UC80) */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN]} />}>
                  <Route path="/admin/employees" element={<UserManagementPage />} />
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/admin/user-management" element={<UserManagementPage />} />
                  {/* WHY: DoctorManagementPage was never committed; doctor accounts are managed in UserManagementPage. */}
                  <Route path="/admin/doctor-management" element={<UserManagementPage />} />
                  <Route path="/admin/audit-logs" element={<AuditLogPage />} />
                  <Route path="/admin/backup" element={<BackupManagementPage />} />
                  <Route path="/backup" element={<BackupManagementPage />} />
                  <Route path="/roles" element={<RolesManagementPage />} />
                  <Route path="/admin/role-management" element={<RolesManagementPage />} />
                </Route>
              </Route>


              {/* Legacy URLs whose role-prefixed copies gave the wrong roles access; redirect so the canonical
                  route's guard decides (no 404 for old bookmarks). */}
              {[["/doctor/feedback", "/feedback"], ["/receptionist/feedback", "/feedback"], ["/admin/feedback", "/feedback"],
                ["/admin/invoices", "/invoices"], ["/admin/qc-flags", "/laboratory/qc-flags"], ["/lab-user/lab-rooms", "/laboratory/rooms"],
                ["/manager/audit-logs", "/admin/audit-logs"], ["/admin/shift-assignment", "/manager/shift-assignment"],
                ["/admin/iot-alerts", "/iot/alerts"],
                // URLs dropped in 18cf0eb (rewrite of App.jsx); restored as aliases of the current screens.
                ["/admin/backups", "/admin/backup"], ["/laboratory/backup", "/admin/backup"], ["/billing/receipts", "/invoices"],
                ["/clinical/test-orders/create", "/doctor/orders/create"], ["/doctor/test-orders/create", "/doctor/orders/create"],
                ["/doctor/assessments/add", "/medical-assessments/add"], ["/iot/thresholds", "/manager/iot-thresholds"],
                ["/monitoring/iot-thresholds", "/manager/iot-thresholds"], ["/lab/batches", "/laboratory/batches"],
                ["/laboratory/notify-results", "/laboratory/notifications"], ["/laboratory/sample-intake/create-list", "/laboratory/sample-list"],
                ["/laboratory/sample-trace", "/laboratory/trace"], ["/laboratory/samples/request-rerun", "/laboratory/rerun-requests"],
                ["/laboratory/specimen-history", "/laboratory/specimens/history"], ["/specimens/history", "/laboratory/specimens/history"],
                ["/laboratory/test-notes/add", "/laboratory/test-notes"], ["/laboratory/verification", "/laboratory/verify-results"],
                ["/patient/payments/checkout", "/payments/checkout"], ["/patient/results/export", "/patient/results"],
                ["/reception/console", "/reception/checkin"], ["/reception/patients", "/patients"],
                ["/reference-intervals", "/laboratory/reference-intervals"], ["/reports", "/reports/tat"],
                ["/shifts", "/shifts/view"], ["/users", "/admin/users"]].map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}

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