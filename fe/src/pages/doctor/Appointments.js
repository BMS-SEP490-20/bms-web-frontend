import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import api from '../../services/api';
import { Container, Card, Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap';

const DoctorAppointments = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [userMap, setUserMap] = useState({});

    // Modals state
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showCancelled, setShowCancelled] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    // State quản lý Popup Cập nhật Trạng thái
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatusApt, setSelectedStatusApt] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        id: '',
        appointmentTime: '',
        appointmentType: 'Khám',
        reasonForRescheduling: '',
        guestName: '',
        guestPhone: ''
    });

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            const [aptResponse, usersResponse] = await Promise.all([
                api.get('/gateway/testorder/appointment'),
                api.get('/gateway/admin/accounts').catch(() => ({ data: { data: [] } }))
            ]);
            let data = aptResponse.data?.data || aptResponse.data || [];
            if (!Array.isArray(data)) data = [];
            setAppointments(data);

            let usersData = usersResponse.data?.data || usersResponse.data || [];
            if (Array.isArray(usersData)) {
                const map = {};
                usersData.forEach(u => {
                    if (u.id) {
                        map[u.id] = u.username || u.email || u.fullName || u.id;
                    }
                });
                setUserMap(map);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleCreateOpen = () => {
        setFormData({
            id: '',
            appointmentTime: '',
            appointmentType: 'Khám',
            reasonForRescheduling: '',
            guestName: '',
            guestPhone: ''
        });
        setShowCreate(true);
    };

    const handleConfirmCancel = async () => {
        if (!selectedAppointment) return;
        try {
            await api.put(`/gateway/testorder/appointment/${selectedAppointment.appointmentId || selectedAppointment.id}`, { status: 'cancelled' });
            setShowDetail(false);
            loadAppointments();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleViewDetail = (apt) => {
        setSelectedAppointment(apt);
        setShowDetail(true);
    };

    const handleCreateSubmit = async () => {
        try {
            const payload = {
                createdBy: user?.id || 'DOCTOR',
                status: 'pending',
                appointmentTime: formData.appointmentTime,
                appointmentType: formData.appointmentType,
                guestName: formData.guestName,
                guestPhone: formData.guestPhone
            };

            await api.post('/gateway/testorder/appointment', payload);
            setShowCreate(false);
            loadAppointments();
        } catch (error) {
            console.error('Error creating:', error);
            alert('Lỗi khi tạo');
        }
    };

    const handleDelete = async (id) => {
        const reason = window.prompt('Nhập lý do hủy lịch (Bắt buộc):');
        if (reason === null) return;
        if (reason.trim() === '') {
            alert('Vui lòng nhập lý do hủy!');
            return;
        }
        try {
            await api.put(`/gateway/testorder/appointment/${id}`, { status: 'cancelled', reasonForRescheduling: reason });
            loadAppointments();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Lỗi khi hủy');
        }
    };

    // Cập nhật trạng thái và tự động đóng Popup
    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.put(`/gateway/testorder/appointment/${id}`, { status: newStatus });
            setShowStatusModal(false);
            loadAppointments();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Lỗi khi cập nhật trạng thái');
        }
    };

    const formatStatus = (status) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('pending') || s === 'đang chờ' || s === 'pending_payment') return <Badge bg="warning" text="dark">Đang chờ</Badge>;
        if (s === 'scheduled' || s === 'confirmed' || s === 'đã hẹn') return <Badge bg="primary">Đã hẹn</Badge>;
        if (s === 'no_show' || s === 'vắng' || s === 'missed') return <Badge bg="danger">Vắng</Badge>;
        if (s === 'cancelled' || s === 'đã hủy') return <Badge bg="secondary">Đã hủy</Badge>;
        if (s === 'cancelled_by_patient') return <Badge bg="secondary">Đã hủy</Badge>;
        return <Badge bg="secondary">{status}</Badge>;
    };

    const activeAppointments = appointments.filter(a => {
        const s = a.status?.toLowerCase() || '';
        return s !== 'cancelled' && s !== 'đã hủy';
    });

    const cancelledAppointments = appointments.filter(a => {
        const s = a.status?.toLowerCase() || '';
        return s === 'cancelled' || s === 'đã hủy';
    });

    return (
        <Container fluid className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <h4 className="mb-4 text-primary" style={{ fontWeight: '600' }}>
                <i className="fas fa-calendar-check me-2"></i>
                Lịch hẹn appointment
            </h4>

            <Card className="shadow-sm border-0 rounded-4">
                <Card.Header className="bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 text-dark fw-bold">Quản lý Lịch hẹn</h5>
                    <Button variant="primary" onClick={handleCreateOpen} style={{ borderRadius: '10px' }}>
                        <i className="fas fa-plus me-2"></i>
                        Tạo lịch hẹn Guest
                    </Button>
                </Card.Header>
                <Card.Body>
                    <div className="table-responsive mt-3">
                        <Table hover className="align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Mã LH</th>
                                    <th>Thời gian</th>
                                    <th>Loại khám</th>
                                    <th>Người tạo</th>
                                    <th>Guest Info</th>
                                    <th className="text-center">Trạng thái</th>
                                    <th className="text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeAppointments.map(apt => {
                                    const statusLower = apt.status?.toLowerCase() || '';
                                    const isScheduled = statusLower === 'scheduled' || statusLower === 'confirmed' || statusLower === 'đã hẹn';
                                    const isNoShow = statusLower === 'no_show' || statusLower === 'vắng' || statusLower === 'missed';

                                    return (
                                        <tr key={apt.appointmentId || apt.id} className={(apt.status === 'cancelled_by_patient' || apt.status === 'cancelled') ? 'table-danger' : ''}>
                                            <td><Badge bg="secondary">{apt.appointmentId || apt.id}</Badge></td>
                                            <td>
                                                {apt.appointmentTime ? (
                                                    <>
                                                        <div className="fw-bold">{new Date(apt.appointmentTime).toLocaleDateString()}</div>
                                                        <small className="text-muted">{new Date(apt.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                    </>
                                                ) : 'N/A'}
                                            </td>
                                            <td>{apt.appointmentType || 'Khám'}</td>
                                            <td>{userMap[apt.createdBy] || apt.patientName || apt.createdBy}</td>
                                            <td>
                                                {apt.guestName ? (
                                                    <>
                                                        <div className="fw-bold">{apt.guestName}</div>
                                                        <small className="text-muted">{apt.guestPhone}</small>
                                                    </>
                                                ) : '-'}
                                            </td>
                                            {/* Nút bấm viền đen mở Popup trạng thái */}
                                            <td className="text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedStatusApt(apt);
                                                        setShowStatusModal(true);
                                                    }}
                                                    disabled={apt.status === 'cancelled_by_patient' || apt.status === 'cancelled'}
                                                    className={`btn btn-sm fw-bold text-uppercase border border-dark border-2 rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-2 ${isScheduled ? 'btn-primary' : isNoShow ? 'btn-danger' : (apt.status === 'cancelled_by_patient' || apt.status === 'cancelled') ? 'btn-secondary text-white' : 'btn-warning text-dark'
                                                        }`}
                                                    title={apt.status === 'cancelled_by_patient' || apt.status === 'cancelled' ? "Lịch đã hủy" : "Bấm để đổi trạng thái"}
                                                >
                                                    <span>{isScheduled ? 'ĐÃ HẸN' : isNoShow ? 'VẮNG' : (apt.status === 'cancelled_by_patient' || apt.status === 'cancelled') ? 'ĐÃ HỦY' : 'ĐANG CHỜ'}</span>
                                                    {!(apt.status === 'cancelled_by_patient' || apt.status === 'cancelled') && <i className="fas fa-edit fs-7"></i>}
                                                </button>
                                            </td>
                                            <td className="text-center">
                                                <Button variant="outline-info" size="sm" className="me-1" onClick={() => handleViewDetail(apt)}>
                                                    <i className="fas fa-eye"></i> Chi tiết
                                                </Button>
                                                {!(apt.status === 'cancelled_by_patient' || apt.status === 'cancelled') && (
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(apt.appointmentId || apt.id)}>
                                                        <i className="fas fa-ban"></i> Hủy
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Cancelled section */}
            <div className="mt-4 mb-4">
                <Button variant="outline-secondary" onClick={() => setShowCancelled(!showCancelled)} className="mb-3 fw-bold" style={{ borderRadius: '10px' }}>
                    <i className={`fas fa-chevron-${showCancelled ? 'up' : 'down'} me-2`}></i>
                    {showCancelled ? 'Ẩn danh sách đã hủy' : 'Xem danh sách đã hủy'} ({cancelledAppointments.length})
                </Button>

                {showCancelled && (
                    <Card className="shadow-sm border-0 rounded-4 bg-light">
                        <Card.Header className="bg-transparent border-bottom-0 pt-3">
                            <h6 className="mb-0 text-muted fw-bold">Danh sách lịch đã hủy</h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="table-responsive">
                                <Table hover className="align-middle text-muted">
                                    <thead>
                                        <tr>
                                            <th>Mã LH</th>
                                            <th>Thời gian</th>
                                            <th>Loại khám</th>
                                            <th>Người tạo</th>
                                            <th>Trạng thái</th>
                                            <th className="text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cancelledAppointments.map(apt => (
                                            <tr key={apt.appointmentId || apt.id}>
                                                <td><Badge bg="secondary">{apt.appointmentId || apt.id}</Badge></td>
                                                <td>
                                                    {apt.appointmentTime ? (
                                                        <>
                                                            <div className="fw-bold">{new Date(apt.appointmentTime).toLocaleDateString()}</div>
                                                            <small>{new Date(apt.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                        </>
                                                    ) : 'N/A'}
                                                </td>
                                                <td>{apt.appointmentType || 'Khám'}</td>
                                                <td>{userMap[apt.createdBy] || apt.patientName || apt.createdBy}</td>
                                                <td>{formatStatus(apt.status)}</td>
                                                <td className="text-center">
                                                    <Button variant="outline-info" size="sm" onClick={() => handleViewDetail(apt)}>
                                                        <i className="fas fa-eye"></i> Chi tiết
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </div>

            {/* Popup (Modal) Cập nhật Trạng thái */}
            <Modal
                show={showStatusModal}
                onHide={() => setShowStatusModal(false)}
                centered
                size="sm"
            >
                <Modal.Header closeButton className="border-0 pb-0 bg-light">
                    <Modal.Title className="fs-6 fw-bold text-dark">
                        <i className="fas fa-sync-alt me-2 text-primary"></i>Cập nhật trạng thái
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3 bg-light rounded-bottom">
                    <p className="text-muted small mb-3 text-center">
                        Chọn trạng thái mới cho lịch hẹn <strong>#{selectedStatusApt?.appointmentId || selectedStatusApt?.id}</strong>:
                    </p>
                    <div className="d-flex flex-column gap-2">
                        <Button
                            variant="outline-warning"
                            className="w-100 text-dark fw-bold d-flex align-items-center justify-content-between p-2.5 rounded-3 border-2 bg-white"
                            onClick={() => handleUpdateStatus(selectedStatusApt?.appointmentId || selectedStatusApt?.id, 'pending')}
                        >
                            <span><i className="fas fa-clock me-2 text-warning"></i>Đang chờ</span>
                            <i className="fas fa-chevron-right opacity-50"></i>
                        </Button>

                        <Button
                            variant="outline-primary"
                            className="w-100 fw-bold d-flex align-items-center justify-content-between p-2.5 rounded-3 border-2 bg-white"
                            onClick={() => handleUpdateStatus(selectedStatusApt?.appointmentId || selectedStatusApt?.id, 'scheduled')}
                        >
                            <span><i className="fas fa-calendar-check me-2 text-primary"></i>Đã hẹn</span>
                            <i className="fas fa-chevron-right opacity-50"></i>
                        </Button>

                        <Button
                            variant="outline-danger"
                            className="w-100 fw-bold d-flex align-items-center justify-content-between p-2.5 rounded-3 border-2 bg-white"
                            onClick={() => handleUpdateStatus(selectedStatusApt?.appointmentId || selectedStatusApt?.id, 'no_show')}
                        >
                            <span><i className="fas fa-user-slash me-2 text-danger"></i>Vắng</span>
                            <i className="fas fa-chevron-right opacity-50"></i>
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Modal Create Guest */}
            <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white border-0">
                    <Modal.Title><i className="fas fa-user-plus me-2"></i>Tạo lịch hẹn cho Guest</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Tên Guest</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nhập tên khách..."
                                value={formData.guestName}
                                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Số điện thoại Guest</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nhập SĐT..."
                                value={formData.guestPhone}
                                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Thời gian hẹn</Form.Label>
                            <Form.Control
                                type="datetime-local"
                                value={formData.appointmentTime}
                                onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold d-block">Loại lịch hẹn</Form.Label>
                            <Form.Check
                                inline type="radio" label="Đăng ký khám" name="type"
                                checked={formData.appointmentType === 'Khám'}
                                onChange={() => setFormData({ ...formData, appointmentType: 'Khám' })}
                            />
                            <Form.Check
                                inline type="radio" label="Tái khám" name="type"
                                checked={formData.appointmentType === 'Tái khám'}
                                onChange={() => setFormData({ ...formData, appointmentType: 'Tái khám' })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light">
                    <Button variant="secondary" onClick={() => setShowCreate(false)}>Hủy</Button>
                    <Button variant="primary" onClick={handleCreateSubmit}>Lưu thông tin</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Detail */}
            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size="md">
                <Modal.Header closeButton className="bg-info text-white border-0">
                    <Modal.Title><i className="fas fa-info-circle me-2"></i>Chi tiết lịch hẹn</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedAppointment && (
                        <div>
                            <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">Thông tin lịch hẹn</h6>
                            <Row className="mb-2">
                                <Col sm={5} className="text-muted fw-bold">Mã lịch hẹn:</Col>
                                <Col sm={7}>{selectedAppointment.appointmentId || selectedAppointment.id}</Col>
                            </Row>
                            <Row className="mb-2">
                                <Col sm={5} className="text-muted fw-bold">Thời gian:</Col>
                                <Col sm={7}>
                                    {selectedAppointment.appointmentTime ?
                                        new Date(selectedAppointment.appointmentTime).toLocaleString() : 'N/A'}
                                </Col>
                            </Row>
                            <Row className="mb-2">
                                <Col sm={5} className="text-muted fw-bold">Loại khám:</Col>
                                <Col sm={7}>{selectedAppointment.appointmentType || 'Khám'}</Col>
                            </Row>
                            <Row className="mb-2">
                                <Col sm={5} className="text-muted fw-bold">Trạng thái:</Col>
                                <Col sm={7}>{formatStatus(selectedAppointment.status)}</Col>
                            </Row>
                            {selectedAppointment?.reasonForRescheduling && (
                                <Row className="mb-2">
                                    <Col sm={5} className={selectedAppointment.status?.includes('cancel') ? "text-danger fw-bold" : "text-muted fw-bold"}>
                                        {selectedAppointment.status?.includes('cancel') ? 'Lý do hủy:' : 'Lý do dời lịch:'}
                                    </Col>
                                    <Col sm={7} className={selectedAppointment.status?.includes('cancel') ? "text-danger fw-bold" : ""}>
                                        {selectedAppointment.reasonForRescheduling}
                                    </Col>
                                </Row>
                            )}
                            

                            <h6 className="fw-bold text-primary mb-3 mt-4 border-bottom pb-2">Thông tin bệnh nhân</h6>
                            <Row className="mb-2">
                                <Col sm={5} className="text-muted fw-bold">Người tạo:</Col>
                                <Col sm={7}>{userMap[selectedAppointment?.createdBy] || selectedAppointment?.patientName || selectedAppointment?.createdBy}</Col>
                            </Row>
                            {selectedAppointment.guestName && (
                                <>
                                    <Row className="mb-2">
                                        <Col sm={5} className="text-muted fw-bold">Tên Guest:</Col>
                                        <Col sm={7}>{selectedAppointment.guestName}</Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col sm={5} className="text-muted fw-bold">SĐT Guest:</Col>
                                        <Col sm={7}>{selectedAppointment.guestPhone}</Col>
                                    </Row>
                                </>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light">
                    {selectedAppointment?.status === 'cancelled_by_patient' && (
                        <Button variant="danger" onClick={handleConfirmCancel}>
                            Đã xem (Xác nhận hủy)
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setShowDetail(false)}>Đóng</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DoctorAppointments;