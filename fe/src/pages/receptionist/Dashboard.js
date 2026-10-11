/**
 * Receptionist Dashboard Component
 * 
 * Dashboard overview for receptionist staff.
 * Main functions are accessible via sidebar menu:
 * 1. Check-in patients using QR code
 * 2. Create patient profiles (for elderly patients who cannot create their own)
 * 
 * @returns {React.ReactNode} Receptionist dashboard component
 */
import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useResponsive from '../../shared/hooks/useResponsive';

const ReceptionistDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>
                <i className="fas fa-concierge-bell me-2"></i>
                Dashboard Lễ Tân
              </h4>
            </Card.Header>
            <Card.Body>
              <p className="mb-0" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                Chào mừng, <strong>{user?.fullName || user?.username || 'Lễ tân'}</strong>!
              </p>
              <small className="text-muted d-none d-md-inline" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                Vai trò: Lễ tân - Quản lý check-in bệnh nhân và tạo hồ sơ
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs={12} md={6} className="mb-4">
          <Card 
            className="shadow-sm h-100" 
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/receptionist/check-in')}
          >
            <Card.Body className="text-center p-3 p-md-5">
              <div className="mb-3">
                <i className="fas fa-qrcode" style={{ fontSize: 'clamp(3rem, 8vw, 4rem)', color: '#0d6efd' }}></i>
              </div>
              <h5 className="mb-3" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>Check-in QR Code</h5>
              <p className="text-muted" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                Quét QR code để check-in bệnh nhân đến phòng khám
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} className="mb-4">
          <Card 
            className="shadow-sm h-100"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/receptionist/create-patient')}
          >
            <Card.Body className="text-center p-3 p-md-5">
              <div className="mb-3">
                <i className="fas fa-user-plus" style={{ fontSize: 'clamp(3rem, 8vw, 4rem)', color: '#198754' }}></i>
              </div>
              <h5 className="mb-3" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>Tạo Hồ Sơ Bệnh Nhân</h5>
              <p className="text-muted" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                Tạo hồ sơ bệnh nhân thay cho người già không thể tự tạo
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ReceptionistDashboard;

