/**
 * @file Sidebar.jsx - BMS Strict Role-Based Navigation Sidebar (RBAC Separation of Duties)
 * Soft Medical Telehealth UI Specification (MEDLINE / macOS Grade).
 * Conforms to: Production Medical Standards ISO 15189 & DESIGN SYSTEM PROMPT.
 */

import React, { useMemo } from 'react';
import { OverlayTrigger, Tooltip, Badge } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationHistoryModal from '../shared/NotificationHistoryModal';
import {
  FaTachometerAlt, FaVial, FaUserMd, FaStethoscope, FaUsersCog,
  FaShieldAlt, FaBoxOpen, FaNotesMedical, FaChevronLeft, FaChevronRight,
  FaHeartbeat, FaDatabase, FaBell, FaHistory, FaQrcode, FaUserPlus, FaCheckCircle,
  FaDoorOpen, FaFlask, FaStar, FaReceipt, FaChartBar, FaClock, FaUsers, FaUserCog, FaTimes, FaCalendarAlt, FaSearch,
  FaSignOutAlt, FaBarcode, FaChartLine, FaExclamationTriangle, FaFileMedicalAlt, FaClipboardCheck
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
      { id: 'admin-patients', path: '/admin/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [ADMIN] },
      { id: 'admin-roles', path: '/roles', label: 'Phân Quyền Vai Trò (RBAC)', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-packages', path: '/admin/packages', label: 'Danh Mục Gói Khám', icon: FaBoxOpen, roles: [ADMIN] },
      { id: 'admin-backup', path: '/admin/backup', label: 'Sao Lưu & Khôi Phục Dữ Liệu', icon: FaDatabase, roles: [ADMIN] },
      { id: 'admin-audit', path: '/admin/audit-logs', label: 'Nhật Ký Audit Hệ Thống', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-shifts', path: '/manage/schedule', label: 'Phân Bổ Lịch Ca Trực', icon: FaClock, roles: [ADMIN] },
      { id: 'admin-view-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Toàn Viện', icon: FaClock, roles: [ADMIN] }
    ]
  },

  // ================= MANAGER SECTIONS (TRƯỞNG LAB / QUẢN LÝ) =================
  {
    category: 'Giám Sát & Phê Duyệt Chuyên Môn',
    roles: [MANAGER],
    items: [
      { id: 'mgr-approval', path: '/laboratory/verify-results', label: 'Thẩm Định Kỹ Thuật', icon: FaCheckCircle, roles: [MANAGER] },
      { id: 'mgr-tat', path: '/reports/tat', label: 'Thống Kê Hiệu Suất TAT', icon: FaChartBar, roles: [MANAGER] },
      { id: 'mgr-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (QC)', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-westgard', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn Westgard', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-notifications', path: '/laboratory/notifications', label: 'Thông Báo Kết Quả Xét Nghiệm', icon: FaBell, roles: [MANAGER] }
    ]
  },
  {
    category: 'Danh Mục Y Tế & Chuẩn ISO 15189',
    roles: [MANAGER],
    items: [
      { id: 'mgr-criteria', path: '/criteria', label: 'Danh Mục Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [MANAGER] },
      { id: 'mgr-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu Sinh Học', icon: FaHeartbeat, roles: [MANAGER] },
      { id: 'mgr-packages', path: '/admin/packages', label: 'Danh Mục Gói Dịch Vụ', icon: FaBoxOpen, roles: [MANAGER] },
      { id: 'mgr-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [MANAGER] },
      { id: 'mgr-rooms', path: '/laboratory/rooms', label: 'Phòng Xét Nghiệm & Lấy Mẫu', icon: FaDoorOpen, roles: [MANAGER] }
    ]
  },
  {
    category: 'Vận Hành & Phân Công Trực',
    roles: [MANAGER],
    items: [
      { id: 'mgr-schedule', path: '/manage/schedule', label: 'Phân Bổ & Xếp Lịch Ca Trực', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-shifts', path: '/shifts/view', label: 'Xem Lịch Ca Trực', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-iot-monitor', path: '/iot/monitor', label: 'Giám Sát Cảm Biến Môi Trường IoT', icon: FaHeartbeat, roles: [MANAGER] }
    ]
  },

  // ================= LAB TECHNICIAN SECTIONS (KỸ THUẬT VIÊN) =================
  {
    category: 'Tiếp Nhận & Lấy Mẫu Bệnh Phẩm',
    roles: [LAB],
    items: [
      { id: 'lab-sample-list', path: '/laboratory/sample-list', label: 'Tiếp Nhận Chỉ Định & In Barcode', icon: FaBarcode, roles: [LAB] },
      { id: 'lab-checkin', path: '/laboratory/checkinsample', label: 'Quét Tiếp Nhận Ống Mẫu (Scan)', icon: FaVial, roles: [LAB] },
      { id: 'lab-queue', path: '/lab/queue', label: 'Hàng Đợi Mẫu Bệnh Phẩm', icon: FaClock, roles: [LAB] }
    ]
  },
  {
    category: 'Phân Tích & Kiểm Soát Chất Lượng',
    roles: [LAB],
    items: [
      { id: 'lab-enter-results', path: '/laboratory/enter-test-results', label: 'Nhập Kết Quả Xét Nghiệm', icon: FaFlask, roles: [LAB] },
      { id: 'lab-qc', path: '/laboratory/qc', label: 'Kiểm Chuẩn Nội Kiểm (Westgard QC)', icon: FaFlask, roles: [LAB] },
      { id: 'lab-qc-flags', path: '/laboratory/qc-flags', label: 'Cảnh Báo Vi Phạm Westgard', icon: FaExclamationTriangle, roles: [LAB] }
    ]
  },
  {
    category: 'Tra Cứu & Lịch Trực',
    roles: [LAB],
    items: [
      { id: 'lab-timeline', path: '/laboratory/sample-timeline', label: 'Tra Cứu Tiến Trình Mẫu Máu', icon: FaHistory, roles: [LAB] },
      { id: 'lab-notifs', path: '/laboratory/notifications', label: 'Thông Báo Kết Quả Xét Nghiệm', icon: FaBell, roles: [LAB] },
      { id: 'lab-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [LAB] }
    ]
  },

  // ================= DOCTOR SECTIONS (BÁC SĨ LÂM SÀNG) =================
  {
    category: 'Khám Bệnh & Y Lệnh Điều Trị',
    roles: [DOCTOR],
    items: [
      { id: 'doc-console', path: '/doctor/console', label: 'Bàn Khám & Hàng Đợi Bệnh Nhân', icon: FaStethoscope, roles: [DOCTOR] },
      { id: 'doc-order', path: '/doctor/orders/create', label: 'Ra Y Lệnh & Chỉ Định Xét Nghiệm', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-emr', path: '/doctor/emr', label: 'Bệnh Án & Kết Luận Chẩn Đoán', icon: FaFileMedicalAlt, roles: [DOCTOR] },
      { id: 'doc-biochem', path: '/laboratory/biochemical-results', label: 'Duyệt Kết Quả Xét Nghiệm & Ký Số', icon: FaClipboardCheck, roles: [DOCTOR] }
    ]
  },
  {
    category: 'Lịch Làm Việc & Người Bệnh',
    roles: [DOCTOR],
    items: [
      { id: 'doc-appointments', path: '/appointments', label: 'Danh Sách Lịch Hẹn Khám', icon: FaCalendarAlt, roles: [DOCTOR] },
      { id: 'doc-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [DOCTOR] },
      { id: 'doc-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [DOCTOR] }
    ]
  },

  // ================= RECEPTIONIST SECTIONS =================
  {
    category: 'Tiếp Đón & Điều Phối Bệnh Nhân',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-checkin', path: '/receptionist/check-in', label: 'Tiếp Đón & Check-in (QR/Mã)', icon: FaQrcode, roles: [RECEPTIONIST] },
      { id: 'rec-create-pt', path: '/receptionist/create-patient', label: 'Đăng Ký Khách Vãng Lai', icon: FaUserPlus, roles: [RECEPTIONIST] },
      { id: 'rec-queue', path: '/reception/queue', label: 'Điều Phối Hàng Đợi Tiếp Đón', icon: FaClock, roles: [RECEPTIONIST] }
    ]
  },
  {
    category: 'Thu Phí & Hóa Đơn',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-fees', path: '/calculate-fees', label: 'Tính Viện Phí', icon: FaReceipt, roles: [RECEPTIONIST] },
      { id: 'rec-invoices', path: '/invoices', label: 'Hóa Đơn / Biên Lai', icon: FaReceipt, roles: [RECEPTIONIST] }
    ]
  },
  {
    category: 'Sổ Bộ Hồ Sơ & Lịch Khám',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-appointments', path: '/appointments', label: 'Sổ Lịch Hẹn Khám (Quầy)', icon: FaCalendarAlt, roles: [RECEPTIONIST] },
      { id: 'rec-patients', path: '/patients', label: 'Tra Cứu Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [RECEPTIONIST] },
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
      { id: 'pt-tracking', path: '/patient/tracking', label: 'Tiến Trình & Kết Quả', icon: FaHeartbeat, roles: [PATIENT] },
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
  const navigate = useNavigate();
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

  const displayName = useMemo(() => {
    return user?.fullName || user?.name || user?.userName || currentRole;
  }, [user, currentRole]);

  const initials = useMemo(() => {
    if (!displayName) return 'U';
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [displayName]);

  const handleLogout = () => {
    localStorage.removeItem('bms_token');
    localStorage.removeItem('bms_access_token');
    localStorage.removeItem('bms_refresh_token');
    localStorage.removeItem('bms_user');
    sessionStorage.removeItem('bms_token');
    sessionStorage.removeItem('bms_access_token');
    sessionStorage.removeItem('bms_refresh_token');
    sessionStorage.removeItem('bms_user');
    navigate('/login');
  };

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
    const current = location.pathname;
    if (path === '/dashboard') return current === '/dashboard';
    // Exact hoặc con path ( /qc/xxx ). Không để /laboratory/qc khớp nhầm /laboratory/qc-flags
    if (current === path) return true;
    return current.startsWith(`${path}/`);
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
                    Icon ? (
                      <Icon size={18} style={{ color: active ? '#FFFFFF' : '#64748B', flexShrink: 0 }} title={item.label} />
                    ) : (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: active ? '#FFFFFF' : '#64748B' }}>{item.label.charAt(0)}</span>
                    )
                  )}
                  {!isCollapsed && (
                    <>
                      {Icon && <Icon size={16} style={{ color: active ? '#FFFFFF' : '#64748B', flexShrink: 0 }} />}
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
                    </>
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

      {/* User Profile & Session Footer */}
      {!isCollapsed ? (
        <div className="bms-sidebar-footer">
          <div className="d-flex align-items-center justify-content-between gap-2">
            {/* User Avatar + Name + Role */}
            <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
              <div className="bms-sidebar-avatar-circle" title={displayName}>
                {initials}
                <span className="bms-sidebar-avatar-dot" />
              </div>
              <div className="overflow-hidden" style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={displayName}
                >
                  {displayName}
                </div>
                <div className="d-flex align-items-center gap-1.5 mt-0.5">
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 650,
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      backgroundColor: '#EEF2F6',
                      color: '#1E60E6',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {currentRole}
                  </span>
                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>● ISO 15189</span>
                </div>
              </div>
            </div>

            {/* Quick Actions: Notifications, Logout & Collapse */}
            <div className="d-flex align-items-center gap-1 flex-shrink-0">
              <NotificationHistoryModal variant="sidebar" />
              <button
                onClick={handleLogout}
                style={{
                  background: '#FEE2E2',
                  border: 'none',
                  color: '#DC2626',
                  borderRadius: '9999px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Đăng xuất khỏi hệ thống"
                aria-label="Đăng xuất"
              >
                <FaSignOutAlt size={12} />
              </button>
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  style={{
                    background: '#EEF2F6',
                    border: 'none',
                    color: '#6B7280',
                    borderRadius: '9999px',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Thu gọn menu"
                  aria-label="Thu gọn sidebar"
                >
                  <FaChevronLeft size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bms-sidebar-footer" style={{ padding: '12px 6px', alignItems: 'center', gap: '8px' }}>
          <OverlayTrigger
            placement="right"
            overlay={
              <Tooltip id="tt-user-collapsed">
                <strong>{displayName}</strong>
                <div>{currentRole}</div>
                <div className="text-success small">● ISO 15189 Lab Hoạt Động</div>
              </Tooltip>
            }
          >
            <div className="bms-sidebar-avatar-circle" style={{ cursor: 'pointer' }}>
              {initials}
              <span className="bms-sidebar-avatar-dot" />
            </div>
          </OverlayTrigger>

          <NotificationHistoryModal variant="sidebar-collapsed" />

          <OverlayTrigger placement="right" overlay={<Tooltip id="tt-logout-collapsed">Đăng xuất</Tooltip>}>
            <button
              onClick={handleLogout}
              style={{
                background: '#FEE2E2',
                border: 'none',
                color: '#DC2626',
                borderRadius: '9999px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Đăng xuất"
            >
              <FaSignOutAlt size={12} />
            </button>
          </OverlayTrigger>

          {!isMobile && (
            <OverlayTrigger placement="right" overlay={<Tooltip id="tt-expand-sidebar">Mở rộng menu</Tooltip>}>
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
                aria-label="Mở rộng menu"
              >
                <FaChevronRight size={12} />
              </button>
            </OverlayTrigger>
          )}
        </div>
      )}
    </aside>
  );
}
