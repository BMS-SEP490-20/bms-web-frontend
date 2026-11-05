/**
 * Patient Header Component
 * 
 * Header component for patients in the Blood Laboratory Management System.
 * Provides patient-specific navigation, user profile access, and logout functionality.
 * Conforms to: Soft Medical Telehealth UI Specification (MEDLINE / macOS Grade).
 * 
 * @author Blood Laboratory Management Team
 * @version 2.0.0
 * @since 2024
 */

import React, { useEffect, useState } from 'react';
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import NotificationHistoryModal from '../../shared/components/Notification/NotificationHistoryModal';
import '../../shared/styles/guest-header.css';

const PatientHeader = ({ setActiveTab }) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState('');

  // Load patient fullName when component mounts or user changes
  useEffect(() => {
    const loadPatientFullName = async () => {
      if (!user?.email) {
        setDisplayName(user?.fullName || user?.username || 'Bệnh nhân');
        return;
      }

      if (user?.fullName && user?.fullName !== user?.username) {
        setDisplayName(user.fullName);
        return;
      }

      try {
        const patientResult = await patientService.getPatientByEmail(user.email);
        if (patientResult.success && patientResult.data) {
          const patientData = patientResult.data;
          const patientFullName = patientData.fullName || patientData.FullName ||
            patientData.fullname || patientData.Fullname ||
            patientData.name || patientData.Name || '';

          if (patientFullName && patientFullName.trim() !== '') {
            setDisplayName(patientFullName);

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
            setDisplayName(user?.username || 'Bệnh nhân');
          }
        } else {
          setDisplayName(user?.username || 'Bệnh nhân');
        }
      } catch (error) {
        setDisplayName(user?.fullName || user?.username || 'Bệnh nhân');
      }
    };

    loadPatientFullName();
  }, [user, updateUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkStyle = (path) => {
    const isActive = location.pathname.startsWith(path);
    return {
      color: isActive ? '#648CF4' : '#6B7280',
      backgroundColor: isActive ? '#E8EFFE' : 'transparent',
      fontWeight: isActive ? 650 : 500,
      fontSize: '13.5px',
      padding: '8px 16px',
      borderRadius: '999px',
      transition: 'all 0.18s ease',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    };
  };

  return (
    <Navbar
      bg="white"
      expand="lg"
      className="sticky-top"
      style={{
        borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
        boxShadow: '0 4px 20px rgba(28, 39, 61, 0.03)',
        padding: '10px 0'
      }}
    >
      <Container style={{ maxWidth: '1360px' }}>
        <Navbar.Brand
          onClick={() => navigate('/home')}
          className="d-flex align-items-center"
          style={{ cursor: 'pointer', padding: 0 }}
        >
          <img
            src="/assets/bms-logo.png"
            alt="BMS Clinical Laboratory"
            style={{
              height: '38px',
              width: 'auto',
              objectFit: 'contain'
            }}
          />
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="patient-navbar-nav" style={{ border: 'none' }} />
        <Navbar.Collapse id="patient-navbar-nav">
          <Nav className="mx-auto align-items-center" style={{ gap: '4px', background: '#EEF2F6', padding: '4px 6px', borderRadius: '999px' }}>
            <Nav.Link
              onClick={() => navigate('/appointments')}
              style={navLinkStyle('/appointments')}
            >
              Lịch Khám Của Tôi
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate('/services')}
              style={navLinkStyle('/services')}
            >
              Gói Xét Nghiệm
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate('/tracking')}
              style={navLinkStyle('/tracking')}
            >
              Tiến Trình &amp; Kết Quả
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate('/patient/payment-history')}
              style={navLinkStyle('/patient/payment-history')}
            >
              Lịch Sử Thanh Toán
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate('/feedback')}
              style={navLinkStyle('/feedback')}
            >
              Góp Ý &amp; Đánh Giá
            </Nav.Link>
          </Nav>

          <div className="d-flex align-items-center gap-2">
            {/* Notifications History Bell */}
            <div>
              <NotificationHistoryModal variant="light" />
            </div>

            <Dropdown>
              <Dropdown.Toggle
                id="patient-profile-dropdown"
                style={{
                  borderRadius: '999px',
                  fontWeight: '600',
                  fontSize: '13.5px',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  padding: '8px 18px',
                  background: '#648CF4',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 14px rgba(100, 140, 244, 0.25)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{(displayName || user?.fullName || user?.username || 'Bệnh nhân').split(' ').slice(-2).join(' ')}</span>
              </Dropdown.Toggle>

              <Dropdown.Menu
                align="end"
                style={{
                  borderRadius: '20px',
                  border: '1px solid rgba(15, 23, 42, 0.04)',
                  boxShadow: '0 12px 36px rgba(28, 39, 61, 0.10)',
                  padding: '8px'
                }}
              >
                <Dropdown.Item
                  onClick={() => navigate('/profile')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    color: '#1A1D21'
                  }}
                >
                  Thông tin hồ sơ y tế
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => navigate('/change-password')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    color: '#1A1D21'
                  }}
                >
                  Đổi mật khẩu
                </Dropdown.Item>
                <Dropdown.Divider style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }} />
                <Dropdown.Item
                  onClick={handleLogout}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    color: '#F04438',
                    fontWeight: 600
                  }}
                >
                  Đăng xuất
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default PatientHeader;
