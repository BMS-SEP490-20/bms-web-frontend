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
  FaDoorOpen, FaFlask, FaStar, FaReceipt, FaChartBar, FaClock, FaUsers, FaUserCog, FaTimes
} from 'react-icons/fa';

// Chuẩn hóa Role (Hỗ trợ cả Role ID số và Role Name chuỗi)
const ROLE_MAP = { 1: 'ADMIN', 2: 'MANAGER', 3: 'DOCTOR', 4: 'LABTECH', 5: 'PATIENT', 6: 'RECEPTIONIST' };
const normalizeRole = (r) => {
  if (!r) return 'PATIENT';
  if (ROLE_MAP[r]) return ROLE_MAP[r];
  const s = r.toString().toUpperCase();
  for (const k of ['ADMIN', 'MANAGER', 'WAREHOUSE', 'DOCTOR', 'HEAD', 'TECH', 'RECEPT', 'NURSE', 'CASHIER']) {
    if (s.includes(k)) return k === 'TECH' ? 'LABTECH' : k === 'HEAD' ? 'LABHEAD' : k === 'RECEPT' ? 'RECEPTIONIST' : k === 'WAREHOUSE' ? 'WAREHOUSESTAFF' : k;
  }
  return 'PATIENT';
};

const ALL_STAFF = ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'NURSE', 'WAREHOUSESTAFF', 'RECEPTIONIST', 'CASHIER'];

// Cấu trúc danh mục menu định nghĩa sẵn
const MENU_SECTIONS = [
  {
    category: 'TỔNG QUAN',
    items: [
      { id: 'dashboard', path: '/dashboard', label: 'Bảng Điều Khiển', icon: FaTachometerAlt, roles: [...ALL_STAFF, 'PATIENT'] },
      { id: 'notifications', path: '/laboratory/notifications', label: 'Thông Báo', icon: FaBell, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'], badge: { text: 'UC60', bg: 'primary' } }
    ]
  },
  {
    category: 'TIẾP ĐÓN & BỆNH NHÂN',
    items: [
      { id: 'check-in', path: '/receptionist/check-in', label: 'Check-in QR Code', icon: FaQrcode, roles: ['ADMIN', 'RECEPTIONIST'], badge: { text: 'QR', bg: 'success' } },
      { id: 'create-pt', path: '/receptionist/create-patient', label: 'Tạo Hồ Sơ Bệnh Nhân', icon: FaUserPlus, roles: ['ADMIN', 'RECEPTIONIST', 'NURSE'] },
      { id: 'patients', path: '/patients', label: 'Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'RECEPTIONIST', 'CASHIER'] },
      { id: 'appointments', path: '/appointments', label: 'Lịch Hẹn Bệnh Nhân', icon: FaClock, roles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST'] }
    ]
  },
  {
    category: 'CHẨN ĐOÁN & KHÁM',
    items: [
      { id: 'assessments', path: '/medical-assessments', label: 'Đánh Giá ICD-10', icon: FaStethoscope, roles: ['ADMIN', 'MANAGER', 'DOCTOR'], badge: { text: 'UC50', bg: 'primary' } },
      { id: 'med-notes', path: '/doctor/medical-notes', label: 'Ghi Chú Y Khoa', icon: FaNotesMedical, roles: ['DOCTOR'], badge: { text: 'UC51', bg: 'primary' } },
      { id: 'doc-approval', path: '/doctor/dashboard?filter=pending_approval', label: 'Duyệt Kết Quả Lab', icon: FaCheckCircle, roles: ['DOCTOR', 'LABHEAD', 'MANAGER'], badge: { text: 'Duyệt', bg: 'warning' } },
      { id: 'feedback', path: '/feedback', label: 'Đánh Giá & Góp Ý', icon: FaStar, roles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST'] }
    ]
  },
  {
    category: 'NGHIỆP VỤ XÉT NGHIỆM',
    items: [
      { id: 'validate', path: '/lab-user/validate-sample', label: 'Kiểm Chuẩn Mẫu', icon: FaVial, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH'], badge: { text: 'QC', bg: 'warning' } },
      { id: 'lab-queue', path: '/lab/queue', label: 'Hàng Đợi Mẫu Lab', icon: FaVial, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR', 'RECEPTIONIST'], badge: { text: 'ISO 15189', bg: 'danger' } },
      { id: 'qc-flags', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn QC', icon: FaFlask, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH'], badge: { text: 'Flags', bg: 'danger' } },
      { id: 'lab-rooms', path: '/laboratory/rooms', label: 'Phòng Xét Nghiệm', icon: FaDoorOpen, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH'] },
      { id: 'lab-profiles', path: '/laboratory/lab-profiles', label: 'Hồ Sơ Lab', icon: FaUsersCog, roles: ['ADMIN', 'MANAGER', 'LABHEAD'], badge: { text: 'UC61', bg: 'primary' } },
      { id: 'criteria', path: '/criteria', label: 'Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'] },
      { id: 'ref-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu', icon: FaHeartbeat, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'], badge: { text: 'UC57', bg: 'success' } }
    ]
  },
  {
    category: 'LỊCH SỬ & THEO DÕI',
    items: [
      { id: 'timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu', icon: FaHistory, roles: [...ALL_STAFF, 'PATIENT'], badge: { text: 'UC71', bg: 'info' } },
      { id: 'specimen-history', path: '/laboratory/specimens/history', label: 'Lịch Sử Mẫu', icon: FaHistory, roles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR', 'RECEPTIONIST'], badge: { text: 'UC70', bg: 'info' } },
      { id: 'my-tests', path: '/patient/test-history', label: 'Lịch Sử Của Tôi', icon: FaHistory, roles: ['PATIENT'], badge: { text: 'UC76', bg: 'info' } }
    ]
  },
  {
    category: 'KHO & VẬN HÀNH',
    items: [
      { id: 'inventory', path: '/inventory', label: 'Quản Lý Kho Hóa Chất', icon: FaBoxOpen, roles: ['ADMIN', 'MANAGER', 'WAREHOUSESTAFF', 'LABHEAD', 'LABTECH'], badge: { text: 'UC56', bg: 'primary' } },
      { id: 'shifts', path: '/schedule', label: 'Phân Bổ Ca Trực', icon: FaClock, roles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST', 'LABHEAD', 'LABTECH'] },
      { id: 'packages', path: '/admin/packages', label: 'Gói Dịch Vụ', icon: FaBoxOpen, roles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST', 'CASHIER'] },
      { id: 'invoices', path: '/invoices', label: 'Biên Lai & Hóa Đơn', icon: FaReceipt, roles: ['ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'] },
      { id: 'reports', path: '/admin/reports', label: 'Báo Cáo Thống Kê', icon: FaChartBar, roles: ['ADMIN', 'MANAGER'] }
    ]
  },
  {
    category: 'HỆ THỐNG',
    items: [
      { id: 'users', path: '/admin/user-management', label: 'Quản Lý Người Dùng', icon: FaUserCog, roles: ['ADMIN'] },
      { id: 'employees', path: '/admin/employees', label: 'Quản Lý Nhân Sự', icon: FaUserNurse, roles: ['ADMIN', 'MANAGER'] },
      { id: 'roles', path: '/roles', label: 'Phân Quyền Vai Trò', icon: FaShieldAlt, roles: ['ADMIN'] },
      { id: 'audit', path: '/admin/audit-logs', label: 'Nhật Ký Audit', icon: FaShieldAlt, roles: ['ADMIN', 'MANAGER'] },
      { id: 'backup', path: '/admin/backup', label: 'Sao Lưu & Khôi Phục', icon: FaDatabase, roles: ['ADMIN', 'MANAGER', 'LABHEAD'], badge: { text: 'UC80', bg: 'primary' } },
      { id: 'profile', path: '/profile', label: 'Hồ Sơ Cá Nhân', icon: FaUserMd, roles: [...ALL_STAFF, 'PATIENT'] },
      { id: 'pwd', path: '/change-password', label: 'Đổi Mật Khẩu', icon: FaKey, roles: [...ALL_STAFF, 'PATIENT'] }
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

  const currentRole = useMemo(() => {
    return normalizeRole(auth?.userRoleId || auth?.userRole || user?.roleId || user?.role || user?.roleName);
  }, [auth, user]);

  // Lọc Menu theo Role
  const filteredSections = useMemo(() => {
    return MENU_SECTIONS.map(sec => ({
      ...sec,
      items: sec.items.filter(item => item.roles.includes(currentRole))
    })).filter(sec => sec.items.length > 0);
  }, [currentRole]);

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
            <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>{user?.email || `${currentRole.toLowerCase()}@bms.med`}</div>
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