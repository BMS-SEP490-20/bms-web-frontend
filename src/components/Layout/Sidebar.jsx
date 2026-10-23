/**
 * @file Sidebar.jsx
 * @description Role-based collapsible navigation sidebar for BMS Management Portal (Refined UC01/UC15).
 * Dynamically organizes and filters menu options by user role and functional category (BR-IAM-02).
 * 
 * SECURITY & ARCHITECTURAL BOUNDARY:
 * Menu visibility logic in this component is strictly an ergonomic UX control (display filtering).
 * It does NOT establish a security perimeter. All medical data access, order mutations,
 * and result approvals remain strictly guarded by backend API authorization policies and token claims.
 * 
 * Conforms to: Production Medical Standards ISO 15189, HIPAA Security Rule, & AGENTS-CODE.md.
 */

import React, { useMemo } from 'react';
import { Nav, Button, OverlayTrigger, Tooltip, Badge } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt, FaVial, FaUserNurse, FaUserMd, FaStethoscope, FaUsersCog,
  FaShieldAlt, FaCalendarAlt, FaBoxOpen, FaNotesMedical, FaKey, FaUserCircle,
  FaChevronLeft, FaChevronRight, FaHeartbeat, FaDatabase, FaBell, FaHistory,
  FaQrcode, FaUserPlus, FaCheckCircle, FaDoorOpen, FaFlask, FaStar, FaReceipt,
  FaChartBar, FaClock, FaUsers, FaUserCog, FaTimes
} from 'react-icons/fa';

/**
 * Legacy numerical role identifiers mapped to canonical BMS role keys.
 * Required for backward compatibility with older microservices.
 */
const ROLE_ID_REGISTRY = {
  1: 'ADMIN',
  2: 'MANAGER',
  3: 'DOCTOR',
  4: 'LABTECH',
  5: 'PATIENT',
  6: 'RECEPTIONIST'
};

/**
 * Normalizes heterogeneous role formats (numerical IDs, Vietnamese strings, localized tokens)
 * into a single canonical uppercase role representation.
 *
 * @param {string|number|null|undefined} role - Raw role indicator
 * @returns {string} Normalized uppercase role; defaults to least-privileged 'PATIENT'
 */
function normalizeRole(role) {
  if (!role && role !== 0) return 'PATIENT';
  if (ROLE_ID_REGISTRY[role]) return ROLE_ID_REGISTRY[role];

  const normalized = role.toString().trim().toUpperCase();
  if (normalized.includes('ADMIN')) return 'ADMIN';
  if (normalized.includes('MANAGER')) return 'MANAGER';
  if (normalized.includes('WAREHOUSE')) return 'WAREHOUSESTAFF';
  if (normalized.includes('DOCTOR') || normalized.includes('BACSI')) return 'DOCTOR';
  if (normalized.includes('HEAD') || normalized.includes('TRUONGPHONG')) return 'LABHEAD';
  if (normalized.includes('TECH') || normalized.includes('LAB') || normalized.includes('KTV')) return 'LABTECH';
  if (normalized.includes('RECEPT') || normalized.includes('LETAN')) return 'RECEPTIONIST';
  if (normalized.includes('NURSE') || normalized === 'PHLEBOTOMIST') return 'NURSE';
  if (normalized.includes('CASHIER') || normalized.includes('THUNGAN')) return 'CASHIER';
  return 'PATIENT';
}

/**
 * Role-based collapsible navigation sidebar component.
 *
 * @param {object} props - Component properties
 * @param {boolean} [props.isCollapsed=false] - Collapsed icon-only mode flag on desktop
 * @param {Function} [props.onToggle] - Primary toggle handler for desktop sidebar collapse
 * @param {Function} [props.onToggleCollapse] - Fallback toggle handler for compatibility
 * @param {boolean} [props.isMobile=false] - Viewport indicator for off-canvas drawer mode
 * @param {Function} [props.onCloseMobile] - Primary mobile drawer close callback
 * @param {Function} [props.onClose] - Fallback mobile drawer close callback
 * @param {object} [props.auth] - Optional AuthContext injection; overrides local storage lookup
 * @returns {JSX.Element} Rendered sidebar component
 */
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
  const handleToggle = onToggle || onToggleCollapse;
  const handleClose = onCloseMobile || onClose;

  // Retrieve user with fallback to browser storage to prevent layout dropouts on hard reloads
  const user = useMemo(() => {
    if (auth?.user) return auth.user;
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [auth?.user]);

  const currentRole = useMemo(() => {
    const raw = auth?.userRoleId || auth?.userRole || user?.roleId || user?.role || user?.roleName;
    return normalizeRole(raw);
  }, [auth?.userRoleId, auth?.userRole, user]);

  /**
   * Resolves the primary dashboard route according to role specialization.
   * Eliminates unnecessary client redirects upon landing.
   */
  const dashboardPath = useMemo(() => {
    switch (currentRole) {
      case 'ADMIN': return '/admin/dashboard';
      case 'MANAGER': return '/manager/dashboard';
      case 'DOCTOR': return '/doctor/dashboard';
      case 'LABTECH':
      case 'LABHEAD': return '/lab-user/dashboard';
      case 'RECEPTIONIST': return '/receptionist/dashboard';
      case 'PATIENT': return '/patient/dashboard';
      default: return '/dashboard';
    }
  }, [currentRole]);

  /**
   * Master menu registry indexed by functional medical workflows and ISO 15189 use cases.
   * Static declaration within useMemo prevents recreation on each render cycle.
   */
  const allMenuItems = useMemo(() => [
    // === 1. TỔNG QUAN ===
    {
      id: 'dashboard',
      category: 'TỔNG QUAN',
      path: dashboardPath,
      label: 'Bảng Điều Khiển',
      icon: FaTachometerAlt,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'NURSE', 'WAREHOUSESTAFF', 'RECEPTIONIST', 'CASHIER', 'PATIENT'],
      badge: null
    },
    {
      id: 'notifications',
      category: 'TỔNG QUAN',
      path: '/laboratory/notifications',
      label: 'Thông Báo Kết Quả',
      icon: FaBell,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR', 'RECEPTIONIST', 'PATIENT'],
      badge: { text: 'UC60', bg: 'primary' }
    },

    // === 2. TIẾP ĐÓN & BỆNH NHÂN ===
    {
      id: 'check-in-qr',
      category: 'TIẾP ĐÓN & LỊCH HẸN',
      path: '/receptionist/check-in',
      label: 'Check-in QR Code',
      icon: FaQrcode,
      allowedRoles: ['ADMIN', 'RECEPTIONIST'],
      badge: { text: 'QR', bg: 'success' }
    },
    {
      id: 'create-patient',
      category: 'TIẾP ĐÓN & LỊCH HẸN',
      path: '/receptionist/create-patient',
      label: 'Tạo Hồ Sơ Bệnh Nhân',
      icon: FaUserPlus,
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'NURSE'],
      badge: null
    },
    {
      id: 'patients',
      category: 'TIẾP ĐÓN & LỊCH HẸN',
      path: '/patients',
      label: 'Hồ Sơ & Tiếp Đón',
      icon: FaUsers,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'RECEPTIONIST', 'CASHIER'],
      badge: null
    },
    {
      id: 'appointments',
      category: 'TIẾP ĐÓN & LỊCH HẸN',
      path: '/appointments',
      label: 'Lịch Hẹn Khám Bệnh',
      icon: FaCalendarAlt,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST'],
      badge: null
    },

    // === 3. KHÁM BỆNH & CHẨN ĐOÁN (DOCTOR) ===
    {
      id: 'medical-assessments',
      category: 'CHẨN ĐOÁN & KHÁM',
      path: '/medical-assessments',
      label: 'Đánh Giá Y Khoa (ICD-10)',
      icon: FaStethoscope,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR'],
      badge: { text: 'UC50', bg: 'primary' }
    },
    {
      id: 'medical-notes',
      category: 'CHẨN ĐOÁN & KHÁM',
      path: '/doctor/medical-notes',
      label: 'Ghi Chú Y Khoa',
      icon: FaNotesMedical,
      allowedRoles: ['DOCTOR'],
      badge: { text: 'UC51', bg: 'primary' }
    },
    {
      id: 'doctor-approval',
      category: 'CHẨN ĐOÁN & KHÁM',
      path: '/doctor/dashboard?filter=pending_approval',
      label: 'Duyệt Kết Quả Lab',
      icon: FaCheckCircle,
      allowedRoles: ['DOCTOR', 'LABHEAD', 'MANAGER'],
      badge: { text: 'Duyệt KQ', bg: 'warning' }
    },
    {
      id: 'patient-feedback',
      category: 'CHẨN ĐOÁN & KHÁM',
      path: '/feedback',
      label: 'Đánh Giá Từ Bệnh Nhân',
      icon: FaStar,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST'],
      badge: null
    },

    // === 4. NGHIỆP VỤ PHÒNG XÉT NGHIỆM (LABORATORY) ===
    {
      id: 'validate-sample',
      category: 'NGHIỆP VỤ XÉT NGHIỆM',
      path: '/lab-user/validate-sample',
      label: 'Kiểm Chuẩn Mẫu (Validate)',
      icon: FaVial,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH'],
      badge: { text: 'Validate', bg: 'warning' }
    },
    {
      id: 'lab-queue',
      category: 'NGHIỆP VỤ XÉT NGHIỆM',
      path: '/lab/queue',
      label: 'Mẫu Bệnh Phẩm & Hàng Đợi',
      icon: FaVial,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR', 'RECEPTIONIST'],
      badge: { text: 'ISO 15189', bg: 'danger' }
    },
    {
      id: 'qc-flags',
      category: 'NGHIỆP VỤ XÉT NGHIỆM',
      path: '/laboratory/qc-flags',
      label: 'Cờ Kiểm Chuẩn QC',
      icon: FaFlask,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH'],
      badge: { text: 'QC', bg: 'danger' }
    },
    {
      id: 'lab-rooms',
      category: 'NGHIỆP VỤ XÉT NGHIỆM',
      path: '/laboratory/rooms',
      label: 'Phòng Xét Nghiệm',
      icon: FaDoorOpen,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH'],
      badge: null
    },
    {
      id: 'lab-profiles',
      category: 'NGHIỆP VỤ XÉT NGHIỆM',
      path: '/laboratory/lab-profiles',
      label: 'Quản Lý Hồ Sơ Lab',
      icon: FaUsersCog,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD'],
      badge: { text: 'UC61', bg: 'primary' }
    },
    {
      id: 'criteria',
      category: 'NGHIỆP VỤ XÉT NGHIỆM',
      path: '/criteria',
      label: 'Chỉ Số Xét Nghiệm',
      icon: FaNotesMedical,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'],
      badge: null
    },
    {
      id: 'reference-intervals',
      category: 'NGHIỆP VỤ XÉT NGHIỆM',
      path: '/laboratory/reference-intervals',
      label: 'Khoảng Tham Chiếu',
      icon: FaHeartbeat,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'],
      badge: { text: 'UC57', bg: 'success' }
    },

    // === 5. THEO DÕI & LỊCH SỬ MẪU ===
    {
      id: 'sample-timeline',
      category: 'LỊCH SỬ & THEO DÕI',
      path: '/laboratory/sample-timeline',
      label: 'Hành Trình Mẫu Bệnh Phẩm',
      icon: FaHistory,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'NURSE', 'RECEPTIONIST', 'PATIENT'],
      badge: { text: 'UC71', bg: 'info' }
    },
    {
      id: 'specimen-history',
      category: 'LỊCH SỬ & THEO DÕI',
      path: '/laboratory/specimens/history',
      label: 'Lịch Sử Mẫu Bệnh Phẩm',
      icon: FaHistory,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR', 'RECEPTIONIST'],
      badge: { text: 'UC70', bg: 'info' }
    },
    {
      id: 'test-history',
      category: 'LỊCH SỬ & THEO DÕI',
      path: '/patient/test-history',
      label: 'Lịch Sử Xét Nghiệm',
      icon: FaHistory,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'PATIENT'],
      badge: { text: 'UC76', bg: 'info' }
    },

    // === 6. VẬN HÀNH & KHO ===
    {
      id: 'inventory',
      category: 'KHO & VẬN HÀNH',
      path: '/inventory',
      label: 'Quản Lý Kho Hóa Chất',
      icon: FaBoxOpen,
      allowedRoles: ['ADMIN', 'MANAGER', 'WAREHOUSESTAFF', 'LABHEAD', 'LABTECH'],
      badge: { text: 'UC56', bg: 'primary' }
    },
    {
      id: 'schedule',
      category: 'KHO & VẬN HÀNH',
      path: '/schedule',
      label: 'Phân Bổ Ca Làm Việc',
      icon: FaClock,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST', 'LABHEAD', 'LABTECH'],
      badge: null
    },
    {
      id: 'packages',
      category: 'KHO & VẬN HÀNH',
      path: '/admin/packages',
      label: 'Quản Lý Gói Dịch Vụ',
      icon: FaBoxOpen,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST', 'CASHIER'],
      badge: null
    },
    {
      id: 'invoices',
      category: 'KHO & VẬN HÀNH',
      path: '/invoices',
      label: 'Hóa Đơn & Biên Lai',
      icon: FaReceipt,
      allowedRoles: ['ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'],
      badge: null
    },
    {
      id: 'reports',
      category: 'KHO & VẬN HÀNH',
      path: '/admin/reports',
      label: 'Báo Cáo Thống Kê',
      icon: FaChartBar,
      allowedRoles: ['ADMIN', 'MANAGER'],
      badge: null
    },

    // === 7. QUẢN TRỊ HỆ THỐNG ===
    {
      id: 'users',
      category: 'QUẢN TRỊ HỆ THỐNG',
      path: '/admin/user-management',
      label: 'Quản Lý Người Dùng',
      icon: FaUserCog,
      allowedRoles: ['ADMIN'],
      badge: null
    },
    {
      id: 'doctor-management',
      category: 'QUẢN TRỊ HỆ THỐNG',
      path: '/admin/doctor-management',
      label: 'Quản Lý Bác Sĩ',
      icon: FaUserMd,
      allowedRoles: ['ADMIN'],
      badge: null
    },
    {
      id: 'employees',
      category: 'QUẢN TRỊ HỆ THỐNG',
      path: '/admin/employees',
      label: 'Quản Lý Nhân Sự',
      icon: FaUserNurse,
      allowedRoles: ['ADMIN', 'MANAGER'],
      badge: null
    },
    {
      id: 'roles',
      category: 'QUẢN TRỊ HỆ THỐNG',
      path: '/roles',
      label: 'Phân Quyền Vai Trò',
      icon: FaShieldAlt,
      allowedRoles: ['ADMIN'],
      badge: null
    },
    {
      id: 'audit-logs',
      category: 'QUẢN TRỊ HỆ THỐNG',
      path: '/admin/audit-logs',
      label: 'Nhật Ký Kiểm Toán (Audit)',
      icon: FaShieldAlt,
      allowedRoles: ['ADMIN', 'MANAGER'],
      badge: null
    },
    {
      id: 'backup',
      category: 'QUẢN TRỊ HỆ THỐNG',
      path: '/admin/backup',
      label: 'Sao Lưu & Khôi Phục',
      icon: FaDatabase,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD'],
      badge: { text: 'UC80', bg: 'primary' }
    },

    // === 8. TÀI KHOẢN CÁ NHÂN ===
    {
      id: 'profile',
      category: 'CÁ NHÂN',
      path: '/profile',
      label: 'Hồ Sơ Cá Nhân',
      icon: FaUserCircle,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'NURSE', 'WAREHOUSESTAFF', 'RECEPTIONIST', 'CASHIER', 'PATIENT'],
      badge: null
    },
    {
      id: 'change-password',
      category: 'CÁ NHÂN',
      path: '/change-password',
      label: 'Đổi Mật Khẩu',
      icon: FaKey,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'NURSE', 'WAREHOUSESTAFF', 'RECEPTIONIST', 'CASHIER', 'PATIENT'],
      badge: null
    }
  ], [dashboardPath]);

  // Dynamic menu filtering per active user role
  const visibleItems = useMemo(() => {
    return allMenuItems.filter(item => item.allowedRoles.includes(currentRole));
  }, [allMenuItems, currentRole]);

  // Aggregate items into grouped functional categories to improve visual hierarchy
  const groupedMenuItems = useMemo(() => {
    const groups = [];
    let currentCategory = null;
    let currentGroup = null;

    visibleItems.forEach(item => {
      const cat = item.category || 'CHỨC NĂNG';
      if (cat !== currentCategory) {
        currentCategory = cat;
        currentGroup = { category: cat, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    });

    return groups;
  }, [visibleItems]);

  // Checks URL path matching while accounting for custom root dashboard paths
  const isItemActive = (path) => {
    const basePath = path.split('?')[0];
    if (basePath === dashboardPath || basePath === '/dashboard') {
      return location.pathname === basePath || 
             location.pathname === '/dashboard' ||
             location.pathname === '/admin/dashboard' || 
             location.pathname === '/doctor/dashboard';
    }
    return location.pathname.startsWith(basePath);
  };

  const handleItemClick = () => {
    if (isMobile && handleClose) {
      handleClose();
    }
  };

  return (
    <aside
      className={`bms-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}
      aria-label="Thanh điều hướng chính"
      style={{
        width: isCollapsed ? '78px' : '265px',
        transition: 'width 0.25s ease',
        backgroundColor: '#1b1b28',
        zIndex: isMobile ? 1051 : 1000,
        position: isMobile ? 'relative' : 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto'
      }}
    >
      {/* Brand Logo & Mobile Dismissal Header */}
      <div 
        className="bms-sidebar-brand d-flex align-items-center justify-content-between p-3 border-bottom border-secondary border-opacity-25"
        style={{ height: '64px' }}
      >
        <Link 
          to="/" 
          className="d-flex align-items-center text-decoration-none text-white gap-2 flex-grow-1 overflow-hidden" 
          onClick={handleItemClick}
        >
          <div className="bms-brand-icon-wrapper flex-shrink-0">
            <img 
              src="/assets/bms-logo.png" 
              alt="BMS Logo" 
              style={{ width: '30px', height: '30px', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          {!isCollapsed && (
            <div className="bms-brand-text text-truncate lh-sm">
              <span className="fw-bold tracking-tight text-white d-block" style={{ fontSize: '0.95rem' }}>
                BMS LABORATORY
              </span>
              <span className="bms-brand-subtext text-muted" style={{ fontSize: '0.68rem' }}>
                Hệ Thống Y Tế ISO 15189
              </span>
            </div>
          )}
        </Link>

        {isMobile && (
          <Button variant="link" className="text-light p-0 ms-2" onClick={handleClose} aria-label="Đóng thanh điều hướng">
            <FaTimes size={18} />
          </Button>
        )}
      </div>

      {/* Role Indicator Banner */}
      {!isCollapsed && (
        <div className="bms-sidebar-role-indicator px-3 py-1.5 bg-black bg-opacity-25 border-bottom border-secondary border-opacity-10 d-flex align-items-center justify-content-between">
          <span className="text-muted small text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>Phân hệ:</span>
          <span className={`badge bg-primary text-uppercase bms-role-tag ${currentRole.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
            {currentRole}
          </span>
        </div>
      )}

      {/* Navigation List */}
      <div 
        className="bms-sidebar-menu flex-grow-1 overflow-auto custom-scrollbar p-2"
        style={{ minHeight: 0, flex: '1 1 auto' }}
      >
        <Nav className="flex-column gap-1">
          {groupedMenuItems.map((group, groupIdx) => (
            <div key={`group-${groupIdx}`} className="mb-2">
              {!isCollapsed ? (
                <div 
                  className="px-3 pt-2 pb-1 text-uppercase text-light opacity-50 fw-bold" 
                  style={{ fontSize: '0.66rem', letterSpacing: '0.6px' }}
                >
                  {group.category}
                </div>
              ) : (
                groupIdx > 0 && <div className="my-2 border-top border-secondary opacity-25 w-75 mx-auto" />
              )}

              {group.items.map((item) => {
                const IconComponent = item.icon;
                const active = isItemActive(item.path);

                const navLink = (
                  <Nav.Link
                    as={Link}
                    to={item.path}
                    key={item.id}
                    onClick={handleItemClick}
                    className={`bms-sidebar-link d-flex align-items-center rounded-2 px-3 py-2 text-white text-decoration-none ${
                      active ? 'active bg-primary shadow-sm fw-medium' : 'hover-item opacity-75'
                    }`}
                    style={{ fontSize: '0.88rem', transition: 'all 0.15s ease' }}
                  >
                    <span 
                      className={`bms-link-icon d-flex align-items-center justify-content-center ${isCollapsed ? 'mx-auto' : 'me-3 flex-shrink-0'}`}
                      style={{ width: '20px' }}
                    >
                      <IconComponent size={isCollapsed ? 18 : 16} />
                    </span>

                    {!isCollapsed && (
                      <span className="bms-link-label text-truncate flex-grow-1">
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <Badge bg={item.badge.bg} pill className="ms-auto bms-menu-badge" style={{ fontSize: '0.65rem' }}>
                        {item.badge.text}
                      </Badge>
                    )}

                    {!isCollapsed && active && !item.badge && (
                      <FaChevronRight size={10} className="ms-auto opacity-75" />
                    )}
                  </Nav.Link>
                );

                if (isCollapsed) {
                  return (
                    <OverlayTrigger
                      key={item.id}
                      placement="right"
                      delay={{ show: 200, hide: 300 }}
                      overlay={<Tooltip id={`tooltip-${item.id}`}>{item.label}</Tooltip>}
                    >
                      <div>{navLink}</div>
                    </OverlayTrigger>
                  );
                }

                return navLink;
              })}
            </div>
          ))}
        </Nav>
      </div>

      {/* User Information Card */}
      <div 
        className="bms-sidebar-user-card p-2.5 px-3 border-top border-secondary border-opacity-25 bg-black bg-opacity-20 d-flex align-items-center flex-shrink-0"
        style={{ minHeight: '60px' }}
      >
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold shadow-sm"
          style={{ width: '36px', height: '36px', fontSize: '15px' }}
        >
          {user?.fullName ? user.fullName.trim()[0].toUpperCase() : <FaUserCircle size={20} />}
        </div>

        {!isCollapsed && (
          <div className="ms-2.5 overflow-hidden flex-grow-1 lh-sm">
            <div className="text-white small fw-semibold text-truncate" title={user?.fullName || user?.name}>
              {user?.fullName || user?.name || 'Nhân viên BMS'}
            </div>
            <div className="text-muted small text-truncate" style={{ fontSize: '0.7rem' }} title={user?.email}>
              {user?.email || `${currentRole.toLowerCase()}@bms.med`}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Collapse Toggle */}
      {!isMobile && (
        <div className="bms-sidebar-footer border-top border-secondary border-opacity-10 bg-black bg-opacity-40">
          <button
            type="button"
            className="btn btn-link text-secondary w-100 text-decoration-none d-flex align-items-center justify-content-center py-2 bms-collapse-btn rounded-0"
            onClick={handleToggle}
            aria-label={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
            style={{ fontSize: '0.82rem' }}
          >
            {isCollapsed ? (
              <FaChevronRight size={14} />
            ) : (
              <>
                <FaChevronLeft className="me-2" size={13} />
                <span>Thu gọn menu</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Component Scoped CSS */}
      <style>{`
        .bms-sidebar .hover-item:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          opacity: 1 !important;
          color: #ffffff !important;
        }
        .bms-sidebar .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .bms-sidebar .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .bms-sidebar .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 4px;
        }
        .bms-sidebar .bms-collapse-btn:hover {
          color: #0d6efd !important;
        }
      `}</style>
    </aside>
  );
}