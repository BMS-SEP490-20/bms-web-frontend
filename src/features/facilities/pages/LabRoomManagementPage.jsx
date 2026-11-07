/**
 * @file LabRoomManagementPage.jsx
 * @description Quản Lý Phòng Xét Nghiệm & Khám Lâm Sàng (UC34).
 * Thẩm quyền: Trưởng Khoa / Quản Lý Phòng Lab (Manager) & Quản Trị Hệ Thống (Admin).
 * Tuân thủ: ISO 15189, Clean Medical Standard & AGENTS.md.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { testOrderService } from '../../../services/testOrderService';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';

const LabRoomManagementPage = () => {
    const { user, userRoleId, userRole } = useAuth();
    const { showSuccess, showError } = useNotificationContext();
    const isAdmin = userRoleId === 1 || userRole === 'admin' || user?.role === 'Administrator';
    const isManagerOrAdmin = isAdmin || userRoleId === 2 || userRole === 'manager' || user?.role === 'Manager' || userRole === 'lab_manager';

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState({
        roomName: '',
        roomLocation: '',
        roomType: 'Xét nghiệm',
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
                const raw = res.data?.data || res.data?.items || res.data || [];
                setRooms(Array.isArray(raw) ? raw : []);
            } else {
                showError(res.message || 'Lỗi khi tải danh sách phòng xét nghiệm');
            }
        } catch (error) {
            console.error('Lỗi tải danh sách phòng lab:', error);
            showError('Lỗi kết nối khi tải dữ liệu phòng xét nghiệm');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (room = null) => {
        if (room) {
            setEditingRoom(room);
            setFormData({
                roomName: room.roomName || room.RoomName || room.name || '',
                roomLocation: room.roomLocation || room.RoomLocation || room.floor || '',
                roomType: room.roomType || room.RoomType || 'Xét nghiệm',
                isAvailable: room.isAvailable !== undefined ? room.isAvailable : (room.IsAvailable !== undefined ? room.IsAvailable : true),
                assignedEquipment: room.assignedEquipment || room.AssignedEquipment || '',
                technicianInCharge: room.technicianInCharge || room.TechnicianInCharge || ''
            });
        } else {
            setEditingRoom(null);
            setFormData({
                roomName: '',
                roomLocation: '',
                roomType: 'Xét nghiệm',
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
                    showSuccess('Cập nhật thông tin phòng xét nghiệm thành công!');
                    handleCloseModal();
                    fetchRooms();
                } else {
                    showError(res.message || 'Lỗi khi cập nhật thông tin phòng');
                }
            } else {
                const res = await testOrderService.createLabRoom(formData);
                if (res.success) {
                    showSuccess('Thiết lập phòng xét nghiệm mới thành công!');
                    handleCloseModal();
                    fetchRooms();
                } else {
                    showError(res.message || 'Lỗi khi tạo phòng mới');
                }
            }
        } catch (error) {
            console.error('Lỗi khi lưu phòng xét nghiệm:', error);
            showError('Đã xảy ra lỗi trong quá trình lưu dữ liệu!');
        }
    };

    const handleDelete = async (roomId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa phòng xét nghiệm này khỏi hệ thống?')) {
            try {
                const res = await testOrderService.deleteLabRoom(roomId);
                if (res.success) {
                    showSuccess('Đã xóa phòng xét nghiệm thành công');
                    fetchRooms();
                } else {
                    showError(res.message || 'Lỗi khi xóa phòng xét nghiệm');
                }
            } catch (error) {
                console.error('Lỗi khi xóa phòng:', error);
                showError('Đã xảy ra lỗi khi thực hiện xóa phòng!');
            }
        }
    };

    return (
        <Container fluid className="py-2 px-md-5" style={{ maxWidth: 1400 }}>
            <header className="bms-page-header">
                <div className="bms-page-header-content">
                    <h1 className="bms-page-title">Phòng xét nghiệm</h1>
                </div>
                {isManagerOrAdmin && (
                    <Button variant="primary" className="fw-semibold d-flex align-items-center gap-2" onClick={() => handleOpenModal()}>
                        <i className="fas fa-plus"></i> Phòng mới
                    </Button>
                )}
            </header>

            <Card className="shadow-sm border-0 rounded-3">
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-3">
                            <Spinner animation="border" variant="primary" />
                            <div className="text-muted small mt-2">Đang tải danh sách phòng xét nghiệm...</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0">
                                <thead className="table-light small text-uppercase">
                                    <tr>
                                        <th className="ps-4">Tên Phòng Xét Nghiệm</th>
                                        <th>Vị Trí</th>
                                        <th>Chức Năng Phòng</th>
                                        <th>Thiết Bị Phân Tích Cố Định</th>
                                        <th>Nhân Sự Phụ Trách</th>
                                        <th>Trạng Thái Vận Hành</th>
                                        <th className="text-end pe-4">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(rooms) && rooms.length > 0 ? rooms.map((room) => {
                                        const rId = room.roomId || room.room_id || room.Id || room.id;
                                        const isAvail = room.isAvailable !== undefined ? room.isAvailable : room.is_available;
                                        return (
                                            <tr key={rId}>
                                                <td className="ps-4 fw-bold text-primary">{room.roomName || room.room_name || room.name}</td>
                                                <td>{room.roomLocation || room.room_location || room.floor || '-'}</td>
                                                <td>
                                                    <Badge bg="info-subtle" text="info" className="border border-info-subtle px-2 py-1">
                                                        {(room.roomType || room.room_type || room.accessLevel || 'Xét Nghiệm').toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td>{room.assignedEquipment || room.assigned_equipment || '-'}</td>
                                                <td>{room.technicianInCharge || room.technician_in_charge || '-'}</td>
                                                <td>
                                                    {isAvail ? (
                                                        <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2 py-1">
                                                            ● Đang Hoạt Động
                                                        </Badge>
                                                    ) : (
                                                        <Badge bg="danger-subtle" text="danger" className="border border-danger-subtle px-2 py-1">
                                                            ● Bảo Trì / Tạm Dừng
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="text-end pe-4">
                                                    {isManagerOrAdmin ? (
                                                        <>
                                                            <Button variant="outline-primary" size="sm" className="me-2 fw-semibold" onClick={() => handleOpenModal(room)}>
                                                                <i className="fas fa-edit me-1"></i> Sửa
                                                            </Button>
                                                            <Button variant="outline-danger" size="sm" className="fw-semibold" onClick={() => handleDelete(rId)}>
                                                                <i className="fas fa-trash me-1"></i> Xóa
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button variant="outline-info" size="sm" onClick={() => handleOpenModal(room)}>
                                                            <i className="fas fa-eye me-1"></i> Xem chi tiết
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={7} className="text-center py-3 text-muted">
                                                Chưa có dữ liệu phòng xét nghiệm nào được cấu hình trong hệ thống.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Modal Thiết lập / Chỉnh sửa phòng xét nghiệm */}
            <Modal show={showModal} onHide={handleCloseModal} centered backdrop="static">
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold fs-5 text-dark">
                        {isManagerOrAdmin ? (editingRoom ? 'Chỉnh Sửa Thông Tin Phòng Xét Nghiệm' : 'Thiết Lập Phòng Xét Nghiệm Mới') : 'Chi Tiết Phòng Xét Nghiệm'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body className="p-2">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Tên Phòng Xét Nghiệm <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="roomName"
                                value={formData.roomName}
                                onChange={handleChange}
                                readOnly={!isManagerOrAdmin}
                                required
                                placeholder="VD: Phòng Xét Nghiệm Huyết Học 01"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Vị Trí (Tòa Nhà, Tầng)</Form.Label>
                            <Form.Control
                                type="text"
                                name="roomLocation"
                                value={formData.roomLocation}
                                onChange={handleChange}
                                readOnly={!isManagerOrAdmin}
                                placeholder="VD: Tầng 2, Dãy B, Khu Kỹ Thuật Cao"
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Chức Năng Phòng</Form.Label>
                                    <Form.Select
                                        name="roomType"
                                        value={formData.roomType}
                                        onChange={handleChange}
                                        disabled={!isManagerOrAdmin}
                                    >
                                        <option value="Xét nghiệm">Phòng Xét Nghiệm</option>
                                        <option value="Khám">Phòng Khám Lâm Sàng</option>
                                        <option value="Lấy mẫu">Phòng Thu Thập Mẫu</option>
                                        <option value="Hành chính">Phòng Quản Lý / Hành Chính</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Trạng Thái Vận Hành</Form.Label>
                                    <Form.Check
                                        type="switch"
                                        id="status-switch"
                                        label={formData.isAvailable ? "Đang hoạt động" : "Tạm ngưng / Bảo trì"}
                                        name="isAvailable"
                                        checked={formData.isAvailable}
                                        onChange={handleChange}
                                        disabled={!isManagerOrAdmin}
                                        className={formData.isAvailable ? "text-success fw-semibold" : "text-danger fw-semibold"}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Thiết Bị Phân Tích Cố Định</Form.Label>
                            <Form.Control
                                type="text"
                                name="assignedEquipment"
                                value={formData.assignedEquipment}
                                onChange={handleChange}
                                readOnly={!isManagerOrAdmin}
                                placeholder="VD: Máy Huyết Học Tự Động Sysmex XN-1000, Máy Sinh Hóa Roche Cobas"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Nhân Sự Phụ Trách (KTV / Bác Sĩ)</Form.Label>
                            <Form.Control
                                type="text"
                                name="technicianInCharge"
                                value={formData.technicianInCharge}
                                onChange={handleChange}
                                readOnly={!isManagerOrAdmin}
                                placeholder="VD: KTV. Phạm Quốc Hưng / BSCKII. Lê Lan Anh"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Hủy Bỏ
                        </Button>
                        {isManagerOrAdmin && (
                            <Button variant="primary" type="submit" className="fw-semibold">
                                Lưu Thông Tin Phòng
                            </Button>
                        )}
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default LabRoomManagementPage;
