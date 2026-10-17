/**
 * @file UserManagementPage.jsx
 * @description Master Employee & User Accounts Management Page (UC14 - Lâm Gia Bảo).
 * Supports: View, Create, Update, Delete Employee Accounts, Lock/Unlock, Role Filtering & Search.
 * Enforces BR-IAM-01 (Employee Codes & Password Policy) and BR-IAM-02 (RBAC Controls).
 * Conforms to: Production Standards, RBAC Architecture & OWASP Top 10.
 * @module features/users/pages/UserManagementPage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Row, Col, Card, Button, Table, Modal, Form,
  Alert, Badge, Spinner, InputGroup
} from 'react-bootstrap';
import {
  FaUserCog, FaKey, FaLock, FaUnlock, FaTrash, FaPlus, FaSave, FaUser, FaSearch, FaFilter
} from 'react-icons/fa';
import UnifiedUserInfoModal from '../components/UnifiedUserInfoModal';
import { userManagementService, ROLE_NAMES } from '../../../services/userManagementService';

/**
 * Unified administrative user and employee account management view.
 *
 * @returns {JSX.Element} Rendered user management dashboard.
 */
export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, byRole: {} });

  // Detail / Edit Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [labRooms, setLabRooms] = useState([]);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    roleId: 3, // Default doctor
    password: '',
    confirmPassword: '',
    isActive: true,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete Confirm Modal
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status Toggle Modal
  const [userToToggle, setUserToToggle] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Load user data and stats
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, statsRes, rooms] = await Promise.all([
        userManagementService.getAllUsers(),
        userManagementService.getUserStats(),
        userManagementService.getAllLabRooms(),
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      setLabRooms(rooms || []);
    } catch (err) {
      setError('Không thể tải danh sách tài khoản. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch =
        !searchTerm.trim() ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm);

      const matchRole =
        selectedRole === 'all' ||
        user.role === selectedRole ||
        String(user.roleId) === String(selectedRole);

      const matchStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && user.isActive) ||
        (selectedStatus === 'inactive' && !user.isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  // Handle open user details
  const handleOpenUserDetail = async (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    setProfileLoading(true);
    try {
      const detailed = await userManagementService.getUserById(user.id);
      if (detailed) {
        setProfileData(detailed.doctorProfile || detailed.labProfile || detailed.patientProfile || detailed);
      }
    } catch {
      setProfileData(user.doctorProfile || user.labProfile || user.patientProfile || null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Save account info from Modal
  const handleSaveAccount = async (updatedData) => {
    const res = await userManagementService.updateUser(updatedData.id, updatedData);
    if (res.success) {
      setSuccess('Cập nhật thông tin tài khoản thành công.');
      loadData();
    } else {
      throw new Error(res.message || 'Cập nhật thất bại.');
    }
  };

  // Save password from Modal
  const handleSavePassword = async (newPassword) => {
    if (!selectedUser) return;
    const res = await userManagementService.changePassword(selectedUser.id, newPassword, selectedUser);
    if (res.success) {
      setSuccess(`Đã cấp lại mật khẩu thành công cho ${selectedUser.fullName}.`);
    } else {
      throw new Error(res.message || 'Đổi mật khẩu thất bại.');
    }
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.fullName.trim()) {
      setCreateError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes('@')) {
      setCreateError('Địa chỉ email không hợp lệ.');
      return;
    }
    if (!createForm.password || createForm.password.length < 8) {
      setCreateError('Mật khẩu nhân viên phải có độ dài tối thiểu 8 ký tự (chuẩn BR-IAM-01).');
      return;
    }
    const hasUpper = /[A-Z]/.test(createForm.password);
    const hasLower = /[a-z]/.test(createForm.password);
    const hasNumber = /[0-9]/.test(createForm.password);
    const hasSpecial = /[!@#$%^&*]/.test(createForm.password);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setCreateError('Mật khẩu nhân viên phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt (!@#$%^&*).');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await userManagementService.createUser(createForm);
      if (res.success) {
        setSuccess('Tạo tài khoản nhân viên mới thành công.');
        setShowCreateModal(false);
        setCreateForm({
          fullName: '',
          username: '',
          email: '',
          phone: '',
          roleId: 3,
          password: '',
          confirmPassword: '',
          isActive: true,
        });
        loadData();
      } else {
        setCreateError(res.message || 'Không thể tạo tài khoản.');
      }
    } catch (err) {
      setCreateError(err.message || 'Lỗi khi gọi API tạo tài khoản.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Toggle status
  const handleConfirmToggleStatus = async () => {
    if (!userToToggle) return;
    setToggleLoading(true);
    try {
      const newStatus = !userToToggle.isActive;
      await userManagementService.toggleUserStatus(userToToggle, newStatus);
      setSuccess(`Tài khoản "${userToToggle.fullName}" đã được ${newStatus ? 'kích hoạt' : 'tạm khóa'}.`);
      setUserToToggle(null);
      loadData();
    } catch {
      setError('Thao tác đổi trạng thái thất bại.');
    } finally {
      setToggleLoading(false);
    }
  };

  // Delete user
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await userManagementService.deleteUser(userToDelete.id);
      setSuccess(`Đã xóa tài khoản "${userToDelete.fullName}" khỏi hệ thống.`);
      setUserToDelete(null);
      loadData();
    } catch {
      setError('Không thể xóa tài khoản. Vui lòng thử lại.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper render role badge
  const renderRoleBadge = (role, roleId) => {
    switch (role?.toLowerCase() || roleId) {
      case 'admin':
      case 1:
        return <Badge bg="danger">Quản trị viên (Admin)</Badge>;
      case 'manager':
      case 2:
        return <Badge bg="dark">Quản lý (Manager)</Badge>;
      case 'doctor':
      case 3:
        return <Badge bg="primary">Bác sĩ (Doctor)</Badge>;
      case 'lab_user':
      case 4:
        return <Badge bg="info" className="text-dark">Kỹ thuật viên Lab</Badge>;
      case 'receptionist':
      case 6:
        return <Badge bg="warning" className="text-dark">Lễ tân</Badge>;
      default:
        return <Badge bg="secondary">Bệnh nhân</Badge>;
    }
  };

  return (
    <Container fluid className="py-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaUserCog className="text-primary" /> Quản Lý Nhân Sự & Tài Khoản Y Tế
          </h2>
          <p className="text-muted mb-0 small">
            Quản trị viên theo dõi, phân quyền, cấp tài khoản cho bác sĩ, kỹ thuật viên xét nghiệm và nhân viên điều phối phòng lab.
          </p>
        </div>
        <div className="mt-2 mt-md-0">
          <Button variant="primary" onClick={() => setShowCreateModal(true)} className="d-flex align-items-center gap-2 shadow-sm">
            <FaPlus /> Thêm tài khoản mới
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="shadow-sm">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')} className="shadow-sm">
          {success}
        </Alert>
      )}

      {/* KPI Stats Row */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3 text-primary">
                <FaUser className="fs-4" />
              </div>
              <div>
                <div className="text-muted small fw-semibold">Tổng tài khoản</div>
                <div className="fs-4 fw-bold text-dark">{stats.total || users.length}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3 text-success">
                <FaUnlock className="fs-4" />
              </div>
              <div>
                <div className="text-muted small fw-semibold">Đang hoạt động</div>
                <div className="fs-4 fw-bold text-success">{stats.active || users.filter(u => u.isActive).length}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-danger bg-opacity-10 p-3 me-3 text-danger">
                <FaLock className="fs-4" />
              </div>
              <div>
                <div className="text-muted small fw-semibold">Đang bị khóa</div>
                <div className="fs-4 fw-bold text-danger">{stats.inactive || users.filter(u => !u.isActive).length}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3 text-info">
                <FaUserCog className="fs-4" />
              </div>
              <div>
                <div className="text-muted small fw-semibold">Bác sĩ & Lab</div>
                <div className="fs-4 fw-bold text-dark">
                  {(stats.byRole?.doctor || 0) + (stats.byRole?.lab_user || 0)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col xs={12} md={5}>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Tìm theo tên, email, tên đăng nhập hoặc SĐT..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col xs={6} md={3}>
              <Form.Select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                <option value="all">-- Tất cả vai trò --</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="doctor">Bác sĩ (Doctor)</option>
                <option value="lab_user">Kỹ thuật viên Lab</option>
                <option value="receptionist">Lễ tân (Receptionist)</option>
                <option value="manager">Quản lý (Manager)</option>
                <option value="patient">Bệnh nhân (Patient)</option>
              </Form.Select>
            </Col>
            <Col xs={6} md={2}>
              <Form.Select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="all">-- Trạng thái --</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đang bị khóa</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={2} className="text-md-end">
              <Button variant="outline-secondary" onClick={() => { setSearchTerm(''); setSelectedRole('all'); setSelectedStatus('all'); }} className="w-100">
                Xóa bộ lọc
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table Data */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="mt-2 text-muted">Đang tải danh sách tài khoản...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaUser className="fs-1 text-secondary opacity-50 mb-3" />
              <div>Không tìm thấy tài khoản nào phù hợp với bộ lọc.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Họ và tên</th>
                    <th>Email / Tên đăng nhập</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th className="text-end pe-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="ps-4">
                        <div className="fw-semibold text-dark">{user.fullName || '—'}</div>
                        <small className="text-muted">{user.username}</small>
                      </td>
                      <td>
                        <div>{user.email || '—'}</div>
                      </td>
                      <td>{user.phone || '—'}</td>
                      <td>{renderRoleBadge(user.role, user.roleId)}</td>
                      <td>
                        {user.isActive ? (
                          <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                            <span className="p-1 rounded-circle bg-white"></span> Hoạt động
                          </Badge>
                        ) : (
                          <Badge bg="danger" className="d-inline-flex align-items-center gap-1">
                            <span className="p-1 rounded-circle bg-white"></span> Tạm khóa
                          </Badge>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <div className="btn-group btn-group-sm">
                          <Button
                            variant="outline-primary"
                            title="Xem chi tiết & Chỉnh sửa hồ sơ"
                            onClick={() => handleOpenUserDetail(user)}
                          >
                            Chi tiết
                          </Button>
                          <Button
                            variant={user.isActive ? "outline-warning" : "outline-success"}
                            title={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            onClick={() => setUserToToggle(user)}
                          >
                            {user.isActive ? <FaLock /> : <FaUnlock />}
                          </Button>
                          <Button
                            variant="outline-danger"
                            title="Xóa tài khoản"
                            onClick={() => setUserToDelete(user)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Unified User Info Modal */}
      {selectedUser && (
        <UnifiedUserInfoModal
          show={showDetailModal}
          onHide={() => { setShowDetailModal(false); setSelectedUser(null); }}
          user={selectedUser}
          labRooms={labRooms}
          onSaveAccount={handleSaveAccount}
          onSaveProfile={() => { setSuccess('Cập nhật hồ sơ chuyên môn thành công.'); loadData(); }}
          onSavePassword={handleSavePassword}
          profileData={profileData}
          profileLoading={profileLoading}
        />
      )}

      {/* Create Account Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5">
            <FaPlus className="text-primary me-2" /> Tạo tài khoản nhân viên / người dùng mới
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateUser}>
          <Modal.Body className="p-4">
            {createError && <Alert variant="danger">{createError}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Họ và tên <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    required
                    placeholder="VD: Bác sĩ Nguyễn Văn A"
                    value={createForm.fullName}
                    onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Tên đăng nhập</Form.Label>
                  <Form.Control
                    placeholder="Tùy chọn (mặc định lấy theo email)"
                    value={createForm.username}
                    onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Email <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    required
                    type="email"
                    placeholder="example@bms.com"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Số điện thoại</Form.Label>
                  <Form.Control
                    placeholder="VD: 0912345678"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Vai trò hệ thống <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={createForm.roleId}
                    onChange={e => setCreateForm({ ...createForm, roleId: Number(e.target.value) })}
                  >
                    <option value={1}>Quản trị viên (Admin)</option>
                    <option value={2}>Quản lý (Manager)</option>
                    <option value={3}>Bác sĩ (Doctor)</option>
                    <option value={4}>Kỹ thuật viên xét nghiệm (Lab User)</option>
                    <option value={6}>Lễ tân (Receptionist)</option>
                    <option value={5}>Bệnh nhân (Patient)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Trạng thái khởi tạo</Form.Label>
                  <Form.Select
                    value={createForm.isActive ? 'true' : 'false'}
                    onChange={e => setCreateForm({ ...createForm, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Kích hoạt ngay</option>
                    <option value="false">Tạm khóa tài khoản</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Mật khẩu khởi tạo <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    required
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Xác nhận mật khẩu <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    required
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={createForm.confirmPassword}
                    onChange={e => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={createLoading}>
              {createLoading ? <Spinner size="sm" animation="border" className="me-2" /> : <FaSave className="me-1" />}
              Lưu tài khoản
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Lock/Unlock Confirm Modal */}
      <Modal show={Boolean(userToToggle)} onHide={() => setUserToToggle(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            {userToToggle?.isActive ? <FaLock className="text-warning me-2" /> : <FaUnlock className="text-success me-2" />}
            Xác nhận thay đổi trạng thái
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn <strong>{userToToggle?.isActive ? 'tạm khóa' : 'kích hoạt'}</strong> tài khoản của{' '}
          <strong>{userToToggle?.fullName}</strong> ({userToToggle?.email}) không?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setUserToToggle(null)}>Đóng</Button>
          <Button
            variant={userToToggle?.isActive ? 'warning' : 'success'}
            onClick={handleConfirmToggleStatus}
            disabled={toggleLoading}
          >
            {toggleLoading ? <Spinner size="sm" animation="border" className="me-1" /> : null}
            Xác nhận {userToToggle?.isActive ? 'khóa' : 'kích hoạt'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal show={Boolean(userToDelete)} onHide={() => setUserToDelete(null)} centered>
        <Modal.Header closeButton className="bg-danger bg-opacity-10 text-danger">
          <Modal.Title className="fs-5">
            <FaTrash className="me-2" /> Xác nhận xóa tài khoản
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Hành động này sẽ xóa vĩnh viễn tài khoản <strong>{userToDelete?.fullName}</strong> ({userToDelete?.email}).
          <br />
          <span className="text-danger small">Lưu ý: Dữ liệu xét nghiệm và lịch sử hoạt động y tế có thể bị ảnh hưởng.</span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setUserToDelete(null)}>Hủy bỏ</Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={deleteLoading}>
            {deleteLoading ? <Spinner size="sm" animation="border" className="me-1" /> : null}
            Xóa vĩnh viễn
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
