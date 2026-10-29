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
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Modal, Spinner, Form } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { sampleService } from '../../services/sampleService';
import { invoiceService } from '../../services/invoiceService';
import api from '../../services/api';
import { useNotificationContext } from '../../shared/contexts/NotificationContext';
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
  FaFlask,
  FaReceipt,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaBell
} from 'react-icons/fa';
import useResponsive from '../../shared/hooks/useResponsive';

const ReceptionistDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { showSuccess, showError } = useNotificationContext();

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

  // States for Generate Receipt (Receptionist)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptAppointment, setSelectedReceiptAppointment] = useState(null);
  const [receiptPackages, setReceiptPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedPackageName, setSelectedPackageName] = useState('');
  const [unitPrice, setUnitPrice] = useState(500000);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [taxPercent, setTaxPercent] = useState(8);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [showGeneratedReceiptModal, setShowGeneratedReceiptModal] = useState(false);

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

  // Fetch test packages for receipt billing calculation
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/gateway/testorder/testpackage');
        const list = res.data?.data || res.data || [];
        setReceiptPackages(Array.isArray(list) ? list : []);
      } catch (e) {
        // Fallback default packages
        setReceiptPackages([
          { packageId: 'PKG001', packageName: 'Tổng phân tích tế bào máu ngoại vi', price: 250000 },
          { packageId: 'PKG002', packageName: 'Xét nghiệm sinh hóa máu tổng quát', price: 450000 },
          { packageId: 'PKG003', packageName: 'Bộ xét nghiệm chức năng gan thận', price: 350000 },
          { packageId: 'PKG004', packageName: 'Gói xét nghiệm tầm soát mỡ máu', price: 300000 }
        ]);
      }
    };
    fetchPackages();
  }, []);

  const handleOpenReceiptModal = (appointment) => {
    setSelectedReceiptAppointment(appointment);
    const defaultPackage = receiptPackages.find(p => p.packageId === appointment.testPackageId || p.packageName === appointment.packageName) || receiptPackages[0];
    if (defaultPackage) {
      setSelectedPackageId(defaultPackage.packageId);
      setSelectedPackageName(defaultPackage.packageName);
      setUnitPrice(Number(defaultPackage.price || 350000));
    } else {
      setSelectedPackageId('PKG001');
      setSelectedPackageName(appointment.packageName || 'Gói xét nghiệm máu tiêu chuẩn');
      setUnitPrice(350000);
    }
    setItemQuantity(1);
    setTaxPercent(8);
    setDiscountAmount(0);
    setPaymentMethod('Cash');
    setReceiptNotes(`Thanh toán tiếp nhận tại quầy lễ tân cho lịch hẹn ${appointment.id || appointment.appointmentId || ''}`);
    setShowReceiptModal(true);
  };

  const handlePackageChange = (packageId) => {
    setSelectedPackageId(packageId);
    const found = receiptPackages.find(p => p.packageId === packageId);
    if (found) {
      setSelectedPackageName(found.packageName);
      setUnitPrice(Number(found.price || 350000));
    }
  };

  const calculateSubTotal = () => {
    return (unitPrice || 0) * (itemQuantity || 1);
  };

  const calculateTaxAmount = () => {
    return Math.round((calculateSubTotal() * (taxPercent || 0)) / 100);
  };

  const calculateTotal = () => {
    const sub = calculateSubTotal();
    const tax = calculateTaxAmount();
    return Math.max(0, sub + tax - (discountAmount || 0));
  };

  const handleGenerateReceipt = async () => {
    if (!selectedReceiptAppointment) return;
    try {
      setGeneratingReceipt(true);
      const patientId = selectedReceiptAppointment.patientId || 
                        selectedReceiptAppointment.patient_id || 
                        selectedReceiptAppointment.created_by || 
                        selectedReceiptAppointment.createdBy || 
                        '00000000-0000-0000-0000-000000000000';

      const payload = {
        appointmentId: String(selectedReceiptAppointment.id || selectedReceiptAppointment.appointmentId || ''),
        patientId: patientId,
        patientName: selectedReceiptAppointment.patientName || 'Bệnh nhân',
        patientPhone: selectedReceiptAppointment.patientPhone || selectedReceiptAppointment.phone || '',
        receptionistId: user?.id || 'RECEPTIONIST_01',
        receptionistName: user?.fullName || user?.username || 'Lễ tân tiếp đón',
        paymentMethod: paymentMethod,
        taxPercent: taxPercent,
        discountAmount: discountAmount,
        notes: receiptNotes,
        items: [
          {
            packageId: selectedPackageId,
            packageName: selectedPackageName,
            quantity: itemQuantity,
            unitPrice: unitPrice
          }
        ]
      };

      const res = await invoiceService.generateReceipt(payload);
      if (res.success && res.data) {
        showSuccess('✅ Tạo biên lai thanh toán thành công!');
        setGeneratedReceipt(res.data);
        setShowReceiptModal(false);
        setShowGeneratedReceiptModal(true);
      } else {
        showError(res.message || 'Lỗi khi tạo biên lai thanh toán');
      }
    } catch (err) {
      showError(err.message || 'Lỗi hệ thống khi tạo biên lai');
    } finally {
      setGeneratingReceipt(false);
    }
  };

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

      {/* Quick Action Navigation Cards (Nhóm chức năng Tiếp tân) */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="shadow-sm h-100 border-0" 
            style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff', borderLeft: '4px solid #0d6efd' }}
            onClick={() => navigate('/receptionist/check-in')}
          >
            <Card.Body className="d-flex align-items-center p-3">
              <div 
                className="me-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(13, 110, 253, 0.1)', color: '#0d6efd' }}
              >
                <FaQrcode style={{ fontSize: '1.6rem' }} />
              </div>
              <div>
                <h6 className="mb-1 text-primary fw-bold">Quét QR Check-in</h6>
                <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                  Quét mã QR tiếp nhận bệnh nhân
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="shadow-sm h-100 border-0" 
            style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff', borderLeft: '4px solid #198754' }}
            onClick={() => navigate('/receptionist/create-patient')}
          >
            <Card.Body className="d-flex align-items-center p-3">
              <div 
                className="me-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(25, 135, 84, 0.1)', color: '#198754' }}
              >
                <FaUserPlus style={{ fontSize: '1.6rem' }} />
              </div>
              <div>
                <h6 className="mb-1 text-success fw-bold">Tạo Bệnh Nhân Mới</h6>
                <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                  Đăng ký thông tin bệnh nhân
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="shadow-sm h-100 border-0" 
            style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff', borderLeft: '4px solid #ffc107' }}
            onClick={() => handleOpenReceiptModal(appointments[0] || null)}
          >
            <Card.Body className="d-flex align-items-center p-3">
              <div 
                className="me-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(255, 193, 7, 0.15)', color: '#d39e00' }}
              >
                <FaReceipt style={{ fontSize: '1.6rem' }} />
              </div>
              <div>
                <h6 className="mb-1 text-warning fw-bold text-dark">Xuất Biên Lai Thu Phí</h6>
                <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                  Tính phí xét nghiệm & in hóa đơn
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="shadow-sm h-100 border-0" 
            style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff', borderLeft: '4px solid #0dcaf0' }}
            onClick={() => navigate('/receptionist/appointments')}
          >
            <Card.Body className="d-flex align-items-center p-3">
              <div 
                className="me-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(13, 202, 240, 0.1)', color: '#0dcaf0' }}
              >
                <FaCalendarAlt style={{ fontSize: '1.6rem' }} />
              </div>
              <div>
                <h6 className="mb-1 text-info fw-bold">Quản Lý Lịch Hẹn</h6>
                <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                  Xem & điều phối danh sách lịch
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="shadow-sm h-100 border-0" 
            style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff', borderLeft: '4px solid #fd7e14' }}
            onClick={() => navigate('/notifications')}
          >
            <Card.Body className="d-flex align-items-center p-3">
              <div 
                className="me-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(253, 126, 20, 0.15)', color: '#fd7e14' }}
              >
                <FaBell style={{ fontSize: '1.6rem' }} />
              </div>
              <div>
                <h6 className="mb-1 text-dark fw-bold">Thông Báo Notify</h6>
                <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                  Doctor hủy lịch, check-in, đổi hồ sơ
                </small>
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
                        <th className="text-center" style={{ padding: '14px 16px', color: '#495057', fontWeight: '600' }}>Thao tác Lễ Tân</th>
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

                            {/* Actions / Print Barcode & Generate Receipt */}
                            <td className="text-center" style={{ padding: '14px 16px' }}>
                              <div className="d-flex justify-content-center gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="fw-semibold px-2 py-1"
                                  onClick={() => handleOpenBarcodeModal(appointment)}
                                  title="In nhãn mã vạch dán ống nghiệm"
                                >
                                  <FaPrint className="me-1" /> Barcode
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  className="fw-semibold px-2 py-1"
                                  onClick={() => handleOpenReceiptModal(appointment)}
                                  title="Tính phí & Xuất biên lai thanh toán"
                                >
                                  <FaReceipt className="me-1" /> Biên Lai
                                </Button>
                              </div>
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

      {/* Generate Receipt Modal (Receptionist) */}
      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title className="d-flex align-items-center gap-2" style={{ fontSize: '1.15rem' }}>
            <FaFileInvoiceDollar />
            Tính phí & Xuất biên lai thanh toán (Receptionist)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedReceiptAppointment && (
            <div>
              <Alert variant="light" className="border d-flex justify-content-between align-items-center mb-4">
                <div>
                  <div className="fw-bold fs-6 text-dark">{selectedReceiptAppointment.patientName || 'Bệnh nhân'}</div>
                  <small className="text-muted">Mã lịch hẹn: {selectedReceiptAppointment.id || selectedReceiptAppointment.appointmentId || 'N/A'}</small>
                </div>
                <Badge bg="success" className="px-3 py-2 fs-6">
                  {calculateTotal().toLocaleString('vi-VN')} VNĐ
                </Badge>
              </Alert>

              <Row className="mb-3">
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Gói xét nghiệm yêu cầu</Form.Label>
                    <Form.Select 
                      value={selectedPackageId} 
                      onChange={(e) => handlePackageChange(e.target.value)}
                    >
                      {receiptPackages.map(pkg => (
                        <option key={pkg.packageId} value={pkg.packageId}>
                          {pkg.packageName} ({Number(pkg.price || 0).toLocaleString('vi-VN')} đ)
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Số lượng gói</Form.Label>
                    <Form.Control 
                      type="number" 
                      min="1" 
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Đơn giá (VNĐ)</Form.Label>
                    <Form.Control 
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Thuế GTGT / VAT (%)</Form.Label>
                    <Form.Control 
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Giảm trừ / Khuyến mãi (VNĐ)</Form.Label>
                    <Form.Control 
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Hình thức thanh toán</Form.Label>
                    <Form.Select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Cash">Tiền mặt (Cash)</option>
                      <option value="VNPay">Cổng thanh toán VNPay</option>
                      <option value="BankTransfer">Chuyển khoản ngân hàng</option>
                      <option value="CreditCard">Thẻ POS / Tín dụng</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Ghi chú biên lai</Form.Label>
                    <Form.Control 
                      type="text"
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder="Ghi chú xuất hóa đơn..."
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Real-time Calculation Summary */}
              <div className="bg-light p-3 rounded-3 mb-2">
                <div className="d-flex justify-content-between mb-1">
                  <span>Tiền dịch vụ (SubTotal):</span>
                  <span className="fw-bold">{calculateSubTotal().toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Thuế VAT ({taxPercent}%):</span>
                  <span>+{calculateTaxAmount().toLocaleString('vi-VN')} đ</span>
                </div>
                {discountAmount > 0 && (
                  <div className="d-flex justify-content-between mb-1 text-danger">
                    <span>Giảm giá:</span>
                    <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="d-flex justify-content-between fs-5 fw-bold text-success">
                  <span>Tổng tiền thanh toán:</span>
                  <span>{calculateTotal().toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)} disabled={generatingReceipt}>
            Hủy
          </Button>
          <Button variant="success" onClick={handleGenerateReceipt} disabled={generatingReceipt}>
            {generatingReceipt ? 'Đang tạo biên lai...' : 'Xác nhận & Xuất Biên Lai'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Itemized Electronic Receipt View Modal */}
      <Modal show={showGeneratedReceiptModal} onHide={() => setShowGeneratedReceiptModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaReceipt className="text-success" />
            Biên Lai Thanh Toán Điện Tử
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" id="printable-receipt">
          {generatedReceipt && (
            <div style={{ border: '2px dashed #ced4da', padding: '24px', borderRadius: '12px', background: '#fff' }}>
              <div className="text-center mb-4">
                <h4 className="fw-bold text-primary mb-1">PHÒNG XÉT NGHIỆM HUYẾT HỌC BMS</h4>
                <p className="text-muted small mb-0">Hệ thống quản lý xét nghiệm & dịch vụ y tế</p>
                <div className="badge bg-success-subtle text-success fs-6 mt-2 px-3 py-1">
                  HÓA ĐƠN / BIÊN LAI ĐIỆN TỬ
                </div>
              </div>

              <Row className="mb-3">
                <Col sm={6}>
                  <div className="small text-muted">Số biên lai:</div>
                  <div className="fw-bold text-dark">{generatedReceipt.receiptNumber}</div>
                  <div className="small text-muted mt-2">Bệnh nhân:</div>
                  <div className="fw-bold">{generatedReceipt.patientName || 'Khách hàng'}</div>
                </Col>
                <Col sm={6} className="text-sm-end">
                  <div className="small text-muted">Ngày phát hành:</div>
                  <div className="fw-bold">{new Date(generatedReceipt.receiptDate).toLocaleString('vi-VN')}</div>
                  <div className="small text-muted mt-2">Thu ngân / Lễ tân:</div>
                  <div className="fw-bold">{generatedReceipt.receptionistName || 'Lễ tân'}</div>
                </Col>
              </Row>

              <Table bordered className="mb-3">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Tên gói xét nghiệm</th>
                    <th className="text-center">Số lượng</th>
                    <th className="text-end">Đơn giá</th>
                    <th className="text-end">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedReceipt.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="text-center">{index + 1}</td>
                      <td>{item.packageName}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-end">{Number(item.unitPrice).toLocaleString('vi-VN')} đ</td>
                      <td className="text-end fw-bold">{Number(item.amount).toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div className="ms-auto" style={{ maxWidth: '320px' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span>Cộng tiền hàng:</span>
                  <span className="fw-bold">{Number(generatedReceipt.subTotal).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Thuế GTGT ({generatedReceipt.taxPercent}%):</span>
                  <span>+{Number(generatedReceipt.taxAmount).toLocaleString('vi-VN')} đ</span>
                </div>
                {generatedReceipt.discountAmount > 0 && (
                  <div className="d-flex justify-content-between mb-1 text-danger">
                    <span>Chiết khấu:</span>
                    <span>-{Number(generatedReceipt.discountAmount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <hr className="my-1" />
                <div className="d-flex justify-content-between fw-bold fs-5 text-success">
                  <span>Tổng cộng thanh toán:</span>
                  <span>{Number(generatedReceipt.totalAmount).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="small text-muted mt-1 text-end">
                  Phương thức: <strong>{generatedReceipt.paymentMethod}</strong>
                </div>
              </div>

              <div className="mt-4 pt-3 border-top text-center text-muted small">
                <p className="mb-1">Cảm ơn quý khách đã sử dụng dịch vụ tại BMS Blood Laboratory!</p>
                <p className="mb-0">Biên lai điện tử có giá trị thanh toán chính thức.</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={() => window.print()}>
            <FaPrint className="me-2" /> In Biên Lai
          </Button>
          <Button variant="secondary" onClick={() => setShowGeneratedReceiptModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ReceptionistDashboard;

