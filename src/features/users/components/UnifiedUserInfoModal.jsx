/**
 * @file UnifiedUserInfoModal.jsx
 * @description Modal dialog for inspecting and modifying multi-role user accounts (UC14, UC08, UC09).
 * Enforces Separation of Duties: Admin manages account identity, role, status, and password reset only.
 * @module features/users/components/UnifiedUserInfoModal
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Tabs, Tab, Alert } from 'react-bootstrap';
import { SquarePen, Save, X as LucideX, Info, UserCheck } from 'lucide-react';

const UnifiedUserInfoModal = ({
  show,
  onHide,
  user,
  onSaveAccount,
  onSavePassword
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [accountForm, setAccountForm] = useState({});
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

  const handleSave = async () => {
    setError('');
    try {
      if (activeTab === 'account') {
        if (onSaveAccount) {
          await onSaveAccount({ ...user, ...accountForm });
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

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }}>
        <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2" style={{ color: '#0f2743' }}>
          <UserCheck style={{ color: '#1E60E6' }} size="1em" />
          Chi Tiết Tài Khoản: <span style={{ color: '#1E60E6' }}>{user.fullName || user.username}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
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

          <Tab eventKey="password" title="Cấp Lại Mật Khẩu">
            <Alert variant="info" className="py-2 mb-3 small d-flex align-items-center gap-2">
              <Info className="fs-5 flex-shrink-0" size="1em" />
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
      <Modal.Footer style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }}>
        {!isEditing ? (
          <>
            <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: 9999 }}>Đóng</Button>
            <Button variant="primary" onClick={() => setIsEditing(true)} className="fw-semibold" style={{ borderRadius: 9999, background: '#1E60E6', borderColor: '#1E60E6', boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)' }}>
              <SquarePen className="me-1" size="1em" /> Chỉnh Sửa Thông Tin
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={() => { setIsEditing(false); setError(''); }} style={{ borderRadius: 9999 }}>
              <LucideX className="me-1" size="1em" /> Hủy Thao Tác
            </Button>
            <Button variant="success" onClick={handleSave} className="fw-semibold" style={{ borderRadius: 9999, background: '#10B981', borderColor: '#10B981', color: '#0f2743', boxShadow: '0 4px 14px rgba(145, 222, 131, 0.25)' }}>
              <Save className="me-1" size="1em" /> Lưu Thay Đổi
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UnifiedUserInfoModal;
