import React from 'react';
import { Container } from 'react-bootstrap';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center bg-light py-4">
      <Container>
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none">
            <h2 className="fw-bold text-primary mb-0">
              <i className="bi bi-droplet-half text-danger me-2"></i>BMS Portal
            </h2>
          </Link>
        </div>
        <Outlet />
      </Container>
    </div>
  );
};

export default AuthLayout;
