/**
 * @file AuthLayout.jsx
 * @description Authentication page layout wrapper for Login, Register, and Forgot Password workflows.
 * Conforms to: Soft Medical Telehealth UI Specification (MEDLINE / macOS Grade).
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center py-5"
      style={{
        backgroundColor: '#F4F7F9',
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <Container>
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-3">
            <img
              src="/assets/bms-logo.png"
              alt="BMS Clinical Laboratory"
              style={{
                height: '44px',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </Link>
        </div>
        <Outlet />
      </Container>
    </div>
  );
};

export default AuthLayout;
