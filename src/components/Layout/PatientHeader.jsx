/**
 * Patient Header Component
 * 
 * Header component for patients in the Blood Laboratory Management System.
 * Provides patient-specific navigation, user profile access, and logout functionality.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useEffect, useState } from 'react';
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import NotificationHistoryModal from '../../shared/components/Notification/NotificationHistoryModal';
import '../../shared/styles/guest-header.css';

/**
 * Patient Header Component
 * 
 * Header component for patient users with navigation to patient-specific pages.
 * Features user profile dropdown and logout functionality.
 * 
 * @param {Function} setActiveTab - Function to set active tab
 * @returns {React.ReactNode} Patient header component
 */
const PatientHeader = ({ setActiveTab }) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');

  // Load patient fullName when component mounts or user changes
  useEffect(() => {
    const loadPatientFullName = async () => {
      if (!user?.email) {
        // Fallback to username if no email
        setDisplayName(user?.fullName || user?.username || 'Bệnh nhân');
        return;
      }

      // If user already has fullName and it's not the same as username, use it
      if (user?.fullName && user?.fullName !== user?.username) {
        setDisplayName(user.fullName);
        return;
      }

      // Try to load patient data to get fullName
      try {
        const patientResult = await patientService.getPatientByEmail(user.email);
        if (patientResult.success && patientResult.data) {
          const patientData = patientResult.data;
          const patientFullName = patientData.fullName || patientData.FullName ||
            patientData.fullname || patientData.Fullname ||
            patientData.name || patientData.Name || '';

          if (patientFullName && patientFullName.trim() !== '') {
            setDisplayName(patientFullName);

            // Update user context with fullName if it's different
            if (user?.fullName !== patientFullName) {
              const updatedUser = {
                ...user,
                fullName: patientFullName,
                phone: patientData.phone || patientData.Phone || user.phone,
                dateOfBirth: patientData.dateOfBirth || patientData.DateOfBirth || user.dateOfBirth
              };
              updateUser(updatedUser);
            }
          } else {
            // No fullName in patient data, use username
            setDisplayName(user?.username || 'Bệnh nhân');
          }
        } else {
          // Patient record doesn't exist yet, use username
          setDisplayName(user?.username || 'Bệnh nhân');
        }
      } catch (error) {
        // Error loading patient data, use username as fallback
        setDisplayName(user?.fullName || user?.username || 'Bệnh nhân');
      }
    };

    loadPatientFullName();
  }, [user, updateUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Navbar bg="white" expand="lg" className="guest-header shadow-sm sticky-top">
      <Container>
        <Navbar.Brand href="/patient/dashboard" className="d-flex align-items-center" style={{
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          borderRadius: '10px',
          padding: '10px 20px',
          boxShadow: '0 4px 15px rgba(30, 60, 114, 0.3)'
        }}>
          <img
            src="/logo1.png"
            alt="Logo"
            style={{
              height: '60px',
              width: '60px',
              borderRadius: '50%',
              objectFit: 'cover',
              marginRight: '15px',
              boxShadow: '0 4px 15px rgba(13, 110, 253, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(13, 110, 253, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(13, 110, 253, 0.2)';
            }}
          />
          <span className="fw-bold" style={{ color: '#ffffff', fontWeight: 'bold' }}>Phòng Xét Nghiệm Máu</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center" style={{ gap: '0.5rem' }}>
            <Nav.Link
              onClick={() => navigate('/patient/appointments')}
              className="fw-medium nav-link"
              style={{
                color: '#333',
                transition: 'all 0.3s ease',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0d6efd';
                e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#333';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-calendar-alt me-2"></i>
              Lịch hẹn appointments
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate('/patient/results')}
              className="fw-medium nav-link"
              style={{
                color: '#333',
                transition: 'all 0.3s ease',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0d6efd';
                e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#333';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-flask me-2"></i>
              Kết quả
            </Nav.Link>

            <Nav.Link
              onClick={() => navigate('/patient/payment-history')}
              className="fw-medium nav-link"
              style={{
                color: '#333',
                transition: 'all 0.3s ease',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0d6efd';
                e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#333';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-credit-card me-2"></i>
              Lịch sử thanh toán
            </Nav.Link>

            <Nav.Link
              onClick={() => navigate('/notifications')}
              className="fw-medium nav-link"
              style={{
                color: '#333',
                transition: 'all 0.3s ease',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fd7e14';
                e.currentTarget.style.backgroundColor = 'rgba(253, 126, 20, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#333';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-bell me-2 text-warning"></i>
              Thông báo notify
            </Nav.Link>

            <Nav.Link
              onClick={() => navigate('/patient/feedback')}
              className="fw-medium nav-link"
              style={{
                color: '#333',
                transition: 'all 0.3s ease',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffc107';
                e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#333';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-star me-2 text-warning"></i>
              Góp ý & Đánh giá
            </Nav.Link>

            {/* Notifications History Bell */}
            <div className="ms-2">
              <NotificationHistoryModal variant="light" />
            </div>

            <Dropdown className="ms-2">
              <Dropdown.Toggle
                variant="outline-primary"
                id="dropdown-basic"
                style={{
                  borderRadius: '25px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  whiteSpace: 'nowrap',
                  fontSize: '1rem',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }}
              >
                <i className="fas fa-user me-2"></i>
                <span style={{ color: 'white' }}>{(displayName || user?.fullName || user?.username || 'Bệnh nhân').split(' ').slice(-2).join(' ')}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                  padding: '8px 0'
                }}
              >
                <Dropdown.Item
                  onClick={() => navigate('/patient/profile-edit')}
                  style={{
                    padding: '10px 20px',
                    transition: 'all 0.3s ease',
                    borderRadius: '8px',
                    margin: '4px 8px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
                    e.currentTarget.style.color = '#0d6efd';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'inherit';
                  }}
                >
                  <i className="fas fa-user-circle me-2"></i>
                  Thông tin cá nhân
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                  onClick={handleLogout}
                  className="text-danger"
                  style={{
                    padding: '10px 20px',
                    transition: 'all 0.3s ease',
                    borderRadius: '8px',
                    margin: '4px 8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    e.currentTarget.style.color = '#dc3545';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#dc3545';
                  }}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>
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

export default PatientHeader;
