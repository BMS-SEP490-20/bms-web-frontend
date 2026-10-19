/**
 * @file MyAppointments.jsx
 * @description Patient self-service appointments management module (UC17).
 * Allows patients to view upcoming test appointments, filter by status, and cancel or reschedule bookings.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React, { useState } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col, Modal } from 'react-bootstrap';
import { 
  FaCalendarCheck, 
  FaClock, 
  FaUserMd, 
  FaMapMarkerAlt, 
  FaTimes, 
  FaVial, 
  FaCheckCircle, 
  FaExclamationCircle 
} from 'react-icons/fa';

export default function MyAppointments({ onBookNew }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Demo seed data reflecting ISO 15189 appointment workflow
  const [appointments, setAppointments] = useState([
    {
      id: 'APT-2026-001',
      packageName: 'Gói xét nghiệm Tổng quát Tiêu chuẩn (CBC + Sinh hóa)',
      doctorName: 'BS. CKII Lê Hoàng Nam',
      room: 'Phòng Lấy Mẫu 102 - Tầng 1',
      date: '2026-10-22',
      timeSlot: '08:30 - 09:30',
      status: 'CONFIRMED',
      price: '850.000 đ'
    },
    {
      id: 'APT-2026-002',
      packageName: 'Định lượng Glucose & HbA1c (Theo dõi tiểu đường)',
      doctorName: 'ThS. BS Trần Minh Trí',
      room: 'Phòng Lấy Mẫu 104 - Tầng 1',
      date: '2026-10-28',
      timeSlot: '14:00 - 15:00',
      status: 'PENDING',
      price: '350.000 đ'
    },
    {
      id: 'APT-2026-003',
      packageName: 'Tổng phân tích tế bào máu ngoại vi (CBC)',
      doctorName: 'BS. Nguyễn Văn Hùng',
      room: 'Phòng Lấy Mẫu 101 - Tầng 1',
      date: '2026-10-10',
      timeSlot: '09:00 - 10:00',
      status: 'COMPLETED',
      price: '180.000 đ'
    }
  ]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" />Đã Xác Nhận</Badge>;
      case 'PENDING':
        return <Badge bg="warning" text="dark" className="px-2 py-1"><FaClock className="me-1" />Chờ Tiếp Nhận</Badge>;
      case 'COMPLETED':
        return <Badge bg="info" className="px-2 py-1"><FaVial className="me-1" />Đã Lấy Mẫu</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger" className="px-2 py-1"><FaTimes className="me-1" />Đã Hủy</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleCancelClick = (apt) => {
    setSelectedAppointment(apt);
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    if (selectedAppointment) {
      setAppointments(prev =>
        prev.map(item =>
          item.id === selectedAppointment.id ? { ...item, status: 'CANCELLED' } : item
        )
      );
      setShowCancelModal(false);
      setSelectedAppointment(null);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filterStatus === 'ALL') return true;
    return apt.status === filterStatus;
  });

  return (
    <div className="bms-my-appointments">
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        <Card.Header className="bg-white py-3 px-4 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 p-2 bg-primary bg-opacity-10 text-primary">
              <FaCalendarCheck size={22} />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-dark">Lịch Hẹn Khám & Xét Nghiệm Của Tôi</h5>
              <small className="text-muted">Theo dõi lịch hẹn lấy mẫu bệnh phẩm tại Phòng khám BMS</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Form.Select 
              size="sm" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: 170 }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="PENDING">Chờ tiếp nhận</option>
              <option value="COMPLETED">Đã lấy mẫu</option>
              <option value="CANCELLED">Đã hủy</option>
            </Form.Select>
            {onBookNew && (
              <Button variant="primary" size="sm" onClick={onBookNew} className="d-flex align-items-center gap-1 text-nowrap">
                <FaCalendarCheck /> Đặt Lịch Mới
              </Button>
            )}
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 text-nowrap">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Mã Lịch Hẹn</th>
                  <th>Gói Dịch Vụ / Xét Nghiệm</th>
                  <th>Bác Sĩ Phụ Trách</th>
                  <th>Địa Điểm Lấy Mẫu</th>
                  <th>Thời Gian Hẹn</th>
                  <th>Chi Phí</th>
                  <th>Trạng Thái</th>
                  <th className="text-end pe-4">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <FaCalendarCheck size={36} className="d-block mx-auto mb-2 opacity-50" />
                      Không tìm thấy lịch hẹn nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map(apt => (
                    <tr key={apt.id}>
                      <td className="ps-4 fw-semibold text-primary">{apt.id}</td>
                      <td>
                        <div className="fw-semibold text-dark">{apt.packageName}</div>
                      </td>
                      <td>
                        <div className="small text-dark"><FaUserMd className="text-muted me-1" />{apt.doctorName}</div>
                      </td>
                      <td>
                        <div className="small text-muted"><FaMapMarkerAlt className="text-danger me-1" />{apt.room}</div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{apt.date}</div>
                        <small className="text-muted"><FaClock className="me-1" />{apt.timeSlot}</small>
                      </td>
                      <td className="fw-bold text-success">{apt.price}</td>
                      <td>{getStatusBadge(apt.status)}</td>
                      <td className="text-end pe-4">
                        {apt.status === 'CONFIRMED' || apt.status === 'PENDING' ? (
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleCancelClick(apt)}
                            className="px-2 py-1"
                          >
                            Hủy Hẹn
                          </Button>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Confirmation Modal for Cancellation */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-danger d-flex align-items-center gap-2">
            <FaExclamationCircle /> Xác Nhận Hủy Lịch Hẹn
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn hủy lịch hẹn <strong>{selectedAppointment?.id}</strong> cho dịch vụ:
          <div className="alert alert-light border mt-2 mb-0 small">
            <strong>{selectedAppointment?.packageName}</strong><br />
            Thời gian: {selectedAppointment?.date} ({selectedAppointment?.timeSlot})
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowCancelModal(false)}>
            Quay Lại
          </Button>
          <Button variant="danger" size="sm" onClick={confirmCancel}>
            Xác Nhận Hủy
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
