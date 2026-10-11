/**
 * Lab Test Invoices Component
 * 
 * Component for patients to view and pay for their lab test invoices.
 * Payment is required before viewing test results.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Table, Form } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';
import { invoiceService } from '../../../services/invoiceService';
import { appointmentService } from '../../../services/appointmentService';
import { labTestService } from '../../../services/labTestService';
import { medicalService } from '../../../services/medicalService';
import { patientService } from '../../../services/patientService';
import api from '../../../services/api';
import { emailService } from '../../../services/emailService';
import useResponsive from '../../../shared/hooks/useResponsive';
import './LabTestInvoices.css';

/**
 * Lab Test Invoices Component
 * 
 * Displays patient's lab test invoices with payment functionality.
 */
const LabTestInvoices = () => {
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();
  const { isMobile, isTablet } = useResponsive();

  const [invoices, setInvoices] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  /**
   * Loads invoices and related data for the patient
   * 
   * This function is the core data fetching function for the lab test invoices page.
   * It performs the following operations:
   * 1. Fetches invoices for the current patient
   * 2. Fetches lab tests for the patient
   * 3. Fetches services for pricing and names
   * 4. Fetches doctors from TestOrder service
   * 5. Auto-creates invoices for lab tests that don't have one yet
   * 6. Enriches invoices with lab test and service information
   * 
   * **Auto-invoice creation:**
   * - Creates invoices automatically for lab tests without invoices
   * - Uses service pricing from services array
   * - Links invoices to appointments via appointmentId
   * 
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load invoices and related data
   * await loadData();
   */
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch invoices for current patient
      const invoiceResponse = await invoiceService.getInvoicesByPatient(user.id);
      
      // Fetch lab tests
      const labTestResponse = await labTestService.getTestsByPatient(user.id);
      
      // Fetch services for pricing and names
      const serviceResponse = await medicalService.getAllServices();

      // Fetch doctors from TestOrder service
      const doctorResponse = await api.get('/gateway/testorder/doctor').catch(() => ({ data: [] }));
      
      // Auto-create invoices for lab tests that don't have one yet
      if (invoiceResponse.success && labTestResponse.success && serviceResponse.success) {
        const existingInvoices = invoiceResponse.data || [];
        const tests = labTestResponse.data || [];
        const services = serviceResponse.data || [];

        const testsWithoutInvoice = tests.filter(test => !existingInvoices.some(inv => inv.appointmentId === test.appointmentId));

        if (testsWithoutInvoice.length > 0) {
          await Promise.all(
            testsWithoutInvoice.map(async (test) => {
              const service = services.find(s => s.id === parseInt(test.serviceId));
              const price = service?.price || 0;
              const itemName = service?.name || test.testType || 'Xét nghiệm';

              const newInvoiceData = {
                patientId: user.id,
                appointmentId: test.appointmentId,
                items: [
                  {
                    serviceId: String(test.serviceId || '0'),
                    serviceName: itemName,
                    quantity: 1,
                    price: price,
                    total: price
                  }
                ],
                totalAmount: price,
                paidAmount: 0,
                status: 'pending',
                paymentMethod: '',
              };

              await invoiceService.createInvoice(newInvoiceData);
            })
          );
        }
      }

      // Re-fetch invoices after potential auto-creation
      const refreshedInvoicesResp = await invoiceService.getInvoicesByPatient(user.id);

      if (refreshedInvoicesResp.success) {
        // Merge invoice data with lab test data
        const mergedData = (refreshedInvoicesResp.data || []).map(invoice => {
          const relatedTest = labTestResponse.data?.find(test => test.appointmentId === invoice.appointmentId);
          return {
            ...invoice,
            labTest: relatedTest
          };
        });
        setInvoices(mergedData);
      }
      
      if (labTestResponse.success) {
        setLabTests(labTestResponse.data || []);
      }
      
      // Handle doctor response structure
      const doctorsData = Array.isArray(doctorResponse.data) 
        ? doctorResponse.data 
        : (doctorResponse.data?.data || []);
      setDoctors(doctorsData);
    } catch (error) {
      showNotification('error', 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format date to Vietnamese format
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa xác định';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /**
   * Format currency to VND
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  /**
   * Get payment status badge
   */
  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      'paid': { bg: 'success', text: 'Đã thanh toán', icon: 'check-circle' },
      'pending': { bg: 'warning', text: 'Chờ thanh toán', icon: 'clock' },
      'cancelled': { bg: 'danger', text: 'Đã hủy', icon: 'times-circle' }
    };

    const statusInfo = statusMap[status] || statusMap['pending'];

    return (
      <Badge 
        bg={statusInfo.bg}
        style={{
          padding: '8px 16px',
          fontSize: '0.9rem',
          fontWeight: '600',
          borderRadius: '20px',
          boxShadow: `0 4px 10px rgba(${statusInfo.bg === 'success' ? '40, 167, 69' : statusInfo.bg === 'warning' ? '255, 193, 7' : '220, 53, 69'}, 0.3)`
        }}
      >
        <i className={`fas fa-${statusInfo.icon} me-2`}></i>
        {statusInfo.text}
      </Badge>
    );
  };

  /**
   * Handle view detail
   */
  const handleViewDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  /**
   * Handle payment modal
   */
  const handlePaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  /**
   * Handle payment submission
   */
  const handlePayment = async () => {
    if (!selectedInvoice) return;

    try {
      const paymentData = {
        amount: selectedInvoice.totalAmount,
        paymentMethod: paymentMethod,
        paidAt: new Date().toISOString()
      };

      const response = await invoiceService.recordPayment(selectedInvoice.id, paymentData);

      if (response.success) {
        // Update related appointment status to confirmed (ready for check-in)
        if (selectedInvoice.appointmentId) {
          try {
            await appointmentService.updateAppointmentStatus(selectedInvoice.appointmentId, 'confirmed');
          } catch (e) {
            // non-blocking
          }
        }
        // Send payment confirmation email (mock)
        try {
          const aptResp = await appointmentService.getAllAppointments();
          if (aptResp.success) {
            const appointment = (aptResp.data || []).find(a => a.id === selectedInvoice.appointmentId);
            // Get patient info from patient service instead of users endpoint
            let patient = null;
            if (appointment?.patientId) {
              try {
                const patientResp = await patientService.getPatientById(appointment.patientId);
                patient = patientResp.success ? patientResp.data : null;
              } catch (error) {
              }
            }
            if (patient?.email) {
              await emailService.sendPaymentConfirmation(patient.email, appointment, response.data || selectedInvoice);
            }
          }
        } catch (_) {}
        showNotification('success', 'Thanh toán thành công!');
        setShowPaymentModal(false);
        loadData(); // Reload data
      } else {
        showNotification('error', 'Thanh toán thất bại');
      }
    } catch (error) {
      showNotification('error', 'Lỗi thanh toán');
    }
  };

  /**
   * Generate invoice code
   */
  const generateInvoiceCode = (invoice) => {
    return `XN${String(invoice.id).padStart(4, '0')}`;
  };

  /**
   * Get doctor name
   */
  const getDoctorName = (doctorId) => {
    const doctor = doctors.find(d => d.id === parseInt(doctorId));
    return doctor?.fullName || 'Chưa xác định';
  };

  // Filter logic
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    // Filter by date range
    if (filterStartDate) {
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.createdAt);
        const startDate = new Date(filterStartDate);
        return invDate >= startDate;
      });
    }

    if (filterEndDate) {
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.createdAt);
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        return invDate <= endDate;
      });
    }

    return filtered;
  }, [invoices, filterStatus, filterStartDate, filterEndDate]);

  // Reset filter
  const handleResetFilter = () => {
    setFilterStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="lab-test-invoices-container py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h2 className="fw-bold" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              <i className="fas fa-file-invoice-dollar me-3"></i>
              Danh sách đơn xét nghiệm ({filteredInvoices.length} / {invoices.length})
            </h2>
            <p className="text-muted">Quản lý và thanh toán các đơn xét nghiệm của bạn</p>
          </Col>
        </Row>

        {/* Filter Section */}
        <Card className="mb-4" style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          border: '2px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '15px'
        }}>
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold" style={{ color: '#667eea' }}>
                    <i className="fas fa-filter me-2"></i>
                    Trạng thái
                  </Form.Label>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #667eea',
                      padding: '10px'
                    }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="pending">Chờ thanh toán</option>
                    <option value="cancelled">Đã hủy</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold" style={{ color: '#667eea' }}>
                    <i className="fas fa-calendar-alt me-2"></i>
                    Từ ngày
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #667eea',
                      padding: '10px'
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold" style={{ color: '#667eea' }}>
                    <i className="fas fa-calendar-check me-2"></i>
                    Đến ngày
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #667eea',
                      padding: '10px'
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Button
                  variant="outline-secondary"
                  onClick={handleResetFilter}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: '600',
                    border: '2px solid #6c757d'
                  }}
                >
                  <i className="fas fa-redo me-2"></i>
                  Đặt lại
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card className="text-center py-5">
            <Card.Body>
              <i className="fas fa-file-invoice fa-3x text-muted mb-3"></i>
              <h5>Chưa có đơn xét nghiệm nào</h5>
              <p className="text-muted">Các đơn xét nghiệm sẽ hiển thị tại đây sau khi bạn đặt lịch hẹn</p>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {filteredInvoices.map((invoice, index) => (
              <Col xs={12} key={invoice.id}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="invoice-card" style={{
                    border: `2px solid ${invoice.status === 'paid' ? '#28a745' : '#ffc107'}`,
                    borderRadius: '15px',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                  }}
                  >
                    <Card.Body className="p-4">
                      <Row className="align-items-center">
                        {/* Left Column - Invoice Info */}
                        <Col lg={8}>
                          {/* Invoice Code */}
                          <div className="mb-3">
                            <code style={{
                              fontSize: '1.3rem',
                              fontWeight: '700',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              padding: '8px 16px',
                              borderRadius: '10px',
                              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                            }}>
                              Đơn XN #{generateInvoiceCode(invoice)}
                            </code>
                          </div>

                          {/* Invoice Details */}
                          <Row className="mb-3">
                            <Col md={6}>
                              <p className="mb-2">
                                <i className="fas fa-calendar me-2 text-primary"></i>
                                <strong>Ngày chỉ định:</strong> {formatDate(invoice.createdAt)}
                              </p>
                              <p className="mb-2">
                                <i className="fas fa-user-md me-2 text-primary"></i>
                                <strong>Bác sĩ chỉ định:</strong> {getDoctorName(invoice.labTest?.doctorId)}
                              </p>
                            </Col>
                            <Col md={6}>
                              <p className="mb-2">
                                <i className="fas fa-credit-card me-2 text-primary"></i>
                                <strong>Phương thức:</strong> {invoice.paymentMethod || 'Chưa thanh toán'}
                              </p>
                              <p className="mb-2">
                                <i className="fas fa-info-circle me-2 text-primary"></i>
                                <strong>Trạng thái:</strong> {getPaymentStatusBadge(invoice.status)}
                              </p>
                            </Col>
                          </Row>

                          {/* Test Items */}
                          <div className="mb-3">
                            <strong className="mb-2 d-block">
                              <i className="fas fa-flask me-2 text-primary"></i>
                              Các xét nghiệm:
                            </strong>
                            <ul className="list-unstyled ms-4">
                              {invoice.items?.map((item, idx) => (
                                <li key={idx} className="mb-1">
                                  <i className="fas fa-check-circle me-2 text-success"></i>
                                  {item.serviceName} - <span className="text-primary fw-bold">{formatCurrency(item.price)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Total Amount */}
                          <div className="p-3 rounded" style={{
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                            borderLeft: '4px solid #667eea'
                          }}>
                            <h5 className="mb-0" style={{ color: '#667eea' }}>
                              <i className="fas fa-money-bill-wave me-2"></i>
                              Tổng tiền: <span className="fw-bold">{formatCurrency(invoice.totalAmount)}</span>
                            </h5>
                          </div>
                        </Col>

                        {/* Right Column - Actions */}
                        <Col lg={4} className="text-end">
                          <div className="d-flex flex-column gap-2">
                            {/* Payment Status or Action Button */}
                            {invoice.status === 'pending' ? (
                              <Button
                                variant="success"
                                size="lg"
                                onClick={() => handlePaymentModal(invoice)}
                                style={{
                                  borderRadius: '15px',
                                  padding: '12px 24px',
                                  fontWeight: '700',
                                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                  border: 'none',
                                  boxShadow: '0 6px 20px rgba(40, 167, 69, 0.4)',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-3px)';
                                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(40, 167, 69, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                                }}
                              >
                                <i className="fas fa-credit-card me-2"></i>
                                Thanh toán
                              </Button>
                            ) : (
                              <Badge 
                                bg="success" 
                                className="p-3"
                                style={{
                                  fontSize: '1.1rem',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                                }}
                              >
                                <i className="fas fa-check-circle me-2"></i>
                                Đã có kết quả
                              </Badge>
                            )}

                            {/* Detail Button */}
                            <Button
                              variant="primary"
                              onClick={() => handleViewDetail(invoice)}
                              style={{
                                borderRadius: '15px',
                                padding: '10px 20px',
                                fontWeight: '600',
                                background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                border: 'none',
                                boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(13, 110, 253, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(13, 110, 253, 0.3)';
                              }}
                            >
                              <i className="fas fa-eye me-2"></i>
                              Chi tiết
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        )}
      </motion.div>

      {/* Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
        fullscreen="md-down"
      >
        <Modal.Header closeButton style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white'
        }}>
          <Modal.Title className="text-white fw-bold">
            <i className="fas fa-file-invoice-dollar me-2"></i>
            Chi tiết đơn xét nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ background: '#f8f9fa' }}>
          {selectedInvoice && (
            <div>
              {/* Invoice Code */}
              <div className="mb-4 p-3" style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                borderRadius: '12px',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                borderLeft: '4px solid #667eea'
              }}>
                <h6 className="fw-bold mb-2" style={{ color: '#667eea' }}>
                  <i className="fas fa-barcode me-2"></i>
                  Mã đơn xét nghiệm
                </h6>
                <code style={{
                  fontSize: '1.2rem',
                  color: '#764ba2',
                  fontWeight: '700',
                  padding: '8px 16px',
                  background: 'rgba(118, 75, 162, 0.2)',
                  borderRadius: '8px',
                  display: 'inline-block'
                }}>
                  #{generateInvoiceCode(selectedInvoice)}
                </code>
              </div>

              {/* Invoice Info */}
              <div className="mb-4 p-3" style={{
                background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(13, 110, 253, 0.1)'
              }}>
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="fas fa-info-circle me-2"></i>
                  Thông tin chung
                </h6>
                <Row>
                  <Col md={6} className="mb-2">
                    <p className="mb-1">
                      <i className="fas fa-calendar me-2 text-muted"></i>
                      <strong>Ngày chỉ định:</strong>
                    </p>
                    <p className="ms-4 text-dark">{formatDate(selectedInvoice.createdAt)}</p>
                  </Col>
                  <Col md={6} className="mb-2">
                    <p className="mb-1">
                      <i className="fas fa-user-md me-2 text-muted"></i>
                      <strong>Bác sĩ chỉ định:</strong>
                    </p>
                    <p className="ms-4 text-dark">{getDoctorName(selectedInvoice.labTest?.doctorId)}</p>
                  </Col>
                  <Col md={6} className="mb-2">
                    <p className="mb-1">
                      <i className="fas fa-credit-card me-2 text-muted"></i>
                      <strong>Phương thức thanh toán:</strong>
                    </p>
                    <p className="ms-4 text-dark">{selectedInvoice.paymentMethod || 'Chưa thanh toán'}</p>
                  </Col>
                  <Col md={6} className="mb-0">
                    <p className="mb-1">
                      <i className="fas fa-info-circle me-2 text-muted"></i>
                      <strong>Trạng thái:</strong>
                    </p>
                    <div className="ms-4">
                      {getPaymentStatusBadge(selectedInvoice.status)}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Test Items */}
              <div className="mb-4 p-3" style={{
                background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(32, 201, 151, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(40, 167, 69, 0.1)'
              }}>
                <h6 className="fw-bold mb-3 text-success">
                  <i className="fas fa-flask me-2"></i>
                  Danh sách xét nghiệm
                </h6>
                <Table responsive bordered hover>
                  <thead style={{ background: 'rgba(40, 167, 69, 0.1)' }}>
                    <tr>
                      <th>STT</th>
                      <th>Tên xét nghiệm</th>
                      <th className="text-center">Số lượng</th>
                      <th className="text-end">Đơn giá</th>
                      <th className="text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{item.serviceName}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-end">{formatCurrency(item.price)}</td>
                        <td className="text-end fw-bold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: 'rgba(40, 167, 69, 0.2)' }}>
                    <tr>
                      <td colSpan="4" className="text-end fw-bold">Tổng cộng:</td>
                      <td className="text-end fw-bold" style={{ fontSize: '1.2rem', color: '#28a745' }}>
                        {formatCurrency(selectedInvoice.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          border: 'none',
          padding: '1.5rem 2rem'
        }}>
          <Button
            variant="secondary"
            onClick={() => setShowDetailModal(false)}
            style={{
              borderRadius: '25px',
              padding: '10px 25px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              border: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)'
            }}
          >
            <i className="fas fa-times me-2"></i>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Payment Modal */}
      <Modal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        centered
      >
        <Modal.Header closeButton style={{
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          border: 'none',
          color: 'white'
        }}>
          <Modal.Title className="text-white fw-bold">
            <i className="fas fa-credit-card me-2"></i>
            Thanh toán đơn xét nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedInvoice && (
            <div>
              <div className="mb-4 text-center p-4" style={{
                background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(32, 201, 151, 0.1) 100%)',
                borderRadius: '15px',
                border: '2px solid rgba(40, 167, 69, 0.3)'
              }}>
                <h6 className="text-muted mb-2">Tổng tiền thanh toán</h6>
                <h2 className="fw-bold mb-0" style={{ color: '#28a745' }}>
                  {formatCurrency(selectedInvoice.totalAmount)}
                </h2>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  <i className="fas fa-wallet me-2 text-primary"></i>
                  Phương thức thanh toán
                </Form.Label>
                <Form.Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    borderRadius: '10px',
                    border: '2px solid #0d6efd',
                    padding: '10px'
                  }}
                >
                  <option value="cash">💵 Tiền mặt</option>
                  <option value="bank_transfer">🏦 Chuyển khoản</option>
                  <option value="credit_card">💳 Thẻ tín dụng</option>
                  <option value="e_wallet">📱 Ví điện tử</option>
                </Form.Select>
              </Form.Group>

              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                <small>Sau khi thanh toán thành công, bạn sẽ có thể xem kết quả xét nghiệm của mình.</small>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #dee2e6', padding: '1rem 1.5rem' }}>
          <Button
            variant="secondary"
            onClick={() => setShowPaymentModal(false)}
            style={{
              borderRadius: '10px',
              padding: '8px 20px',
              fontWeight: '600'
            }}
          >
            <i className="fas fa-times me-2"></i>
            Hủy
          </Button>
          <Button
            variant="success"
            onClick={handlePayment}
            style={{
              borderRadius: '10px',
              padding: '8px 20px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
            }}
          >
            <i className="fas fa-check me-2"></i>
            Xác nhận thanh toán
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LabTestInvoices;

