/**
 * @file Sidebar.jsx - BMS Role-based Navigation Sidebar (Compact & Optimized)
 * Conforms to: Production Medical Standards ISO 15189 & AGENTS-DESIGN.md
 */

import React, { useMemo } from 'react';
import { Nav, OverlayTrigger, Tooltip, Badge, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt, FaVial, FaUserNurse, FaUserMd, FaStethoscope, FaUsersCog,
  FaShieldAlt, FaBoxOpen, FaNotesMedical, FaKey, FaChevronLeft, FaChevronRight,
  FaHeartbeat, FaDatabase, FaBell, FaHistory, FaQrcode, FaUserPlus, FaCheckCircle,
  FaDoorOpen, FaFlask, FaStar, FaReceipt, FaChartBar, FaClock, FaUsers, FaUserCog, FaTimes, FaSearch
} from 'react-icons/fa';

import { ROLES, ROLE_LABELS, ALL_ROLES, resolveRoleId } from '../../constants/roles';

// WHY: roles come from src/constants/roles.js (6 roles, decision 30/10). Each list mirrors the route guard in
// App.jsx and the row in ROLE-PERMISSION-MATRIX §1, so a menu item never leads to a 403/404 for its role.
const { ADMIN, MANAGER, LAB, DOCTOR, RECEPTIONIST, PATIENT } = ROLES;

// Cấu trúc danh mục menu định nghĩa sẵn
const MENU_SECTIONS = [
  {
    category: 'TỔNG QUAN',
    items: [
      { id: 'dashboard', path: '/dashboard', label: 'Bảng Điều Khiển', icon: FaTachometerAlt, roles: ALL_ROLES },
      { id: 'search-packages', path: '/services', label: 'Tra Cứu Gói XN', icon: FaSearch, roles: ALL_ROLES, badge: { text: 'UC20', bg: 'info' } },
      { id: 'notifications', path: '/laboratory/notifications', label: 'Thông Báo', icon: FaBell, roles: [LAB, MANAGER], badge: { text: 'UC60', bg: 'primary' } }
    ]
  },
  {
    category: 'TIẾP ĐÓN & BỆNH NHÂN',
    items: [
      { id: 'check-in', path: '/receptionist/check-in', label: 'Check-in QR Code', icon: FaQrcode, roles: [RECEPTIONIST], badge: { text: 'QR', bg: 'success' } },
      { id: 'create-pt', path: '/receptionist/create-patient', label: 'Tạo Hồ Sơ Bệnh Nhân', icon: FaUserPlus, roles: [RECEPTIONIST] },
      { id: 'patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [RECEPTIONIST, DOCTOR, LAB, MANAGER], badge: { text: 'UC30', bg: 'info' } },
      { id: 'appointments', path: '/appointments', label: 'Lịch Hẹn Bệnh Nhân', icon: FaClock, roles: [RECEPTIONIST, MANAGER, DOCTOR, PATIENT] }
    ]
  },
  {
    category: 'CHẨN ĐOÁN & KHÁM',
    items: [
      { id: 'assessments', path: '/medical-assessments', label: 'Đánh Giá ICD-10', icon: FaStethoscope, roles: [DOCTOR, MANAGER], badge: { text: 'UC50', bg: 'primary' } },
      { id: 'med-notes', path: '/doctor/medical-notes', label: 'Ghi Chú Y Khoa', icon: FaNotesMedical, roles: [DOCTOR], badge: { text: 'UC51', bg: 'primary' } },
      // WHY: only the Manager signs results (decision 30/10 #1, UC49). The old link /doctor/dashboard?... had no route (404);
      // the verification queue is the routed step of the approval chain until a signing screen is wired (Đợt 3).
      { id: 'doc-approval', path: '/laboratory/verify-results', label: 'Duyệt Kết Quả Lab', icon: FaCheckCircle, roles: [MANAGER], badge: { text: 'Duyệt', bg: 'warning' } },
      { id: 'feedback', path: '/feedback', label: 'Đánh Giá & Góp Ý', icon: FaStar, roles: [MANAGER, PATIENT] }
    ]
  },
  {
    category: 'NGHIỆP VỤ XÉT NGHIỆM',
    items: [
      { id: 'validate', path: '/lab-user/validate-sample', label: 'Kiểm Chuẩn Mẫu', icon: FaVial, roles: [LAB, MANAGER], badge: { text: 'QC', bg: 'warning' } },
      { id: 'lab-queue', path: '/lab/queue', label: 'Hàng Đợi Mẫu Lab', icon: FaVial, roles: [LAB, MANAGER], badge: { text: 'ISO 15189', bg: 'danger' } },
      { id: 'qc-flags', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn QC', icon: FaFlask, roles: [LAB, MANAGER], badge: { text: 'Flags', bg: 'danger' } },
      { id: 'lab-rooms', path: '/laboratory/rooms', label: 'Phòng Xét Nghiệm', icon: FaDoorOpen, roles: [MANAGER, ADMIN] },
      { id: 'lab-profiles', path: '/laboratory/lab-profiles', label: 'Hồ Sơ Lab', icon: FaUsersCog, roles: [MANAGER, ADMIN], badge: { text: 'UC61', bg: 'primary' } },
      { id: 'criteria', path: '/criteria', label: 'Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [MANAGER, LAB, DOCTOR] },
      { id: 'ref-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu', icon: FaHeartbeat, roles: [MANAGER, LAB, DOCTOR], badge: { text: 'UC57', bg: 'success' } }
    ]
  },
  {
    category: 'LỊCH SỬ & THEO DÕI',
    items: [
      // WHY: UC71 timeline is lab-chain data. Matrix row UC71 + Quy trình ruling 30/10: Lab, Manager, Doctor only.
      { id: 'timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu', icon: FaHistory, roles: [LAB, MANAGER, DOCTOR], badge: { text: 'UC71', bg: 'info' } },
      { id: 'specimen-history', path: '/laboratory/specimens/history', label: 'Lịch Sử Mẫu', icon: FaHistory, roles: [LAB, MANAGER, DOCTOR], badge: { text: 'UC70', bg: 'info' } },
      // WHY: restores LacPG's UC76 item (c8850ca) lost in the 18cd447 rewrite. Decision 10: Admin and Receptionist must not see clinical history; Patient sees own data only (server-scoped).
      { id: 'test-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [MANAGER, LAB, DOCTOR, PATIENT], badge: { text: 'UC76', bg: 'info' } }
    ]
  },
  {
    category: 'KHO & VẬN HÀNH',
    items: [
      { id: 'inventory', path: '/inventory', label: 'Quản Lý Kho Hóa Chất', icon: FaBoxOpen, roles: [ADMIN, MANAGER, LAB], badge: { text: 'UC56', bg: 'primary' } },
      { id: 'shifts', path: '/shifts/view', label: 'Lịch Ca Trực', icon: FaClock, roles: [ADMIN, MANAGER, DOCTOR, LAB, RECEPTIONIST], badge: { text: 'UC35', bg: 'info' } },
      { id: 'shift-roster', path: '/manage/schedule', label: 'Phân Bổ Ca Trực', icon: FaClock, roles: [MANAGER], badge: { text: 'UC35', bg: 'primary' } },
      { id: 'packages', path: '/admin/packages', label: 'Gói Dịch Vụ', icon: FaBoxOpen, roles: [ADMIN, MANAGER] },
      { id: 'invoices', path: '/invoices', label: 'Biên Lai & Hóa Đơn', icon: FaReceipt, roles: [RECEPTIONIST, MANAGER] },
      // WHY: /admin/reports had no route (404); the reports that exist are TAT (UC63) and revenue (UC78), Admin + Manager.
      { id: 'reports', path: '/reports/tat', label: 'Báo Cáo Thống Kê', icon: FaChartBar, roles: [ADMIN, MANAGER] }
    ]
  },
  {
    category: 'HỆ THỐNG',
    items: [
      { id: 'users', path: '/admin/user-management', label: 'Quản Lý Người Dùng', icon: FaUserCog, roles: [ADMIN] },
      { id: 'employees', path: '/admin/employees', label: 'Quản Lý Nhân Sự', icon: FaUserNurse, roles: [ADMIN] },
      { id: 'roles', path: '/roles', label: 'Phân Quyền Vai Trò', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'audit', path: '/admin/audit-logs', label: 'Nhật Ký Audit', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'backup', path: '/admin/backup', label: 'Sao Lưu & Khôi Phục', icon: FaDatabase, roles: [ADMIN], badge: { text: 'UC80', bg: 'primary' } },
      { id: 'profile', path: '/profile', label: 'Hồ Sơ Cá Nhân', icon: FaUserMd, roles: ALL_ROLES },
      { id: 'pwd', path: '/change-password', label: 'Đổi Mật Khẩu', icon: FaKey, roles: ALL_ROLES }
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

  // Lấy User và Role an toàn
  const user = useMemo(() => {
    if (auth?.user) return auth.user;
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [auth?.user]);

  // Unknown role => null => no role-specific menu (never silently treated as Patient).
  const roleId = useMemo(() => resolveRoleId(user) ?? resolveRoleId(auth?.userRoleId ?? auth?.userRole), [auth, user]);
  const currentRole = roleId ? ROLE_LABELS[roleId] : 'Không rõ vai trò';

  // Lọc Menu theo Role
  const filteredSections = useMemo(() => {
    return MENU_SECTIONS.map(sec => ({
      ...sec,
      items: sec.items.filter(item => roleId !== null && item.roles.includes(roleId))
    })).filter(sec => sec.items.length > 0);
  }, [roleId]);

  const isActive = (path) => {
    const base = path.split('?')[0];
    return base === '/dashboard' ? location.pathname.endsWith('/dashboard') : location.pathname.startsWith(base);
  };

  return (
    <aside
      className={`bms-sidebar d-flex flex-column text-white ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        width: isCollapsed ? '78px' : '260px',
        height: '100vh',
        backgroundColor: '#1b1b28',
        position: isMobile ? 'relative' : 'fixed',
        left: 0, top: 0, zIndex: 1050,
        transition: 'width 0.25s ease'
      }}
    >
      {/* 1. Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary border-opacity-25" style={{ height: '64px' }}>
        <Link to="/" className="d-flex align-items-center text-decoration-none text-white gap-2 overflow-hidden" onClick={() => isMobile && closeSidebar?.()}>
          <img src="/assets/bms-logo.png" alt="BMS" style={{ width: '28px', height: '28px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          {!isCollapsed && (
            <div className="text-truncate lh-1">
              <span className="fw-bold tracking-wide d-block" style={{ fontSize: '0.95rem' }}>BMS MEDLAB</span>
              <small className="text-muted" style={{ fontSize: '0.65rem' }}>ISO 15189 STANDARDS</small>
            </div>
          )}
        </Link>
        {isMobile && <Button variant="link" className="text-light p-0" onClick={closeSidebar}><FaTimes size={18} /></Button>}
      </div>

      {/* 2. Role Badge */}
      {!isCollapsed && (
        <div className="px-3 py-1.5 bg-black bg-opacity-25 border-bottom border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
          <span className="text-muted text-uppercase" style={{ fontSize: '0.68rem' }}>Phân hệ</span>
          <Badge bg="primary" className="text-uppercase" style={{ fontSize: '0.65rem' }}>{currentRole}</Badge>
        </div>
      )}

      {/* 3. Navigation Items */}
      <div className="flex-grow-1 overflow-auto custom-scrollbar p-2" style={{ minHeight: 0 }}>
        <Nav className="flex-column gap-1">
          {filteredSections.map((sec, idx) => (
            <div key={sec.category} className="mb-2">
              {!isCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-uppercase text-muted fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                  {sec.category}
                </div>
              ) : (
                idx > 0 && <hr className="my-2 border-secondary opacity-25 w-75 mx-auto" />
              )}

              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                const link = (
                  <Nav.Link
                    as={Link}
                    to={item.path}
                    onClick={() => isMobile && closeSidebar?.()}
                    className={`d-flex align-items-center rounded-2 px-3 py-2 text-white text-decoration-none ${
                      active ? 'bg-primary shadow-sm fw-medium' : 'hover-item opacity-75'
                    }`}
                    style={{ fontSize: '0.88rem', transition: 'all 0.15s' }}
                  >
                    <Icon size={isCollapsed ? 18 : 16} className={isCollapsed ? 'mx-auto' : 'me-3 flex-shrink-0'} />
                    {!isCollapsed && <span className="flex-grow-1 text-truncate">{item.label}</span>}
                    {!isCollapsed && item.badge && <Badge bg={item.badge.bg} pill style={{ fontSize: '0.65rem' }}>{item.badge.text}</Badge>}
                  </Nav.Link>
                );

                return isCollapsed ? (
                  <OverlayTrigger key={item.id} placement="right" overlay={<Tooltip id={`t-${item.id}`}>{item.label}</Tooltip>}>
                    <div>{link}</div>
                  </OverlayTrigger>
                ) : <React.Fragment key={item.id}>{link}</React.Fragment>;
              })}
            </div>
          ))}
        </Nav>
      </div>

      {/* 4. User Card */}
      <div className="p-2 border-top border-secondary border-opacity-25 bg-black bg-opacity-20 d-flex align-items-center">
        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold" style={{ width: '34px', height: '34px', fontSize: '14px' }}>
          {user?.fullName?.[0]?.toUpperCase() || currentRole[0]}
        </div>
        {!isCollapsed && (
          <div className="ms-2.5 overflow-hidden flex-grow-1 lh-sm">
            <div className="text-white small fw-semibold text-truncate">{user?.fullName || user?.name || 'Nhân viên'}</div>
            <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>{user?.email || currentRole}</div>
          </div>
        )}
      </div>

      {/* 5. Collapse Button (Desktop) */}
      {!isMobile && (
        <Button
          variant="link"
          className="text-secondary text-decoration-none py-2 text-center border-top border-secondary border-opacity-10 rounded-0"
          onClick={toggleSidebar}
          style={{ fontSize: '0.82rem' }}
        >
          {isCollapsed ? <FaChevronRight size={14} /> : <><FaChevronLeft className="me-1.5" size={12} /><span>Thu gọn</span></>}
        </Button>
      )}

      <style>{`
        .bms-sidebar .hover-item:hover { background-color: rgba(255,255,255,0.08) !important; opacity: 1 !important; }
        .bms-sidebar .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .bms-sidebar .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}</style>
    </aside>
  );
}