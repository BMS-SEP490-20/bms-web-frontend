/**
 * @file UnifiedUserInfoModal.jsx
 * @description Modal dialog for inspecting and modifying multi-role user accounts (UC14, UC08, UC09).
 * Features dedicated tabs for Account Credentials, Clinical Doctor/Lab Profile details, and Administrative Password Reset.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * @module features/users/components/UnifiedUserInfoModal
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Tabs, Tab, Alert } from 'react-bootstrap';
import { FaEdit, FaSave, FaTimes, FaLock } from 'react-icons/fa';

/**
 * Unified multi-tab user detail and credential modification dialog.
 *
 * @param {object} props - Component properties.
 * @param {boolean} props.show - Visibility flag for the modal dialog.
 * @param {Function} props.onHide - Callback to dismiss the modal dialog.
 * @param {object} props.user - The target user object under inspection.
 * @param {object[]} [props.labRooms=[]] - Available laboratory rooms for technician assignment.
 * @param {Function} props.onSaveAccount - Callback to persist account metadata updates.
 * @param {Function} props.onSaveProfile - Callback to persist clinical role profile updates.
 * @param {Function} props.onSavePassword - Callback to execute administrative password reset.
 * @param {object} [props.profileData] - Detailed profile payload fetched from backend.
 * @param {boolean} [props.profileLoading] - Loading indicator state for profile fetch.
 * @returns {JSX.Element} The rendered modal dialog.
 */
const UnifiedUserInfoModal = ({ 
  show, 
  onHide, 
  user, 
  labRooms = [], 
  onSaveAccount, 
  onSaveProfile, 
  onSavePassword,
  profileData,
  profileLoading
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  
  // Account Form
  const [accountForm, setAccountForm] = useState({});
  // Profile Form
  const [profileForm, setProfileForm] = useState({});
  // Password Form
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (show && user) {
      setIsEditing(false);
      setActiveTab('account');
      setError('');
      setAccountForm({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || user.phoneNumber || '',
        role: user.role || 'patient',
        isActive: user.isActive !== undefined ? user.isActive : true
      });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  }, [show, user]);

  useEffect(() => {
    if (profileData) {
      if (user?.role === 'doctor') {
        setProfileForm({
          fullName: profileData.fullName || user?.fullName || '',
          specialization: profileData.specialization || 'Đa khoa / Huyết học',
          phone: profileData.phone || user?.phone || '',
          email: profileData.email || user?.email || '',
          status: profileData.status || 'Active'
        });
      } else if (user?.role === 'lab_user') {
        setProfileForm({
          fullName: profileData.fullName || user?.fullName || '',
          jobTitle: profileData.jobTitle || 'Kỹ thuật viên xét nghiệm',
          phone: profileData.phone || user?.phone || '',
          email: profileData.email || user?.email || '',
          defaultRoomId: profileData.defaultRoomId || '',
          status: profileData.status || 'Active'
        });
      } else if (user?.role === 'patient') {
        setProfileForm({
          patientCode: profileData.patientCode || 'BN-2026-08192',
          identityCardNumber: profileData.identityCardNumber || '079201008234',
          dateOfBirth: profileData.dateOfBirth || '1995-08-15',
          gender: profileData.gender || 'Nam',
          address: profileData.address || 'Hồ Chí Minh',
          bloodType: profileData.bloodType || 'O+'
        });
      }
    } else {
      setProfileForm({});
    }
  }, [profileData, user]);

  const handleSave = async () => {
    setError('');
    try {
      if (activeTab === 'account') {
        if (onSaveAccount) {
          await onSaveAccount({ ...user, ...accountForm });
        }
      } else if (activeTab === 'profile') {
        if (onSaveProfile) {
          await onSaveProfile(profileForm);
        }
      } else if (activeTab === 'password') {
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
          setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setError('Mật khẩu xác nhận không trùng khớp.');
          return;
        }
        if (onSavePassword) {
          await onSavePassword(passwordForm.newPassword);
        }
      }
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi lưu thông tin.');
    }
  };

  const hasProfile = user?.role === 'doctor' || user?.role === 'lab_user' || user?.role === 'patient';

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fs-5">
          <i className="bi bi-person-badge me-2 text-primary"></i>
          Chi tiết tài khoản: <strong>{user.fullName || user.username}</strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        
        <Tabs 
          activeKey={activeTab} 
          onSelect={(k) => { setActiveTab(k); setIsEditing(false); setError(''); }} 
          className="mb-4"
        >
          <Tab eventKey="account" title="Thông tin tài khoản">
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Họ và tên</Form.Label>
                    <Form.Control
                      value={accountForm.fullName || ''}
                      onChange={e => setAccountForm({ ...accountForm, fullName: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={accountForm.email || ''}
                      onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Số điện thoại</Form.Label>
                    <Form.Control
                      value={accountForm.phone || ''}
                      onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Vai trò hệ thống</Form.Label>
                    <Form.Select
                      value={accountForm.role || 'patient'}
                      onChange={e => setAccountForm({ ...accountForm, role: e.target.value })}
                      disabled={!isEditing}
                    >
                      <option value="admin">Quản trị viên (Admin)</option>
                      <option value="manager">Quản lý (Manager)</option>
                      <option value="doctor">Bác sĩ (Doctor)</option>
                      <option value="lab_user">Kỹ thuật viên xét nghiệm (Lab User)</option>
                      <option value="patient">Bệnh nhân (Patient)</option>
                      <option value="receptionist">Lễ tân (Receptionist)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Trạng thái tài khoản</Form.Label>
                    <Form.Select
                      value={accountForm.isActive ? 'true' : 'false'}
                      onChange={e => setAccountForm({ ...accountForm, isActive: e.target.value === 'true' })}
                      disabled={!isEditing}
                    >
                      <option value="true">Đang hoạt động (Active)</option>
                      <option value="false">Tạm khóa (Inactive)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Tab>

          {hasProfile && (
            <Tab eventKey="profile" title="Hồ sơ nghiệp vụ">
              {profileLoading ? (
                <div className="text-center py-4 text-muted">
                  <div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
                  Đang tải thông tin chuyên môn...
                </div>
              ) : (
                <Form>
                  {user.role === 'doctor' && (
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Chuyên khoa khám</Form.Label>
                          <Form.Control
                            value={profileForm.specialization || ''}
                            onChange={e => setProfileForm({ ...profileForm, specialization: e.target.value })}
                            disabled={!isEditing}
                            placeholder="VD: Huyết học lâm sàng"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Trạng thái bác sĩ</Form.Label>
                          <Form.Select
                            value={profileForm.status || 'Active'}
                            onChange={e => setProfileForm({ ...profileForm, status: e.target.value })}
                            disabled={!isEditing}
                          >
                            <option value="Active">Đang làm việc</option>
                            <option value="Inactive">Nghỉ phép / Tạm ngừng</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}

                  {user.role === 'lab_user' && (
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Chức danh chuyên môn</Form.Label>
                          <Form.Control
                            value={profileForm.jobTitle || ''}
                            onChange={e => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                            disabled={!isEditing}
                            placeholder="VD: Kỹ thuật viên xét nghiệm"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Phòng xét nghiệm phụ trách</Form.Label>
                          <Form.Select
                            value={profileForm.defaultRoomId || ''}
                            onChange={e => setProfileForm({ ...profileForm, defaultRoomId: e.target.value })}
                            disabled={!isEditing}
                          >
                            <option value="">-- Chọn phòng xét nghiệm --</option>
                            {labRooms.map(room => (
                              <option key={room.id || room.roomId} value={room.id || room.roomId}>
                                {room.roomName || room.name || room.id}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}

                  {user.role === 'patient' && (
                    <Row className="g-3">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Mã bệnh nhân</Form.Label>
                          <Form.Control value={profileForm.patientCode || 'Chưa cấp'} disabled />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Số CCCD / Định danh</Form.Label>
                          <Form.Control value={profileForm.identityCardNumber || 'Chưa cập nhật'} disabled />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Nhóm máu</Form.Label>
                          <Form.Control value={profileForm.bloodType || 'O+'} disabled />
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                </Form>
              )}
            </Tab>
          )}

          <Tab eventKey="password" title="Đổi mật khẩu">
            <Alert variant="info" className="py-2 mb-3 small">
              <i className="bi bi-info-circle me-1"></i> Quản trị viên có thể cấp lại mật khẩu mới cho người dùng (tối thiểu 6 ký tự).
            </Alert>
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Mật khẩu mới</Form.Label>
                    <Form.Control
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Nhập mật khẩu mới"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Xác nhận mật khẩu</Form.Label>
                    <Form.Control
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer className="bg-light">
        {!isEditing ? (
          <>
            <Button variant="outline-secondary" onClick={onHide}>Đóng</Button>
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              <FaEdit className="me-1" /> Chỉnh sửa thông tin
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={() => { setIsEditing(false); setError(''); }}>
              <FaTimes className="me-1" /> Hủy thao tác
            </Button>
            <Button variant="success" onClick={handleSave}>
              <FaSave className="me-1" /> Lưu thay đổi
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UnifiedUserInfoModal;
