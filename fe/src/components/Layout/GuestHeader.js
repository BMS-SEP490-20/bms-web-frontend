/**
 * Guest Header Component
 * 
 * Header component for guest users (non-authenticated) in the Blood Laboratory Management System.
 * Provides navigation to login and register pages with clean, welcoming design.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../../shared/styles/guest-header.css';

/**
 * Guest Header Component
 * 
 * Header component for guest users with navigation to authentication pages.
 * Features clean design and call-to-action buttons for login/register.
 * 
 * @returns {React.ReactNode} Guest header component
 */
const GuestHeader = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <Navbar bg="white" expand="lg" className="guest-header shadow-sm sticky-top">
      <Container>
        <Navbar.Brand href="/" className="d-flex align-items-center" style={{
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
          <Nav className="ms-auto">
            <Nav.Link 
              className="btn btn-outline-primary btn-login ms-2 px-4 py-2" 
              onClick={handleLogin}
              style={{ 
                borderRadius: '25px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                border: '2px solid #0d6efd'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(13, 110, 253, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-sign-in-alt me-2"></i>
              Đăng nhập
            </Nav.Link>
            <Nav.Link 
              className="btn btn-primary btn-register ms-2 px-4 py-2" 
              onClick={handleRegister}
              style={{ 
                borderRadius: '25px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
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
              <i className="fas fa-user-plus me-2"></i>
              Đăng ký
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default GuestHeader;
