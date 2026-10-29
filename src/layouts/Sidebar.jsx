/**
 * Sidebar Component
 * * Navigation sidebar component for the Blood Laboratory Management System.
 * Provides role-based navigation menu with collapsible sections and active state management.
 * * @author Blood Laboratory Management Team
 * @version 1.1.0
 * @since 2024
 */

import React, { useMemo } from 'react';
import { Nav, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import {
  FaTachometerAlt,
  FaUsers,
  FaCalendarAlt,
  FaComments,
  FaCogs,
  FaReceipt,
  FaChartBar,
  FaBoxes,
  FaClock,
  FaUserMd,
  FaUserCog,
  FaShieldAlt,
  FaTimes,
  FaChevronRight,
  FaChevronLeft,
  FaVial,
  FaEdit,
  FaQrcode,
  FaUserPlus
} from 'react-icons/fa';

const Sidebar = ({ onClose, isCollapsed, onToggleCollapse, isMobile = false }) => {
  const location = useLocation();
  const { user, userRoleId, userRole, loading: authLoading, hasRole } = useAuth();

  // --- Logic: Xác định Dashboard Path ---
  const getDashboardPath = useMemo(() => {
    switch (userRoleId) {
      case 1: return '/admin/dashboard';
      case 2: return '/manager/dashboard';
      case 3: return '/doctor/dashboard';
      case 4: return '/lab-user/dashboard';
      case 5: return '/patient/dashboard';
      case 6: return '/receptionist/dashboard';
      default:
        // Fallback cho string role
        switch (userRole) {
          case 'admin': return '/admin/dashboard';
          case 'manager': return '/manager/dashboard';
          case 'doctor': return '/doctor/dashboard';
          case 'lab_user': return '/lab-user/dashboard';
          case 'receptionist': return '/receptionist/dashboard';
          case 'patient': return '/patient/dashboard';
          default: return '/dashboard';
        }
    }
  }, [userRoleId, userRole]);

  // --- Logic: Định nghĩa Menu Items ---
  const menuItems = useMemo(() => [
    {
      path: getDashboardPath,
      icon: FaTachometerAlt,
      label: 'Dashboard',
      roles: ['admin', 'doctor', 'manager', 'receptionist', 'patient'],
      color: 'primary'
    },
        {
      path: '/lab-user/validate-sample',
      icon: FaVial,
      label: 'Validate Sample',
      roles: ['lab_user', 'manager'],
      roleIds: [4, 2],
      color: 'warning'
    },
    // --- ADMIN SECTION ---
    {
      path: '/admin/patients',
      icon: FaUsers,
      label: 'Quản lý bệnh nhân',
      roles: ['admin'],
      roleIds: [1],
      color: 'success'
    },
    {
      path: '/admin/sample-management',
      icon: FaVial,
      label: 'Mẫu xét nghiệm',
      roles: ['admin'],
      roleIds: [1],
      color: 'danger'
    },
    {
      path: '/admin/services',
      icon: FaCogs,
      label: 'Quản lý gói dịch vụ',
      roles: ['admin'],
      roleIds: [1],
      color: 'info'
    },
    {
      path: '/admin/invoices',
      icon: FaReceipt,
      label: 'Hóa đơn',
      roles: ['admin'],
      roleIds: [1],
      color: 'success'
    },
    {
      path: '/admin/reports',
      icon: FaChartBar,
      label: 'Báo cáo',
      roles: ['admin'],
      roleIds: [1],
      color: 'primary'
    },
    {
      path: '/admin/inventory-management',
      icon: FaBoxes,
      label: 'Quản lý kho',
      roles: ['admin'],
      roleIds: [1],
      color: 'warning'
    },
    {
      path: '/admin/shift-assignment',
      icon: FaClock,
      label: 'Phân bổ ca làm việc',
      roles: ['admin'],
      roleIds: [1],
      color: 'info'
    },
    {
      path: '/admin/user-management',
      icon: FaUserCog,
      label: 'Quản lý người dùng',
      roles: ['admin'],
      roleIds: [1],
      color: 'danger'
    },
    {
      path: '/admin/role-management',
      icon: FaShieldAlt,
      label: 'Phân quyền',
      roles: ['admin'],
      roleIds: [1],
      color: 'dark'
    },
    {
      path: '/admin/lab-rooms',
      icon: FaVial,
      label: 'Phòng Lab',
      roles: ['admin'],
      roleIds: [1],
      color: 'primary'
    },

    // --- LAB USER SECTION ---
    {
      path: '/lab-user/sample-management',
      icon: FaVial,
      label: 'Mẫu xét nghiệm',
      roles: ['lab_user'],
      roleIds: [4],
      color: 'success'
    },
    {
      path: '/lab-user/appointments',
      icon: FaCalendarAlt,
      label: 'Lịch hẹn appointments',
      roles: ['lab_user'],
      roleIds: [4],
      color: 'info'
    },
    {
      path: '/lab-user/lab-rooms',
      icon: FaVial,
      label: 'Phòng Lab',
      roles: ['lab_user'],
      roleIds: [4],
      color: 'primary'
    },



    // --- DOCTOR SECTION ---
    {
      path: '/doctor/schedule',
      icon: FaClock,
      label: 'Lịch làm việc',
      roles: ['doctor'],
      roleIds: [3],
      color: 'success'
    },
    {
      path: '/doctor/appointments',
      icon: FaCalendarAlt,
      label: 'Lịch hẹn appointment',
      roles: ['doctor'],
      roleIds: [3],
      color: 'info'
    },

    // --- MANAGER SECTION ---
    {
      path: '/manager/sample-management',
      icon: FaVial,
      label: 'Mẫu xét nghiệm',
      roles: ['manager'],
      roleIds: [2],
      color: 'success'
    },
    {
      path: '/manager/services',
      icon: FaCogs,
      label: 'Quản lý gói dịch vụ',
      roles: ['manager'],
      roleIds: [2],
      color: 'info'
    },
    {
      path: '/manager/inventory-management',
      icon: FaBoxes,
      label: 'Quản lý kho',
      roles: ['manager'],
      roleIds: [2],
      color: 'warning'
    },
    {
      path: '/manager/shift-assignment',
      icon: FaClock,
      label: 'Phân bổ ca',
      roles: ['manager'],
      roleIds: [2],
      color: 'info'
    },

    // --- RECEPTIONIST SECTION ---
    {
      path: '/receptionist/sample-management',
      icon: FaVial,
      label: 'Mẫu xét nghiệm',
      roles: ['receptionist'],
      roleIds: [6],
      color: 'success'
    },
    {
      path: '/receptionist/appointments',
      icon: FaCalendarAlt,
      label: 'Lịch hẹn appointments',
      roles: ['receptionist'],
      roleIds: [6],
      color: 'primary'
    },
    {
      path: '/receptionist/services',
      icon: FaCogs,
      label: 'Quản lý gói dịch vụ',
      roles: ['receptionist'],
      roleIds: [6],
      color: 'info'
    },
    {
      path: '/receptionist/check-in',
      icon: FaQrcode,
      label: 'Check-in QR Code',
      roles: ['receptionist'],
      roleIds: [6],
      color: 'primary'
    },
    {
      path: '/receptionist/create-patient',
      icon: FaUserPlus,
      label: 'Tạo Hồ Sơ Bệnh Nhân',
      roles: ['receptionist'],
      roleIds: [6],
      color: 'success'
    },

  ], [getDashboardPath]);

  // --- Logic: Filter Menu theo Role ---
  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    try {
      return menuItems.filter(item => {
        if (item.roles && item.roles.length > 0) {
          try {
            return hasRole(item.roles);
          } catch (error) {
            // Fallback
            return item.roles.includes(userRole);
          }
        }
        return true;
      });
    } catch (error) {
      console.error('Error filtering menu items:', error);
      return [];
    }
  }, [menuItems, user, userRole, hasRole]);

  // --- Logic: Check Active State ---
  // Cải tiến: Active khi path hiện tại BẮT ĐẦU bằng path menu (trừ dashboard)
  const isActive = (path) => {
    if (path === getDashboardPath) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // --- Render Loading ---
  if (authLoading || !user) {
    return (
      <div className="sidebar h-100 shadow-lg bg-dark d-flex align-items-center justify-content-center">
        <div className="spinner-border spinner-border-sm text-light" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div
      className={`sidebar shadow-lg d-flex flex-column ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      style={{
        width: isCollapsed ? '80px' : '280px',
        height: '100vh',
        transition: 'width 0.3s ease',
        backgroundColor: '#1e1e2d', // Dark theme standard
        zIndex: isMobile ? 1051 : 1000,
        position: isMobile ? 'relative' : 'fixed',
        left: isMobile ? 'auto' : 0,
        top: 0,
        bottom: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        willChange: 'width'
      }}
    >
      {/* 1. HEADER & TOGGLE BUTTON */}
      <div className="sidebar-header p-3 border-bottom border-secondary d-flex align-items-center justify-content-between" style={{ height: '70px', marginTop: isMobile ? '0' : '70px' }}>

        {/* Toggle Sidebar Button */}
        <Button
          variant="link"
          className={`d-flex align-items-center text-light p-0 text-decoration-none ${isCollapsed ? 'justify-content-center w-100' : ''}`}
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          style={{ flex: 1 }}
        >
          {isCollapsed ? (
            <FaChevronRight size={18} style={{ color: '#0d6efd' }} />
          ) : (
            <>
              <FaChevronLeft className="me-2" size={18} style={{ color: '#0d6efd' }} />
              <span className="text-white fw-semibold text-nowrap" style={{ fontSize: '0.95rem' }}>
                Thu gọn
              </span>
            </>
          )}
        </Button>

        {/* Close Button (Mobile) */}
        <Button
          variant="link"
          className="d-md-none text-light p-0"
          onClick={onClose}
        >
          <FaTimes size={20} />
        </Button>
      </div>

      {/* 2. NAVIGATION LIST */}
      <div className="flex-grow-1 overflow-auto custom-scrollbar p-2"
        style={{
          minHeight: 0,
          flex: '1 1 auto'
        }}>
        <Nav className="flex-column gap-1">
          {filteredMenuItems.map((item, index) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);

            // Nội dung của Link
            const LinkContent = (
              <>
                <div
                  className={`d-flex align-items-center justify-content-center ${isCollapsed ? '' : 'me-3'}`}
                  style={{ width: '24px' }}
                >
                  <IconComponent size={isCollapsed ? 20 : 18} />
                </div>

                {!isCollapsed && (
                  <div className="flex-grow-1 text-truncate" style={{ fontSize: '0.95rem' }}>
                    {item.label}
                  </div>
                )}

                {!isCollapsed && active && (
                  <FaChevronRight size={12} className="ms-2 opacity-75" />
                )}
              </>
            );

            return (
              <Nav.Item key={`${item.path}-${index}`}>
                {/* Nếu collapsed, hiển thị Tooltip khi hover */}
                {isCollapsed ? (
                  <OverlayTrigger
                    placement="right"
                    delay={{ show: 250, hide: 400 }}
                    overlay={<Tooltip id={`tooltip-${index}`}>{item.label}</Tooltip>}
                  >
                    <Link
                      to={item.path}
                      className={`nav-link d-flex align-items-center justify-content-center p-3 rounded-3 mb-1 text-white text-decoration-none ${active ? 'bg-primary shadow-sm' : 'hover-bg-secondary'}`}
                      style={{ transition: 'all 0.2s', opacity: active ? 1 : 0.75 }}
                      onClick={(e) => active && e.preventDefault()}
                    >
                      {LinkContent}
                    </Link>
                  </OverlayTrigger>
                ) : (
                  <Link
                    to={item.path}
                    className={`nav-link d-flex align-items-center p-3 rounded-3 mb-1 text-white text-decoration-none ${active ? 'bg-primary shadow-sm' : 'hover-bg-secondary'}`}
                    style={{ transition: 'all 0.2s', opacity: active ? 1 : 0.8 }}
                    onClick={(e) => active && e.preventDefault()}
                  >
                    {LinkContent}
                  </Link>
                )}
              </Nav.Item>
            );
          })}
        </Nav>
      </div>

      {/* 3. FOOTER (USER INFO) */}
      <div className="sidebar-footer p-3 border-top border-secondary bg-dark bg-opacity-25 flex-shrink-0"
        style={{
          width: isCollapsed ? '80px' : '280px',
          transition: 'width 0.3s ease',
          minHeight: '80px'
        }}>
        <div className={`d-flex align-items-center ${isCollapsed ? 'justify-content-center' : ''}`}>
          <div
            className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white flex-shrink-0 shadow-sm"
            style={{ width: '40px', height: '40px', fontSize: '18px' }}
          >
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <FaUserCog />}
          </div>

          {!isCollapsed && (
            <div className="ms-3 overflow-hidden">
              <div className="text-white fw-semibold text-truncate" title={user?.fullName}>
                {user?.fullName || 'User'}
              </div>
              <div className="text-white small text-truncate" style={{ opacity: 0.8 }} title={user?.email}>
                {user?.email}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Inline cho Hover Effect nếu chưa có trong file CSS toàn cục */}
      <style>{`
        .hover-bg-secondary:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          opacity: 1 !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
