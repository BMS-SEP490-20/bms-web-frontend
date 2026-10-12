import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Tabs, Tab, Alert } from 'react-bootstrap';
import { FaEdit, FaSave, FaTimes, FaLock } from 'react-icons/fa';

const UnifiedUserInfoModal = ({ 
  show, 
  onHide, 
  user, 
  labRooms = [], 
  onSaveAccount, 
  onSaveProfile, 
  onSavePassword,
  profileData, // from parent fetching
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
        phone: user.phone || '',
        role: user.role || '',
        isActive: user.isActive
      });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  }, [show, user]);

  useEffect(() => {
    if (profileData) {
      if (user?.role === 'doctor') {
        setProfileForm({
          fullName: profileData.fullName || '',
          specialization: profileData.specialization || '',
          phone: profileData.phone || '',
          email: profileData.email || '',
          status: profileData.status || 'Active'
        });
      } else if (user?.role === 'lab_user') {
        setProfileForm({
          fullName: profileData.fullName || '',
          jobTitle: profileData.jobTitle || '',
          phone: profileData.phone || '',
          email: profileData.email || '',
          defaultRoomId: profileData.defaultRoomId || '',
          status: profileData.status || 'Active'
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
        await onSaveAccount({ ...user, ...accountForm });
      } else if (activeTab === 'profile') {
        await onSaveProfile(profileForm);
      } else if (activeTab === 'password') {
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
          setError('Mật khẩu phải có ít nhất 6 ký tự');
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setError('Mật khẩu không khớp');
          return;
        }
        await onSavePassword(passwordForm.newPassword);
      }
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi lưu');
    }
  };

  const hasProfile = user?.role === 'doctor' || user?.role === 'lab_user';

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Thông tin người dùng: {user.fullName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Tabs activeKey={activeTab} onSelect={(k) => { setActiveTab(k); setIsEditing(false); setError(''); }} className="mb-3">
          <Tab eventKey="account" title="Tài khoản">
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Họ tên</Form.Label>
                    <Form.Control
                      value={accountForm.fullName}
                      onChange={e => setAccountForm({ ...accountForm, fullName: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={accountForm.email}
                      onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Số điện thoại</Form.Label>
                    <Form.Control
                      value={accountForm.phone}
                      onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Vai trò</Form.Label>
                    <Form.Select
                      value={accountForm.role}
                      onChange={e => setAccountForm({ ...accountForm, role: e.target.value })}
                      disabled={!isEditing}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="doctor">Bác sĩ</option>
                      <option value="lab_user">Lab User</option>
                      <option value="patient">Bệnh nhân</option>
                      <option value="receptionist">Lễ tân</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Trạng thái</Form.Label>
                    <Form.Select
                      value={accountForm.isActive}
                      onChange={e => setAccountForm({ ...accountForm, isActive: e.target.value === 'true' })}
                      disabled={!isEditing}
                    >
                      <option value={true}>Hoạt động</option>
                      <option value={false}>Khóa</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Tab>

          {hasProfile && (
            <Tab eventKey="profile" title="Hồ sơ">
              {profileLoading ? (
                <div className="text-center py-3">Đang tải hồ sơ...</div>
              ) : !profileData ? (
                <Alert variant="warning">Không tìm thấy hồ sơ cho người dùng này.</Alert>
              ) : (
                <Form>
                  {user.role === 'doctor' && (
                    <>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Chuyên khoa</Form.Label>
                            <Form.Control
                              value={profileForm.specialization}
                              onChange={e => setProfileForm({ ...profileForm, specialization: e.target.value })}
                              disabled={!isEditing}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Trạng thái hồ sơ</Form.Label>
                            <Form.Select
                              value={profileForm.status}
                              onChange={e => setProfileForm({ ...profileForm, status: e.target.value })}
                              disabled={!isEditing}
                            >
                              <option value="Active">Hoạt động</option>
                              <option value="Inactive">Không hoạt động</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}
                  {user.role === 'lab_user' && (
                    <>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Chức danh</Form.Label>
                            <Form.Control
                              value={profileForm.jobTitle}
                              onChange={e => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                              disabled={!isEditing}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Phòng mặc định</Form.Label>
                            <Form.Select
                              value={profileForm.defaultRoomId}
                              onChange={e => setProfileForm({ ...profileForm, defaultRoomId: e.target.value })}
                              disabled={!isEditing}
                            >
                              <option value="">-- Chọn phòng --</option>
                              {labRooms.map(room => (
                                <option key={room.id || room.roomId} value={room.id || room.roomId}>
                                  {room.roomName || room.name || room.id}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Trạng thái hồ sơ</Form.Label>
                            <Form.Select
                              value={profileForm.status}
                              onChange={e => setProfileForm({ ...profileForm, status: e.target.value })}
                              disabled={!isEditing}
                            >
                              <option value="Active">Hoạt động</option>
                              <option value="Inactive">Không hoạt động</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}
                </Form>
              )}
            </Tab>
          )}

          <Tab eventKey="password" title="Đổi mật khẩu">
            <Alert variant="info" className="py-2 mb-3 small">
              Mật khẩu mới phải có ít nhất 6 ký tự.
            </Alert>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Mật khẩu mới</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  disabled={!isEditing}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Xác nhận mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  disabled={!isEditing}
                />
              </Form.Group>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer>
        {!isEditing ? (
          <>
            <Button variant="secondary" onClick={onHide}>Đóng</Button>
            {((activeTab === 'profile' && profileData) || activeTab !== 'profile') && (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                <FaEdit className="me-1" /> Chỉnh sửa
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => { setIsEditing(false); setError(''); }}>
              <FaTimes className="me-1" /> Hủy
            </Button>
            <Button variant="success" onClick={handleSave}>
              <FaSave className="me-1" /> Lưu
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UnifiedUserInfoModal;
