/**
 * @file AppHeader.jsx
 * @description Primary authenticated navigation header for BMS Management Portal.
 * Displays breadcrumbs, system clinical status, notification triggers, and user profile session menu.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React, { useMemo } from 'react';
import { Dropdown, Badge, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaBars,
  FaBell,
  FaUserCircle,
  FaShieldAlt,
  FaSignOutAlt,
  FaKey,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

/**
 * Maps system route paths to friendly Vietnamese medical breadcrumb titles.
 */
const ROUTE_TITLE_MAP = {
  '/inventory': 'Kho Hóa Chất & Sinh Phẩm',
  '/dashboard': 'Bảng Điều Khiển Tổng Quan',
  '/lab/queue': 'Hàng Đợi Mẫu Xét Nghiệm',
  '/criteria': 'Danh Mục Chỉ Số & Dải Tham Chiếu',
  '/laboratory/criteria': 'Danh Mục Chỉ Số & Dải Tham Chiếu',
  '/services': 'Danh Mục Dịch Vụ Xét Nghiệm',
  '/catalog': 'Danh Mục Dịch Vụ Xét Nghiệm',
  '/admin/packages': 'Quản Lý Gói Dịch Vụ',
  '/packages': 'Quản Lý Gói Dịch Vụ',
  '/schedule': 'Lịch Trực Bác Sĩ & Điều Phối',
  '/doctor/schedule': 'Lịch Trực Bác Sĩ & Điều Phối',
  '/admin/employees': 'Quản Trị Nhân Sự Y Tế',
  '/admin/users': 'Quản Trị Nhân Sự Y Tế',
  '/users': 'Quản Trị Nhân Sự Y Tế',
  '/roles': 'Quản Lý Phân Quyền Vai Trò (RBAC)',
  '/profile': 'Hồ Sơ Tài Khoản Cá Nhân',
  '/change-password': 'Thay Đổi Mật Khẩu Bảo Mật'
};

/**
 * Returns role badge visual configuration.
 *
 * @param {string} role Raw role string
 * @returns {{ label: string, colorClass: string }} Badge config
 */
function getRoleBadgeConfig(role) {
  const r = (role || '').toUpperCase();
  if (r.includes('ADMIN')) return { label: 'Quản Trị Viên', colorClass: 'badge-admin' };
  if (r.includes('MANAGER')) return { label: 'Quản Lý Lab', colorClass: 'badge-manager' };
  if (r.includes('WAREHOUSE')) return { label: 'Nhân Viên Kho', colorClass: 'badge-manager' };
  if (r.includes('DOCTOR') || r.includes('BACSI')) return { label: 'Bác Sĩ Lâm Sàng', colorClass: 'badge-doctor' };
  if (r.includes('HEAD')) return { label: 'Trưởng Phòng Xét Nghiệm', colorClass: 'badge-labhead' };
  if (r.includes('TECH') || r.includes('LAB')) return { label: 'Kỹ Thuật Viên Lab', colorClass: 'badge-labtech' };
  if (r.includes('RECEPT')) return { label: 'Lễ Tân Tiếp Đón', colorClass: 'badge-receptionist' };
  if (r.includes('CASHIER')) return { label: 'Thu Ngân POS', colorClass: 'badge-cashier' };
  return { label: 'Bệnh Nhân / Khách', colorClass: 'badge-patient' };
}

/**
 * Application header component with user session menu and operational status indicators.
 *
 * @param {object} props Component properties
 * @param {Function} props.onToggleSidebar Callback to toggle sidebar
 * @returns {JSX.Element} Rendered app header
 */
export default function AppHeader({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve current user from storage
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const roleConfig = useMemo(() => {
    return getRoleBadgeConfig(user?.role || user?.roleName);
  }, [user]);

  const currentTitle = useMemo(() => {
    const matchedPath = Object.keys(ROUTE_TITLE_MAP).find(path =>
      location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
    );
    return matchedPath ? ROUTE_TITLE_MAP[matchedPath] : 'Cổng Quản Trị Y Tế BMS';
  }, [location.pathname]);

  // Handle user logout and clear session state
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

  return (
    <header className="bms-header shadow-sm bg-white border-bottom sticky-top">
      <div className="bms-header-container d-flex align-items-center justify-content-between px-3 py-2">
        {/* Left: Sidebar Toggle & Breadcrumb Title */}
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="light"
            className="bms-header-toggle-btn border p-2 d-flex align-items-center justify-content-center"
            onClick={onToggleSidebar}
            aria-label="Đóng mở thanh điều hướng"
          >
            <FaBars className="text-secondary" />
          </Button>

          <div className="bms-header-title-box">
            <h1 className="bms-header-title h5 mb-0 text-dark fw-bold">
              {currentTitle}
            </h1>
            <nav aria-label="breadcrumb" className="bms-header-breadcrumb">
              <span className="text-muted small">Hệ Thống BMS</span>
              <span className="text-muted mx-1 small">/</span>
              <span className="text-primary small fw-semibold">{currentTitle}</span>
            </nav>
          </div>
        </div>

        {/* Right: Operational Status + Notifications + Profile Dropdown */}
        <div className="d-flex align-items-center gap-3">
          {/* Clinical Status Indicator */}
          <div className="d-none d-lg-flex align-items-center gap-2 bms-system-status px-2 py-1 bg-light rounded-pill border">
            <FaCheckCircle className="text-success small" />
            <span className="text-muted small">Lab Online (ISO 15189)</span>
          </div>

          {/* Quick Notification Bell */}
          <Dropdown align="end">
            <Dropdown.Toggle
              as={Button}
              variant="light"
              className="bms-icon-btn position-relative border rounded-circle p-2"
              aria-label="Thông báo hệ thống"
            >
              <FaBell className="text-secondary" />
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '10px' }}>
                2
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="shadow-lg border-0 rounded-3 p-2" style={{ minWidth: 320 }}>
              <div className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom mb-2">
                <span className="fw-bold small text-dark">Cảnh Báo Lâm Sàng & Hệ Thống</span>
                <span className="badge bg-danger-subtle text-danger small">2 Mới</span>
              </div>
              <Dropdown.Item className="rounded-2 p-2 mb-1">
                <div className="d-flex align-items-start gap-2">
                  <FaExclamationTriangle className="text-danger mt-1 flex-shrink-0" />
                  <div>
                    <div className="fw-semibold small text-danger">Mẫu khẩn STAT: SMP-261017-0012</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>Phòng cấp cứu chuyển mẫu CBC - Cần phân tích ngay</div>
                  </div>
                </div>
              </Dropdown.Item>
              <Dropdown.Item className="rounded-2 p-2">
                <div className="d-flex align-items-start gap-2">
                  <FaCheckCircle className="text-success mt-1 flex-shrink-0" />
                  <div>
                    <div className="fw-semibold small text-dark">Kiểm chuẩn IQC Ca Sáng</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>Máy Cobas 6000 đạt quy tắc Westgard 1-3s</div>
                  </div>
                </div>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          {/* User Profile Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle
              as="button"
              className="bms-user-profile-btn d-flex align-items-center gap-2 border rounded-pill px-3 py-1 bg-white"
            >
              <div className="bms-avatar rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: 34, height: 34, fontSize: 14 }}>
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="d-none d-md-flex flex-column text-start">
                <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: 140, fontSize: '13px' }}>
                  {user?.fullName || 'Người Dùng BMS'}
                </span>
                <span className={`bms-role-badge ${roleConfig.colorClass}`}>
                  {roleConfig.label}
                </span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow-lg border-0 rounded-3 py-2" style={{ minWidth: 240 }}>
              <div className="px-3 py-2 border-bottom mb-1">
                <div className="fw-bold text-dark">{user?.fullName || 'Người Dùng BMS'}</div>
                <div className="text-muted small">{user?.email || 'user@bms.health.vn'}</div>
                <div className="mt-1">
                  <span className={`badge ${roleConfig.colorClass}`}>
                    {roleConfig.label}
                  </span>
                </div>
              </div>

              <Dropdown.Item as={Link} to="/profile" className="py-2">
                <FaUserCircle className="me-2 text-primary" />
                <span>Hồ Sơ Cá Nhân</span>
              </Dropdown.Item>

              <Dropdown.Item as={Link} to="/change-password" className="py-2">
                <FaKey className="me-2 text-warning" />
                <span>Đổi Mật Khẩu</span>
              </Dropdown.Item>

              <Dropdown.Divider />

              <Dropdown.Item onClick={handleLogout} className="py-2 text-danger fw-semibold">
                <FaSignOutAlt className="me-2" />
                <span>Đăng Xuất Phiên Làm Việc</span>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
