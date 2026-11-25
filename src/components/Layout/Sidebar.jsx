/**
 * @file Sidebar.jsx - BMS Strict Role-Based Navigation Sidebar (RBAC Separation of Duties)
 * Soft Medical Telehealth UI Specification (MEDLINE / macOS Grade).
 * Conforms to: Production Medical Standards ISO 15189 & DESIGN SYSTEM PROMPT.
 */

import React, { useMemo } from 'react';
import { OverlayTrigger, Tooltip, Badge } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Gauge, TestTube2, Stethoscope, UserCog, ShieldCheck, Package, FileText, ChevronLeft, ChevronRight, HeartPulse, Database, Bell, History, QrCode, UserPlus, CheckCircle2, DoorOpen, FlaskConical, Star, Receipt, BarChart3, Clock, Users, X as LucideX, Calendar, Search, LogOut, Barcode as LucideBarcode, TrendingUp, AlertTriangle, FileHeart, ClipboardCheck } from 'lucide-react';

import { ROLES, ROLE_LABELS, ALL_ROLES, resolveRoleId } from '../../constants/roles';

const { ADMIN, MANAGER, LAB, DOCTOR, RECEPTIONIST, PATIENT } = ROLES;

/**
 * Clean Role-Permission Navigation Matrix:
 * Internal developer codes (UCxx) have been removed in favor of clean consumer-grade labeling.
 */
const MENU_SECTIONS = [
  // ================= ADMIN SECTIONS (PURE SYSTEM & IAM) =================
  {
    category: 'Quản Trị Hệ Thống',
    roles: [ADMIN],
    items: [
      { id: 'admin-dash', path: '/dashboard', label: 'Bảng Điều Khiển Admin', icon: Gauge, roles: [ADMIN] },
      { id: 'admin-users', path: '/admin/user-management', label: 'Quản Lý Tài Khoản (IAM)', icon: UserCog, roles: [ADMIN] },
      { id: 'admin-roles', path: '/roles', label: 'Phân Quyền Vai Trò (RBAC)', icon: ShieldCheck, roles: [ADMIN] },
      { id: 'admin-backup', path: '/admin/backup', label: 'Sao Lưu & Khôi Phục Dữ Liệu', icon: Database, roles: [ADMIN] },
      { id: 'admin-audit', path: '/admin/audit-logs', label: 'Nhật Ký Audit Hệ Thống', icon: History, roles: [ADMIN] },
      { id: 'admin-notifs', path: '/admin/notifications', label: 'Thông Báo Hệ Thống', icon: Bell, roles: [ADMIN] }
    ]
  },

  // ================= MANAGER SECTIONS (TRƯỞNG LAB / QUẢN LÝ) =================
  {
    category: 'Điều Hành & Phê Duyệt Kỹ Thuật',
    roles: [MANAGER],
    items: [
      { id: 'mgr-dash', path: '/dashboard', label: 'Tổng Quan Điều Hành', icon: Gauge, roles: [MANAGER] },
      { id: 'mgr-approval', path: '/laboratory/verify-results', label: 'Thẩm Định Kỹ Thuật', icon: CheckCircle2, roles: [MANAGER] },
      { id: 'mgr-tat', path: '/reports/tat', label: 'Thống Kê Hiệu Suất TAT', icon: BarChart3, roles: [MANAGER] },
      { id: 'mgr-revenue', path: '/reports/revenue', label: 'Báo Cáo Doanh Thu', icon: Receipt, roles: [MANAGER] },
      { id: 'mgr-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (QC)', icon: FlaskConical, roles: [MANAGER] },
      { id: 'mgr-notifications', path: '/laboratory/notifications', label: 'Thông Báo Kết Quả XN', icon: Bell, roles: [MANAGER] },
      { id: 'mgr-feedback', path: '/manager/feedback', label: 'Phản Hồi Bệnh Nhân', icon: Star, roles: [MANAGER] }
    ]
  },
  {
    category: 'Danh Mục Y Tế & Tài Nguyên Lab',
    roles: [MANAGER],
    items: [
      { id: 'mgr-criteria', path: '/criteria', label: 'Danh Mục Chỉ Số Xét Nghiệm', icon: FileText, roles: [MANAGER] },
      { id: 'mgr-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu Sinh Học', icon: HeartPulse, roles: [MANAGER] },
      { id: 'mgr-packages', path: '/admin/packages', label: 'Danh Mục Gói Dịch Vụ', icon: Package, roles: [MANAGER] },
      { id: 'mgr-rooms', path: '/laboratory/rooms', label: 'Phòng Xét Nghiệm & Lấy Mẫu', icon: DoorOpen, roles: [MANAGER] },
      { id: 'mgr-inventory', path: '/inventory', label: 'Kho Hóa Chất & Vật Tư', icon: TestTube2, roles: [MANAGER] },
      { id: 'mgr-lab-profiles', path: '/laboratory/lab-profiles', label: 'Hồ Sơ Chuyên Môn KTV', icon: Users, roles: [MANAGER] },
      { id: 'mgr-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: Users, roles: [MANAGER] }
    ]
  },
  {
    category: 'Vận Hành, Ca Trực & IoT',
    roles: [MANAGER],
    items: [
      { id: 'mgr-schedule', path: '/manage/schedule', label: 'Phân Bổ & Xếp Lịch Ca Trực', icon: Clock, roles: [MANAGER] },
      { id: 'mgr-shifts', path: '/shifts/view', label: 'Xem Lịch Ca Trực', icon: Clock, roles: [MANAGER] },
      { id: 'mgr-iot-monitor', path: '/iot/monitor', label: 'Giám Sát Cảm Biến IoT', icon: HeartPulse, roles: [MANAGER] },
      { id: 'mgr-iot-alerts', path: '/iot/alerts', label: 'Cảnh Báo Ngưỡng IoT', icon: AlertTriangle, roles: [MANAGER] }
    ]
  },

  // ================= LAB TECHNICIAN SECTIONS (KỸ THUẬT VIÊN) =================
  {
    category: 'Tiếp Nhận & Lấy Mẫu Bệnh Phẩm',
    roles: [LAB],
    items: [
      { id: 'lab-sample-list', path: '/laboratory/sample-list', label: 'Tiếp Nhận Chỉ Định & In Barcode', icon: LucideBarcode, roles: [LAB] },
      { id: 'lab-checkin', path: '/laboratory/checkinsample', label: 'Quét Tiếp Nhận Ống Mẫu (Scan)', icon: TestTube2, roles: [LAB] },
      { id: 'lab-batches', path: '/laboratory/batches', label: 'Quản Lý Lô Mẫu (Batch)', icon: ClipboardCheck, roles: [LAB] },
      { id: 'lab-queue', path: '/lab/queue', label: 'Hàng Đợi Mẫu Bệnh Phẩm', icon: Clock, roles: [LAB] }
    ]
  },
  {
    category: 'Phân Tích & Kiểm Soát Chất Lượng',
    roles: [LAB],
    items: [
      { id: 'lab-enter-results', path: '/laboratory/enter-test-results', label: 'Nhập Kết Quả Xét Nghiệm', icon: FlaskConical, roles: [LAB] },
      { id: 'lab-qc', path: '/laboratory/qc', label: 'Kiểm Chuẩn Nội Kiểm (Westgard QC)', icon: FlaskConical, roles: [LAB] },
      { id: 'lab-qc-flags', path: '/laboratory/qc-flags', label: 'Cảnh Báo Vi Phạm Westgard', icon: AlertTriangle, roles: [LAB] }
    ]
  },
  {
    category: 'Truy Vết, Kho & Thiết Bị IoT',
    roles: [LAB],
    items: [
      { id: 'lab-specimen-history', path: '/laboratory/specimens/history', label: 'Lịch Sử & Truy Vết Mẫu Máu', icon: History, roles: [LAB] },
      { id: 'lab-inventory', path: '/inventory', label: 'Kho Hóa Chất & Thuốc Thử', icon: Package, roles: [LAB] },
      { id: 'lab-iot-monitor', path: '/iot/monitor', label: 'Giám Sát Nhiệt Độ IoT', icon: HeartPulse, roles: [LAB] },
      { id: 'lab-notifs', path: '/laboratory/notifications', label: 'Thông Báo Kết Quả Xét Nghiệm', icon: Bell, roles: [LAB] },
      { id: 'lab-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: Clock, roles: [LAB] }
    ]
  },

  // ================= DOCTOR SECTIONS (BÁC SĨ LÂM SÀNG) =================
  {
    category: 'Khám Bệnh & Y Lệnh Điều Trị',
    roles: [DOCTOR],
    items: [
      { id: 'doc-console', path: '/doctor/console', label: 'Bàn Khám & Hàng Đợi Bệnh Nhân', icon: Stethoscope, roles: [DOCTOR] },
      { id: 'doc-order', path: '/doctor/orders/create', label: 'Ra Y Lệnh & Chỉ Định Xét Nghiệm', icon: FileText, roles: [DOCTOR] },
      { id: 'doc-emr', path: '/doctor/emr', label: 'Bệnh Án & Kết Luận Chẩn Đoán', icon: FileHeart, roles: [DOCTOR] },
      { id: 'doc-assessments', path: '/medical-assessments', label: 'Đánh Giá Lâm Sàng (ICD-10)', icon: ClipboardCheck, roles: [DOCTOR] },
      { id: 'doc-biochem', path: '/laboratory/biochemical-results', label: 'Duyệt Kết Quả Xét Nghiệm & Ký Số', icon: CheckCircle2, roles: [DOCTOR] }
    ]
  },
  {
    category: 'Lịch Làm Việc & Người Bệnh',
    roles: [DOCTOR],
    items: [
      { id: 'doc-appointments', path: '/appointments', label: 'Danh Sách Lịch Hẹn Khám', icon: Calendar, roles: [DOCTOR] },
      { id: 'doc-patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: Users, roles: [DOCTOR] },
      { id: 'doc-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: Clock, roles: [DOCTOR] }
    ]
  },

  // ================= RECEPTIONIST SECTIONS =================
  {
    category: 'Tiếp Đón & Điều Phối Bệnh Nhân',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-checkin', path: '/receptionist/check-in', label: 'Tiếp Đón & Check-in (QR/Mã)', icon: QrCode, roles: [RECEPTIONIST] },
      { id: 'rec-create-pt', path: '/receptionist/create-patient', label: 'Đăng Ký Khách Vãng Lai', icon: UserPlus, roles: [RECEPTIONIST] },
      { id: 'rec-queue', path: '/reception/queue', label: 'Điều Phối Hàng Đợi Tiếp Đón', icon: Clock, roles: [RECEPTIONIST] }
    ]
  },
  {
    category: 'Thu Phí & Hóa Đơn',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-fees', path: '/calculate-fees', label: 'Tính Viện Phí', icon: Receipt, roles: [RECEPTIONIST] },
      { id: 'rec-invoices', path: '/invoices', label: 'Hóa Đơn / Biên Lai', icon: Receipt, roles: [RECEPTIONIST] }
    ]
  },
  {
    category: 'Sổ Bộ Hồ Sơ & Lịch Khám',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-appointments', path: '/appointments', label: 'Sổ Lịch Hẹn Khám (Quầy)', icon: Calendar, roles: [RECEPTIONIST] },
      { id: 'rec-patients', path: '/patients', label: 'Tra Cứu Hồ Sơ Bệnh Nhân', icon: Users, roles: [RECEPTIONIST] },
      { id: 'rec-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: Clock, roles: [RECEPTIONIST] }
    ]
  },

  // ================= COMMON ACCOUNT SECTION =================
  {
    category: 'Tài Khoản',
    roles: ALL_ROLES,
    items: [
      { id: 'common-profile', path: '/profile', label: 'Thông Tin Tài Khoản', icon: Stethoscope, roles: ALL_ROLES },
      { id: 'common-pwd', path: '/change-password', label: 'Thay Đổi Mật Khẩu', icon: ShieldCheck, roles: ALL_ROLES }
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
            <LucideX  size="1em"/>
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
              <ChevronLeft size={12} />
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
                </div>
              </div>
            </div>

            {/* Quick Actions: Logout & Collapse */}
            <div className="d-flex align-items-center gap-1 flex-shrink-0">
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
                <LogOut size={12} />
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
                  <ChevronLeft size={11} />
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
                <div className="text-success small">● Đang hoạt động</div>
              </Tooltip>
            }
          >
            <div className="bms-sidebar-avatar-circle" style={{ cursor: 'pointer' }}>
              {initials}
              <span className="bms-sidebar-avatar-dot" />
            </div>
          </OverlayTrigger>

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
              <LogOut size={12} />
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
                <ChevronRight size={12} />
              </button>
            </OverlayTrigger>
          )}
        </div>
      )}
    </aside>
  );
}
