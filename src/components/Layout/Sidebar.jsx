/**
 * @file Sidebar.jsx
 * @description Role-based collapsible navigation sidebar for BMS Management Portal (Refined UC01/UC15).
 * Filters menu items dynamically according to current user role (BR-IAM-02).
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React, { useMemo } from 'react';
import { Nav, OverlayTrigger, Tooltip, Badge } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaVial,
  FaUserNurse,
  FaUserMd,
  FaStethoscope,
  FaUsersCog,
  FaShieldAlt,
  FaCalendarAlt,
  FaBoxOpen,
  FaNotesMedical,
  FaKey,
  FaUserCircle,
  FaChevronLeft,
  FaChevronRight,
  FaHospital,
  FaHeartbeat,
  FaDatabase,
  FaBell,
  FaHistory
} from 'react-icons/fa';

/**
 * Normalizes role string to standard uppercase format.
 *
 * @param {string} role Raw role string
 * @returns {string} Normalized role
 */
function normalizeRole(role) {
  if (!role) return 'PATIENT';
  const r = role.toString().trim().toUpperCase();
  if (r.includes('ADMIN')) return 'ADMIN';
  if (r.includes('MANAGER')) return 'MANAGER';
  if (r.includes('DOCTOR') || r.includes('BACSI')) return 'DOCTOR';
  if (r.includes('HEAD') || r.includes('TRUONGPHONG')) return 'LABHEAD';
  if (r.includes('TECH') || r.includes('LAB') || r.includes('KTV')) return 'LABTECH';
  if (r.includes('RECEPT') || r.includes('LETAN')) return 'RECEPTIONIST';
  if (r.includes('CASHIER') || r.includes('THUNGAN')) return 'CASHIER';
  return 'PATIENT';
}

/**
 * Sidebar navigation component with role-based filtering and collapse support.
 *
 * @param {object} props Component properties
 * @param {boolean} props.isCollapsed Desktop collapsed state (icon-only)
 * @param {Function} props.onToggle Desktop toggle callback
 * @param {boolean} [props.isMobile] Mobile rendering flag
 * @param {Function} [props.onCloseMobile] Mobile drawer close callback
 * @returns {JSX.Element} Rendered sidebar component
 */
export default function Sidebar({
  isCollapsed,
  onToggle,
  isMobile = false,
  onCloseMobile
}) {
  const location = useLocation();

  // Retrieve current user and role from client storage
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const currentRole = useMemo(() => {
    return normalizeRole(user?.role || user?.roleName);
  }, [user]);

  // Master menu registry across clinical, laboratory, reception and admin workflows
  const allMenuItems = useMemo(() => [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Bảng Điều Khiển',
      icon: FaTachometerAlt,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'RECEPTIONIST', 'CASHIER', 'PATIENT'],
      badge: null
    },
    {
      id: 'patients',
      path: '/patients',
      label: 'Hồ Sơ Bệnh Nhân & Tiếp Đón',
      icon: FaUserMd,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'RECEPTIONIST', 'CASHIER'],
      badge: null
    },
    {
      id: 'medical-assessments',
      path: '/medical-assessments',
      label: 'Đánh Giá Y Khoa (ICD-10)',
      icon: FaStethoscope,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR'],
      badge: { text: 'UC50', bg: 'primary' }
    },
    {
      id: 'medical-notes',
      path: '/doctor/medical-notes',
      label: 'Ghi Chú Y Khoa',
      icon: FaNotesMedical,
      allowedRoles: ['DOCTOR'],
      badge: { text: 'UC51', bg: 'primary' }
    },
    {
      id: 'lab-queue',
      path: '/lab/queue',
      label: 'Mẫu Bệnh Phẩm & Hàng Đợi Lab',
      icon: FaVial,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR', 'RECEPTIONIST'],
      badge: { text: 'ISO 15189', bg: 'danger' }
    },
    {
      id: 'specimen-history',
      path: '/laboratory/specimens/history',
      label: 'Lịch Sử Bệnh Phẩm',
      icon: FaHistory,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR', 'RECEPTIONIST'],
      badge: { text: 'UC70', bg: 'info' }
    },
    {
      id: 'schedule',
      path: '/schedule',
      label: 'Quản Lý Ca Trực',
      icon: FaCalendarAlt,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST', 'LABHEAD', 'LABTECH'],
      badge: null
    },
    {
      id: 'packages',
      path: '/admin/packages',
      label: 'Quản Lý Gói Dịch Vụ',
      icon: FaBoxOpen,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST', 'CASHIER'],
      badge: null
    },
    {
      id: 'criteria',
      path: '/criteria',
      label: 'Chỉ Số Xét Nghiệm',
      icon: FaNotesMedical,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'],
      badge: null
    },
    {
      id: 'reference-intervals',
      path: '/laboratory/reference-intervals',
      label: 'Khoảng Tham Chiếu',
      icon: FaHeartbeat,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'],
      badge: { text: 'UC57', bg: 'success' }
    },
    {
      id: 'notifications',
      path: '/laboratory/notifications',
      label: 'Thông Báo Kết Quả',
      icon: FaBell,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD', 'LABTECH', 'DOCTOR'],
      badge: { text: 'UC60', bg: 'primary' }
    },
    {
      id: 'employees',
      path: '/admin/employees',
      label: 'Quản Lý Nhân Sự',
      icon: FaUserNurse,
      allowedRoles: ['ADMIN', 'MANAGER'],
      badge: null
    },
    {
      id: 'roles',
      path: '/roles',
      label: 'Phân Quyền Vai Trò',
      icon: FaShieldAlt,
      allowedRoles: ['ADMIN'],
      badge: null
    },
    {
      id: 'backup',
      path: '/admin/backup',
      label: 'Sao Lưu & Khôi Phục',
      icon: FaDatabase,
      allowedRoles: ['ADMIN', 'MANAGER', 'LABHEAD'],
      badge: { text: 'UC80', bg: 'primary' }
    },
    {
      id: 'profile',
      path: '/profile',
      label: 'Hồ Sơ Cá Nhân',
      icon: FaUserCircle,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'RECEPTIONIST', 'CASHIER', 'PATIENT'],
      badge: null
    },
    {
      id: 'change-password',
      path: '/change-password',
      label: 'Đổi Mật Khẩu',
      icon: FaKey,
      allowedRoles: ['ADMIN', 'MANAGER', 'DOCTOR', 'LABHEAD', 'LABTECH', 'RECEPTIONIST', 'CASHIER', 'PATIENT'],
      badge: null
    }
  ], []);

  // Filter items permissible for current user role
  const visibleItems = useMemo(() => {
    return allMenuItems.filter(item => item.allowedRoles.includes(currentRole));
  }, [allMenuItems, currentRole]);

  // Determine active route state
  const isItemActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/admin/dashboard' || location.pathname === '/doctor/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleItemClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`bms-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}
      aria-label="Điều hướng chính"
    >
      {/* Sidebar Brand Header */}
      <div className="bms-sidebar-brand">
        <Link to="/" className="d-flex align-items-center text-decoration-none text-white gap-2" onClick={handleItemClick}>
          <div className="bms-brand-icon-wrapper">
            <img src="/assets/bms-logo.png" alt="BMS Logo" />
          </div>
          {!isCollapsed && (
            <div className="bms-brand-text">
              <span className="fw-bold tracking-tight">BMS LABORATORY</span>
              <span className="bms-brand-subtext">Hệ Thống Y Tế ISO 15189</span>
            </div>
          )}
        </Link>
      </div>

      {/* Role Indicator Banner */}
      {!isCollapsed && (
        <div className="bms-sidebar-role-indicator">
          <span className="text-muted small text-uppercase">Phân hệ:</span>
          <span className={`bms-role-tag ${currentRole.toLowerCase()}`}>
            {currentRole}
          </span>
        </div>
      )}

      {/* Navigation Menu */}
      <Nav className="flex-column bms-sidebar-menu flex-grow-1">
        {visibleItems.map((item) => {
          const IconComponent = item.icon;
          const active = isItemActive(item.path);

          const navLink = (
            <Nav.Link
              as={Link}
              to={item.path}
              key={item.id}
              onClick={handleItemClick}
              className={`bms-sidebar-link ${active ? 'active' : ''}`}
            >
              <span className="bms-link-icon">
                <IconComponent />
              </span>
              {!isCollapsed && (
                <span className="bms-link-label text-truncate flex-grow-1">
                  {item.label}
                </span>
              )}
              {!isCollapsed && item.badge && (
                <Badge bg={item.badge.bg} pill className="ms-auto bms-menu-badge">
                  {item.badge.text}
                </Badge>
              )}
            </Nav.Link>
          );

          if (isCollapsed) {
            return (
              <OverlayTrigger
                key={item.id}
                placement="right"
                overlay={<Tooltip id={`tooltip-${item.id}`}>{item.label}</Tooltip>}
              >
                <div>{navLink}</div>
              </OverlayTrigger>
            );
          }

          return navLink;
        })}
      </Nav>

      {/* Sidebar Footer with Collapse Toggle (Desktop only) */}
      {!isMobile && (
        <div className="bms-sidebar-footer">
          <button
            type="button"
            className="bms-collapse-btn"
            onClick={onToggle}
            aria-label={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          >
            {isCollapsed ? <FaChevronRight /> : <><FaChevronLeft className="me-2" /><span>Thu gọn</span></>}
          </button>
        </div>
      )}
    </aside>
  );
}
