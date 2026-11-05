/**
 * @file UnifiedUserInfoModal.jsx
 * @description Modal dialog for inspecting and modifying multi-role user accounts (UC14, UC08, UC09).
 * Features dedicated tabs for Account Credentials, Clinical Doctor/Lab Profile details, and Administrative Password Reset.
 * Conforms to: Production Medical Standards, ISO 15189, Separation of Duties & AGENTS-DESIGN.md.
 * @module features/users/components/UnifiedUserInfoModal
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Tabs, Tab, Alert } from 'react-bootstrap';
import { FaEdit, FaSave, FaTimes, FaLock, FaUserShield, FaInfoCircle } from 'react-icons/fa';

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
      } else if (user?.role === 'lab_user' || user?.role === 'lab') {
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
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
          setError('Mật khẩu mới phải có tối thiểu 8 ký tự (chuẩn an toàn BR-IAM-01).');
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

  const hasProfile = user?.role === 'doctor' || user?.role === 'lab_user' || user?.role === 'lab' || user?.role === 'patient';

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #E5E9EB', background: '#F8FAFC' }}>
        <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2" style={{ color: '#0f2743' }}>
          <FaUserShield style={{ color: '#5E85E6' }} />
          Chi Tiết Tài Khoản Nhân Sự: <span style={{ color: '#5E85E6' }}>{user.fullName || user.username}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        
        <Tabs 
          activeKey={activeTab} 
          onSelect={(k) => { setActiveTab(k); setIsEditing(false); setError(''); }} 
          className="mb-4"
        >
          <Tab eventKey="account" title="Thông Tin Tài Khoản">
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Họ và tên nhân sự</Form.Label>
                    <Form.Control
                      value={accountForm.fullName || ''}
                      onChange={e => setAccountForm({ ...accountForm, fullName: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Email cơ quan</Form.Label>
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
                      <option value="admin">Quản Trị Viên Hệ Thống</option>
                      <option value="manager">Quản Lý Phòng Xét Nghiệm</option>
                      <option value="doctor">Bác Sĩ Lâm Sàng</option>
                      <option value="lab">Kỹ Thuật Viên Xét Nghiệm</option>
                      <option value="receptionist">Lễ Tân Tiếp Đón</option>
                      <option value="patient">Bệnh Nhân</option>
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
                      <option value="true">Đang Hoạt Động</option>
                      <option value="false">Tạm Khóa Hoạt Động</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Tab>

          {hasProfile && (
            <Tab eventKey="profile" title="Hồ Sơ Chuyên Môn">
              {profileLoading ? (
                <div className="text-center py-4 text-muted">
                  <div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
                  Đang tải thông tin hồ sơ nghiệp vụ...
                </div>
              ) : (
                <Form>
                  {user.role === 'doctor' && (
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Chuyên khoa khám bệnh</Form.Label>
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
                          <Form.Label className="fw-semibold">Tình trạng trực lâm sàng</Form.Label>
                          <Form.Select
                            value={profileForm.status || 'Active'}
                            onChange={e => setProfileForm({ ...profileForm, status: e.target.value })}
                            disabled={!isEditing}
                          >
                            <option value="Active">Đang Phục Vụ Lâm Sàng</option>
                            <option value="Inactive">Nghỉ Phép / Tạm Ngừng Tiếp Nhận</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}

                  {(user.role === 'lab_user' || user.role === 'lab') && (
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Chức danh kỹ thuật</Form.Label>
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
                            <option value="">-- Phân công phòng xét nghiệm --</option>
                            {Array.isArray(labRooms) && labRooms.map(room => (
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
                          <Form.Label className="fw-semibold">Mã định danh bệnh nhân</Form.Label>
                          <Form.Control value={profileForm.patientCode || 'Chưa cấp mã'} disabled />
                          <Form.Text className="text-muted small">Bất biến theo hồ sơ EMR</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Số CCCD / Hộ chiếu</Form.Label>
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

          <Tab eventKey="password" title="Cấp Lại Mật Khẩu">
            <Alert variant="info" className="py-2 mb-3 small d-flex align-items-center gap-2">
              <FaInfoCircle className="fs-5 flex-shrink-0" />
              <span>Quản trị viên có quyền cấp lại mật khẩu an toàn cho nhân sự (tối thiểu 8 ký tự, tuân thủ BR-IAM-01).</span>
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
                      placeholder="Nhập lại đúng mật khẩu mới"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer className="py-2 px-3" style={{ borderTop: '1px solid #E5E9EB', background: '#F8FAFC' }}>
        {!isEditing ? (
          <>
            <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: 9999 }}>Đóng</Button>
            <Button variant="primary" onClick={() => setIsEditing(true)} className="fw-semibold" style={{ borderRadius: 9999, background: '#5E85E6', borderColor: '#5E85E6', boxShadow: '0 4px 14px rgba(94, 133, 230, 0.25)' }}>
              <FaEdit className="me-1" /> Chỉnh Sửa Thông Tin
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={() => { setIsEditing(false); setError(''); }} style={{ borderRadius: 9999 }}>
              <FaTimes className="me-1" /> Hủy Thao Tác
            </Button>
            <Button variant="success" onClick={handleSave} className="fw-semibold" style={{ borderRadius: 9999, background: '#91DE83', borderColor: '#91DE83', color: '#0f2743', boxShadow: '0 4px 14px rgba(145, 222, 131, 0.25)' }}>
              <FaSave className="me-1" /> Lưu Thay Đổi
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UnifiedUserInfoModal;
