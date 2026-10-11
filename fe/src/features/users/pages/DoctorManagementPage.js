/**
 * Doctor Management Component
 * 
 * Doctor management component for the Blood Laboratory Management System.
 * Provides comprehensive doctor account management including creation,
 * editing, shift assignment, and status management.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
// Using Bootstrap Icons instead of FontAwesome
import { userManagementService } from '../../../services/userManagementService';
import { shiftService } from '../../../services/shiftService';
import ConfirmDialog from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import useResponsive from '../../../shared/hooks/useResponsive';

/**
 * Doctor Management Component
 * 
 * Manages doctor accounts with full CRUD operations and shift assignment.
 * Provides role-based access control and comprehensive user management.
 * 
 * @returns {React.ReactNode} Doctor management component
 */
const DoctorManagement = () => {
  const { isMobile, isTablet } = useResponsive();
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    experience: '',
    isActive: true
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [shiftData, setShiftData] = useState({
    shiftDate: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [doctorsData, shiftsData] = await Promise.all([
        userManagementService.getUsersByRole('doctor'),
        shiftService.getShifts()
      ]);

      if (doctorsData.success) {
        setDoctors(Array.isArray(doctorsData.data) ? doctorsData.data : []);
      } else {
        setDoctors([]);
        if (doctorsData.message) {
          setError(doctorsData.message);
        }
      }
      
      if (shiftsData.success) {
        setShifts(Array.isArray(shiftsData.data) ? shiftsData.data : []);
      } else {
        setShifts([]);
        if (shiftsData.message) {
          setError(shiftsData.message);
        }
      }
    } catch (error) {
      setError('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  const filterDoctors = useCallback(() => {
    let filtered = doctors || [];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doctor =>
        doctor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by active tab
    if (activeTab === 'active') {
      filtered = filtered.filter(doctor => doctor.isActive === true || doctor.status === 'active');
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(doctor => doctor.isActive === false || doctor.status === 'inactive');
    }

    setFilteredDoctors(filtered);
  }, [doctors, searchTerm, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter doctors when search term or tab changes
  useEffect(() => {
    filterDoctors();
  }, [filterDoctors]);


  const handleCreateDoctor = () => {
    setModalMode('create');
    setSelectedDoctor(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      specialization: '',
      experience: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEditDoctor = (doctor) => {
    setModalMode('edit');
    setSelectedDoctor(doctor);
    setFormData({
      fullName: doctor.fullName,
      email: doctor.email,
      password: '',
      phone: doctor.phone,
      specialization: doctor.specialization || '',
      experience: doctor.experience || '',
      isActive: doctor.isActive
    });
    setShowModal(true);
  };

  const handleSaveDoctor = async () => {
    try {
      const doctorData = {
        ...formData,
        role: 'doctor'
      };
      
      if (modalMode === 'create') {
        await userManagementService.createUser(doctorData);
      } else {
        const updateData = { ...doctorData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await userManagementService.updateUser(selectedDoctor.id, updateData);
      }
      await loadData();
      setShowModal(false);
    } catch (err) {
      setError('Lỗi lưu dữ liệu: ' + err.message);
    }
  };

  const handleDeleteDoctor = (doctor) => {
    setDoctorToDelete(doctor);
    setShowConfirmDialog(true);
  };

  const confirmDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    
    setIsDeleting(true);
    try {
      await userManagementService.deleteUser(doctorToDelete.id);
      await loadData();
      setShowConfirmDialog(false);
      setDoctorToDelete(null);
    } catch (err) {
      setError('Lỗi xóa bác sĩ: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (doctor) => {
    try {
      await userManagementService.toggleUserStatus(doctor.id, !doctor.isActive);
      await loadData();
    } catch (err) {
      setError('Lỗi cập nhật trạng thái: ' + err.message);
    }
  };

  const handleChangePassword = (doctor) => {
    setSelectedDoctor(doctor);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      await userManagementService.changePassword(selectedDoctor.id, passwordData.newPassword);
      setShowPasswordModal(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError('Lỗi đổi mật khẩu: ' + err.message);
    }
  };

  const handleAssignShift = (doctor) => {
    setSelectedDoctor(doctor);
    setShiftData({
      shiftDate: '',
      startTime: '',
      endTime: '',
      notes: ''
    });
    setShowShiftModal(true);
  };

  const handleSaveShift = async () => {
    try {
      await shiftService.createShift({
        userId: selectedDoctor.id,
        userName: selectedDoctor.fullName,
        role: 'doctor',
        ...shiftData,
        status: 'scheduled'
      });
      await loadData();
      setShowShiftModal(false);
    } catch (err) {
      setError('Lỗi tạo ca làm việc: ' + err.message);
    }
  };

  const getDoctorShifts = (doctorId) => {
    return shifts.filter(shift => shift.userId === doctorId && shift.role === 'doctor');
  };

  const getShiftStatusBadge = (status) => {
    const variants = {
      scheduled: 'primary',
      working: 'success',
      completed: 'secondary',
      cancelled: 'danger'
    };
    return variants[status] || 'secondary';
  };

  // const getShiftStatusText = (status) => {
  //   const texts = {
  //     scheduled: 'Đã lên lịch',
  //     working: 'Đang làm việc',
  //     completed: 'Hoàn thành',
  //     cancelled: 'Đã hủy'
  //   };
  //   return texts[status] || status;
  // };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2><i className="fas fa-user-md me-2"></i>Quản lý bác sĩ</h2>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={handleCreateDoctor}>
            <i className="fas fa-plus me-2"></i>
            Thêm bác sĩ
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{doctors.length}</h3>
              <p className="mb-0">Tổng bác sĩ</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{doctors.filter(d => d.isActive).length}</h3>
              <p className="mb-0">Đang hoạt động</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{shifts.filter(s => s.role === 'doctor').length}</h3>
              <p className="mb-0">Ca làm việc</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{shifts.filter(s => s.role === 'doctor' && s.status === 'scheduled').length}</h3>
              <p className="mb-0">Ca sắp tới</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="Tìm kiếm theo tên, email, chuyên khoa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="all" title={`Tất cả (${doctors.length})`} />
        <Tab eventKey="active" title={`Đang hoạt động (${doctors.filter(d => d.isActive).length})`} />
        <Tab eventKey="inactive" title={`Tạm khóa (${doctors.filter(d => !d.isActive).length})`} />
      </Tabs>

      {/* Doctors Table */}
      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Chuyên khoa</th>
                <th>Kinh nghiệm</th>
                <th>Trạng thái</th>
                <th>Ca làm việc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    Không có dữ liệu bác sĩ
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => {
                  const doctorShifts = getDoctorShifts(doctor.id);
                  return (
                    <tr key={doctor.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <i className="fas fa-user-md me-2 text-primary"></i>
                          {doctor.fullName || 'N/A'}
                        </div>
                      </td>
                      <td>{doctor.email || 'N/A'}</td>
                      <td>{doctor.specialization || 'Chưa cập nhật'}</td>
                      <td>{doctor.experience || 'Chưa cập nhật'}</td>
                      <td>
                        <Badge bg={doctor.isActive ? 'success' : 'secondary'}>
                          {doctor.isActive ? 'Hoạt động' : 'Tạm khóa'}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {doctorShifts.slice(0, 2).map((shift) => (
                            <Badge 
                              key={shift.id} 
                              bg={getShiftStatusBadge(shift.status)}
                              className="small"
                            >
                              {shift.shiftDate ? new Date(shift.shiftDate).toLocaleDateString('vi-VN') : 'N/A'}
                            </Badge>
                          ))}
                          {doctorShifts.length > 2 && (
                            <Badge bg="light" text="dark" className="small">
                              +{doctorShifts.length - 2}
                            </Badge>
                          )}
                          {doctorShifts.length === 0 && (
                            <span className="text-muted small">Chưa có ca</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEditDoctor(doctor)}
                            title="Chỉnh sửa"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleAssignShift(doctor)}
                            title="Phân ca làm việc"
                          >
                            <i className="fas fa-calendar"></i>
                          </Button>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() => handleChangePassword(doctor)}
                            title="Đổi mật khẩu"
                          >
                            <i className="fas fa-key"></i>
                          </Button>
                          <Button
                            variant={doctor.isActive ? "outline-warning" : "outline-success"}
                            size="sm"
                            onClick={() => handleToggleStatus(doctor)}
                            title={doctor.isActive ? "Khóa tài khoản" : "Kích hoạt tài khoản"}
                          >
                            <i className={`fas fa-${doctor.isActive ? 'eye-slash' : 'eye'}`}></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteDoctor(doctor)}
                            title="Xóa"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Create/Edit Doctor Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === 'create' ? 'Thêm bác sĩ mới' : 'Chỉnh sửa bác sĩ'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Họ và tên *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mật khẩu {modalMode === 'create' ? '*' : '(để trống nếu không đổi)'}</Form.Label>
                  <Form.Control
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={modalMode === 'create'}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Số điện thoại</Form.Label>
                  <Form.Control
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Chuyên khoa</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    placeholder="VD: Tim mạch, Nội khoa, Xét nghiệm..."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Kinh nghiệm</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    placeholder="VD: 5 năm, Thạc sĩ..."
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select
                    value={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                  >
                    <option value={true}>Hoạt động</option>
                    <option value={false}>Tạm khóa</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSaveDoctor}>
            {modalMode === 'create' ? 'Tạo' : 'Cập nhật'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Change Password Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Đổi mật khẩu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu mới *</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Xác nhận mật khẩu *</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSavePassword}>
            Đổi mật khẩu
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal show={showShiftModal} onHide={() => setShowShiftModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Phân ca làm việc cho {selectedDoctor?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ngày làm việc *</Form.Label>
                  <Form.Control
                    type="date"
                    value={shiftData.shiftDate}
                    onChange={(e) => setShiftData({...shiftData, shiftDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Giờ bắt đầu *</Form.Label>
                  <Form.Control
                    type="time"
                    value={shiftData.startTime}
                    onChange={(e) => setShiftData({...shiftData, startTime: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Giờ kết thúc *</Form.Label>
                  <Form.Control
                    type="time"
                    value={shiftData.endTime}
                    onChange={(e) => setShiftData({...shiftData, endTime: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Ghi chú</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={shiftData.notes}
                onChange={(e) => setShiftData({...shiftData, notes: e.target.value})}
                placeholder="VD: Ca sáng, Ca tối, Ca đêm..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSaveShift}>
            Phân ca
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        show={showConfirmDialog}
        onHide={() => {
          setShowConfirmDialog(false);
          setDoctorToDelete(null);
        }}
        onConfirm={confirmDeleteDoctor}
        title="Xác nhận xóa bác sĩ"
        message={doctorToDelete ? `Bạn có chắc chắn muốn xóa bác sĩ "${doctorToDelete.fullName}"?` : 'Bạn có chắc chắn muốn xóa bác sĩ này?'}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeleting}
      />
    </Container>
  );
};

export default DoctorManagement;
