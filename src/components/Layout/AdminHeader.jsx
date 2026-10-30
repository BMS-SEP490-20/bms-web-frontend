/**
 * Admin Header Component
 * 
 * Header component for administrators in the Blood Laboratory Management System.
 * Provides navigation and user profile access.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { Navbar, Nav, Container, Dropdown, Badge, Button } from 'react-bootstrap';
import {
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaBars
} from 'react-icons/fa';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getRoleDisplayName as getRoleDisplayNameUtil } from '../../features/users/utils/roleUtils';
import NotificationHistoryModal from '../../shared/components/Notification/NotificationHistoryModal';

/**
 * Admin Header Component
 * 
 * Header component for admin users with navigation and user menu.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onToggleSidebar - Function to toggle sidebar visibility
 * @returns {React.ReactNode} Admin header component
 */
const AdminHeader = ({ onToggleSidebar }) => {
  const { user, logout, userRoleId, userRoleName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get role display name (support both roleId and role string)
  const getRoleDisplayName = (role) => {
    // If userRoleName is available from context, use it
    if (userRoleName) {
      return userRoleName;
    }
    // Fallback to utility function
    return getRoleDisplayNameUtil(role) || role;
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    // Use roleId if available
    if (userRoleId) {
      const colors = {
        1: 'danger',    // Admin
        2: 'success',   // Doctor
        3: 'info',      // Lab User
        4: 'primary',   // Receptionist
        5: 'secondary', // Patient
        6: 'warning'    // Manager
      };
      return colors[userRoleId] || 'secondary';
    }
    // Fallback to role string
    const colors = {
      admin: 'danger',
      doctor: 'success',
      lab_user: 'info',
      manager: 'warning',
      receptionist: 'primary',
      patient: 'secondary'
    };
    return colors[role] || 'secondary';
  };

  return (
    <Navbar
      bg="primary"
      variant="dark"
      expand="lg"
      className="header-navbar shadow-lg"
      style={{ 
        zIndex: 1030,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%'
      }}
    >
      <Container fluid>
        {/* Mobile Menu Button */}
        <Button
          variant="outline-light"
          className="d-md-none me-3 border-0"
          onClick={onToggleSidebar}
          size="sm"
          style={{ borderRadius: '8px' }}
        >
          <FaBars />
        </Button>

        {/* Brand */}
        <div
          className="brand-section d-flex align-items-center"
          style={{
            cursor: 'default',
            transition: 'opacity 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <div className="brand-icon me-3">
            <img
              src="/logo1.png"
              alt="Logo"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          </div>
          <div className="brand-text">
            <h5 className="mb-0 text-white fw-bold">Phòng Xét Nghiệm Máu</h5>
            <small className="text-white-50">Hệ thống quản lý y tế</small>
          </div>
        </div>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center gap-2">
            {/* Notifications History Bell */}
            <NotificationHistoryModal variant="dark" />

            {/* User Profile Dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="outline-light"
                id="dropdown-basic"
                className="user-dropdown-toggle border-0 bg-transparent d-flex align-items-center"
                style={{ borderRadius: '25px' }}
              >
                <div className="user-avatar me-2">
                  <div className="avatar-circle bg-white text-primary rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '32px', height: '32px' }}>
                    <FaUser size={14} />
                  </div>
                </div>
                <div className="user-info text-start">
                  <div className="user-name fw-semibold text-white">{user?.fullName || 'User'}</div>
                  <Badge
                    bg={getRoleBadgeColor(user)}
                    className="role-badge"
                    style={{ fontSize: '0.7rem' }}
                  >
                    {getRoleDisplayName(user)}
                  </Badge>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu className="user-dropdown-menu">
                <Dropdown.Header className="user-dropdown-header">
                  <div className="d-flex align-items-center">
                    <div className="user-avatar-large me-2">
                      <FaUser />
                    </div>
                    <div>
                      <div className="fw-bold">{user?.fullName || 'User'}</div>
                      <small className="text-muted">{user?.email}</small>
                    </div>
                  </div>
                </Dropdown.Header>

                <Dropdown.Divider />

                {/* Ẩn "Hồ sơ cá nhân" và "Cài đặt" cho các role: lễ tân (6), labuser (4), bác sĩ (3), manager (2), admin (1) */}
                {/* Chỉ hiển thị cho role khác (ví dụ: patient - role 5) */}
                {userRoleId && ![1, 2, 3, 4, 6].includes(userRoleId) && (
                  <>
                    <Dropdown.Item as={Link} to="/profile" className="dropdown-item-custom">
                      <FaUser className="me-2" />
                      Hồ sơ cá nhân
                    </Dropdown.Item>

                    <Dropdown.Item as={Link} to="/settings" className="dropdown-item-custom">
                      <FaCog className="me-2" />
                      Cài đặt
                    </Dropdown.Item>

                    <Dropdown.Divider />
                  </>
                )}

                <Dropdown.Item
                  onClick={handleLogout}
                  className="dropdown-item-custom text-danger"
                >
                  <FaSignOutAlt className="me-2" />
                  Đăng xuất
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AdminHeader;
