/**
 * Receptionist Dashboard Component
 * 
 * Dashboard overview for receptionist staff.
 * Features:
 * 1. Check-in patients using QR code
 * 2. Create patient profiles
 * 3. Prominently displays Patient Name and Barcode ID (Sample ID)
 * 4. Print Barcodes for tubes right at reception counter with 4 fields:
 *    - Patient Initials
 *    - Sample ID
 *    - Test Codes
 *    - Collection Timestamp
 * 
 * @returns {React.ReactNode} Receptionist dashboard component
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Modal, Spinner } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { sampleService } from '../../services/sampleService';
import { StatusBadge } from '../../shared/utils/status/statusHelper';
import BarcodeDisplay from '../../shared/components/QRBarcode/BarcodeDisplay';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaUser, 
  FaBarcode, 
  FaPrint, 
  FaSync, 
  FaCheckCircle, 
  FaQrcode, 
  FaUserPlus, 
  FaConciergeBell,
  FaFlask
} from 'react-icons/fa';
import useResponsive from '../../shared/hooks/useResponsive';

const ReceptionistDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    checkedIn: 0,
    hasBarcode: 0,
    pending: 0
  });

  // Modal print barcode state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState(null);

  const loadReceptionData = useCallback(async () => {
    try {
      setLoading(true);
      const [aptRes, patRes, sampleRes] = await Promise.all([
        appointmentService.getAllAppointments({ fetchAll: false }),
        patientService.getAllPatients({ fetchAll: false }),
        sampleService.getAllSamples({ fetchAll: false })
      ]);

      const aptList = aptRes?.success && Array.isArray(aptRes.data) ? aptRes.data : [];
      const patList = patRes?.success && Array.isArray(patRes.data) ? patRes.data : [];
      const sampleList = sampleRes?.success && Array.isArray(sampleRes.data) ? sampleRes.data : [];

      // Combine appointments with patient name and blood sample / barcode
      const combined = aptList.map(apt => {
        let item = { ...apt };
        const aptId = String(apt.id || apt.appointmentId || apt.AppointmentId || apt.appointment_id || '');
        
        // Find patient
        const patientId = String(apt.created_by || apt.createdBy || apt.patient_id || apt.patientId || '');
        if (patientId && patList.length > 0) {
          const patient = patList.find(p => String(p.id || p.patient_id || p.patientId) === patientId);
          if (patient) {
            item.patientName = patient.full_name || patient.fullName || patient.name || item.patientName;
          }
        }
        if (!item.patientName && apt.patient) {
          item.patientName = apt.patient.fullName || apt.patient.fullname || apt.patient.name;
        }

        // Find sample / barcode
        if (aptId && sampleList.length > 0) {
          const sample = sampleList.find(s => 
            String(s.appointmentId || s.appointment_id || s.AppointmentId) === aptId
          );
          if (sample) {
            item.sampleId = sample.sampleId || sample.SampleId || sample.id;
            item.barcode = sample.barcode || sample.sampleId || sample.SampleId || sample.id;
            item.sample = sample;
          }
        }

        return item;
      });

      // Sort recent first
      const sorted = combined.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.CreatedAt || a.appointmentDate || 0);
        const dateB = new Date(b.createdAt || b.CreatedAt || b.appointmentDate || 0);
        return dateB - dateA;
      });

      setAppointments(sorted);

      // Compute stats
      const total = sorted.length;
      const checkedInCount = sorted.filter(a => {
        const s = (a.status || '').toLowerCase();
        return s === 'checked_in' || s === 'check_in' || s === 'completed' || s === 'sample_collected';
      }).length;
      const hasBarcodeCount = sorted.filter(a => Boolean(a.barcode || a.sampleId)).length;
      const pendingCount = total - checkedInCount;

      setStats({
        totalToday: total,
        checkedIn: checkedInCount,
        hasBarcode: hasBarcodeCount,
        pending: pendingCount > 0 ? pendingCount : 0
      });
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu lễ tân:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceptionData();
  }, [loadReceptionData]);

  const handleOpenBarcodeModal = (appointment) => {
    setSelectedBarcodeItem(appointment);
    setShowBarcodeModal(true);
  };

  const handleCloseBarcodeModal = () => {
    setShowBarcodeModal(false);
    setSelectedBarcodeItem(null);
  };

  return (
    <Container fluid className="py-4">
      {/* Header Banner */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', color: '#fff' }}>
            <Card.Body className="p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h4 className="mb-1 fw-bold">
                  <FaConciergeBell className="me-2" />
                  Dashboard Tiếp Đón & Quản Lý Mã Vạch (Lễ Tân)
                </h4>
                <p className="mb-0 opacity-75">
                  Chào mừng, <strong>{user?.fullName || user?.username || 'Lễ tân'}</strong> | Quản lý tiếp nhận, kiểm tra mã barcode bệnh nhân và in nhãn dán ống nghiệm
                </p>
              </div>
              <Button 
                variant="light" 
                size="sm" 
                onClick={loadReceptionData} 
                disabled={loading}
                className="fw-semibold text-primary shadow-sm"
              >
                <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} /> Làm mới
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Action Navigation Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={6}>
          <Card 
            className="shadow-sm h-100 border-0" 
            style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff' }}
            onClick={() => navigate('/receptionist/check-in')}
          >
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div 
                className="me-3 d-flex align-items-center justify-content-center"
                style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(13, 110, 253, 0.1)', color: '#0d6efd' }}
              >
                <FaQrcode style={{ fontSize: '2rem' }} />
              </div>
              <div>
                <h5 className="mb-1 text-primary fw-bold">Quét QR Check-in</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  Quét mã QR của bệnh nhân đến phòng khám để tiếp nhận và tạo mẫu
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6}>
          <Card 
            className="shadow-sm h-100 border-0"
            style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff' }}
            onClick={() => navigate('/receptionist/create-patient')}
          >
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div 
                className="me-3 d-flex align-items-center justify-content-center"
                style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(25, 135, 84, 0.1)', color: '#198754' }}
              >
                <FaUserPlus style={{ fontSize: '2rem' }} />
              </div>
              <div>
                <h5 className="mb-1 text-success fw-bold">Tạo Hồ Sơ Bệnh Nhân Mới</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  Đăng ký thông tin trực tiếp cho bệnh nhân chưa có tài khoản
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stats Summary Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <small className="text-muted fw-semibold">Tổng tiếp nhận</small>
            <h3 className="fw-bold text-primary my-1">{stats.totalToday}</h3>
            <small className="text-muted">lịch hẹn</small>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <small className="text-muted fw-semibold">Đã Check-in</small>
            <h3 className="fw-bold text-success my-1">{stats.checkedIn}</h3>
            <small className="text-success"><FaCheckCircle className="me-1" />hoàn tất tiếp đón</small>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <small className="text-muted fw-semibold">Đã cấp Barcode</small>
            <h3 className="fw-bold text-info my-1">{stats.hasBarcode}</h3>
            <small className="text-info"><FaBarcode className="me-1" />có mã ống mẫu</small>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <small className="text-muted fw-semibold">Chờ tiếp đón</small>
            <h3 className="fw-bold text-warning my-1">{stats.pending}</h3>
            <small className="text-muted">đang chờ đến</small>
          </Card>
        </Col>
      </Row>

      {/* Main Table: Patient Name & Barcode ID */}
      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom">
              <h5 className="mb-0 text-primary fw-bold">
                <FaBarcode className="me-2 text-primary" />
                Danh Sách Tiếp Nhận & Mã Barcode (Lễ Tân)
              </h5>
              <Badge bg="primary" className="px-3 py-2 font-monospace" style={{ fontSize: '0.85rem' }}>
                {appointments.length} bệnh nhân
              </Badge>
            </Card.Header>

            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Đang tải danh sách bệnh nhân và mã barcode...</p>
                </div>
              ) : appointments.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>Mã lịch hẹn</th>
                        <th style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>Bệnh nhân (Tên)</th>
                        <th style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>Mã Barcode (Sample ID)</th>
                        <th className="d-none d-lg-table-cell" style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>Gói / Xét nghiệm</th>
                        <th style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>Thời gian</th>
                        <th style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>Trạng thái</th>
                        <th className="text-center" style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>In Barcode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => {
                        const patientName = appointment.patientName || 
                                          appointment.patient?.fullName || 
                                          appointment.patient?.name || 
                                          (appointment.patientId ? `BN-${String(appointment.patientId).substring(0, 8)}` : 'Chưa có tên');
                        
                        const barcodeValue = appointment.barcode || 
                                             appointment.sampleId || 
                                             (appointment.sample && (appointment.sample.barcode || appointment.sample.sampleId));

                        const serviceName = appointment.packageName || 
                                          appointment.testPackageName || 
                                          appointment.TestPackageName || 
                                          appointment.service || 
                                          'Xét nghiệm tổng quát';

                        const appointmentDate = appointment.appointmentDate || appointment.createdAt;

                        return (
                          <tr key={appointment.id || Math.random()}>
                            {/* Appointment ID */}
                            <td style={{ padding: '14px 16px' }}>
                              <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                                {appointment.appointmentCode || (appointment.id ? `APT-${String(appointment.id).substring(0, 6).toUpperCase()}` : 'N/A')}
                              </span>
                            </td>

                            {/* Patient Name */}
                            <td style={{ padding: '14px 16px' }}>
                              <div className="d-flex align-items-center">
                                <div 
                                  className="me-2 rounded-circle d-flex align-items-center justify-content-center bg-primary text-white"
                                  style={{ width: '32px', height: '32px', fontSize: '0.8rem', fontWeight: 'bold' }}
                                >
                                  <FaUser />
                                </div>
                                <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                                  {patientName}
                                </span>
                              </div>
                            </td>

                            {/* Barcode ID (Prominently displayed) */}
                            <td style={{ padding: '14px 16px' }}>
                              {barcodeValue ? (
                                <div className="d-flex align-items-center gap-2">
                                  <span 
                                    className="badge bg-light text-primary border border-primary font-monospace px-2 py-1"
                                    style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                                    onClick={() => handleOpenBarcodeModal(appointment)}
                                    title="Mã Barcode - Nhấn để xem và in"
                                  >
                                    <FaBarcode className="me-1" />
                                    {barcodeValue}
                                  </span>
                                </div>
                              ) : (
                                <span className="badge bg-light text-muted border px-2 py-1" style={{ fontSize: '0.8rem' }}>
                                  Chờ cấp barcode
                                </span>
                              )}
                            </td>

                            {/* Service / Test Code */}
                            <td className="d-none d-lg-table-cell" style={{ padding: '14px 16px' }}>
                              <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                                <FaFlask className="me-1 text-primary" style={{ fontSize: '0.8rem' }} />
                                {serviceName}
                              </span>
                            </td>

                            {/* Date & Time */}
                            <td style={{ padding: '14px 16px' }}>
                              <small className="text-dark d-block">
                                <FaCalendarAlt className="me-1 text-muted" />
                                {appointmentDate ? new Date(appointmentDate).toLocaleDateString('vi-VN') : '—'}
                              </small>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '14px 16px' }}>
                              <StatusBadge entity="appointment" status={appointment.status} />
                            </td>

                            {/* Actions / Print Barcode */}
                            <td className="text-center" style={{ padding: '14px 16px' }}>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="fw-semibold px-2 py-1"
                                onClick={() => handleOpenBarcodeModal(appointment)}
                                title="In nhãn mã vạch dán ống nghiệm"
                              >
                                <FaPrint className="me-1" /> In Barcode
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <FaCalendarAlt className="text-muted mb-2" style={{ fontSize: '2.5rem' }} />
                  <p className="text-muted mb-0">Hôm nay chưa có dữ liệu tiếp nhận bệnh nhân</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Barcode Print Modal for Receptionist */}
      <Modal show={showBarcodeModal} onHide={handleCloseBarcodeModal} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            <FaBarcode className="me-2" /> In Nhãn Mã Vạch Tiếp Nhận (Lễ Tân)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedBarcodeItem ? (
            <div>
              <Alert variant="info" className="py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-info-circle me-1"></i>
                Nhãn in sẵn sàng cho ống xét nghiệm với 4 trường: <strong>Chữ cái đầu tên</strong>, <strong>Mã mẫu</strong>, <strong>Mã xét nghiệm</strong>, và <strong>Thời gian lấy mẫu</strong>.
              </Alert>
              <BarcodeDisplay
                value={selectedBarcodeItem.barcode || selectedBarcodeItem.sampleId || (selectedBarcodeItem.id ? `SA-${selectedBarcodeItem.id}` : '')}
                sampleId={selectedBarcodeItem.barcode || selectedBarcodeItem.sampleId || selectedBarcodeItem.id}
                patientName={selectedBarcodeItem.patientName}
                patientId={selectedBarcodeItem.patientId || selectedBarcodeItem.patient_id || ''}
                testCodes={selectedBarcodeItem.testCodes || selectedBarcodeItem.packageName || selectedBarcodeItem.serviceName || selectedBarcodeItem.testPackageName || ''}
                collectionTimestamp={selectedBarcodeItem.collectedAt || selectedBarcodeItem.createdAt || selectedBarcodeItem.appointmentDate || ''}
                showActions={true}
                className="text-center"
              />
            </div>
          ) : (
            <p className="text-muted text-center mb-0">Không tìm thấy thông tin bệnh nhân</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseBarcodeModal}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ReceptionistDashboard;

