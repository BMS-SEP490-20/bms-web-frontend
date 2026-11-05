/**
 * @file Sidebar.jsx - BMS Strict Role-Based Navigation Sidebar (RBAC Separation of Duties)
 * Conforms to: Production Medical Standards ISO 15189, ROLE-PERMISSION-MATRIX & AGENTS-DESIGN.md
 */

import React, { useMemo } from 'react';
import { Nav, OverlayTrigger, Tooltip, Badge, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt, FaVial, FaUserMd, FaStethoscope, FaUsersCog,
  FaShieldAlt, FaBoxOpen, FaNotesMedical, FaKey, FaChevronLeft, FaChevronRight,
  FaHeartbeat, FaDatabase, FaBell, FaHistory, FaQrcode, FaUserPlus, FaCheckCircle,
  FaDoorOpen, FaFlask, FaStar, FaReceipt, FaChartBar, FaClock, FaUsers, FaUserCog, FaTimes, FaCalendarAlt, FaSearch
} from 'react-icons/fa';

import { ROLES, ROLE_LABELS, ALL_ROLES, resolveRoleId } from '../../constants/roles';

const { ADMIN, MANAGER, LAB, DOCTOR, RECEPTIONIST, PATIENT } = ROLES;

/**
 * Strict Role-Permission Matrix (Separation of Duties):
 * - ADMIN: System infrastructure, IAM accounts, roles RBAC, audit, database backup, packages. NO clinical data.
 * - MANAGER: High-level medical oversight: result sign-off, QC review, reports (TAT/Revenue), lab config, roster.
 * - LAB: Laboratory operations: sample queue, check-in, results entry, batches, QC Westgard, reagents.
 * - DOCTOR: Clinical patient care: examination console, blood test order creation, EMR, ICD-10 assessment.
 * - RECEPTIONIST: Front-desk patient intake: QR check-in, queue board, patient creation, fee calculation, invoices.
 * - PATIENT: Patient portal: self appointments, sample tracking, test history, packages, feedback.
 */
const MENU_SECTIONS = [
  // ================= ADMIN SECTIONS =================
  {
    category: 'QUẢN TRỊ HỆ THỐNG',
    roles: [ADMIN],
    items: [
      { id: 'admin-dash', path: '/dashboard', label: 'Bảng Điều Khiển Admin', icon: FaTachometerAlt, roles: [ADMIN] },
      { id: 'admin-users', path: '/admin/user-management', label: 'Quản Lý Tài Khoản (IAM)', icon: FaUserCog, roles: [ADMIN] },
      { id: 'admin-roles', path: '/roles', label: 'Phân Quyền Vai Trò (RBAC)', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-audit', path: '/admin/audit-logs', label: 'Nhật Ký Audit Hệ Thống', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-backup', path: '/admin/backup', label: 'Sao Lưu & Khôi Phục Dữ Liệu', icon: FaDatabase, roles: [ADMIN], badge: { text: 'UC80', bg: 'primary' } },
      { id: 'admin-packages', path: '/admin/packages', label: 'Danh Mục Gói Dịch Vụ', icon: FaBoxOpen, roles: [ADMIN] },
      { id: 'admin-shifts', path: '/manage/schedule', label: 'Phân Bổ Ca Trực', icon: FaClock, roles: [ADMIN] },
      { id: 'admin-view-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Toàn Viện', icon: FaClock, roles: [ADMIN] },
      { id: 'admin-rev', path: '/reports/revenue', label: 'Báo Cáo Doanh Thu Viện Phí', icon: FaChartBar, roles: [ADMIN] },
      { id: 'admin-tat', path: '/reports/tat', label: 'Thống Kê Thời Gian TAT', icon: FaChartBar, roles: [ADMIN] }
    ]
  },

  // ================= MANAGER SECTIONS =================
  {
    category: 'QUẢN LÝ & BÁO CÁO',
    roles: [MANAGER],
    items: [
      { id: 'mgr-dash', path: '/dashboard', label: 'Bảng Điều Khiển Tổng Quan', icon: FaTachometerAlt, roles: [MANAGER] },
      { id: 'mgr-approval', path: '/laboratory/verify-results', label: 'Duyệt & Ký Số Kết Quả', icon: FaCheckCircle, roles: [MANAGER], badge: { text: 'Duyệt', bg: 'warning' } },
      { id: 'mgr-tat', path: '/reports/tat', label: 'Báo Cáo Hiệu Suất TAT', icon: FaChartBar, roles: [MANAGER], badge: { text: 'UC63', bg: 'info' } },
      { id: 'mgr-revenue', path: '/reports/revenue', label: 'Báo Cáo Doanh Thu Viện Phí', icon: FaChartBar, roles: [MANAGER], badge: { text: 'UC78', bg: 'success' } },
      { id: 'mgr-search-packages', path: '/services', label: 'Tra Cứu Gói XN', icon: FaSearch, roles: [MANAGER], badge: { text: 'UC20', bg: 'info' } },
      { id: 'mgr-feedback', path: '/feedback', label: 'Đánh Giá & Khảo Sát Bệnh Nhân', icon: FaStar, roles: [MANAGER] },
      { id: 'mgr-notifications', path: '/laboratory/notifications', label: 'Cảnh Báo & Thông Báo Khẩn', icon: FaBell, roles: [MANAGER], badge: { text: 'UC60', bg: 'primary' } }
    ]
  },
  {
    category: 'GIÁM SÁT LAB & CẤU HÌNH Y TẾ',
    roles: [MANAGER],
    items: [
      { id: 'mgr-lab-queue', path: '/lab/queue', label: 'Giám Sát Hàng Đợi Mẫu', icon: FaVial, roles: [MANAGER], badge: { text: 'UC40/45', bg: 'danger' } },
      { id: 'mgr-validate', path: '/lab-user/validate-sample', label: 'Kiểm Chuẩn Mẫu Tiền Phân Tích', icon: FaVial, roles: [MANAGER], badge: { text: 'QC', bg: 'warning' } },
      { id: 'mgr-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (QC)', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-westgard', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn Westgard', icon: FaFlask, roles: [MANAGER], badge: { text: 'Flags', bg: 'danger' } },
      { id: 'mgr-criteria', path: '/criteria', label: 'Danh Mục Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [MANAGER] },
      { id: 'mgr-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu Y Tế', icon: FaHeartbeat, roles: [MANAGER], badge: { text: 'UC57', bg: 'success' } },
      { id: 'mgr-biochem', path: '/laboratory/biochemical-results', label: 'Tra Cứu Kết Quả Sinh Hóa', icon: FaFlask, roles: [MANAGER], badge: { text: 'UC75', bg: 'primary' } },
      { id: 'mgr-rooms', path: '/laboratory/rooms', label: 'Phòng Xét Nghiệm & Lấy Mẫu', icon: FaDoorOpen, roles: [MANAGER] },
      { id: 'mgr-profiles', path: '/laboratory/lab-profiles', label: 'Hồ Sơ Kỹ Thuật Máy Lab', icon: FaUsersCog, roles: [MANAGER], badge: { text: 'UC61', bg: 'primary' } },
      { id: 'mgr-iot', path: '/manager/iot-thresholds', label: 'Cảm Biến IoT & Tủ Trữ Mẫu', icon: FaHeartbeat, roles: [MANAGER] },
      { id: 'mgr-schedule', path: '/manage/schedule', label: 'Phân Bổ & Xếp Lịch Ca Trực', icon: FaClock, roles: [MANAGER], badge: { text: 'UC35', bg: 'primary' } },
      { id: 'mgr-shifts', path: '/shifts/view', label: 'Xem Lịch Ca Trực', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-inventory', path: '/inventory', label: 'Quản Lý Kho Hóa Chất', icon: FaBoxOpen, roles: [MANAGER], badge: { text: 'UC56', bg: 'primary' } },
      { id: 'mgr-invoices', path: '/invoices', label: 'Biên Lai & Hóa Đơn', icon: FaReceipt, roles: [MANAGER] },
      { id: 'mgr-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [MANAGER], badge: { text: 'UC30', bg: 'info' } },
      { id: 'mgr-appointments', path: '/appointments', label: 'Lịch Hẹn Bệnh Nhân', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-assessments', path: '/medical-assessments', label: 'Đánh Giá ICD-10', icon: FaStethoscope, roles: [MANAGER], badge: { text: 'UC50', bg: 'primary' } },
      { id: 'mgr-emr', path: '/doctor/emr', label: 'Tra Cứu Bệnh Án Điện Tử (EMR)', icon: FaNotesMedical, roles: [MANAGER] },
      { id: 'mgr-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [MANAGER] },
      { id: 'mgr-test-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [MANAGER] }
    ]
  },

  // ================= LAB TECHNICIAN SECTIONS =================
  {
    category: 'NGHIỆP VỤ XÉT NGHIỆM',
    roles: [LAB],
    items: [
      { id: 'lab-queue', path: '/lab/queue', label: 'Hàng Đợi Mẫu Bệnh Phẩm', icon: FaVial, roles: [LAB], badge: { text: 'UC40/45', bg: 'danger' } },
      { id: 'lab-checkin', path: '/laboratory/checkinsample', label: 'Tiếp Nhận Ống Mẫu Máu', icon: FaVial, roles: [LAB] },
      { id: 'lab-enter-res', path: '/laboratory/enter-test-results', label: 'Nhập Kết Quả Xét Nghiệm', icon: FaNotesMedical, roles: [LAB] },
      { id: 'lab-batches', path: '/laboratory/batches', label: 'Quản Lý Lô Mẫu Phân Tích', icon: FaFlask, roles: [LAB] },
      { id: 'lab-validate', path: '/lab-user/validate-sample', label: 'Kiểm Chuẩn Mẫu Tiền Phân Tích', icon: FaVial, roles: [LAB], badge: { text: 'QC', bg: 'warning' } },
      { id: 'lab-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (IQC/EQA)', icon: FaFlask, roles: [LAB] },
      { id: 'lab-flags', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn Westgard', icon: FaFlask, roles: [LAB], badge: { text: 'Flags', bg: 'danger' } },
      { id: 'lab-criteria', path: '/criteria', label: 'Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [LAB] },
      { id: 'lab-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu', icon: FaHeartbeat, roles: [LAB], badge: { text: 'UC57', bg: 'success' } },
      { id: 'lab-biochem', path: '/laboratory/biochemical-results', label: 'Tra Cứu Sinh Hóa', icon: FaFlask, roles: [LAB], badge: { text: 'UC75', bg: 'primary' } }
    ]
  },
  {
    category: 'VẬN HÀNH & KHO LAB',
    roles: [LAB],
    items: [
      { id: 'lab-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-test-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-history', path: '/laboratory/specimens/history', label: 'Lịch Sử Mẫu Bệnh Phẩm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-inventory', path: '/inventory', label: 'Quản Lý Kho Hóa Chất & Vật Tư', icon: FaBoxOpen, roles: [LAB], badge: { text: 'UC56', bg: 'primary' } },
      { id: 'lab-patients', path: '/patients', label: 'Tra Cứu Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [LAB], badge: { text: 'UC30', bg: 'info' } },
      { id: 'lab-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [LAB], badge: { text: 'UC35', bg: 'info' } },
      { id: 'lab-notifs', path: '/laboratory/notifications', label: 'Thông Báo Nội Bộ Lab', icon: FaBell, roles: [LAB], badge: { text: 'UC60', bg: 'primary' } }
    ]
  },

  // ================= DOCTOR SECTIONS =================
  {
    category: 'BÀN KHÁM & ĐIỀU TRỊ',
    roles: [DOCTOR],
    items: [
      { id: 'doc-console', path: '/doctor/console', label: 'Bàn Khám Bác Sĩ & Gọi Số', icon: FaStethoscope, roles: [DOCTOR] },
      { id: 'doc-order', path: '/doctor/orders/create', label: 'Chỉ Định Xét Nghiệm Máu', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-emr', path: '/doctor/emr', label: 'Bệnh Án Điện Tử (EMR)', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-assessment', path: '/medical-assessments', label: 'Chẩn Đoán Lâm Sàng (ICD-10)', icon: FaStethoscope, roles: [DOCTOR], badge: { text: 'UC50', bg: 'primary' } },
      { id: 'doc-notes', path: '/doctor/medical-notes', label: 'Ghi Chú Y Khoa Tiến Trình', icon: FaNotesMedical, roles: [DOCTOR], badge: { text: 'UC51', bg: 'primary' } },
      { id: 'doc-criteria', path: '/criteria', label: 'Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu', icon: FaHeartbeat, roles: [DOCTOR] },
      { id: 'doc-biochem', path: '/laboratory/biochemical-results', label: 'Tra Cứu Sinh Hóa', icon: FaFlask, roles: [DOCTOR] }
    ]
  },
  {
    category: 'LỊCH HẸN & THEO DÕI',
    roles: [DOCTOR],
    items: [
      { id: 'doc-appointments', path: '/appointments', label: 'Danh Sách Lịch Hẹn Khám', icon: FaClock, roles: [DOCTOR] },
      { id: 'doc-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [DOCTOR], badge: { text: 'UC30', bg: 'info' } },
      { id: 'doc-patient-hist', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [DOCTOR] },
      { id: 'doc-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [DOCTOR] },
      { id: 'doc-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Bác Sĩ', icon: FaClock, roles: [DOCTOR], badge: { text: 'UC35', bg: 'info' } }
    ]
  },

  // ================= RECEPTIONIST SECTIONS =================
  {
    category: 'TIẾP ĐÓN & ĐIỀU PHỐI BỆNH NHÂN',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-checkin', path: '/receptionist/check-in', label: '1. Quầy Tiếp Đón & Check-in QR', icon: FaQrcode, roles: [RECEPTIONIST], badge: { text: 'QR', bg: 'success' } },
      { id: 'rec-queue', path: '/reception/queue', label: '2. Bảng Gọi Số & Hàng Đợi', icon: FaClock, roles: [RECEPTIONIST] },
      { id: 'rec-create-pt', path: '/receptionist/create-patient', label: '3. Tạo Hồ Sơ Bệnh Nhân (Vãng Lai)', icon: FaUserPlus, roles: [RECEPTIONIST] },
      { id: 'rec-appointments', path: '/appointments', label: '4. Sổ Lịch Hẹn & Khung Giờ', icon: FaCalendarAlt, roles: [RECEPTIONIST] },
      { id: 'rec-patients', path: '/patients', label: '5. Tra Cứu Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [RECEPTIONIST], badge: { text: 'UC30', bg: 'info' } }
    ]
  },
  {
    category: 'VIỆN PHÍ & THU NGÂN',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-invoices', path: '/invoices', label: 'Quầy Thu Viện Phí & Hóa Đơn VAT', icon: FaReceipt, roles: [RECEPTIONIST] },
      { id: 'rec-fees', path: '/calculate-fees', label: 'Tra Cứu Bảng Giá & Dự Toán BHYT', icon: FaReceipt, roles: [RECEPTIONIST] },
      { id: 'rec-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [RECEPTIONIST], badge: { text: 'UC35', bg: 'info' } }
    ]
  },

  // ================= PATIENT SECTION =================
  {
    category: 'CỔNG BỆNH NHÂN',
    roles: [PATIENT],
    items: [
      { id: 'pt-search-packages', path: '/services', label: 'Tra Cứu Gói Xét Nghiệm', icon: FaSearch, roles: [PATIENT], badge: { text: 'UC20', bg: 'info' } },
      { id: 'pt-appointments', path: '/appointments', label: 'Lịch Khám & Hẹn Lấy Mẫu Của Tôi', icon: FaCalendarAlt, roles: [PATIENT] },
      { id: 'pt-tracking', path: '/tracking', label: 'Tiến Trình & Kết Quả', icon: FaHeartbeat, roles: [PATIENT] },
      { id: 'pt-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [PATIENT] },
      { id: 'pt-feedback', path: '/feedback', label: 'Đánh Giá & Góp Ý Y Tế', icon: FaStar, roles: [PATIENT] }
    ]
  },

  // ================= COMMON ACCOUNT SECTION =================
  {
    category: 'TÀI KHOẢN CÁ NHÂN',
    roles: ALL_ROLES,
    items: [
      { id: 'common-profile', path: '/profile', label: 'Thông Tin Tài Khoản', icon: FaUserMd, roles: ALL_ROLES },
      { id: 'common-pwd', path: '/change-password', label: 'Thay Đổi Mật Khẩu', icon: FaKey, roles: ALL_ROLES }
    ]
  }
];

export default function Sidebar({
  isCollapsed = false,
  onToggle,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
  onClose,
  auth
}) {
  const location = useLocation();
  const toggleSidebar = onToggle || onToggleCollapse;
  const closeSidebar = onCloseMobile || onClose;

  // Safe user & role resolution
  const user = useMemo(() => {
    if (auth?.user) return auth.user;
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [auth?.user]);

  const roleId = useMemo(() => resolveRoleId(user) ?? resolveRoleId(auth?.userRoleId ?? auth?.userRole), [auth, user]);
  const currentRole = roleId ? ROLE_LABELS[roleId] : 'Nhân viên y tế';

  // Filter sections strictly by current roleId
  const filteredSections = useMemo(() => {
    return MENU_SECTIONS
      .filter(sec => roleId !== null && sec.roles.includes(roleId))
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item => roleId !== null && item.roles.includes(roleId))
      }))
      .filter(sec => sec.items.length > 0);
  }, [roleId]);

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`bms-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile-show' : ''}`}
      style={{
        width: isCollapsed ? '78px' : '265px',
        minWidth: isCollapsed ? '78px' : '265px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#0f172a',
        color: '#f8fafc',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1040,
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        borderRight: '1px solid rgba(255,255,255,0.06)'
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: isCollapsed ? '16px 8px' : '20px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          background: 'rgba(255,255,255,0.02)'
        }}
      >
        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: '#fff',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #5E85E6 0%, #4a6ec7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(94, 133, 230, 0.35)'
            }}
          >
            <FaVial />
          </div>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px' }}>BMS CLINICAL</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ISO 15189 LAB
              </span>
            </div>
          )}
        </Link>

        {isMobile ? (
          <button
            onClick={closeSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <FaTimes />
          </button>
        ) : (
          !isCollapsed && (
            <button
              onClick={toggleSidebar}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title="Thu gọn menu"
            >
              <FaChevronLeft size={12} />
            </button>
          )
        )}
      </div>

      {/* Role Badge Indicator */}
      <div
        style={{
          padding: isCollapsed ? '12px 6px' : '12px 18px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#91DE83',
            boxShadow: '0 0 8px #91DE83',
            flexShrink: 0,
            margin: isCollapsed ? '0 auto' : 0
          }}
        />
        {!isCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Phiên Làm Việc
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: '#5E85E6',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {currentRole}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isCollapsed ? '12px 6px' : '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {filteredSections.map((section, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  marginBottom: '2px'
                }}
              >
                {section.category}
              </div>
            )}

            {section.items.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  to={item.path}
                  onClick={isMobile ? closeSidebar : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : '12px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '11px 0' : '9px 12px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    color: active ? '#ffffff' : '#cbd5e1',
                    background: active
                      ? '#5E85E6'
                      : 'transparent',
                    boxShadow: active ? '0 4px 14px rgba(94,133,230,0.35)' : 'none',
                    fontWeight: active ? 600 : 500,
                    fontSize: '0.86rem',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon
                    style={{
                      fontSize: '16px',
                      color: active ? '#ffffff' : '#94a3b8',
                      flexShrink: 0
                    }}
                  />
                  {!isCollapsed && (
                    <span
                      style={{
                        flex: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isCollapsed && item.badge && (
                    <Badge
                      bg={item.badge.bg || 'primary'}
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '3px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {item.badge.text}
                    </Badge>
                  )}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <OverlayTrigger
                    key={item.id}
                    placement="right"
                    overlay={<Tooltip id={`tt-${item.id}`}>{item.label}</Tooltip>}
                  >
                    <div>{linkContent}</div>
                  </OverlayTrigger>
                );
              }

              return <div key={item.id}>{linkContent}</div>;
            })}
          </div>
        ))}
      </div>

      {/* Collapse Footer Toggle (Desktop) */}
      {!isMobile && isCollapsed && (
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={toggleSidebar}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              borderRadius: '6px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Mở rộng menu"
          >
            <FaChevronRight size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}
