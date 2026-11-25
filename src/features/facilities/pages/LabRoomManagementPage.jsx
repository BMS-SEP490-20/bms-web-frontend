/**
 * @file LabRoomManagementPage.jsx
 * @description Quản Lý Phòng Xét Nghiệm & Khám Lâm Sàng (UC34).
 * Thẩm quyền: Trưởng Khoa / Quản Lý Phòng Lab (Manager) & Quản Trị Hệ Thống (Admin).
 * Tuân thủ: ISO 15189, Clean Medical Standard & AGENTS.md.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Table, Button, Form, Modal, Spinner, Badge } from 'react-bootstrap';
import { Plus, Search, X as LucideX, RefreshCw, SquarePen, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { testOrderService } from '../../../services/testOrderService';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';

const LabRoomManagementPage = () => {
    const { user, userRoleId, userRole } = useAuth();
    const { showSuccess, showError } = useNotificationContext();
    const isAdmin = userRoleId === 1 || userRole === 'admin' || user?.role === 'Administrator';
    const isManagerOrAdmin = isAdmin || userRoleId === 6 || userRole === 'manager' || user?.role === 'Manager' || userRole === 'lab_manager';

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
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

    const filteredRooms = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return (Array.isArray(rooms) ? rooms : []).filter((room) => {
            const isAvail = room.isAvailable !== undefined ? room.isAvailable : room.is_available;
            const rType = String(room.roomType || room.room_type || room.accessLevel || 'Xét nghiệm').toLowerCase();
            if (statusFilter === 'AVAILABLE' && !isAvail) return false;
            if (statusFilter === 'MAINTENANCE' && isAvail) return false;
            if (typeFilter !== 'ALL' && !rType.includes(typeFilter.toLowerCase())) return false;
            if (!q) return true;
            const name = String(room.roomName || room.room_name || room.name || '').toLowerCase();
            const loc = String(room.roomLocation || room.room_location || room.floor || '').toLowerCase();
            const equip = String(room.assignedEquipment || room.assigned_equipment || '').toLowerCase();
            const tech = String(room.technicianInCharge || room.technician_in_charge || '').toLowerCase();
            return name.includes(q) || loc.includes(q) || equip.includes(q) || tech.includes(q);
        });
    }, [rooms, searchTerm, statusFilter, typeFilter]);

    return (
        <div className="w-100 py-1">
            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">Quản Lý Phòng Xét Nghiệm &amp; Lâm Sàng</h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Quản lý danh mục phòng chức năng, thiết bị phân tích cố định và trạng thái vận hành
                    </p>
                </div>
                <div className="bms-page-actions">
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2"
                        onClick={fetchRooms}
                        disabled={loading}
                    >
                        <RefreshCw className={loading ? 'fa-spin' : ''} size={13} />
                        <span>Làm mới</span>
                    </Button>
                    {isManagerOrAdmin && (
                        <Button
                            variant="primary"
                            size="sm"
                            className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2"
                            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                            onClick={() => handleOpenModal()}
                        >
                            <Plus size={12} />
                            <span>Thêm phòng mới</span>
                        </Button>
                    )}
                </div>
            </div>

            <div className="bms-filter-bar mb-3">
                <div className="bms-search-input-pill">
                    <Search className="bms-search-icon"  size="1em"/>
                    <input
                        type="text"
                        placeholder="Tìm tên phòng, vị trí, thiết bị hoặc nhân sự phụ trách..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            className="bms-search-clear"
                            onClick={() => setSearchTerm('')}
                            title="Xóa tìm kiếm"
                        >
                            <LucideX size={12} />
                        </button>
                    )}
                </div>

                <Form.Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="ALL">Tất cả chức năng</option>
                    <option value="Xét nghiệm">Phòng xét nghiệm</option>
                    <option value="Khám">Phòng khám lâm sàng</option>
                    <option value="Lấy mẫu">Phòng thu thập mẫu</option>
                    <option value="Hành chính">Phòng hành chính</option>
                </Form.Select>

                <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="AVAILABLE">Đang hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì / Tạm dừng</option>
                </Form.Select>

                {(searchTerm !== '' || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        className="rounded-pill px-3 text-nowrap"
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('ALL');
                            setTypeFilter('ALL');
                        }}
                    >
                        Đặt lại
                    </Button>
                )}

                <span className="bms-filter-meta">
                    Hiển thị <strong>{filteredRooms.length}</strong> / {rooms.length} phòng
                </span>
            </div>

            <div className="bms-table-standalone-section">
                <div className="bms-table-standalone-body">
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" />
                            <div className="text-muted small mt-2">Đang tải danh sách phòng xét nghiệm...</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0">
                                <thead>
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
                                    {filteredRooms.length > 0 ? filteredRooms.map((room) => {
                                        const rId = room.roomId || room.room_id || room.Id || room.id;
                                        const isAvail = room.isAvailable !== undefined ? room.isAvailable : room.is_available;
                                        return (
                                            <tr key={rId}>
                                                <td className="ps-4 fw-bold text-primary">{room.roomName || room.room_name || room.name}</td>
                                                <td>{room.roomLocation || room.room_location || room.floor || '-'}</td>
                                                <td>
                                                    <Badge bg="info-subtle" text="info" className="border border-info-subtle px-2 py-1 rounded-pill">
                                                        {room.roomType || room.room_type || room.accessLevel || 'Xét nghiệm'}
                                                    </Badge>
                                                </td>
                                                <td>{room.assignedEquipment || room.assigned_equipment || '-'}</td>
                                                <td>{room.technicianInCharge || room.technician_in_charge || '-'}</td>
                                                <td>
                                                    {isAvail ? (
                                                        <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2 py-1 rounded-pill">
                                                            Đang hoạt động
                                                        </Badge>
                                                    ) : (
                                                        <Badge bg="danger-subtle" text="danger" className="border border-danger-subtle px-2 py-1 rounded-pill">
                                                            Bảo trì / Tạm dừng
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="text-end pe-4">
                                                    <div className="bms-action-btn-group">
                                                        {isManagerOrAdmin ? (
                                                            <>
                                                                <Button variant="outline-primary" size="sm" className="rounded-pill text-nowrap fw-semibold" onClick={() => handleOpenModal(room)}>
                                                                    <SquarePen className="me-1"  size="1em"/> Sửa
                                                                </Button>
                                                                <Button variant="outline-danger" size="sm" className="rounded-pill text-nowrap fw-semibold" onClick={() => handleDelete(rId)}>
                                                                    <Trash2 className="me-1"  size="1em"/> Xóa
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button variant="outline-primary" size="sm" className="rounded-pill text-nowrap" onClick={() => handleOpenModal(room)}>
                                                                <Eye className="me-1"  size="1em"/> Xem chi tiết
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-muted">
                                                Không tìm thấy phòng xét nghiệm nào phù hợp với bộ lọc.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Thiết lập / Chỉnh sửa phòng xét nghiệm */}
            <Modal show={showModal} onHide={handleCloseModal} centered backdrop="static">
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold fs-5 text-dark">
                        {isManagerOrAdmin ? (editingRoom ? 'Chỉnh Sửa Thông Tin Phòng Xét Nghiệm' : 'Thiết Lập Phòng Xét Nghiệm Mới') : 'Chi Tiết Phòng Xét Nghiệm'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
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
        </div>
    );
};

export default LabRoomManagementPage;
