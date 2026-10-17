/**
 * @file UserProfilePage.jsx
 * @description Patient & Clinical User Profile management screen (UC08).
 * Features: 2-column layout, PII masking, active session indicator, and Shimmer skeleton loading.
 * Conforms to: OWASP Top 10 (A01: IDOR Prevention) & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Alert } from 'react-bootstrap';
import { getUserProfile } from '../../../services/userService';
import { SkeletonProfile } from '../../../components/common/SkeletonProfile';
import UserQuickViewDrawer from '../components/UserQuickViewDrawer';
import './UserProfilePage.css';

export const UserProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await getUserProfile();
      if (result.isSuccess && result.data) {
        setProfile(result.data);
      } else {
        setErrorMessage(result.message || 'Unable to load profile.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to BMS services.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bms-profile-page">
        <SkeletonProfile />
      </div>
    );
  }

  return (
    <div className="bms-profile-page">
      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
        </Alert>
      )}

      {profile && (
        <Row className="g-4">
          {/* Left Column: Avatar & Overview Card */}
          <Col xs={12} lg={4}>
            <div className="bms-profile-card text-center p-4">
              <div className="bms-avatar-wrapper">
                <img
                  src={profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'}
                  alt={profile.fullName}
                  className="bms-avatar-img"
                />
                <span className="bms-active-dot" title="Active Account"></span>
              </div>

              <h4 className="fw-bold mb-1 text-dark">{profile.fullName}</h4>
              <p className="text-muted small mb-1">@{profile.username}</p>

              <div>
                <span className="bms-patient-code-badge">
                  <i className="bi bi-person-vcard me-1"></i>
                  {profile.patientCode}
                </span>
              </div>

              <div>
                <span className="bms-role-badge">
                  <i className="bi bi-shield-check"></i>
                  {profile.role}
                </span>
              </div>

              <hr className="my-4 text-muted" />

              <div className="text-start small">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Trạng thái tài khoản:</span>
                  <span className="text-success fw-semibold">
                    <i className="bi bi-check-circle-fill me-1"></i>Đang hoạt động
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Ngày mở hồ sơ:</span>
                  <span className="text-dark fw-medium">{profile.createdAt}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Bảo mật 2 lớp:</span>
                  <span className="text-primary fw-semibold">
                    <i className="bi bi-shield-lock-fill me-1"></i>Đã kích hoạt (OTP)
                  </span>
                </div>
              </div>

              <div className="d-grid gap-2 mt-4">
                <Button variant="outline-primary" size="sm" onClick={fetchProfile}>
                  <i className="bi bi-arrow-clockwise me-1"></i>Làm Mới Hồ Sơ
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(true)}>
                  <i className="bi bi-layout-sidebar-inset-reverse me-1"></i>Xem Nhanh Bệnh Án
                </Button>
              </div>
            </div>
          </Col>

          {/* Right Column: Detailed Clinical Profile Form */}
          <Col xs={12} lg={8}>
            <div className="bms-profile-card">
              <div className="bms-profile-card-header d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold m-0 text-white">Hồ Sơ Sức Khỏe & Định Danh Cá Nhân</h5>
                  <small className="text-white-50">Thông tin bảo mật và liên kết hồ sơ bệnh án điện tử BMS</small>
                </div>
                <Badge bg="light" text="dark" className="px-3 py-2 fw-semibold">
                  <i className="bi bi-lock-fill me-1"></i>Bảo Mật Bệnh Án
                </Badge>
              </div>

              <div className="p-4">
                <Row className="g-3">
                  <Col md={6}>
                    <div className="bms-field-label">Họ và tên bệnh nhân</div>
                    <div className="bms-field-value">{profile.fullName}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Số CCCD / Định danh (Đề án 06)</div>
                    <div className="bms-field-value">{profile.identityCardNumberMasked}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Ngày sinh</div>
                    <div className="bms-field-value">
                      <i className="bi bi-calendar-event me-2 text-muted"></i>
                      {profile.dateOfBirth}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Giới tính</div>
                    <div className="bms-field-value">{profile.gender}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Số điện thoại liên hệ</div>
                    <div className="bms-field-value">
                      <i className="bi bi-telephone me-2 text-muted"></i>
                      {profile.phoneNumber}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Địa chỉ Email nhận kết quả</div>
                    <div className="bms-field-value">
                      <i className="bi bi-envelope me-2 text-muted"></i>
                      {profile.email}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Nhóm máu hệ ABO / Rh</div>
                    <div className="bms-field-value">
                      <span className="bms-blood-badge">
                        <i className="bi bi-droplet-fill me-1"></i>
                        {profile.bloodType}
                      </span>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Vai trò trên hệ thống</div>
                    <div className="bms-field-value">{profile.role}</div>
                  </Col>

                  <Col xs={12}>
                    <div className="bms-field-label">Địa chỉ thường trú đã đăng ký</div>
                    <div className="bms-field-value">
                      <i className="bi bi-geo-alt me-2 text-muted"></i>
                      {profile.address}
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>
        </Row>
      )}

      <UserQuickViewDrawer
        isOpen={isDrawerOpen}
        user={profile}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default UserProfilePage;
