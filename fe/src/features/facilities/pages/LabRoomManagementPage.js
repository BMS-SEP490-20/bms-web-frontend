import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { testOrderService } from '../../../services/testOrderService';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';

const LabRoomManagementPage = () => {
    const { user, userRoleId, userRole } = useAuth();
    const { showSuccess, showError } = useNotificationContext();
    const isAdmin = userRoleId === 1 || userRole === 'admin' || user?.role === 'Administrator';

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState({
        roomName: '',
        roomLocation: '',
        roomType: 'Khám',
        isAvailable: true,
        assignedEquipment: '',
        technicianInCharge: ''
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await testOrderService.getAllLabRooms({ fetchAll: true });
            if (res.success) {
                setRooms(res.data || []);
            } else {
                showError(res.message || 'Lỗi lấy danh sách phòng lab');
            }
        } catch (error) {
            showError('Lỗi khi tải dữ liệu phòng lab');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (room = null) => {
        if (room) {
            setEditingRoom(room);
            setFormData({
                roomName: room.roomName || room.RoomName || '',
                roomLocation: room.roomLocation || room.RoomLocation || '',
                roomType: room.roomType || room.RoomType || 'Khám',
                isAvailable: room.isAvailable !== undefined ? room.isAvailable : (room.IsAvailable !== undefined ? room.IsAvailable : true),
                assignedEquipment: room.assignedEquipment || room.AssignedEquipment || '',
                technicianInCharge: room.technicianInCharge || room.TechnicianInCharge || ''
            });
        } else {
            setEditingRoom(null);
            setFormData({
                roomName: '',
                roomLocation: '',
                roomType: 'Khám',
                isAvailable: true,
                assignedEquipment: '',
                technicianInCharge: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingRoom(null);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingRoom) {
                const roomId = editingRoom.roomId || editingRoom.RoomId || editingRoom.id || editingRoom.Id;
                const res = await testOrderService.updateLabRoom(roomId, formData);
                if (res.success) {
                    showSuccess('Cập nhật phòng thành công');
                    handleCloseModal();
                    fetchRooms();
                } else {
                    showError(res.message || 'Lỗi cập nhật phòng');
                }
            } else {
                const res = await testOrderService.createLabRoom(formData);
                if (res.success) {
                    showSuccess('Tạo phòng mới thành công');
                    handleCloseModal();
                    fetchRooms();
                } else {
                    showError(res.message || 'Lỗi tạo phòng');
                }
            }
        } catch (error) {
            showError('Đã xảy ra lỗi!');
        }
    };

    const handleDelete = async (roomId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa phòng này?')) {
            try {
                const res = await testOrderService.deleteLabRoom(roomId);
                if (res.success) {
                    showSuccess('Xóa phòng thành công');
                    fetchRooms();
                } else {
                    showError(res.message || 'Lỗi xóa phòng');
                }
            } catch (error) {
                showError('Đã xảy ra lỗi khi xóa!');
            }
        }
    };

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 text-primary">
                    <i className="fas fa-door-open me-2"></i>
                    Quản lý Phòng Khám / Xét Nghiệm
                </h2>
                {isAdmin && (
                    <Button variant="primary" onClick={() => handleOpenModal()}>
                        <i className="fas fa-plus me-1"></i> Tạo Phòng Mới
                    </Button>
                )}
            </div>

            <Card className="shadow-sm">
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table responsive hover>
                            <thead className="bg-light">
                                <tr>
                                    <th>Tên Phòng</th>
                                    <th>Vị Trí</th>
                                    <th>Loại Phòng</th>
                                    <th>Thiết Bị (Equipment)</th>
                                    <th>Nhân Viên (KTV)</th>
                                    <th>Trạng Thái</th>
                                    <th className="text-end">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms && rooms.length > 0 ? rooms.map((room) => {
                                    const rId = room.roomId || room.room_id || room.Id;
                                    return (
                                        <tr key={rId}>
                                            <td className="fw-bold text-primary">{room.roomName || room.room_name}</td>
                                            <td>{room.roomLocation || room.room_location || '-'}</td>
                                            <td>
                                                <Badge bg="info" text="dark">
                                                    {(room.roomType || room.room_type || '').toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td>{room.assignedEquipment || room.assigned_equipment || '-'}</td>
                                            <td>{room.technicianInCharge || room.technician_in_charge || '-'}</td>
                                            <td>
                                                {(room.isAvailable !== undefined ? room.isAvailable : room.is_available) ? 
                                                    <Badge bg="success">Hoạt động</Badge> : 
                                                    <Badge bg="danger">Bảo trì / Dừng</Badge>
                                                }
                                            </td>
                                            <td className="text-end">
                                                    {isAdmin ? (
                                                        <>
                                                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenModal(room)}>
                                                                <i className="fas fa-edit"></i> Sửa
                                                            </Button>
                                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rId)}>
                                                                <i className="fas fa-trash"></i> Xóa
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button variant="outline-info" size="sm" onClick={() => handleOpenModal(room)}>
                                                            <i className="fas fa-eye"></i> Xem chi tiết
                                                        </Button>
                                                    )}
                                                </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted">
                                            Không có dữ liệu phòng nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Modal Create/Edit */}
            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isAdmin ? (editingRoom ? 'Sửa thông tin Phòng' : 'Tạo Phòng Mới') : 'Chi tiết Phòng Lab'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Tên Phòng <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="roomName"
                                value={formData.roomName}
                                onChange={handleChange} readOnly={!isAdmin}
                                required
                                placeholder="VD: Phòng Xét Nghiệm Hóa Sinh 1"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Vị Trí (Location)</Form.Label>
                            <Form.Control
                                type="text"
                                name="roomLocation"
                                value={formData.roomLocation}
                                onChange={handleChange} readOnly={!isAdmin}
                                placeholder="VD: Tầng 2, Dãy B"
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Loại Phòng</Form.Label>
                                    <Form.Select
                                        name="roomType"
                                        value={formData.roomType}
                                        onChange={handleChange} readOnly={!isAdmin}
                                     disabled={!isAdmin}>
                                        <option value="Khám">Phòng Khám</option>
                                        <option value="Xét nghiệm">Phòng Xét Nghiệm</option>
                                        <option value="Lấy mẫu">Phòng Lấy Mẫu</option>
                                        <option value="Hành chính">Phòng Hành Chính</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Trạng Thái</Form.Label>
                                    <Form.Check
                                        type="switch"
                                        id="status-switch"
                                        label={formData.isAvailable ? "Đang hoạt động" : "Tạm ngưng / Bảo trì"}
                                        name="isAvailable"
                                        checked={formData.isAvailable}
                                        onChange={handleChange} readOnly={!isAdmin} disabled={!isAdmin}
                                        className={formData.isAvailable ? "text-success" : "text-danger"}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Thiết Bị Cố Định (Assigned Equipment)</Form.Label>
                            <Form.Control
                                type="text"
                                name="assignedEquipment"
                                value={formData.assignedEquipment}
                                onChange={handleChange} readOnly={!isAdmin}
                                placeholder="VD: Máy Huyết Học Sysmex XN-1000"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Kỹ Thuật Viên Phụ Trách (Technician in charge)</Form.Label>
                            <Form.Control
                                type="text"
                                name="technicianInCharge"
                                value={formData.technicianInCharge}
                                onChange={handleChange} readOnly={!isAdmin}
                                placeholder="Tên hoặc Mã KTV phụ trách chính"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Hủy
                        </Button>
                        {isAdmin && (
                            <Button variant="primary" type="submit">
                                Lưu thông tin
                            </Button>
                        )}
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default LabRoomManagementPage;
