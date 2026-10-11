/**
 * User Profile Page (Read-Only Version)
 * * UI POLISHED
 * * Features:
 * - Pure Display Mode (No Edit)
 * - Role-based data presentation
 * - Medical Blue theme consistency
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { doctorService } from '../../services/doctorService';
import useResponsive from '../../shared/hooks/useResponsive';

const Profile = () => {
  const { isMobile, isTablet } = useResponsive();
  const { user } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);

  // Profile Data State
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    email: '',
    role: '',
    specialization: '', // Doctor specific
    doctorId: '',       // Doctor specific
    status: ''          // Doctor specific
  });

  // --- Helpers ---
  const getRoleDisplayName = (role) => {
    if (!role) return '';

    // Chuyển role về dạng chuỗi để dễ so sánh (đề phòng role là number)
    const roleKey = String(role).toLowerCase();

    const roleNames = {
      // Mapping theo tên (String)
      'admin': 'Quản trị viên',
      'doctor': 'Bác sĩ',
      'staff': 'Nhân viên',
      'manager': 'Quản lý',
      'patient': 'Bệnh nhân',
      'lab_user': 'Kỹ thuật viên',
      'technician': 'Kỹ thuật viên',

      // Mapping theo ID (Number -> String)
      '1': 'Quản trị viên',
      '2': 'Quản lý',
      '3': 'Bác sĩ',
      '4': 'Kỹ thuật viên', // <-- Đây là cái bạn đang cần
      '5': 'Bệnh nhân'
    };

    return roleNames[roleKey] || 'Người dùng hệ thống';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleDateString('vi-VN');
  };

  // --- Load Data ---
  const loadProfileData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    try {
      let additionalInfo = {};

      // Nếu là Bác sĩ, lấy thêm thông tin chuyên môn
      if (user.role === 'doctor' || user.role === 3 || String(user.roleId) === '3') {
        try {
          const docRes = await doctorService.getDoctorByEmail(user.email);
          if (docRes.success && docRes.data) {
            const doc = Array.isArray(docRes.data) ? docRes.data[0] : docRes.data;
            if (doc) {
              additionalInfo = {
                specialization: doc.specialization,
                doctorId: doc.doctorId || doc.id,
                status: doc.status,
                phone: doc.phone || user.phone
              };
            }
          }
        } catch (e) {
        }
      }

      setProfileData({
        fullName: user.fullName || '',
        phone: additionalInfo.phone || user.phone || '',
        email: user.email || '',
        role: user.role || '',
        specialization: additionalInfo.specialization || '',
        doctorId: additionalInfo.doctorId || '',
        status: additionalInfo.status || (user.isActive ? 'Active' : 'Inactive')
      });

    } catch (err) {
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // --- Components ---
  // InfoItem Component để hiển thị từng dòng thông tin cho đẹp
  const InfoItem = ({ icon, label, value, highlight = false }) => (
    <div className="d-flex align-items-center mb-4 p-2 p-md-3 rounded-4 bg-white shadow-sm border border-light">
      <div className={`rounded-circle p-2 p-md-3 me-2 me-md-3 d-flex align-items-center justify-content-center ${highlight ? 'bg-primary text-white' : 'bg-primary-subtle text-primary'}`} style={{ width: 'clamp(40px, 8vw, 50px)', height: 'clamp(40px, 8vw, 50px)', flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}></i>
      </div>
      <div className="flex-grow-1">
        <div className="small text-muted text-uppercase fw-bold mb-1" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.75rem)' }}>{label}</div>
        <div className={`fw-bold ${highlight ? 'text-primary' : 'text-dark'}`} style={{ fontSize: highlight ? 'clamp(1rem, 3vw, 1.25rem)' : 'clamp(0.875rem, 2vw, 1rem)' }}>{value || '---'}</div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <Container className="py-5 text-center">
        <Alert variant="warning" className="d-inline-block">Vui lòng đăng nhập.</Alert>
      </Container>
    );
  }

  if (dataLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-4 bg-light" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="text-primary fw-bold mb-1" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
            <i className="fas fa-id-card me-2"></i>Hồ sơ cá nhân
          </h2>
          <p className="text-muted mb-0 d-none d-md-block" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Thông tin tài khoản và chi tiết nhân sự.</p>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Left Column: Identity Card */}
        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden text-center">
            <div className="bg-primary p-3 p-md-5 position-relative" style={{ background: 'var(--gradient-primary)' }}>
              <div className="avatar-circle bg-white text-primary mx-auto mb-3 d-flex align-items-center justify-content-center shadow-lg position-relative" style={{ width: 'clamp(80px, 15vw, 120px)', height: 'clamp(80px, 15vw, 120px)', borderRadius: '50%', fontSize: 'clamp(2rem, 5vw, 3rem)', border: '4px solid rgba(255,255,255,0.3)' }}>
                <i className="fas fa-user-md"></i>
                <span className={`position-absolute bottom-0 end-0 p-2 border border-2 border-white rounded-circle ${user.isActive ? 'bg-success' : 'bg-danger'}`} style={{ width: 'clamp(16px, 3vw, 20px)', height: 'clamp(16px, 3vw, 20px)' }}></span>
              </div>
              <h4 className="fw-bold text-white mb-1" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>{profileData.fullName}</h4>
              <Badge bg="light" text="primary" className="rounded-pill px-3 py-2 fw-normal mt-2" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                {getRoleDisplayName(profileData.role)}
              </Badge>
            </div>
            <Card.Body className="p-4 d-flex flex-column justify-content-center">
              <div className="text-muted fst-italic mb-4">
                "Chào mừng trở lại hệ thống quản lý phòng xét nghiệm."
              </div>

              <Alert variant="info" className="border-0 bg-info-subtle text-start d-flex align-items-start rounded-3">
                <i className="fas fa-info-circle mt-1 me-3 text-info"></i>
                <div className="small">
                  <strong>Lưu ý:</strong> Thông tin cá nhân được quản lý tập trung. Nếu cần thay đổi hoặc chỉnh sửa sai sót, vui lòng liên hệ <strong>Quản trị viên (Admin)</strong>.
                </div>
              </Alert>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Detailed Info */}
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Header className="bg-white border-bottom-0 p-3 p-md-4">
              <h5 className="text-primary fw-bold mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <i className="fas fa-list-alt me-2"></i>Thông tin chi tiết
              </h5>
            </Card.Header>
            <Card.Body className="p-4 pt-0">
              <Row>
                {/* Basic Info */}
                <Col md={6}>
                  <InfoItem icon="fa-user" label="Họ và tên" value={profileData.fullName} highlight={true} />
                </Col>
                <Col md={6}>
                  <InfoItem icon="fa-envelope" label="Email (Tên đăng nhập)" value={profileData.email} />
                </Col>
                <Col md={6}>
                  <InfoItem icon="fa-phone" label="Số điện thoại" value={profileData.phone} />
                </Col>
                <Col md={6}>
                  <InfoItem icon="fa-calendar-check" label="Ngày tham gia hệ thống" value={formatDate(user.createdAt)} />
                </Col>

                {/* Doctor Specific Info */}
                {(profileData.doctorId || profileData.specialization) && (
                  <>
                    <Col md={12}>
                      <hr className="my-2 opacity-10" />
                      <h6 className="text-muted fw-bold text-uppercase small mb-3 mt-3 ps-1">Thông tin chuyên môn</h6>
                    </Col>

                    {profileData.doctorId && (
                      <Col md={6}>
                        <InfoItem icon="fa-id-badge" label="Mã định danh Bác sĩ (Doctor ID)" value={profileData.doctorId} highlight={true} />
                      </Col>
                    )}
                    {profileData.specialization && (
                      <Col md={6}>
                        <InfoItem icon="fa-stethoscope" label="Chuyên khoa" value={profileData.specialization} />
                      </Col>
                    )}
                    <Col md={6}>
                      <InfoItem icon="fa-toggle-on" label="Trạng thái hoạt động" value={profileData.status === 'Active' ? 'Đang hoạt động' : 'Tạm ngưng'} />
                    </Col>
                  </>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;