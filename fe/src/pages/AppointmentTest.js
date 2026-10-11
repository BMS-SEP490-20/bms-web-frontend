import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Table } from 'react-bootstrap';
import api from '../services/api';

const AppointmentTest = () => {
    const [role, setRole] = useState('patient'); // 'patient' or 'doctor'
    const [appointments, setAppointments] = useState([]);
    
    // Modals state
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState({
        id: '',
        appointmentTime: '',
        appointmentType: 'Khám',
        reasonForRescheduling: '',
        guestName: '',
        guestPhone: ''
    });

    const patientId = 'PAT-TEST-01'; // Mock patient ID
    const doctorId = 'DOC-TEST-01'; // Mock doctor ID

    useEffect(() => {
        loadAppointments();
    }, [role]);

    const loadAppointments = async () => {
        try {
            // Lấy tất cả và filter cho đơn giản trong test
            const response = await api.get('/gateway/testorder/appointment');
            let data = response.data?.data || response.data || [];
            if (!Array.isArray(data)) data = [];
            
            if (role === 'patient') {
                data = data.filter(a => a.createdBy === patientId);
            }
            setAppointments(data);
        } catch (error) {
            console.error('Error loading appointments:', error);
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

    const handleEditOpen = (apt) => {
        setFormData({
            id: apt.appointmentId || apt.id,
            appointmentTime: apt.appointmentTime ? new Date(apt.appointmentTime).toISOString().slice(0, 16) : '',
            appointmentType: apt.appointmentType || 'Khám',
            reasonForRescheduling: apt.reasonForRescheduling || '',
            guestName: apt.guestName || '',
            guestPhone: apt.guestPhone || ''
        });
        setShowEdit(true);
    };

    const handleCreateSubmit = async () => {
        try {
            const payload = {
                createdBy: role === 'patient' ? patientId : doctorId,
                status: 'scheduled',
                appointmentTime: formData.appointmentTime,
                appointmentType: formData.appointmentType,
                guestName: role === 'doctor' ? formData.guestName : null,
                guestPhone: role === 'doctor' ? formData.guestPhone : null
            };
            
            await api.post('/gateway/testorder/appointment', payload);
            setShowCreate(false);
            loadAppointments();
        } catch (error) {
            console.error('Error creating:', error);
            alert('Lỗi khi tạo');
        }
    };

    const handleEditSubmit = async () => {
        try {
            const payload = {
                appointmentTime: formData.appointmentTime,
                appointmentType: formData.appointmentType,
                reasonForRescheduling: formData.reasonForRescheduling,
                guestName: formData.guestName,
                guestPhone: formData.guestPhone
            };
            
            await api.put(`/gateway/testorder/appointment/${formData.id}`, payload);
            setShowEdit(false);
            loadAppointments();
        } catch (error) {
            console.error('Error updating:', error);
            alert('Lỗi khi sửa');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return;
        try {
            await api.delete(`/gateway/testorder/appointment/${id}`);
            loadAppointments();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Lỗi khi xóa');
        }
    };

    const handleCheckIn = async (id) => {
        try {
            await api.put(`/gateway/testorder/appointment/${id}`, { status: 'checked_in' });
            loadAppointments();
        } catch (error) {
            console.error('Error check in:', error);
            alert('Lỗi khi check in');
        }
    };

    return (
        <Container className="mt-5">
            <h2 className="mb-4">Test CRUD Appointments (Manage Appointments)</h2>
            <div className="mb-4">
                <strong>Current Role: </strong>
                <Button 
                    variant={role === 'patient' ? 'primary' : 'outline-primary'} 
                    className="me-2" 
                    onClick={() => setRole('patient')}
                >
                    User / Patient
                </Button>
                <Button 
                    variant={role === 'doctor' ? 'primary' : 'outline-primary'} 
                    onClick={() => setRole('doctor')}
                >
                    Doctor
                </Button>
            </div>

            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Danh sách Appointment</h5>
                    <Button variant="success" onClick={handleCreateOpen}>
                        {role === 'patient' ? 'Tạo lịch hẹn' : 'Tạo lịch hẹn cho Guest'}
                    </Button>
                </Card.Header>
                <Card.Body>
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Created By</th>
                                <th>Type</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Guest Info</th>
                                <th>Lý do dời</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map(apt => (
                                <tr key={apt.appointmentId || apt.id}>
                                    <td>{apt.appointmentId || apt.id}</td>
                                    <td>{apt.createdBy}</td>
                                    <td>{apt.appointmentType}</td>
                                    <td>{apt.appointmentTime ? new Date(apt.appointmentTime).toLocaleString() : 'N/A'}</td>
                                    <td>{apt.status}</td>
                                    <td>
                                        {apt.guestName ? `${apt.guestName} - ${apt.guestPhone}` : 'N/A'}
                                    </td>
                                    <td>{apt.reasonForRescheduling}</td>
                                    <td>
                                        {role === 'patient' && (
                                            <>
                                                <Button variant="warning" size="sm" className="me-2" onClick={() => handleEditOpen(apt)}>Sửa</Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDelete(apt.appointmentId || apt.id)}>Xóa</Button>
                                            </>
                                        )}
                                        {role === 'doctor' && (
                                            <>
                                                {apt.status !== 'checked_in' && (
                                                    <Button variant="info" size="sm" className="me-2" onClick={() => handleCheckIn(apt.appointmentId || apt.id)}>Check-in</Button>
                                                )}
                                                {apt.guestName && (
                                                    <>
                                                        <Button variant="warning" size="sm" className="me-2" onClick={() => handleEditOpen(apt)}>Sửa</Button>
                                                        <Button variant="danger" size="sm" onClick={() => handleDelete(apt.appointmentId || apt.id)}>Xóa</Button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Modal Create */}
            <Modal show={showCreate} onHide={() => setShowCreate(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{role === 'patient' ? 'Tạo lịch hẹn mới' : 'Tạo lịch hẹn cho Guest'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Thời gian hẹn</Form.Label>
                            <Form.Control 
                                type="datetime-local" 
                                value={formData.appointmentTime}
                                onChange={(e) => setFormData({...formData, appointmentTime: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Đăng ký khám / Tái khám</Form.Label>
                            <div>
                                <Form.Check 
                                    inline
                                    type="radio" 
                                    label="Khám" 
                                    name="type" 
                                    checked={formData.appointmentType === 'Khám'}
                                    onChange={() => setFormData({...formData, appointmentType: 'Khám'})}
                                />
                                <Form.Check 
                                    inline
                                    type="radio" 
                                    label="Tái khám" 
                                    name="type" 
                                    checked={formData.appointmentType === 'Tái khám'}
                                    onChange={() => setFormData({...formData, appointmentType: 'Tái khám'})}
                                />
                            </div>
                        </Form.Group>
                        {role === 'doctor' && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tên Guest</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        value={formData.guestName}
                                        onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>SĐT Guest</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        value={formData.guestPhone}
                                        onChange={(e) => setFormData({...formData, guestPhone: e.target.value})}
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreate(false)}>Hủy</Button>
                    <Button variant="primary" onClick={handleCreateSubmit}>Lưu</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Edit */}
            <Modal show={showEdit} onHide={() => setShowEdit(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Chỉnh sửa lịch hẹn</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Đặt lại thời gian hẹn</Form.Label>
                            <Form.Control 
                                type="datetime-local" 
                                value={formData.appointmentTime}
                                onChange={(e) => setFormData({...formData, appointmentTime: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Đăng ký khám / Tái khám</Form.Label>
                            <div>
                                <Form.Check 
                                    inline
                                    type="radio" 
                                    label="Khám" 
                                    name="editType" 
                                    checked={formData.appointmentType === 'Khám'}
                                    onChange={() => setFormData({...formData, appointmentType: 'Khám'})}
                                />
                                <Form.Check 
                                    inline
                                    type="radio" 
                                    label="Tái khám" 
                                    name="editType" 
                                    checked={formData.appointmentType === 'Tái khám'}
                                    onChange={() => setFormData({...formData, appointmentType: 'Tái khám'})}
                                />
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ghi chú thêm lý do dời lịch (Không bắt buộc)</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2}
                                value={formData.reasonForRescheduling}
                                onChange={(e) => setFormData({...formData, reasonForRescheduling: e.target.value})}
                            />
                        </Form.Group>
                        {formData.guestName && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tên Guest</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        value={formData.guestName}
                                        onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>SĐT Guest</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        value={formData.guestPhone}
                                        onChange={(e) => setFormData({...formData, guestPhone: e.target.value})}
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEdit(false)}>Hủy</Button>
                    <Button variant="primary" onClick={handleEditSubmit}>Lưu chỉnh sửa</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AppointmentTest;
