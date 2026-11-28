/**
 * @file UnifiedUserInfoModal.jsx
 * @description Medical-Standard ISO 15189 Account & Clinical Credentials Modal (UC14, UC08, UC09).
 * Displays and edits both IAM account identity and Blood Laboratory medical credentials:
 * Employee Code, Practice License (CCHN), Issuing Authority, Expiry/CME, Qualification,
 * Specialty, Department, Assigned Room (from DB), Biosafety Level (ATSH/ISO 15189), and Digital Signature ID.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Tabs, Tab, Alert, Badge } from 'react-bootstrap';
import { SquarePen, Save, X as LucideX, Info, UserCheck, ShieldCheck, Stethoscope } from 'lucide-react';
import { ROLES, resolveRoleId } from '../../../constants/roles';

const ROLE_KEY_TO_ID = {
  admin: ROLES.ADMIN,
  manager: ROLES.MANAGER,
  doctor: ROLES.DOCTOR,
  lab: ROLES.LAB,
  receptionist: ROLES.RECEPTIONIST,
  patient: ROLES.PATIENT,
};

const DEPARTMENT_OPTIONS = [
  'Khoa Khám Bệnh & Tư Vấn Huyết Học',
  'Khoa Xét Nghiệm Huyết Học & Đông Máu',
  'Khoa Xét Nghiệm Sinh Hóa - Miễn Dịch',
  'Phòng Quản Lý Chất Lượng (ISO 15189)',
  'Bộ Phận Tiếp Đón & Chăm Sóc Khách Hàng',
  'Ban Quản Trị Hệ Thống CNTT',
];

const BIOSAFETY_OPTIONS = [
  'ATSH Cấp II · ISO 15189:2022',
  'ATSH Cấp II',
  'ATSH Cấp I',
  'Không áp dụng',
];

const UnifiedUserInfoModal = ({
  show,
  onHide,
  user,
  labRooms = [],
  onSaveAccount,
  onSavePassword
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [accountForm, setAccountForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show && user) {
      setIsEditing(false);
      setActiveTab('account');
      setError('');
      const roleKey = user.role || 'patient';
      setAccountForm({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || user.phoneNumber || '',
        role: roleKey,
        roleId: user.roleId || ROLE_KEY_TO_ID[roleKey] || ROLES.PATIENT,
        isActive: user.isActive !== undefined ? user.isActive : true,
        employeeCode: user.employeeCode || '',
        identityCardNumber: user.identityCardNumber || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth || '',
        licenseNumber: user.licenseNumber || '',
        licenseIssuedBy: user.licenseIssuedBy || '',
        licenseExpiryDate: user.licenseExpiryDate || '',
        qualification: user.qualification || '',
        specialty: user.specialty || '',
        department: user.department || '',
        assignedRoom: user.assignedRoom || '',
        biosafetyLevel: user.biosafetyLevel || '',
        digitalSignatureCode: user.digitalSignatureCode || '',
      });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  }, [show, user]);

  const isStaffRole = (accountForm.role || user?.role) !== 'patient';
  const isClinicalOrLab = ['doctor', 'lab', 'manager'].includes(accountForm.role || user?.role);

  const handleRoleChange = (newRoleKey) => {
    const newRoleId = ROLE_KEY_TO_ID[newRoleKey] || resolveRoleId(newRoleKey) || ROLES.PATIENT;
    setAccountForm((prev) => ({ ...prev, role: newRoleKey, roleId: newRoleId }));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (activeTab === 'account' || activeTab === 'medical') {
        if (onSaveAccount) {
          await onSaveAccount({ ...user, ...accountForm });
        }
      } else if (activeTab === 'password') {
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
          setError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
          setSaving(false);
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setError('Mật khẩu xác nhận không trùng khớp.');
          setSaving(false);
          return;
        }
        if (onSavePassword) {
          await onSavePassword(passwordForm.newPassword);
        }
      }
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.06)', background: '#F8FAFC' }}>
        <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2 flex-wrap" style={{ color: '#0f2743' }}>
          <UserCheck style={{ color: '#1E60E6' }} size="1em" />
          <span>Chi Tiết Tài Khoản:</span>
          <span style={{ color: '#1E60E6' }}>{user.fullName || user.username}</span>
          {accountForm.employeeCode && (
            <Badge bg="light" text="dark" className="border font-monospace fw-semibold" style={{ fontSize: '12px' }}>
              {accountForm.employeeCode}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => { setActiveTab(k); setError(''); }}
          className="mb-4"
        >

          <Tab eventKey="account" title="Thông Tin Tài Khoản">
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Họ và tên</Form.Label>
                    <Form.Control
                      value={accountForm.fullName || ''}
                      onChange={e => setAccountForm({ ...accountForm, fullName: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Mã nhân viên / Định danh</Form.Label>
                    <Form.Control
                      value={accountForm.employeeCode || ''}
                      onChange={e => setAccountForm({ ...accountForm, employeeCode: e.target.value })}
                      placeholder="VD: BS-HH-001, KTV-XN-004"
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Email công vụ</Form.Label>
                    <Form.Control
                      type="email"
                      value={accountForm.email || ''}
                      onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
                      placeholder="ten@bms.health.vn"
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Số điện thoại liên hệ</Form.Label>
                    <Form.Control
                      value={accountForm.phone || ''}
                      onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })}
                      placeholder="VD: 0902000002"
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Số CCCD (Đề án 06)</Form.Label>
                    <Form.Control
                      value={accountForm.identityCardNumber || ''}
                      onChange={e => setAccountForm({ ...accountForm, identityCardNumber: e.target.value })}
                      placeholder="12 chữ số CCCD"
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Giới tính</Form.Label>
                    <Form.Select
                      value={accountForm.gender || ''}
                      onChange={e => setAccountForm({ ...accountForm, gender: e.target.value })}
                      disabled={!isEditing}
                    >
                      <option value="">-- Chọn --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Ngày sinh</Form.Label>
                    <Form.Control
                      type="date"
                      value={accountForm.dateOfBirth || ''}
                      onChange={e => setAccountForm({ ...accountForm, dateOfBirth: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-secondary">Vai trò hệ thống (RBAC)</Form.Label>
                    <Form.Select
                      value={accountForm.role || 'patient'}
                      onChange={e => handleRoleChange(e.target.value)}
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
                    <Form.Label className="fw-semibold small text-secondary">Trạng thái tài khoản</Form.Label>
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

          {isStaffRole && (
            <Tab eventKey="medical" title="Hồ Sơ Y Tế & CCHN (ISO 15189)">
              <div className="p-3 mb-3 rounded-3 border d-flex align-items-start gap-2" style={{ background: '#F0F7FF', borderColor: '#BFDBFE' }}>
                <Stethoscope size={18} className="text-primary flex-shrink-0 mt-1" />
                <div className="small text-dark">
                  <strong>Chuẩn năng lực nhân sự Phòng Xét Nghiệm Máu (Bộ Y tế &amp; ISO 15189:2022):</strong>{' '}
                  Ghi nhận Chứng chỉ hành nghề (CCHN), Khoa/Phòng trực thuộc, chứng nhận An toàn sinh học và mã chữ ký số duyệt kết quả.
                  {accountForm.role === 'lab' && ' Mọi thay đổi Trình độ & Phòng mặc định sẽ tự động đồng bộ sang dữ liệu phân phòng & ca trực Phòng Lab.'}
                </div>
              </div>

              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small text-secondary">Khoa / Phòng ban trực thuộc</Form.Label>
                      <Form.Control
                        list="bms-department-list"
                        value={accountForm.department || ''}
                        onChange={e => setAccountForm({ ...accountForm, department: e.target.value })}
                        placeholder="VD: Khoa Xét Nghiệm Huyết Học & Đông Máu"
                        disabled={!isEditing}
                      />
                      <datalist id="bms-department-list">
                        {DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d} />)}
                      </datalist>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small text-secondary">Phòng khám / Phòng Lab phụ trách</Form.Label>
                      <Form.Control
                        list="bms-room-list"
                        value={accountForm.assignedRoom || ''}
                        onChange={e => setAccountForm({ ...accountForm, assignedRoom: e.target.value })}
                        placeholder="VD: ROOM-101, LAB-ROOM-201"
                        disabled={!isEditing}
                      />
                      <datalist id="bms-room-list">
                        {labRooms.map((r) => (
                          <option key={r.id || r.roomCode} value={r.id || r.roomCode}>
                            {r.name ? `${r.id} — ${r.name}` : r.id}
                          </option>
                        ))}
                        <option value="ROOM-101">ROOM-101 — Phòng khám Huyết học Tổng quát 1</option>
                        <option value="ROOM-102">ROOM-102 — Phòng khám Nội tiết - Chuyển hóa</option>
                        <option value="ROOM-103">ROOM-103 — Phòng khám Sàng lọc Tiền hôn nhân</option>
                        <option value="QUAY-01">QUAY-01 — Quầy Tiếp Đón 01</option>
                      </datalist>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small text-secondary">Trình độ chuyên môn / Học vị</Form.Label>
                      <Form.Control
                        value={accountForm.qualification || ''}
                        onChange={e => setAccountForm({ ...accountForm, qualification: e.target.value })}
                        placeholder="VD: Bác sĩ Chuyên khoa I Huyết học / Cử nhân XN Y học"
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small text-secondary">Chuyên khoa / Phạm vi hành nghề</Form.Label>
                      <Form.Control
                        value={accountForm.specialty || ''}
                        onChange={e => setAccountForm({ ...accountForm, specialty: e.target.value })}
                        placeholder="VD: Huyết học - Truyền máu / Sinh hóa - Miễn dịch"
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>

                  {isClinicalOrLab && (
                    <>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-secondary">Số Chứng chỉ hành nghề (CCHN)</Form.Label>
                          <Form.Control
                            className="font-monospace"
                            value={accountForm.licenseNumber || ''}
                            onChange={e => setAccountForm({ ...accountForm, licenseNumber: e.target.value })}
                            placeholder="VD: 004821/BYT-CCHN"
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-secondary">Cơ quan cấp CCHN</Form.Label>
                          <Form.Control
                            value={accountForm.licenseIssuedBy || ''}
                            onChange={e => setAccountForm({ ...accountForm, licenseIssuedBy: e.target.value })}
                            placeholder="VD: Bộ Y tế / Sở Y tế TP.HCM"
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-secondary">Hạn cập nhật CME / Hiệu lực</Form.Label>
                          <Form.Control
                            type="date"
                            value={accountForm.licenseExpiryDate || ''}
                            onChange={e => setAccountForm({ ...accountForm, licenseExpiryDate: e.target.value })}
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-secondary">Chứng nhận An toàn sinh học (ATSH)</Form.Label>
                          <Form.Select
                            value={accountForm.biosafetyLevel || ''}
                            onChange={e => setAccountForm({ ...accountForm, biosafetyLevel: e.target.value })}
                            disabled={!isEditing}
                          >
                            <option value="">-- Chọn mức chứng nhận --</option>
                            {BIOSAFETY_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-secondary">
                            <ShieldCheck size={14} className="me-1 text-success" />
                            Mã chữ ký số / Phê duyệt kết quả
                          </Form.Label>
                          <Form.Control
                            className="font-monospace"
                            value={accountForm.digitalSignatureCode || ''}
                            onChange={e => setAccountForm({ ...accountForm, digitalSignatureCode: e.target.value })}
                            placeholder="VD: SIGN-BS-002 / SIGN-KTV-004"
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                    </>
                  )}
                </Row>
              </Form>
            </Tab>
          )}

          <Tab eventKey="password" title="Cấp Lại Mật Khẩu">
            <Alert variant="info" className="py-2 mb-3 small d-flex align-items-center gap-2">
              <Info className="fs-5 flex-shrink-0" size="1em" />
              <span>Cấp lại mật khẩu mới cho tài khoản (tối thiểu 8 ký tự).</span>
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
      <Modal.Footer style={{ borderTop: '1px solid rgba(15, 23, 42, 0.06)', background: '#F8FAFC' }}>
        {!isEditing ? (
          <>
            <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: 9999 }}>Đóng</Button>
            <Button variant="primary" onClick={() => setIsEditing(true)} className="fw-semibold" style={{ borderRadius: 9999, background: '#1E60E6', borderColor: '#1E60E6', boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)' }}>
              <SquarePen className="me-1" size="1em" /> Chỉnh Sửa Thông Tin
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={() => { setIsEditing(false); setError(''); }} disabled={saving} style={{ borderRadius: 9999 }}>
              <LucideX className="me-1" size="1em" /> Hủy Thao Tác
            </Button>
            <Button variant="success" onClick={handleSave} disabled={saving} className="fw-semibold" style={{ borderRadius: 9999, background: '#10B981', borderColor: '#10B981', color: '#ffffff', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}>
              <Save className="me-1" size="1em" /> {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UnifiedUserInfoModal;
