/**
 * @file AuthLayout.jsx
 * @description Authentication page layout wrapper for Login, Register, Forgot Password, and OTP verification workflows.
 * Provides a centered, responsive card structure with clinic branding.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import { Outlet, Link } from 'react-router-dom';

/**
 * Authentication layout providing consistent brand identity and viewport centering.
 *
 * @returns {JSX.Element} The rendered authentication layout.
 */
const AuthLayout = () => {
  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center bg-light py-4">
      <Container>
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-3">
            <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 10, padding: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
              <img src="/assets/bms-logo.png" alt="BMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="text-start">
              <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '18px' }}>BMS CLINICAL LABORATORY</h3>
              <small className="text-muted" style={{ fontSize: '11px' }}>Hệ Thống Quản Lý Xét Nghiệm Y Khoa ISO 15189</small>
            </div>
          </Link>
        </div>
        <Outlet />
      </Container>
    </div>
  );
};

export default AuthLayout;
