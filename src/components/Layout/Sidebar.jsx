/**
 * @file Sidebar.jsx - BMS Strict Role-Based Navigation Sidebar (RBAC Separation of Duties)
 * Soft Medical Telehealth UI Specification (MEDLINE / macOS Grade).
 * Conforms to: Production Medical Standards ISO 15189 & DESIGN SYSTEM PROMPT.
 */

import React, { useMemo } from 'react';
import { OverlayTrigger, Tooltip, Badge } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt, FaVial, FaUserMd, FaStethoscope, FaUsersCog,
  FaShieldAlt, FaBoxOpen, FaNotesMedical, FaChevronLeft, FaChevronRight,
  FaHeartbeat, FaDatabase, FaBell, FaHistory, FaQrcode, FaUserPlus, FaCheckCircle,
  FaDoorOpen, FaFlask, FaStar, FaReceipt, FaChartBar, FaClock, FaUsers, FaUserCog, FaTimes, FaCalendarAlt, FaSearch
} from 'react-icons/fa';

import { ROLES, ROLE_LABELS, ALL_ROLES, resolveRoleId } from '../../constants/roles';

const { ADMIN, MANAGER, LAB, DOCTOR, RECEPTIONIST, PATIENT } = ROLES;

/**
 * Clean Role-Permission Navigation Matrix:
 * Internal developer codes (UCxx) have been removed in favor of clean consumer-grade labeling.
 */
const MENU_SECTIONS = [
  // ================= ADMIN SECTIONS =================
  {
    category: 'Quản Trị Hệ Thống',
    roles: [ADMIN],
    items: [
      { id: 'admin-dash', path: '/dashboard', label: 'Bảng Điều Khiển Admin', icon: FaTachometerAlt, roles: [ADMIN] },
      { id: 'admin-users', path: '/admin/user-management', label: 'Quản Lý Tài Khoản (IAM)', icon: FaUserCog, roles: [ADMIN] },
      { id: 'admin-roles', path: '/roles', label: 'Phân Quyền Vai Trò (RBAC)', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-audit', path: '/admin/audit-logs', label: 'Nhật Ký Audit Hệ Thống', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-backup', path: '/admin/backup', label: 'Sao Lưu & Khôi Phục Dữ Liệu', icon: FaDatabase, roles: [ADMIN] },
      { id: 'admin-packages', path: '/admin/packages', label: 'Danh Mục Gói Dịch Vụ', icon: FaBoxOpen, roles: [ADMIN] },
      { id: 'admin-shifts', path: '/manage/schedule', label: 'Phân Bổ Ca Trực', icon: FaClock, roles: [ADMIN] },
      { id: 'admin-view-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Toàn Viện', icon: FaClock, roles: [ADMIN] },
      { id: 'admin-rev', path: '/reports/revenue', label: 'Báo Cáo Doanh Thu Viện Phí', icon: FaChartBar, roles: [ADMIN] },
      { id: 'admin-tat', path: '/reports/tat', label: 'Thống Kê Thời Gian TAT', icon: FaChartBar, roles: [ADMIN] }
    ]
  },

  // ================= MANAGER SECTIONS =================
  {
    category: 'Quản Lý & Báo Cáo',
    roles: [MANAGER],
    items: [
      { id: 'mgr-dash', path: '/dashboard', label: 'Bảng Điều Khiển Tổng Quan', icon: FaTachometerAlt, roles: [MANAGER] },
      { id: 'mgr-approval', path: '/laboratory/verify-results', label: 'Duyệt & Ký Số Kết Quả', icon: FaCheckCircle, roles: [MANAGER], badge: { text: 'Chờ duyệt', bg: 'warning' } },
      { id: 'mgr-tat', path: '/reports/tat', label: 'Báo Cáo Hiệu Suất TAT', icon: FaChartBar, roles: [MANAGER] },
      { id: 'mgr-revenue', path: '/reports/revenue', label: 'Báo Cáo Doanh Thu Viện Phí', icon: FaChartBar, roles: [MANAGER] },
      { id: 'mgr-search-packages', path: '/services', label: 'Tra Cứu Gói Xét Nghiệm', icon: FaSearch, roles: [MANAGER] },
      { id: 'mgr-feedback', path: '/feedback', label: 'Đánh Giá & Khảo Sát Bệnh Nhân', icon: FaStar, roles: [MANAGER] },
      { id: 'mgr-notifications', path: '/laboratory/notifications', label: 'Cảnh Báo & Thông Báo Khẩn', icon: FaBell, roles: [MANAGER] }
    ]
  },
  {
    category: 'Giám Sát Lab & Cấu Hình',
    roles: [MANAGER],
    items: [
      { id: 'mgr-lab-queue', path: '/lab/queue', label: 'Giám Sát Hàng Đợi Mẫu', icon: FaVial, roles: [MANAGER] },
      { id: 'mgr-validate', path: '/lab-user/validate-sample', label: 'Kiểm Chuẩn Mẫu Tiền Phân Tích', icon: FaVial, roles: [MANAGER], badge: { text: 'QC', bg: 'info' } },
      { id: 'mgr-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (QC)', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-westgard', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn Westgard', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-criteria', path: '/criteria', label: 'Danh Mục Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [MANAGER] },
      { id: 'mgr-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu Y Tế', icon: FaHeartbeat, roles: [MANAGER] },
      { id: 'mgr-biochem', path: '/laboratory/biochemical-results', label: 'Tra Cứu Kết Quả Sinh Hóa', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-rooms', path: '/laboratory/rooms', label: 'Phòng Xét Nghiệm & Lấy Mẫu', icon: FaDoorOpen, roles: [MANAGER] },
      { id: 'mgr-profiles', path: '/laboratory/lab-profiles', label: 'Hồ Sơ Kỹ Thuật Máy Lab', icon: FaUsersCog, roles: [MANAGER] },
      { id: 'mgr-iot', path: '/manager/iot-thresholds', label: 'Cảm Biến IoT & Tủ Trữ Mẫu', icon: FaHeartbeat, roles: [MANAGER] },
      { id: 'mgr-schedule', path: '/manage/schedule', label: 'Phân Bổ & Xếp Lịch Ca Trực', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-shifts', path: '/shifts/view', label: 'Xem Lịch Ca Trực', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-inventory', path: '/inventory', label: 'Quản Lý Kho Hóa Chất', icon: FaBoxOpen, roles: [MANAGER] },
      { id: 'mgr-invoices', path: '/invoices', label: 'Biên Lai & Hóa Đơn', icon: FaReceipt, roles: [MANAGER] },
      { id: 'mgr-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [MANAGER] },
      { id: 'mgr-appointments', path: '/appointments', label: 'Lịch Hẹn Bệnh Nhân', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-assessments', path: '/medical-assessments', label: 'Đánh Giá ICD-10', icon: FaStethoscope, roles: [MANAGER] },
      { id: 'mgr-emr', path: '/doctor/emr', label: 'Tra Cứu Bệnh Án Điện Tử (EMR)', icon: FaNotesMedical, roles: [MANAGER] },
      { id: 'mgr-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [MANAGER] },
      { id: 'mgr-test-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [MANAGER] }
    ]
  },

  // ================= LAB TECHNICIAN SECTIONS =================
  {
    category: 'Nghiệp Vụ Xét Nghiệm',
    roles: [LAB],
    items: [
      { id: 'lab-queue', path: '/lab/queue', label: 'Hàng Đợi Mẫu Bệnh Phẩm', icon: FaVial, roles: [LAB] },
      { id: 'lab-checkin', path: '/laboratory/checkinsample', label: 'Tiếp Nhận Ống Mẫu Máu', icon: FaVial, roles: [LAB] },
      { id: 'lab-enter-res', path: '/laboratory/enter-test-results', label: 'Nhập Kết Quả Xét Nghiệm', icon: FaNotesMedical, roles: [LAB] },
      { id: 'lab-batches', path: '/laboratory/batches', label: 'Quản Lý Lô Mẫu Phân Tích', icon: FaFlask, roles: [LAB] },
      { id: 'lab-validate', path: '/lab-user/validate-sample', label: 'Kiểm Chuẩn Mẫu Tiền Phân Tích', icon: FaVial, roles: [LAB], badge: { text: 'QC', bg: 'info' } },
      { id: 'lab-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (IQC/EQA)', icon: FaFlask, roles: [LAB] },
      { id: 'lab-flags', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn Westgard', icon: FaFlask, roles: [LAB] },
      { id: 'lab-criteria', path: '/criteria', label: 'Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [LAB] },
      { id: 'lab-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu', icon: FaHeartbeat, roles: [LAB] },
      { id: 'lab-biochem', path: '/laboratory/biochemical-results', label: 'Tra Cứu Sinh Hóa', icon: FaFlask, roles: [LAB] }
    ]
  },
  {
    category: 'Vận Hành & Kho Lab',
    roles: [LAB],
    items: [
      { id: 'lab-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-test-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-history', path: '/laboratory/specimens/history', label: 'Lịch Sử Mẫu Bệnh Phẩm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-inventory', path: '/inventory', label: 'Quản Lý Kho Hóa Chất & Vật Tư', icon: FaBoxOpen, roles: [LAB] },
      { id: 'lab-patients', path: '/patients', label: 'Tra Cứu Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [LAB] },
      { id: 'lab-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [LAB] },
      { id: 'lab-notifs', path: '/laboratory/notifications', label: 'Thông Báo Nội Bộ Lab', icon: FaBell, roles: [LAB] }
    ]
  },

  // ================= DOCTOR SECTIONS =================
  {
    category: 'Bàn Khám & Điều Trị',
    roles: [DOCTOR],
    items: [
      { id: 'doc-console', path: '/doctor/console', label: 'Bàn Khám Bác Sĩ & Gọi Số', icon: FaStethoscope, roles: [DOCTOR] },
      { id: 'doc-order', path: '/doctor/orders/create', label: 'Chỉ Định Xét Nghiệm Máu', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-emr', path: '/doctor/emr', label: 'Bệnh Án Điện Tử (EMR)', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-assessment', path: '/medical-assessments', label: 'Chẩn Đoán Lâm Sàng (ICD-10)', icon: FaStethoscope, roles: [DOCTOR] },
      { id: 'doc-notes', path: '/doctor/medical-notes', label: 'Ghi Chú Y Khoa Tiến Trình', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-criteria', path: '/criteria', label: 'Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu', icon: FaHeartbeat, roles: [DOCTOR] },
      { id: 'doc-biochem', path: '/laboratory/biochemical-results', label: 'Tra Cứu Sinh Hóa', icon: FaFlask, roles: [DOCTOR] }
    ]
  },
  {
    category: 'Lịch Hẹn & Theo Dõi',
    roles: [DOCTOR],
    items: [
      { id: 'doc-appointments', path: '/appointments', label: 'Danh Sách Lịch Hẹn Khám', icon: FaClock, roles: [DOCTOR] },
      { id: 'doc-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [DOCTOR] },
      { id: 'doc-patient-hist', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [DOCTOR] },
      { id: 'doc-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [DOCTOR] },
      { id: 'doc-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Bác Sĩ', icon: FaClock, roles: [DOCTOR] }
    ]
  },

  // ================= RECEPTIONIST SECTIONS =================
  {
    category: 'Tiếp Đón & Điều Phối Bệnh Nhân',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-checkin', path: '/receptionist/check-in', label: '1. Quầy Tiếp Đón & Check-in QR', icon: FaQrcode, roles: [RECEPTIONIST], badge: { text: 'QR', bg: 'success' } },
      { id: 'rec-queue', path: '/reception/queue', label: '2. Bảng Gọi Số & Hàng Đợi', icon: FaClock, roles: [RECEPTIONIST] },
      { id: 'rec-create-pt', path: '/receptionist/create-patient', label: '3. Tạo Hồ Sơ Bệnh Nhân', icon: FaUserPlus, roles: [RECEPTIONIST] },
      { id: 'rec-appointments', path: '/appointments', label: '4. Sổ Lịch Hẹn & Khung Giờ', icon: FaCalendarAlt, roles: [RECEPTIONIST] },
      { id: 'rec-patients', path: '/patients', label: '5. Tra Cứu Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [RECEPTIONIST] }
    ]
  },
  {
    category: 'Viện Phí & Thu Ngân',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-invoices', path: '/invoices', label: 'Quầy Thu Viện Phí & Hóa Đơn VAT', icon: FaReceipt, roles: [RECEPTIONIST] },
      { id: 'rec-fees', path: '/calculate-fees', label: 'Tra Cứu Bảng Giá & Dự Toán BHYT', icon: FaReceipt, roles: [RECEPTIONIST] },
      { id: 'rec-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [RECEPTIONIST] }
    ]
  },

  // ================= PATIENT SECTION =================
  {
    category: 'Cổng Bệnh Nhân',
    roles: [PATIENT],
    items: [
      { id: 'pt-search-packages', path: '/services', label: 'Tra Cứu Gói Xét Nghiệm', icon: FaSearch, roles: [PATIENT] },
      { id: 'pt-appointments', path: '/appointments', label: 'Lịch Khám & Hẹn Lấy Mẫu', icon: FaCalendarAlt, roles: [PATIENT] },
      { id: 'pt-tracking', path: '/tracking', label: 'Tiến Trình & Kết Quả', icon: FaHeartbeat, roles: [PATIENT] },
      { id: 'pt-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [PATIENT] },
      { id: 'pt-feedback', path: '/feedback', label: 'Đánh Giá & Góp Ý Y Tế', icon: FaStar, roles: [PATIENT] }
    ]
  },

  // ================= COMMON ACCOUNT SECTION =================
  {
    category: 'Tài Khoản',
    roles: ALL_ROLES,
    items: [
      { id: 'common-profile', path: '/profile', label: 'Thông Tin Tài Khoản', icon: FaUserMd, roles: ALL_ROLES },
      { id: 'common-pwd', path: '/change-password', label: 'Thay Đổi Mật Khẩu', icon: FaShieldAlt, roles: ALL_ROLES }
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
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        background: '#FFFFFF',
        color: '#1A1D21',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1040,
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        boxShadow: 'none',
        borderRight: 'none'
      }}
    >
      {/* Brand Header with Crisp BMS Logo */}
      <div
        style={{
          padding: isCollapsed ? '16px 8px' : '18px 20px',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          background: '#FFFFFF'
        }}
      >
        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: '#1A1D21',
            overflow: 'hidden'
          }}
        >
          <img
            src="/assets/bms-logo.png"
            alt="BMS Health"
            style={{
              height: isCollapsed ? '28px' : '32px',
              width: 'auto',
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.currentTarget.src = '/bmslogo.png';
            }}
          />
        </Link>

        {isMobile ? (
          <button
            onClick={closeSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
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
                background: '#EEF2F6',
                border: 'none',
                color: '#6B7280',
                borderRadius: '9999px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Thu gọn menu"
            >
              <FaChevronLeft size={12} />
            </button>
          )
        )}
      </div>

      {/* Role / Session Pill */}
      <div
        style={{
          padding: isCollapsed ? '10px 6px' : '10px 16px',
          margin: isCollapsed ? '8px 6px' : '12px 14px',
          background: '#EEF2F6',
          borderRadius: '16px',
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
            background: '#10B981',
            
            flexShrink: 0,
            margin: isCollapsed ? '0 auto' : 0
          }}
        />
        {!isCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>
              Đang hoạt động
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: '#1A1D21',
                fontWeight: 650,
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
          padding: isCollapsed ? '10px 6px' : '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {filteredSections.map((section, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 650,
                  letterSpacing: '0.02em',
                  color: '#9CA3AF',
                  padding: '4px 12px',
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
                    gap: isCollapsed ? '0' : '10px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '10px 0' : '9px 14px',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    color: active ? '#FFFFFF' : '#6B7280',
                    background: active ? '#1E60E6' : 'transparent',
                    boxShadow: 'none',
                    fontWeight: active ? 650 : 500,
                    fontSize: '0.86rem',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {isCollapsed && (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: active ? '#1E60E6' : '#64748B' }}>{item.label.charAt(0)}</span>
                  )}
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
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 650,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: item.badge.bg === 'warning' ? '#FFF4E5' : '#E8EFFE',
                        color: item.badge.bg === 'warning' ? '#8C5300' : '#1E60E6'
                      }}
                    >
                      {item.badge.text}
                    </span>
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
            borderTop: 'none',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={toggleSidebar}
            style={{
              background: '#EEF2F6',
              border: 'none',
              color: '#6B7280',
              borderRadius: '9999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Mở rộng menu"
          >
            <FaChevronRight size={12} />
          </button>
        </div>
      )}
    </aside>
  );
}
