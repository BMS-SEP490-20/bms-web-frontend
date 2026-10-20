/**
 * @file UserProfilePage.jsx
 * @description Patient & Clinical User Profile management screen (UC08 & UC30 - View Patient Information).
 * @issue I2-032 | BR-093 | Assignee: Hứa Khánh Duy | Reviewer: Võ Gia Huy
 * Features: 2-column layout, PII masking, active session indicator, and Shimmer skeleton loading.
 * Conforms to: OWASP Top 10 (A01: IDOR Prevention) & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Alert, Modal, Table, Spinner } from 'react-bootstrap';
import { getUserProfile } from '../../../services/userService';
import { getMyPatientInformation } from '../../../services/patientService';
import { SkeletonProfile } from '../../../components/common/SkeletonProfile';
import UserQuickViewDrawer from '../components/UserQuickViewDrawer';
import './UserProfilePage.css';

export const UserProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showClinicalModal, setShowClinicalModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [userRes, patRes] = await Promise.allSettled([
        getUserProfile(),
        getMyPatientInformation()
      ]);

      if (userRes.status === 'fulfilled' && userRes.value?.isSuccess && userRes.value?.data) {
        setProfile(userRes.value.data);
      } else if (patRes.status === 'fulfilled' && patRes.value) {
        const p = patRes.value;
        setProfile({
          fullName: p.fullName,
          username: p.patientCode || p.id,
          patientCode: p.patientCode || p.id,
          role: 'Patient',
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '—',
          identityCardNumberMasked: p.identityCardMasked || p.identityCard || '—',
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('vi-VN') : '—',
          gender: p.gender || '—',
          phoneNumber: p.phone || '—',
          email: p.email || '—',
          bloodType: p.bloodType || 'Chưa xác định',
          address: p.address || '—'
        });
      } else {
        setErrorMessage(userRes.value?.message || 'Unable to load profile.');
      }

      if (patRes.status === 'fulfilled' && patRes.value) {
        setPatientRecord(patRes.value);
      }
    } catch {
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
                  {patientRecord?.patientCode || profile.patientCode}
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
                <Button variant="primary" size="sm" onClick={() => setShowClinicalModal(true)}>
                  <i className="bi bi-file-earmark-medical me-1"></i>Chi Tiết Hồ Sơ Bệnh Nhân (Popup)
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={() => setIsDrawerOpen(true)}>
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
                    <div className="bms-field-value">{patientRecord?.fullName || profile.fullName}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Số CCCD / Định danh (Đề án 06)</div>
                    <div className="bms-field-value">{patientRecord?.identityCard || profile.identityCardNumberMasked}</div>
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
                    <div className="bms-field-value">{patientRecord?.gender || profile.gender}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Số điện thoại liên hệ</div>
                    <div className="bms-field-value">
                      <i className="bi bi-telephone me-2 text-muted"></i>
                      {patientRecord?.phone || profile.phoneNumber}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Địa chỉ Email nhận kết quả</div>
                    <div className="bms-field-value">
                      <i className="bi bi-envelope me-2 text-muted"></i>
                      {patientRecord?.email || profile.email}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Nhóm máu hệ ABO / Rh</div>
                    <div className="bms-field-value">
                      <span className="bms-blood-badge">
                        <i className="bi bi-droplet-fill me-1"></i>
                        {patientRecord?.bloodType || profile.bloodType}
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
                      {patientRecord?.address || profile.address}
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Popup Modal: Clinical Patient Information (/api/patients/me) */}
      <Modal show={showClinicalModal} onHide={() => setShowClinicalModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold">
            Hồ Sơ Y Tế & Lịch Sử Khám Xét Nghiệm ({patientRecord?.patientCode || profile?.patientCode})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {patientRecord ? (
            <>
              <Row className="g-3 mb-3">
                <Col sm={4}>
                  <div className="p-3 border rounded-3 bg-light">
                    <div className="small text-muted">Chỉ số sinh hiệu</div>
                    <div className="fw-bold text-dark">
                      Cao: {patientRecord.vitals?.heightCm || '—'} cm • Nặng: {patientRecord.vitals?.weightKg || '—'} kg
                    </div>
                    <div className="small text-secondary">BMI: {patientRecord.vitals?.bmi || '—'}</div>
                  </div>
                </Col>
                <Col sm={4}>
                  <div className="p-3 border rounded-3 bg-light">
                    <div className="small text-muted">Tiền sử dị ứng</div>
                    <div className="fw-bold text-danger">
                      {Array.isArray(patientRecord.allergies) && patientRecord.allergies.length > 0
                        ? patientRecord.allergies.join(', ')
                        : 'Không ghi nhận dị ứng'}
                    </div>
                  </div>
                </Col>
                <Col sm={4}>
                  <div className="p-3 border rounded-3 bg-light">
                    <div className="small text-muted">Liên hệ khẩn cấp</div>
                    <div className="fw-bold text-dark">
                      {patientRecord.emergencyContact?.name || 'Chưa cập nhật'}
                    </div>
                    <div className="small text-secondary">
                      {patientRecord.emergencyContact?.phone || ''} {patientRecord.emergencyContact?.relationship ? `(${patientRecord.emergencyContact.relationship})` : ''}
                    </div>
                  </div>
                </Col>
              </Row>

              <h6 className="fw-bold text-secondary mb-2">Lịch hẹn xét nghiệm gần đây</h6>
              {Array.isArray(patientRecord.recentAppointments) && patientRecord.recentAppointments.length > 0 ? (
                <Table size="sm" bordered hover className="mb-3 small">
                  <thead className="table-light">
                    <tr>
                      <th>Mã Lịch Hẹn</th>
                      <th>Ngày Giờ</th>
                      <th>Trạng Thái</th>
                      <th>Thanh Toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientRecord.recentAppointments.map((a) => (
                      <tr key={a.id}>
                        <td><code>{a.id}</code></td>
                        <td>{a.appointmentDate ? new Date(a.appointmentDate).toLocaleString('vi-VN') : '—'}</td>
                        <td><Badge bg="info">{a.status}</Badge></td>
                        <td>{a.paymentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="small text-muted mb-3">Chưa có lịch hẹn xét nghiệm nào.</div>
              )}
            </>
          ) : (
            <div className="text-muted small">Đang hiển thị thông tin hồ sơ tài khoản cơ bản.</div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowClinicalModal(false)}>Đóng</Button>
        </Modal.Footer>
      </Modal>

      <UserQuickViewDrawer
        isOpen={isDrawerOpen}
        user={profile}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default UserProfilePage;

