/**
 * @file App.jsx
 * @description Main application routing configuration for BMS Web Frontend.
 * Integrates public patient portal, service catalog (UC01), authentication workflows (UC02, UC03, UC05, UC10),
 * and authenticated medical / administration modules (UC07, UC08, UC12, UC13, UC17, UC18).
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import Register from "./features/auth/Register";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import ForgotPassword from "./features/auth/pages/ForgotPassword.jsx";
import ChangePassword from "./features/auth/ChangePassword";

import UserProfilePage from "./features/patient/pages/UserProfilePage";
import PatientHomepage from "./features/patient/pages/PatientHomepage.jsx";
import RoleBasedDashboard from "./features/manager-dashboard/pages/RoleDashboard";
import SampleQueuePage from "./features/laboratory/pages/SampleQueuePage";
import RolesManagementPage from "./features/user-management/pages/RolesManagementPage";
import TestCriteriaPage from "./features/laboratory/pages/TestCriteriaPage";
import TestBatchManagementPage from "./features/laboratory/pages/TestBatchManagementPage.jsx";
import ServiceCatalogPage from "./features/catalog/pages/ServiceCatalogPage";
import CheckInSamplePage from "./features/sample-checkin/pages/CheckInSamplePage.jsx";
import SampleTimelinePage from "./features/laboratory/pages/SampleTimelinePage.jsx";
import TestHistoryPage from "./features/patient/pages/TestHistoryPage.jsx";
import { fetchServiceCatalog } from "./features/catalog/api/catalogApi";
import DoctorSchedulePage from "./features/doctor-schedule/pages/DoctorSchedulePage";
import ViewShiftsPage from "./features/view-shifts/pages/ViewShiftsPage.jsx";
import BookAppointmentPage from "./features/appointment/pages/BookAppointmentPage.jsx";
import AppointmentListPage from "./features/appointment/pages/AppointmentListPage.jsx";
import AppointmentConfirmationPage from "./features/appointment/pages/AppointmentConfirmationPage";
import ScheduleManagementPage from "./features/schedule/pages/ManageSchedulePage.jsx";
import ServicePackagesPage from "./features/admin/pages/ServicePackagesPage.jsx";
import EnterTestResultsPage from "./features/test-results/pages/EnterTestResultsPage.jsx";
import RegisterWalkInPatientPage from "./features/walkin/pages/RegisterWalkInPage.jsx";
import UserManagementPage from "./features/users/pages/UserManagementPage.jsx";
import CheckInPage from "./features/reception/pages/CheckInPage.jsx";
import BillingInvoicesPage from "./features/billing/pages/BillingInvoicesPage.jsx";
import ProcessPaymentPage from "./features/billing/pages/ProcessPaymentPage.jsx";
import DoctorConsolePage from "./features/doctor/pages/DoctorConsolePage.jsx";
import PublicQueueBoardPage from "./features/reception/pages/PublicQueueBoardPage.jsx";
import MedicalRecordPage from "./features/doctor/pages/MedicalRecordPage.jsx";
import AddMedicalNotesPage from "./features/doctor/pages/AddMedicalNotesPage.jsx";
import LabProfilesPage from "./features/lab-profiles/pages/LabProfilesPage.jsx";
import InventoryPage from "./features/inventory/pages/InventoryPage.jsx";
import AddMedicalAssessmentPage from "./features/doctor/pages/AddMedicalAssessmentPage.jsx";
import MedicalAssessmentListPage from "./features/doctor/pages/MedicalAssessmentListPage.jsx";
import SampleRerunPage from "./features/laboratory/pages/SampleRerunPage.jsx";
import AddTestNotePage from "./features/laboratory/pages/AddTestNotePage.jsx";
import VerifyTestResultsPage from "./features/laboratory/pages/VerifyTestResultsPage.jsx";
import TraceSampleOriginPage from "./features/laboratory/pages/TraceSampleOriginPage.jsx";
import TestReportPage from "./features/patient/pages/TestReportPage.jsx";
import ExportTestResultPdfPage from "./features/patient/pages/ExportTestResultPdfPage.jsx";
import TrackTestProgressPage from "./features/patient/pages/TrackTestProgressPage.jsx";
import CalculateFeesPage from "./features/billing/pages/CalculateFeesPage.jsx";
import PushNotificationCenterPage from "./features/notifications/pages/PushNotificationCenterPage.jsx";
import TatStatisticsDashboardPage from "./features/reports/pages/TatStatisticsDashboardPage.jsx";
import AlertThresholdViolationPage from "./features/iot/pages/AlertThresholdViolationPage.jsx";
import QualityControlManagementPage from "./features/qc/pages/QualityControlManagementPage.jsx";
import RevenueReportPage from "./features/reports/pages/RevenueReportPage.jsx";
import ConfigureIotThresholdsPage from "./features/manager-dashboard/pages/ConfigureIotThresholdsPage.jsx";
import SampleListPage from "./features/laboratory/pages/SampleListPage.jsx";
import ConfigureReferenceIntervalsPage from "./features/laboratory/pages/ConfigureReferenceIntervalsPage.jsx";
import BackupManagementPage from "./features/backup/pages/BackupManagementPage.jsx";
import NotifyTestResultsPage from "./features/laboratory/pages/NotifyTestResultsPage.jsx";
import SpecimenHistoryPage from "./features/laboratory/pages/SpecimenHistoryPage.jsx";
import CreateTestOrderPage from "./features/doctor/pages/CreateTestOrderPage.jsx";
import QueueBoardPage from "./features/reception/pages/QueueBoardPage.jsx";
import ProtectedRoute from "./routes/ProtectedRoute";
import NotFound404 from "./components/errors/NotFound404";

import { 
    FaVial, 
    FaPhoneAlt, 
    FaClock, 
    FaCheckCircle, 
    FaSearch, 
    FaArrowRight, 
    FaShieldAlt, 
    FaFileMedicalAlt, 
    FaMicroscope, 
    FaCalendarCheck, 
    FaHospital, 
    FaLock, 
    FaUserMd,
    FaFlask,
    FaUserCircle,
    FaSignOutAlt,
    FaFileInvoiceDollar,
    FaHistory,
    FaTimes
} from "react-icons/fa";
import api from "./config/api";
import "./app.css";

/**
 * Public Clinical Landing Page (UC81 / UC01)
 * Conforms to: Production Medical Standards, Clinical Human-Centered Design & AGENTS-DESIGN.md.
 * 
 * @returns {JSX.Element} Clinical landing page view.
 */
function HomePage() {
    const [searchTerm, setSearchTerm] = React.useState("");
    const [lookupCode, setLookupCode] = React.useState("");
    const [lookupPhone, setLookupPhone] = React.useState("");
    const [featuredPackages, setFeaturedPackages] = React.useState([]);
    const [user, setUser] = React.useState(() => {
        try {
            const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });
    const [showResultsModal, setShowResultsModal] = React.useState(false);
    const [showPaymentModal, setShowPaymentModal] = React.useState(false);
    const [showRequireLoginModal, setShowRequireLoginModal] = React.useState(false);
    const [showBookingModal, setShowBookingModal] = React.useState(false);
    const [bookingPackage, setBookingPackage] = React.useState(null);
    const [collectionType, setCollectionType] = React.useState("clinic"); // "clinic" | "home"
    const [bookingSuccess, setBookingSuccess] = React.useState(false);
    const [bookingCode, setBookingCode] = React.useState("");
    const [bookingForm, setBookingForm] = React.useState({
        patientName: "",
        phoneNumber: "",
        identityCard: "",
        address: "",
        bookingDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        bookingSlot: "07:00 - 08:30",
        notes: ""
    });
    const [patientData, setPatientData] = React.useState(null);
    const [loadingRecords, setLoadingRecords] = React.useState(false);

    React.useEffect(() => {
        fetchServiceCatalog()
            .then(res => {
                if (res.packages && res.packages.length > 0) {
                    setFeaturedPackages(res.packages.slice(0, 4));
                }
            })
            .catch(() => {});
    }, []);

    React.useEffect(() => {
        try {
            const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
            if (raw) {
                const u = JSON.parse(raw);
                setUser(u);
                setBookingForm(prev => ({
                    ...prev,
                    patientName: u.fullName || u.username || "",
                    phoneNumber: u.phone || u.phoneNumber || u.contactPhone || "",
                    identityCard: u.identityCard || u.idCard || "",
                    address: u.address || ""
                }));
            }
        } catch {}

        // Listen for tab query params or hash
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab === "results" || window.location.hash === "#lich-su-xet-nghiem") {
            setShowResultsModal(true);
        } else if (tab === "payments" || window.location.hash === "#lich-su-thanh-toan") {
            setShowPaymentModal(true);
        }
    }, []);

    React.useEffect(() => {
        if (user) {
            setLoadingRecords(true);
            api.get("/dashboard/stats?role=Patient")
                .then(res => {
                    if (res.data?.success) {
                        setPatientData(res.data.data);
                    }
                })
                .catch(() => {})
                .finally(() => setLoadingRecords(false));
        }
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem("bms_token");
        localStorage.removeItem("bms_access_token");
        localStorage.removeItem("bms_user");
        sessionStorage.removeItem("bms_token");
        sessionStorage.removeItem("bms_access_token");
        sessionStorage.removeItem("bms_user");
        setUser(null);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            window.location.href = `/services?search=${encodeURIComponent(searchTerm.trim())}`;
        } else {
            window.location.href = "/services";
        }
    };

    const handleLookup = (e) => {
        e.preventDefault();
        if (!lookupCode.trim()) {
            alert("Vui lòng nhập Mã biên nhận hoặc Barcode để tra cứu.");
            return;
        }
        window.location.href = `/tracking?code=${encodeURIComponent(lookupCode.trim())}`;
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
            phoneNumber: user.phone || user.phoneNumber || user.contactPhone || "",
            identityCard: user.identityCard || user.idCard || "",
            address: user.address || ""
        }));
        setShowBookingModal(true);
    };

    const handleBookingSubmit = (e) => {
        e.preventDefault();
        if (!bookingForm.patientName.trim() || !bookingForm.phoneNumber.trim()) {
            alert("Vui lòng điền Họ tên và Số điện thoại liên hệ.");
            return;
        }
        const genCode = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        setBookingCode(genCode);
        setBookingSuccess(true);
    };

    return (
        <div className="bms-landing-wrapper">
            {/* 1. TOP ANNOUNCEMENT & CONTACT BAR */}
            <div className="bms-topbar">
                <div className="bms-topbar-container">
                    <div className="bms-topbar-info">
                        <div className="bms-topbar-item">
                            <FaPhoneAlt />
                            <span>Hotline Đặt Lịch & Tư Vấn: <strong>1900 6868</strong></span>
                        </div>
                        <div className="bms-topbar-item">
                            <FaClock />
                            <span>Giờ tiếp nhận mẫu: 06:00 - 20:00 (Thứ 2 - Chủ Nhật & Ngày Lễ)</span>
                        </div>
                    </div>
                    <div className="bms-topbar-badge">
                        Giấy phép BYT: Số 08892/BYT-GPHĐ
                    </div>
                </div>
            </div>

            {/* 2. MAIN NAVIGATION HEADER */}
            <header className="bms-navbar">
                <div className="bms-navbar-container">
                    <a className="bms-brand" href="/">
                        <div className="bms-brand-logo">
                            <img src="/assets/bms-logo.png" alt="BMS Logo" />
                        </div>
                        <div className="bms-brand-text">
                            <h1>BMS CLINICAL LABORATORY</h1>
                            <p>Hệ Thống Xét Nghiệm Máu Tiêu Chuẩn Quốc Tế ISO 15189</p>
                        </div>
                    </a>

                    <ul className="bms-nav-links">
                        <li><a className="bms-nav-link" href="/services">Gói Xét Nghiệm</a></li>
                        {user ? (
                            <>
                                <li>
                                    <button 
                                        type="button" 
                                        className="bms-nav-btn"
                                        onClick={() => setShowResultsModal(true)}
                                    >
                                        <FaHistory className="text-primary" /> Lịch Sử Xét Nghiệm
                                    </button>
                                </li>
                                <li>
                                    <button 
                                        type="button" 
                                        className="bms-nav-btn"
                                        onClick={() => setShowPaymentModal(true)}
                                    >
                                        <FaFileInvoiceDollar className="text-success" /> Lịch Sử Thanh Toán
                                    </button>
                                </li>
                            </>
                        ) : null}
                        <li><a className="bms-nav-link" href="/tracking"><FaVial className="text-primary me-1" /> Lộ Trình Mẫu</a></li>
                        <li><a className="bms-nav-link" href="/calculate-fees">Tính Phí</a></li>
                        <li><a className="bms-nav-link" href="/notifications/dispatch">Thông Báo</a></li>
                        <li><a className="bms-nav-link" href="/tat/statistics">Thống Kê TAT</a></li>
                        <li><a className="bms-nav-link" href="/alerts/threshold-violations">Cảnh Báo</a></li>
                        <li><a className="bms-nav-link" href="/qc/management">QC Westgard</a></li>
                        <li><a className="bms-nav-link" href="/reports/revenue">Doanh Thu</a></li>
                        <li><a className="bms-nav-link" href="#tra-cuu">Tra Cứu Kết Quả</a></li>
                    </ul>

                    <div className="bms-header-actions">
                        {user ? (
                            <div className="bms-user-nav-dropdown">
                                <a className="bms-user-pill" href="/profile" title="Xem hồ sơ sức khỏe cá nhân">
                                    <div className="bms-user-avatar">
                                        {user.fullName ? user.fullName.trim().split(' ').slice(-1)[0][0].toUpperCase() : 'U'}
                                    </div>
                                    <div className="bms-user-meta">
                                        <span className="bms-user-name">{user.fullName || user.username}</span>
                                        <span className="bms-user-badge">{user.role || 'Bệnh Nhân'}</span>
                                    </div>
                                </a>
                                <a className="bms-btn bms-btn-outline bms-btn-sm" href="/profile">
                                    <FaUserCircle /> Hồ Sơ
                                </a>
                                <button 
                                    type="button" 
                                    className="bms-btn bms-btn-danger-outline bms-btn-sm"
                                    onClick={handleLogout}
                                    title="Đăng xuất khỏi hệ thống"
                                >
                                    <FaSignOutAlt /> Đăng Xuất
                                </button>
                            </div>
                        ) : (
                            <>
                                <a className="bms-btn bms-btn-outline" href="/services">
                                    <FaSearch /> Bảng Giá Khám
                                </a>
                                <a className="bms-btn bms-btn-primary" href="/login">
                                    Đăng Nhập Cổng Y Tế <FaArrowRight />
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* MODAL: LỊCH SỬ XÉT NGHIỆM */}
            {showResultsModal && (
                <div className="bms-modal-backdrop" onClick={() => setShowResultsModal(false)}>
                    <div className="bms-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="bms-modal-head">
                            <h3 className="bms-modal-title">
                                <FaFileMedicalAlt className="text-primary" /> Lịch Sử Xét Nghiệm Y Khoa - {user?.fullName || "Bệnh Nhân"}
                            </h3>
                            <button type="button" className="bms-modal-close" onClick={() => setShowResultsModal(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="bms-modal-body">
                            <div className="alert alert-info py-2 px-3 small d-flex align-items-center justify-content-between mb-3">
                                <span><FaShieldAlt className="me-2" />Toàn bộ kết quả xét nghiệm được thẩm định bởi Bác Sĩ Chuyên Khoa và có chữ ký số điện tử chuẩn ISO 15189:2012.</span>
                                <span className="badge bg-primary text-white">Mã BN: {user?.patientCode || user?.id || "BN-2026-0881"}</span>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr className="small text-muted text-uppercase">
                                            <th>Ngày Trả KQ</th>
                                            <th>Gói / Dịch Vụ Xét Nghiệm</th>
                                            <th>Mã Đơn / Barcode</th>
                                            <th>Trạng Thái</th>
                                            <th>Đánh Giá</th>
                                            <th className="text-end">Chi Tiết</th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        {patientData?.patientData?.recentResults && patientData.patientData.recentResults.length > 0 ? (
                                            patientData.patientData.recentResults.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td><strong>{item.releasedAt || "17/10/2026"}</strong></td>
                                                    <td className="fw-semibold text-dark">{item.packageName || "Tổng phân tích tế bào máu ngoại vi (CBC)"}</td>
                                                    <td><span className="font-monospace text-muted">{item.testOrderId || `ORD-2026-0${idx + 101}`}</span></td>
                                                    <td><span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">{item.status || "Đã Thẩm Định"}</span></td>
                                                    <td>
                                                        {item.hasAbnormalFlag ? (
                                                            <span className="badge bg-warning-subtle text-warning border px-2 py-1">Cần lưu ý</span>
                                                        ) : (
                                                            <span className="badge bg-primary-subtle text-primary border px-2 py-1">Bình thường</span>
                                                        )}
                                                    </td>
                                                    <td className="text-end">
                                                        <a href="/profile" className="btn btn-sm btn-outline-primary py-0 px-2">Xem KQ</a>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <>
                                                <tr>
                                                    <td><strong>17/10/2026</strong></td>
                                                    <td className="fw-semibold text-dark">Tổng phân tích tế bào máu ngoại vi 24 chỉ số (CBC)</td>
                                                    <td><span className="font-monospace text-muted">ORD-2026-0881</span></td>
                                                    <td><span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Đã Duyệt KQ</span></td>
                                                    <td><span className="badge bg-primary-subtle text-primary border px-2 py-1">Bình thường (Đạt chuẩn)</span></td>
                                                    <td className="text-end"><a href="/profile" className="btn btn-sm btn-outline-primary py-0 px-2">Xem KQ</a></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>15/10/2026</strong></td>
                                                    <td className="fw-semibold text-dark">Đông máu toàn bộ (PT, APTT, Fibrinogen)</td>
                                                    <td><span className="font-monospace text-muted">ORD-2026-0842</span></td>
                                                    <td><span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Đã Duyệt KQ</span></td>
                                                    <td><span className="badge bg-primary-subtle text-primary border px-2 py-1">Chỉ số ổn định</span></td>
                                                    <td className="text-end"><a href="/profile" className="btn btn-sm btn-outline-primary py-0 px-2">Xem KQ</a></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>10/10/2026</strong></td>
                                                    <td className="fw-semibold text-dark">Kiểm tra đường huyết & Men gan (Glucose, HbA1c, AST, ALT)</td>
                                                    <td><span className="font-monospace text-muted">ORD-2026-0790</span></td>
                                                    <td><span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Đã Duyệt KQ</span></td>
                                                    <td><span className="badge bg-warning-subtle text-warning border px-2 py-1">Men gan hơi cao</span></td>
                                                    <td className="text-end"><a href="/profile" className="btn btn-sm btn-outline-primary py-0 px-2">Xem KQ</a></td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                                <span className="text-muted small">Cần tư vấn thêm kết quả? Liên hệ Bác Sĩ trực ca qua Hotline <strong>1900 6868</strong></span>
                                <a href="/profile" className="btn btn-primary btn-sm px-3">Xem Toàn Bộ Hồ Sơ Bệnh Án →</a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: LỊCH SỬ THANH TOÁN */}
            {showPaymentModal && (
                <div className="bms-modal-backdrop" onClick={() => setShowPaymentModal(false)}>
                    <div className="bms-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="bms-modal-head">
                            <h3 className="bms-modal-title">
                                <FaFileInvoiceDollar className="text-success" /> Lịch Sử Hóa Đơn & Thanh Toán - {user?.fullName || "Bệnh Nhân"}
                            </h3>
                            <button type="button" className="bms-modal-close" onClick={() => setShowPaymentModal(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="bms-modal-body">
                            <div className="row g-3 mb-3">
                                <div className="col-sm-4">
                                    <div className="p-3 bg-light rounded-3 border">
                                        <div className="text-muted small">Tổng chi phí xét nghiệm</div>
                                        <h4 className="fw-bold text-primary mb-0 mt-1">2.450.000 đ</h4>
                                    </div>
                                </div>
                                <div className="col-sm-4">
                                    <div className="p-3 bg-light rounded-3 border">
                                        <div className="text-muted small">Đã thanh toán (VNPay / POS)</div>
                                        <h4 className="fw-bold text-success mb-0 mt-1">2.450.000 đ</h4>
                                    </div>
                                </div>
                                <div className="col-sm-4">
                                    <div className="p-3 bg-light rounded-3 border">
                                        <div className="text-muted small">Công nợ hiện tại</div>
                                        <h4 className="fw-bold text-muted mb-0 mt-1">0 đ</h4>
                                    </div>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr className="small text-muted text-uppercase">
                                            <th>Thời Gian</th>
                                            <th>Mã Hóa Đơn</th>
                                            <th>Gói Dịch Vụ</th>
                                            <th>Phương Thức</th>
                                            <th>Số Tiền</th>
                                            <th className="text-end">Trạng Thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        <tr>
                                            <td>17/10/2026 08:35</td>
                                            <td><span className="font-monospace fw-semibold text-primary">INV-2026-0881</span></td>
                                            <td>Gói Xét Nghiệm Tổng Quát Chuyên Sâu</td>
                                            <td><span className="badge bg-light text-dark border">Cổng VNPay QR</span></td>
                                            <td className="fw-bold text-dark">1.250.000 đ</td>
                                            <td className="text-end"><span className="badge bg-success text-white px-2 py-1">Đã Thanh Toán</span></td>
                                        </tr>
                                        <tr>
                                            <td>15/10/2026 09:12</td>
                                            <td><span className="font-monospace fw-semibold text-primary">INV-2026-0842</span></td>
                                            <td>Gói Tầm Soát Rối Loạn Đông Máu</td>
                                            <td><span className="badge bg-light text-dark border">Thẻ POS Tại Quầy</span></td>
                                            <td className="fw-bold text-dark">750.000 đ</td>
                                            <td className="text-end"><span className="badge bg-success text-white px-2 py-1">Đã Thanh Toán</span></td>
                                        </tr>
                                        <tr>
                                            <td>10/10/2026 14:20</td>
                                            <td><span className="font-monospace fw-semibold text-primary">INV-2026-0790</span></td>
                                            <td>Gói Kiểm Tra Đường Huyết & Chức Năng Gan</td>
                                            <td><span className="badge bg-light text-dark border">Tiền Mặt</span></td>
                                            <td className="fw-bold text-dark">450.000 đ</td>
                                            <td className="text-end"><span className="badge bg-success text-white px-2 py-1">Đã Thanh Toán</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                                <span className="text-muted small">Hóa đơn điện tử VAT (e-Invoice) đã được tự động gửi về email của quý khách.</span>
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>In Biên Lai</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: YÊU CẦU ĐĂNG NHẬP ĐỂ ĐẶT LỊCH (GUEST) */}
            {showRequireLoginModal && (
                <div className="bms-modal-backdrop" onClick={() => setShowRequireLoginModal(false)}>
                    <div className="bms-modal-card bms-modal-card-sm" onClick={e => e.stopPropagation()}>
                        <div className="bms-modal-head">
                            <h3 className="bms-modal-title">
                                <FaLock className="text-primary" /> Yêu Cầu Đăng Nhập
                            </h3>
                            <button type="button" className="bms-modal-close" onClick={() => setShowRequireLoginModal(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="bms-modal-body text-center py-4">
                            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eff6ff", color: "#1e40af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
                                <FaLock />
                            </div>
                            <h4 className="fw-bold text-dark mb-2">Đăng Nhập Để Đặt Lịch Xét Nghiệm</h4>
                            <p className="text-secondary small mb-4" style={{ lineHeight: 1.6 }}>
                                Quý khách đang chọn: <strong>{bookingPackage?.packageName || "Gói xét nghiệm y khoa"}</strong>.<br />
                                Theo quy chuẩn y tế Bộ Y tế và bảo mật hồ sơ bệnh án ISO 15189, quý khách vui lòng đăng nhập tài khoản Cổng Y Tế BMS để tiến hành đặt hẹn lấy mẫu và tra cứu kết quả bảo mật.
                            </p>
                            <div className="d-grid gap-2">
                                <a 
                                    className="bms-btn bms-btn-primary py-2"
                                    href={`/login?redirect=booking&package=${encodeURIComponent(bookingPackage?.packageName || "")}`}
                                >
                                    Đăng Nhập Cổng Y Tế <FaArrowRight />
                                </a>
                                <a 
                                    className="bms-btn bms-btn-outline py-2"
                                    href="/register"
                                >
                                    Tạo Hồ Sơ Bệnh Nhân Mới
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ĐẶT LỊCH XÉT NGHIỆM TRỰC TUYẾN (LOGGED-IN PATIENT) */}
            {showBookingModal && (
                <div className="bms-modal-backdrop" onClick={() => setShowBookingModal(false)}>
                    <div className="bms-modal-card bms-modal-card-md" onClick={e => e.stopPropagation()}>
                        <div className="bms-modal-head">
                            <h3 className="bms-modal-title">
                                <FaCalendarCheck className="text-primary" /> Đặt Lịch Hẹn Xét Nghiệm - BMS Lab
                            </h3>
                            <button type="button" className="bms-modal-close" onClick={() => setShowBookingModal(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="bms-modal-body">
                            {bookingSuccess ? (
                                <div className="text-center py-3">
                                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
                                        <FaCheckCircle />
                                    </div>
                                    <h4 className="fw-bold text-dark mb-2">Đăng Ký Đặt Lịch Thành Công!</h4>
                                    <p className="text-muted small mb-3">
                                        Mã phiếu hẹn của quý khách: <strong className="font-monospace text-primary fs-5">{bookingCode}</strong>
                                    </p>
                                    <div className="p-3 bg-light rounded-3 text-start small mb-4 border">
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Gói xét nghiệm:</span>
                                            <strong className="text-dark">{bookingPackage?.packageName}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Bệnh nhân:</span>
                                            <strong className="text-dark">{bookingForm.patientName} ({bookingForm.phoneNumber})</strong>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Hình thức:</span>
                                            <strong className="text-dark">{collectionType === "home" ? "Lấy mẫu tại nhà" : "Lấy mẫu tại phòng khám BMS"}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Thời gian hẹn:</span>
                                            <strong className="text-primary">{bookingForm.bookingDate} ({bookingForm.bookingSlot})</strong>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span className="text-muted">Tổng chi phí dự kiến:</span>
                                            <strong className="text-danger fs-6">{new Intl.NumberFormat('vi-VN').format((bookingPackage?.price || 0) + (collectionType === 'home' ? 150000 : 0))} VNĐ</strong>
                                        </div>
                                    </div>
                                    <div className="alert alert-warning text-start small py-2 px-3 mb-4">
                                        <strong><FaShieldAlt className="me-1" /> Hướng dẫn chuẩn bị:</strong> Quý khách vui lòng nhịn ăn sáng tối thiểu 8 giờ trước giờ lấy mẫu để đảm bảo độ chính xác của các chỉ số sinh hóa máu (Glucose, Men gan, Mỡ máu).
                                    </div>
                                    <div className="d-flex gap-2 justify-content-center">
                                        <button 
                                            type="button" 
                                            className="bms-btn bms-btn-outline" 
                                            onClick={() => {
                                                setShowBookingModal(false);
                                                setShowResultsModal(true);
                                            }}
                                        >
                                            <FaHistory /> Xem Lịch Sử Xét Nghiệm
                                        </button>
                                        <button 
                                            type="button" 
                                            className="bms-btn bms-btn-primary" 
                                            onClick={() => setShowBookingModal(false)}
                                        >
                                            Hoàn Tất
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleBookingSubmit}>
                                    <div className="p-3 bg-light rounded-3 mb-3 border">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <h5 className="fw-bold text-dark m-0">{bookingPackage?.packageName}</h5>
                                            <span className="fw-bold text-primary fs-5">{new Intl.NumberFormat('vi-VN').format(bookingPackage?.price || 0)} đ</span>
                                        </div>
                                        <div className="text-muted small d-flex gap-3 mt-2">
                                            <span><FaVial className="text-primary me-1" />{bookingPackage?.sampleTube || "Serum / Máu"}</span>
                                            <span><FaClock className="text-secondary me-1" />Thời gian trả: {bookingPackage?.tat || "60 - 90 Phút"}</span>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="bms-form-label">Hình thức lấy mẫu bệnh phẩm *</label>
                                        <div className="d-flex gap-3">
                                            <label className="d-flex align-items-center gap-2 p-2 px-3 border rounded-3 cursor-pointer" style={{ flex: 1, backgroundColor: collectionType === 'clinic' ? '#eff6ff' : '#fff', borderColor: collectionType === 'clinic' ? '#3b82f6' : '#e2e8f0' }}>
                                                <input 
                                                    type="radio" 
                                                    name="colType" 
                                                    checked={collectionType === 'clinic'} 
                                                    onChange={() => setCollectionType('clinic')} 
                                                />
                                                <div>
                                                    <div className="fw-semibold small text-dark"><FaHospital className="text-primary me-1" /> Tại phòng khám BMS</div>
                                                    <div className="text-muted" style={{ fontSize: '11px' }}>Miễn phí tiền công lấy mẫu</div>
                                                </div>
                                            </label>
                                            <label className="d-flex align-items-center gap-2 p-2 px-3 border rounded-3 cursor-pointer" style={{ flex: 1, backgroundColor: collectionType === 'home' ? '#eff6ff' : '#fff', borderColor: collectionType === 'home' ? '#3b82f6' : '#e2e8f0' }}>
                                                <input 
                                                    type="radio" 
                                                    name="colType" 
                                                    checked={collectionType === 'home'} 
                                                    onChange={() => setCollectionType('home')} 
                                                />
                                                <div>
                                                    <div className="fw-semibold small text-dark">🏠 Tại nhà / Cơ quan</div>
                                                    <div className="text-muted" style={{ fontSize: '11px' }}>Phụ phí điều dưỡng: +150.000 đ</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        <div className="col-sm-6">
                                            <label className="bms-form-label">Họ và tên bệnh nhân *</label>
                                            <input 
                                                type="text" 
                                                className="bms-form-control" 
                                                required 
                                                value={bookingForm.patientName} 
                                                onChange={e => setBookingForm({...bookingForm, patientName: e.target.value})} 
                                            />
                                        </div>
                                        <div className="col-sm-6">
                                            <label className="bms-form-label">Số điện thoại liên hệ *</label>
                                            <input 
                                                type="tel" 
                                                className="bms-form-control" 
                                                required 
                                                value={bookingForm.phoneNumber} 
                                                onChange={e => setBookingForm({...bookingForm, phoneNumber: e.target.value})} 
                                            />
                                        </div>
                                    </div>

                                    {collectionType === 'home' && (
                                        <div className="mb-3">
                                            <label className="bms-form-label">Địa chỉ lấy mẫu tận nơi *</label>
                                            <input 
                                                type="text" 
                                                className="bms-form-control" 
                                                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." 
                                                required={collectionType === 'home'} 
                                                value={bookingForm.address} 
                                                onChange={e => setBookingForm({...bookingForm, address: e.target.value})} 
                                            />
                                        </div>
                                    )}

                                    <div className="row g-2 mb-3">
                                        <div className="col-sm-6">
                                            <label className="bms-form-label">Ngày hẹn lấy mẫu *</label>
                                            <input 
                                                type="date" 
                                                className="bms-form-control" 
                                                min={new Date().toISOString().split("T")[0]} 
                                                required 
                                                value={bookingForm.bookingDate} 
                                                onChange={e => setBookingForm({...bookingForm, bookingDate: e.target.value})} 
                                            />
                                        </div>
                                        <div className="col-sm-6">
                                            <label className="bms-form-label">Khung giờ tiếp nhận *</label>
                                            <select 
                                                className="bms-form-control" 
                                                value={bookingForm.bookingSlot} 
                                                onChange={e => setBookingForm({...bookingForm, bookingSlot: e.target.value})}
                                            >
                                                <option value="07:00 - 08:30">07:00 - 08:30 (Sáng sớm - Nhịn ăn)</option>
                                                <option value="08:30 - 10:00">08:30 - 10:00 (Buổi sáng)</option>
                                                <option value="10:00 - 11:30">10:00 - 11:30 (Buổi trưa)</option>
                                                <option value="13:30 - 15:00">13:30 - 15:00 (Buổi chiều)</option>
                                                <option value="15:00 - 17:00">15:00 - 17:00 (Cuối ngày)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="bms-form-label">Ghi chú y tế / Tiền sử bệnh lý (Nếu có)</label>
                                        <textarea 
                                            className="bms-form-control" 
                                            rows="2" 
                                            placeholder="Ví dụ: Đang dùng thuốc huyết áp, tiền sử đái tháo đường, khó lấy ven..." 
                                            value={bookingForm.notes} 
                                            onChange={e => setBookingForm({...bookingForm, notes: e.target.value})}
                                        />
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                        <div>
                                            <span className="text-muted small">Tổng thanh toán: </span>
                                            <strong className="text-primary fs-5">
                                                {new Intl.NumberFormat('vi-VN').format((bookingPackage?.price || 0) + (collectionType === 'home' ? 150000 : 0))} đ
                                            </strong>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button type="button" className="bms-btn bms-btn-outline" onClick={() => setShowBookingModal(false)}>Hủy</button>
                                            <button type="submit" className="bms-btn bms-btn-primary">
                                                <FaCalendarCheck /> Xác Nhận Đặt Lịch
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. HERO SECTION */}
            <section className="bms-hero-section">
                <div className="bms-hero-container">
                    {/* Left Column: Clinical Value Proposition */}
                    <div className="bms-hero-content">
                        <div className="bms-hero-badge">
                            <FaShieldAlt /> TIÊU CHUẨN ISO 15189:2012 & CHỨNG NHẬN CAP
                        </div>
                        <h2 className="bms-hero-title">
                            Xét Nghiệm Máu Nhanh Chóng, <span>Chính Xác & Đáng Tin Cậy</span>
                        </h2>
                        <p className="bms-hero-desc">
                            Hệ thống phòng lab tự động hóa hoàn toàn với hơn 80+ chỉ số sinh hóa, huyết học và miễn dịch.
                            Kết quả được thẩm định bởi Bác sĩ Chuyên khoa, bảo mật tuyệt đối và trả trực tuyến có chữ ký số chỉ sau 90-120 phút.
                        </p>

                        {/* Search Bar for Test Packages */}
                        <form className="bms-search-bar" onSubmit={handleSearch}>
                            <div className="bms-search-icon">
                                <FaSearch />
                            </div>
                            <input 
                                type="text"
                                className="bms-search-input"
                                placeholder="Tìm gói xét nghiệm (Tổng quát, Men gan, Thận, Tiểu đường, Mỡ máu...)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit" className="bms-search-btn">
                                Tìm Kiếm
                            </button>
                        </form>

                        {/* Trust Metrics Row */}
                        <div className="bms-hero-metrics">
                            <div className="bms-metric-item">
                                <h3>99.9%</h3>
                                <p>Độ chính xác lâm sàng</p>
                            </div>
                            <div className="bms-metric-item">
                                <h3>&lt; 2 Giờ</h3>
                                <p>Trả kết quả online</p>
                            </div>
                            <div className="bms-metric-item">
                                <h3>80+</h3>
                                <p>Chỉ số xét nghiệm</p>
                            </div>
                            <div className="bms-metric-item">
                                <h3>100k+</h3>
                                <p>Bệnh nhân mỗi năm</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Fast Tracking & Appointment Widget */}
                    <div className="bms-utility-card" id="tra-cuu">
                        <div className="bms-utility-header">
                            <h3><FaFileMedicalAlt style={{ color: "#1e40af" }} /> Tra Cứu Kết Quả Xét Nghiệm</h3>
                            <p>Dành cho bệnh nhân đã lấy mẫu tại phòng khám hoặc tại nhà</p>
                        </div>
                        <form onSubmit={handleLookup}>
                            <div className="bms-form-group">
                                <label className="bms-form-label">Mã phiếu hẹn / Mã biên lai *</label>
                                <input 
                                    type="text" 
                                    className="bms-form-control" 
                                    placeholder="Ví dụ: ORD-2026-0881" 
                                    value={lookupCode}
                                    onChange={(e) => setLookupCode(e.target.value)}
                                />
                            </div>
                            <div className="bms-form-group">
                                <label className="bms-form-label">Số điện thoại đăng ký *</label>
                                <input 
                                    type="tel" 
                                    className="bms-form-control" 
                                    placeholder="Ví dụ: 0912 345 678" 
                                    value={lookupPhone}
                                    onChange={(e) => setLookupPhone(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="bms-btn bms-btn-primary" style={{ width: "100%", padding: "12px", marginTop: "8px" }}>
                                <FaSearch /> Tra Cứu Kết Quả Ngay
                            </button>
                        </form>
                        <div className="bms-utility-alert">
                            <FaLock style={{ color: "#059669" }} />
                            <span>Bảo mật theo tiêu chuẩn HIPAA & Quy định Bộ Y tế. Không tiết lộ thông tin bệnh án.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WORKFLOW SECTION: 4 BƯỚC XÉT NGHIỆM */}
            <section className="bms-section" id="quy-trinh">
                <div className="bms-container">
                    <div className="bms-section-header">
                        <div className="bms-section-subtitle">QUY TRÌNH CHUẨN Y KHOA</div>
                        <h3 className="bms-section-title">4 Bước Xét Nghiệm Nhanh Chóng & Tiện Lợi</h3>
                        <p className="bms-section-desc">
                            Quy trình khép kín tối ưu hóa thời gian chờ đợi, đảm bảo vô trùng tuyệt đối từ khâu lấy mẫu đến thẩm định kết quả.
                        </p>
                    </div>

                    <div className="bms-steps-grid">
                        <div className="bms-step-card">
                            <span className="bms-step-number">01</span>
                            <div className="bms-step-icon"><FaCalendarCheck /></div>
                            <h4>1. Đăng Ký Lịch Hẹn</h4>
                            <p>Chọn gói xét nghiệm và khung giờ thuận tiện trực tuyến hoặc qua hotline. Không cần chờ bốc số.</p>
                        </div>
                        <div className="bms-step-card">
                            <span className="bms-step-number">02</span>
                            <div className="bms-step-icon"><FaVial /></div>
                            <h4>2. Lấy Mẫu An Toàn 5 Phút</h4>
                            <p>Sử dụng kim chân không Vacutainer 1 lần vô trùng, kỹ thuật viên tay nghề cao lấy mẫu êm ái, không đau.</p>
                        </div>
                        <div className="bms-step-card">
                            <span className="bms-step-number">03</span>
                            <div className="bms-step-icon"><FaMicroscope /></div>
                            <h4>3. Phân Tích Tự Động Hóa</h4>
                            <p>Hệ thống máy Roche Cobas & Sysmex phân tích tự động, kiểm chuẩn chất lượng nội kiểm IQC hàng ngày.</p>
                        </div>
                        <div className="bms-step-card">
                            <span className="bms-step-number">04</span>
                            <div className="bms-step-icon"><FaFileMedicalAlt /></div>
                            <h4>4. Nhận Kết Quả Online</h4>
                            <p>Nhận kết quả định dạng PDF có chữ ký số bác sĩ chuyên khoa và con dấu đỏ qua tin nhắn SMS & Cổng y tế.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. FEATURED TEST PACKAGES */}
            <section className="bms-section bms-section-alt" id="goi-kham">
                <div className="bms-container">
                    <div className="bms-section-header">
                        <div className="bms-section-subtitle">DANH MỤC DỊCH VỤ NIÊM YẾT & GÓI KHÁM SỨC KHỎE</div>
                        <h3 className="bms-section-title">Các Gói Xét Nghiệm Máu Tiêu Biểu</h3>
                        <p className="bms-section-desc">
                            Bảng giá niêm yết công khai, chi tiết từng chỉ số sinh hóa và huyết học theo tiêu chuẩn Bộ Y tế.
                        </p>
                    </div>

                    <div className="bms-packages-grid">
                        {featuredPackages.length > 0 ? (
                            featuredPackages.map((pkg, idx) => (
                                <div key={pkg.id || idx} className={`bms-package-card ${idx === 0 ? 'featured' : ''}`}>
                                    {idx === 0 && <div className="bms-package-ribbon">Phổ biến nhất</div>}
                                    <div className="bms-package-body">
                                        <h4 className="bms-package-title">{pkg.packageName}</h4>
                                        <p className="bms-package-summary">{pkg.description || 'Gói xét nghiệm y khoa đạt chuẩn ISO 15189 tại phòng xét nghiệm BMS.'}</p>
                                        <div className="bms-package-meta">
                                            <div className="bms-meta-row">
                                                <span className="bms-meta-label">Chuyên khoa:</span>
                                                <span className="bms-meta-val">{pkg.category || 'Sinh hóa'}</span>
                                            </div>
                                            <div className="bms-meta-row">
                                                <span className="bms-meta-label">Mẫu bệnh phẩm:</span>
                                                <span className="bms-meta-val">{pkg.sampleTube || 'Serum / Máu'}</span>
                                            </div>
                                            <div className="bms-meta-row">
                                                <span className="bms-meta-label">Thời gian trả:</span>
                                                <span className="bms-meta-val">{pkg.tat || '60 - 90 Phút'}</span>
                                            </div>
                                        </div>
                                        <div className="bms-package-price">
                                            <span className="bms-price-val">{new Intl.NumberFormat('vi-VN').format(pkg.price || 0)}</span>
                                            <span className="bms-price-unit">VNĐ</span>
                                        </div>
                                        <div className="bms-package-actions">
                                            <a className="bms-btn bms-btn-outline" href={`/services?search=${encodeURIComponent(pkg.packageName || "")}`}>
                                                Xem Chi Tiết
                                            </a>
                                            <button 
                                                type="button" 
                                                className={`bms-btn ${idx === 0 ? 'bms-btn-primary' : 'bms-btn-outline'}`}
                                                onClick={() => handleBookPackage(pkg)}
                                            >
                                                <FaCalendarCheck /> Đặt Lịch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 w-100 text-muted">
                                Đang tải danh mục gói khám từ hệ thống...
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 6. TRUST & ACCREDITATION SECTION */}
            <section className="bms-section" id="cam-ket">
                <div className="bms-container">
                    <div className="bms-section-header">
                        <div className="bms-section-subtitle">CAM KẾT CHẤT LƯỢNG LÂM SÀNG</div>
                        <h3 className="bms-section-title">Hệ Thống Kiểm Chuẩn Đạt Chuẩn Y Khoa</h3>
                        <p className="bms-section-desc">
                            Mỗi mẫu xét nghiệm đều trải qua chu trình kiểm soát chất lượng nghiêm ngặt trước khi trả cho bệnh nhân.
                        </p>
                    </div>

                    <div className="bms-trust-grid">
                        <div className="bms-trust-card">
                            <div className="bms-trust-icon"><FaShieldAlt /></div>
                            <div className="bms-trust-text">
                                <h4>Nội Kiểm IQC Hàng Ngày</h4>
                                <p>Áp dụng 6 quy tắc Westgard nghiêm ngặt cho từng lô xét nghiệm, loại bỏ hoàn toàn sai số hệ thống.</p>
                            </div>
                        </div>
                        <div className="bms-trust-card">
                            <div className="bms-trust-icon"><FaMicroscope /></div>
                            <div className="bms-trust-text">
                                <h4>Thiết Bị Tự Động Hóa 100%</h4>
                                <p>Trang bị dàn máy Roche Cobas và Sysmex thế hệ mới nhất, kết nối trực tiếp với phần mềm LIS hai chiều.</p>
                            </div>
                        </div>
                        <div className="bms-trust-card">
                            <div className="bms-trust-icon"><FaUserMd /></div>
                            <div className="bms-trust-text">
                                <h4>Thẩm Định Bởi Bác Sĩ Chuyên Khoa</h4>
                                <p>100% phiếu kết quả đều được bác sĩ chuyên khoa xét nghiệm duyệt, ký số và đưa ra lời khuyên y khoa hữu ích.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. MEDICAL FOOTER */}
            <footer className="bms-footer">
                <div className="bms-container">
                    <div className="bms-footer-grid">
                        <div className="bms-footer-col">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <div style={{ width: 44, height: 44, background: '#fff', borderRadius: 8, padding: 3, overflow: 'hidden', flexShrink: 0 }}>
                                    <img src="/assets/bms-logo.png" alt="BMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <h4 className="m-0 text-white" style={{ fontSize: '15px' }}>TRUNG TÂM XÉT NGHIỆM Y KHOA BMS</h4>
                            </div>
                            <p>Đơn vị y tế chuyên sâu trong lĩnh vực xét nghiệm huyết học, sinh hóa, miễn dịch và sàng lọc sớm bệnh lý.</p>
                            <p><strong>Giấy phép hoạt động:</strong> 08892/BYT-GPHĐ cấp bởi Bộ Y tế.</p>
                            <p><strong>Địa chỉ:</strong> Tầng 1 - 2, Tòa nhà Kỹ thuật cao, TP. Hồ Chí Minh.</p>
                        </div>
                        <div className="bms-footer-col">
                            <h4>Dịch Vụ Xét Nghiệm</h4>
                            <ul className="bms-footer-links">
                                <li><a href="/services">Tầm soát tổng quát định kỳ</a></li>
                                <li><a href="/services">Xét nghiệm chức năng gan - thận</a></li>
                                <li><a href="/services">Tầm soát đái tháo đường</a></li>
                                <li><a href="/services">Dấu ấn ung thư sớm</a></li>
                                <li><a href="/services">Dịch vụ lấy mẫu tại nhà</a></li>
                            </ul>
                        </div>
                        <div className="bms-footer-col">
                            <h4>Dành Cho Bệnh Nhân</h4>
                            <ul className="bms-footer-links">
                                <li><a href="#tra-cuu">Tra cứu kết quả online</a></li>
                                <li><a href="#quy-trinh">Hướng dẫn nhịn ăn trước khi lấy máu</a></li>
                                <li><a href="/login">Đăng nhập tài khoản bệnh nhân</a></li>
                                <li><a href="/register">Đăng ký hồ sơ y tế</a></li>
                                <li><a href="/privacy">Chính sách bảo mật bệnh án (HIPAA)</a></li>
                            </ul>
                        </div>
                        <div className="bms-footer-col">
                            <h4>Hỗ Trợ Y Tế 24/7</h4>
                            <p><strong>Hotline:</strong> 1900 6868</p>
                            <p><strong>Cấp cứu / Khẩn cấp:</strong> 028 3822 5588</p>
                            <p><strong>Email chuyên môn:</strong> bms.mec.lab@gmail.com</p>
                            <p><strong>Thời gian làm việc:</strong> 06:00 - 20:00 (Hàng ngày)</p>
                        </div>
                    </div>

                    <div className="bms-footer-bottom">
                        <div>&copy; 2026 BMS Health - Blood Laboratory Management System. All rights reserved.</div>
                        <div>Tuân thủ tiêu chuẩn ISO 15189:2012 & Bảo mật thông tin y tế Bộ Y tế</div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/**
 * Root application component configuring top-level client-side routing.
 *
 * @returns {JSX.Element} Application router hierarchy.
 */
function App() {
    return (
        <Router>
            <Routes>
                {/* Public pages */}
                <Route path="/" element={<HomePage />} />
                <Route path="/services" element={<ServiceCatalogPage />} />
                <Route path="/catalog" element={<ServiceCatalogPage />} />
                <Route path="/patient" element={<Navigate to="/" replace />} />
                <Route path="/tracking" element={<TrackTestProgressPage />} />
                <Route path="/tracking/:identifier" element={<TrackTestProgressPage />} />

                {/* Authentication Workflows */}
                <Route element={<AuthLayout />}>
                    <Route
                        path="/login"
                        element={
                            <LoginPage
                                onBack={() => {
                                    window.location.href = "/";
                                }}
                                onRegister={() => {
                                    window.location.href = "/register";
                                }}
                                onForgotPassword={() => {
                                    window.location.href = "/forgot-password";
                                }}
                            />
                        }
                    />

                    <Route
                        path="/register"
                        element={<Register />}
                    />

                    <Route
                        path="/forgot-password"
                        element={
                            <ForgotPassword
                                onBackToLogin={() => {
                                    window.location.href = "/login";
                                }}
                                onRegister={() => {
                                    window.location.href = "/register";
                                }}
                                onOtpSent={(email, result) => {
                                    console.log(
                                        "OTP đã được yêu cầu cho:",
                                        email,
                                        result
                                    );
                                }}
                            />
                        }
                    />
                </Route>

                {/* Standalone Fullscreen Smart Queue Kiosk Board */}
                <Route
                    path="/reception/queue-board"
                    element={<PublicQueueBoardPage />}
                />

                {/* Authenticated Clinical, Patient, Lab & Admin Workflows */}
                <Route element={<MainLayout />}>
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "WarehouseStaff", "LabHead", "LabTech"]} />}>
                        <Route path="/inventory" element={<InventoryPage />} />
                    </Route>
                    <Route element={<ProtectedRoute allowedRoles={["Doctor"]} />}>
                        <Route path="/doctor/medical-notes" element={<AddMedicalNotesPage />} />
                    </Route>
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "LabHead"]} />}>
                        <Route path="/laboratory/lab-profiles" element={<LabProfilesPage />} />
                    </Route>
                    {/* All Authenticated Roles - Dashboard, Profile, Password */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "LabHead", "LabTech", "Nurse", "Phlebotomist", "WarehouseStaff", "Receptionist", "Cashier", "Patient"]} />}>
                        <Route
                            path="/dashboard"
                            element={<RoleBasedDashboard />}
                        />
                        <Route
                            path="/profile"
                            element={<UserProfilePage />}
                        />
                        <Route
                            path="/change-password"
                            element={
                                <div className="container py-4">
                                    <div className="row justify-content-center">
                                        <div className="col-md-7">
                                            <ChangePassword />
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                        <Route
                            path="/appointments/book"
                            element={<BookAppointmentPage />}
                        />
                        <Route
                            path="/appointments"
                            element={<AppointmentListPage />}
                        />
                        <Route
                            path="/appointments/:id/confirmation"
                            element={<AppointmentConfirmationPage />}
                        />
                        <Route
                            path="/appointments/confirmation"
                            element={<AppointmentConfirmationPage />}
                        />
                        <Route
                            path="/shifts/view"
                            element={<ViewShiftsPage />}
                        />
                        <Route
                            path="/results/:orderId/report"
                            element={<TestReportPage />}
                        />
                        <Route
                            path="/reports/:orderId"
                            element={<TestReportPage />}
                        />
                        <Route
                            path="/reports"
                            element={<TestReportPage />}
                        />
                        <Route
                            path="/patient/results/:orderId"
                            element={<TestReportPage />}
                        />
                        <Route
                            path="/payments/checkout"
                            element={<ProcessPaymentPage />}
                        />
                        <Route
                            path="/payments/checkout/:invoiceId"
                            element={<ProcessPaymentPage />}
                        />
                        <Route
                            path="/patient/payments/checkout"
                            element={<ProcessPaymentPage />}
                        />
                        <Route
                            path="/patient/results"
                            element={<ExportTestResultPdfPage />}
                        />
                        <Route
                            path="/patient/results/export"
                            element={<ExportTestResultPdfPage />}
                        />
                        <Route
                            path="/patient/results/export/:orderId"
                            element={<ExportTestResultPdfPage />}
                        />
                        <Route
                            path="/results/export/:orderId"
                            element={<ExportTestResultPdfPage />}
                        />
                        <Route
                            path="/patient/tracking"
                            element={<TrackTestProgressPage />}
                        />
                        <Route
                            path="/patient/tracking/:identifier"
                            element={<TrackTestProgressPage />}
                        />
                    </Route>

                    {/* Patient Information & Guest Profile Creation (View Patient Info & Create Guest Profile) */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "LabHead", "LabTech", "Receptionist", "Cashier"]} />}>
                        <Route
                            path="/patients"
                            element={<CheckInPage />}
                        />
                        <Route
                            path="/reception/checkin"
                            element={<CheckInPage />}
                        />
                        <Route
                            path="/reception/patients"
                            element={<CheckInPage />}
                        />
                        <Route
                            path="/reception/register-walkin"
                            element={<RegisterWalkInPatientPage />}
                        />
                        <Route
                            path="/doctor/console"
                            element={<DoctorConsolePage />}
                        />
                        <Route
                            path="/reception/console"
                            element={<DoctorConsolePage />}
                        />
                        <Route
                            path="/doctor/emr"
                            element={<MedicalRecordPage />}
                        />
                        <Route
                            path="/medical-records"
                            element={<MedicalRecordPage />}
                        />
                        <Route
                            path="/doctor/assessments"
                            element={<MedicalAssessmentListPage />}
                        />
                        <Route
                            path="/doctor/assessments/add"
                            element={<AddMedicalAssessmentPage />}
                        />
                        <Route
                            path="/doctor/assessments/:id/edit"
                            element={<AddMedicalAssessmentPage />}
                        />
                        <Route
                            path="/medical-assessments"
                            element={<MedicalAssessmentListPage />}
                        />
                        <Route
                            path="/medical-assessments/add"
                            element={<AddMedicalAssessmentPage />}
                        />
                        <Route
                            path="/medical-assessments/:id/edit"
                            element={<AddMedicalAssessmentPage />}
                        />
                        <Route
                            path="/medical-assessments/:id"
                            element={<AddMedicalAssessmentPage />}
                        />
                        <Route
                            path="/reception/queue"
                            element={<QueueBoardPage />}
                        />
                        <Route
                            path="/queue"
                            element={<QueueBoardPage />}
                        />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "LabHead", "LabTech", "Nurse", "Phlebotomist", "Receptionist", "Patient"]} />}>
                        <Route path="/laboratory/sample-timeline" element={<SampleTimelinePage />} />
                    </Route>
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "LabHead", "LabTech", "Patient"]} />}>
                        <Route path="/patient/test-history" element={<TestHistoryPage />} />
                    </Route>
                    {/* Lab Operations - Lab Queue, Record Sample Time & Update Sample Status */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "LabHead", "LabTech", "Doctor", "Receptionist"]} />}>
                        <Route
                            path="/lab/queue"
                            element={<SampleQueuePage />}
                        />
                        <Route
                            path="/laboratory/samples"
                            element={<SampleQueuePage />}
                        />
                        <Route
                            path="/laboratory/checkinsample"
                            element={<CheckInSamplePage />}
                        />
                        <Route
                            path="/laboratory/enter-test-results"
                            element={<EnterTestResultsPage />}
                        />
                        <Route
                            path="/laboratory/batches"
                            element={<TestBatchManagementPage />}
                        />
                        <Route
                            path="/lab/batches"
                            element={<TestBatchManagementPage />}
                        />
                        <Route
                            path="/laboratory/sample-list"
                            element={<SampleListPage />}
                        />
                        <Route
                            path="/laboratory/sample-intake/create-list"
                            element={<SampleListPage />}
                        />
                        <Route
                            path="/laboratory/rerun-requests"
                            element={<SampleRerunPage />}
                        />
                        <Route
                            path="/laboratory/samples/request-rerun"
                            element={<SampleRerunPage />}
                        />
                        <Route
                            path="/laboratory/samples/:id/rerun"
                            element={<SampleRerunPage />}
                        />
                        <Route
                            path="/laboratory/test-notes"
                            element={<AddTestNotePage />}
                        />
                        <Route
                            path="/laboratory/test-notes/add"
                            element={<AddTestNotePage />}
                        />
                        <Route
                            path="/laboratory/specimens/:specimenId/notes"
                            element={<AddTestNotePage />}
                        />
                        <Route
                            path="/laboratory/verify-results"
                            element={<VerifyTestResultsPage />}
                        />
                        <Route
                            path="/laboratory/verify-results/:specimenId"
                            element={<VerifyTestResultsPage />}
                        />
                        <Route
                            path="/laboratory/verification"
                            element={<VerifyTestResultsPage />}
                        />
                        <Route
                            path="/laboratory/notifications"
                            element={<NotifyTestResultsPage />}
                        />
                        <Route
                            path="/laboratory/notify-results"
                            element={<NotifyTestResultsPage />}
                        />
                        <Route
                            path="/laboratory/specimens/history"
                            element={<SpecimenHistoryPage />}
                        />
                        <Route
                            path="/laboratory/specimen-history"
                            element={<SpecimenHistoryPage />}
                        />
                        <Route
                            path="/specimens/history"
                            element={<SpecimenHistoryPage />}
                        />
                        <Route
                            path="/laboratory/trace"
                            element={<TraceSampleOriginPage />}
                        />
                        <Route
                            path="/laboratory/trace/:specimenId"
                            element={<TraceSampleOriginPage />}
                        />
                        <Route
                            path="/laboratory/sample-trace"
                            element={<TraceSampleOriginPage />}
                        />
                    </Route>

                    {/* Medical Criteria - Admin, Manager, LabHead, LabTech, Doctor */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "LabHead", "LabTech", "Doctor"]} />}>
                        <Route
                            path="/criteria"
                            element={<TestCriteriaPage />}
                        />
                        <Route
                            path="/laboratory/criteria"
                            element={<TestCriteriaPage />}
                        />
                        <Route
                            path="/laboratory/reference-intervals"
                            element={<ConfigureReferenceIntervalsPage />}
                        />
                        <Route
                            path="/reference-intervals"
                            element={<ConfigureReferenceIntervalsPage />}
                        />
                    </Route>

                    {/* Clinical & Lab Shifts (View, Create, Update, Delete Shifts) */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "Receptionist", "LabHead", "LabTech"]} />}>
                        <Route
                            path="/schedule"
                            element={<DoctorSchedulePage />}
                        />
                        <Route
                            path="/shifts"
                            element={<DoctorSchedulePage />}
                        />
                        <Route
                            path="/doctor/schedule"
                            element={<DoctorSchedulePage />}
                        />
                        <Route
                            path="/doctor/orders/create"
                            element={<CreateTestOrderPage />}
                        />
                        <Route
                            path="/doctor/test-orders/create"
                            element={<CreateTestOrderPage />}
                        />
                        <Route
                            path="/clinical/test-orders/create"
                            element={<CreateTestOrderPage />}
                        />
                    </Route>

                    {/* Service Packages - Admin, Manager (Full CRUD) and Clinical Staff (Catalog Lookup) */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "Receptionist", "Cashier"]} />}>
                        <Route
                            path="/admin/packages"
                            element={<ServicePackagesPage />}
                        />
                        <Route
                            path="/packages"
                            element={<ServicePackagesPage />}
                        />
                    </Route>

                    {/* Medical Billing & POS Receipts (UC43) */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Cashier", "Receptionist"]} />}>
                        <Route
                            path="/billing/invoices"
                            element={<BillingInvoicesPage />}
                        />
                        <Route
                            path="/billing/receipts"
                            element={<BillingInvoicesPage />}
                        />
                        <Route
                            path="/invoices"
                            element={<BillingInvoicesPage />}
                        />
                    </Route>

                     {/* Admin & Doctor Only */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager"]} />}>
                        <Route
                            path="/manage/schedule"
                            element={<ScheduleManagementPage />}
                        />
                        <Route
                            path="/manager/iot-thresholds"
                            element={<ConfigureIotThresholdsPage />}
                        />
                        <Route
                            path="/monitoring/iot-thresholds"
                            element={<ConfigureIotThresholdsPage />}
                        />
                        <Route
                            path="/iot/thresholds"
                            element={<ConfigureIotThresholdsPage />}
                        />
                    </Route>

                    {/* Admin & Manager Only - Employees */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager"]} />}>
                        <Route
                            path="/admin/employees"
                            element={<UserManagementPage />}
                        />
                        <Route
                            path="/admin/users"
                            element={<UserManagementPage />}
                        />
                        <Route
                            path="/users"
                            element={<UserManagementPage />}
                        />
                    </Route>

                    {/* System Administrator Only - Roles Management */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                        <Route
                            path="/roles"
                            element={<RolesManagementPage />}
                        />
                    </Route>

                    {/* Database Backup & Restore - Admin, Manager, LabHead (UC80) */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "LabHead"]} />}>
                        <Route
                            path="/admin/backup"
                            element={<BackupManagementPage />}
                        />
                        <Route
                            path="/admin/backups"
                            element={<BackupManagementPage />}
                        />
                        <Route
                            path="/backup"
                            element={<BackupManagementPage />}
                        />
                        <Route
                            path="/laboratory/backup"
                            element={<BackupManagementPage />}
                        />
                    </Route>

                    {/* UC53: Calculate Fees */}
                    <Route
                        path="/calculate-fees"
                        element={<CalculateFeesPage />}
                    />
                    <Route
                        path="/fee-calculator"
                        element={<CalculateFeesPage />}
                    />
                    <Route
                        path="/billing/calculate-fee"
                        element={<CalculateFeesPage />}
                    />
                    <Route
                        path="/patient/fee-calculator"
                        element={<CalculateFeesPage />}
                    />

                    {/* UC58: Push Notifications Dispatcher & Audit Logs */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "LabHead"]} />}>
                        <Route
                            path="/notifications/dispatch"
                            element={<PushNotificationCenterPage />}
                        />
                        <Route
                            path="/admin/notifications"
                            element={<PushNotificationCenterPage />}
                        />
                    </Route>

                    {/* UC63: Turnaround Time (TAT) Analytics */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "LabHead"]} />}>
                        <Route
                            path="/reports/tat"
                            element={<TatStatisticsDashboardPage />}
                        />
                        <Route
                            path="/tat/statistics"
                            element={<TatStatisticsDashboardPage />}
                        />
                        <Route
                            path="/laboratory/tat-statistics"
                            element={<TatStatisticsDashboardPage />}
                        />
                        <Route
                            path="/admin/tat-statistics"
                            element={<TatStatisticsDashboardPage />}
                        />
                    </Route>

                    {/* UC68: Environmental Alert Threshold Violations */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "LabHead"]} />}>
                        <Route
                            path="/alerts/threshold-violations"
                            element={<AlertThresholdViolationPage />}
                        />
                        <Route
                            path="/iot/alerts"
                            element={<AlertThresholdViolationPage />}
                        />
                        <Route
                            path="/iot/threshold-violations"
                            element={<AlertThresholdViolationPage />}
                        />
                        <Route
                            path="/admin/alerts"
                            element={<AlertThresholdViolationPage />}
                        />
                    </Route>

                    {/* UC73: Laboratory QC & Westgard Multi-Rule Evaluation */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "LabHead", "Doctor"]} />}>
                        <Route
                            path="/qc/management"
                            element={<QualityControlManagementPage />}
                        />
                        <Route
                            path="/laboratory/qc-westgard"
                            element={<QualityControlManagementPage />}
                        />
                        <Route
                            path="/qc-management"
                            element={<QualityControlManagementPage />}
                        />
                    </Route>

                    {/* UC78: Laboratory Revenue & Financial Analytics */}
                    <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager", "Doctor", "LabHead"]} />}>
                        <Route
                            path="/reports/revenue"
                            element={<RevenueReportPage />}
                        />
                        <Route
                            path="/admin/revenue-report"
                            element={<RevenueReportPage />}
                        />
                        <Route
                            path="/manager/revenue"
                            element={<RevenueReportPage />}
                        />
                    </Route>
                </Route>

                {/* 404 Not Found Page */}
                <Route
                    path="*"
                    element={<NotFound404 />}
                />
            </Routes>
        </Router>
    );
}

export default App;
