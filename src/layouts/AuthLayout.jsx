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
    <div className="min-vh-100 d-flex flex-column justify-content-center py-4" style={{ backgroundColor: 'var(--bms-surface-card, #F1F4F7)', backgroundImage: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #F1F4F7 100%)' }}>
      <Container>
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-3">
            <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 12, padding: 3, border: '1px solid #E5E9EB', boxShadow: '0 4px 12px rgba(94, 133, 230, 0.08)', overflow: 'hidden' }}>
              <img src="/assets/bms-logo.png" alt="BMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="text-start">
              <h3 className="fw-bold mb-0" style={{ fontSize: '17px', color: 'var(--bms-text-primary, #20242B)', letterSpacing: '-0.01em' }}>BMS CLINICAL LABORATORY</h3>
              <small className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.02em' }}>Hệ Thống Quản Lý Xét Nghiệm Y Khoa ISO 15189</small>
            </div>
          </Link>
        </div>
        <Outlet />
      </Container>
    </div>
  );
};

export default AuthLayout;
