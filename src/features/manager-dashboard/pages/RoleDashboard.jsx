/**
 * @file RoleDashboard.jsx
 * @description Role-Based Operational Dashboard (UC12 - Võ Gia Huy / Phương Gia Lạc).
 * Dynamic metrics cockpit rendering customized cards and worklists based on active user role:
 * Doctor (Queue/Approval), Lab Technician (Analyzers/Samples), Patient (Appointments/PDFs), and Receptionist.
 * Conforms to: BR-IAM-02 (RBAC), BR-LAB-01 (TAT SLA) & AGENTS-DESIGN.md.
 * @module features/manager-dashboard/pages/RoleDashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Table, Spinner, Nav, Alert } from 'react-bootstrap';
import api from '../../../config/api';

/**
 * Role-tailored clinical and administrative dashboard component.
 *
 * @returns {JSX.Element} Rendered role dashboard.
 */
const RoleBasedDashboard = () => {
  const currentUser = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const initialRole = React.useMemo(() => {
    if (!currentUser) return 'Manager';
    const r = (currentUser.role || currentUser.roleName || '').toString().trim().toLowerCase();
    if (r.includes('pat')) return 'Patient';
    if (r.includes('doc')) return 'Doctor';
    if (r.includes('lab') || r.includes('tech')) return 'LaboratoryUser';
    if (r.includes('rec')) return 'Receptionist';
    return 'Manager';
  }, [currentUser]);

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardStats = async (role) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/dashboard/stats?role=${role}`);
      if (res.data?.success) {
        setStats(res.data.data);
      } else {
        setError(res.data?.message || 'Không thể tải số liệu thống kê.');
      }
    } catch (err) {
      console.error('[RoleDashboard] API Error:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối tới dịch vụ cơ sở dữ liệu BMS.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats(selectedRole);
  }, [selectedRole]);

  return (
    <div className="container-fluid py-4">
      {/* Header with Role Selector */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-primary mb-1">
            <i className="bi bi-speedometer2 me-2"></i>Bảng Điều Khiển Vận Hành Y Tế (Role Dashboard)
          </h3>
          <p className="text-muted small mb-0">
            Hiển thị chỉ số KPI & dữ liệu theo vai trò người dùng trong phòng Lab
          </p>
        </div>

        {/* Switch Role Tab Navigation */}
        <Nav variant="pills" activeKey={selectedRole} onSelect={(k) => setSelectedRole(k)} className="bg-light p-1 rounded-3 border">
          <Nav.Item>
            <Nav.Link eventKey="Patient" className="px-3 py-1 small fw-semibold">
              <i className="bi bi-person me-1"></i>Bệnh nhân
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="Doctor" className="px-3 py-1 small fw-semibold">
              <i className="bi bi-heart-pulse me-1"></i>Bác sĩ
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="LaboratoryUser" className="px-3 py-1 small fw-semibold">
              <i className="bi bi-eyedropper me-1"></i>KTV Lab
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="Receptionist" className="px-3 py-1 small fw-semibold">
              <i className="bi bi-person-badge me-1"></i>Lễ tân
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="Manager" className="px-3 py-1 small fw-semibold">
              <i className="bi bi-graph-up-arrow me-1"></i>Quản lý / Admin
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Đang tải số liệu thống kê...</p>
        </div>
      ) : stats ? (
        <>
          {/* User Welcome Banner */}
          <Alert variant="info" className="d-flex justify-content-between align-items-center border-0 shadow-sm py-2 px-3 mb-4 rounded-3">
            <div>
              <span className="fw-bold">{stats.userName}</span> — Đang xem dưới quyền: <Badge bg="primary">{stats.role}</Badge>
            </div>
            <small className="text-muted">Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}</small>
          </Alert>

          {/* 4 Summary Metric Cards */}
          <Row className="g-3 mb-4">
            {stats.summaryCards?.map((card, idx) => (
              <Col key={idx} xs={12} sm={6} lg={3}>
                <Card className="h-100 border-0 shadow-sm rounded-4">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small fw-medium">{card.title}</span>
                      <div className={`badge bg-${card.colorVariant}-subtle text-${card.colorVariant} p-2 rounded-3 fs-5`}>
                        <i className={`bi ${card.icon}`}></i>
                      </div>
                    </div>
                    <h3 className="fw-bold mb-1">{card.value}</h3>
                    {card.subtitle && <p className="text-muted small mb-0">{card.subtitle}</p>}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Role-Specific Content Area */}
          {selectedRole === 'LaboratoryUser' && stats.labUserData && (
            <Card className="border-0 shadow-sm rounded-4 mb-4">
              <Card.Header className="bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0 text-danger">
                  <i className="bi bi-exclamation-octagon me-2"></i>Mẫu Cần Xử Lý Ưu Tiên & Chạy Lại (STAT)
                </h5>
                <Badge bg="danger">{stats.labUserData.prioritySamples?.length || 0} mẫu</Badge>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="px-4">Mã Barcode</th>
                      <th>Bệnh nhân</th>
                      <th>Gói xét nghiệm</th>
                      <th>Loại mẫu</th>
                      <th>Ưu tiên</th>
                      <th>Trạng thái</th>
                      <th className="text-end px-4">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.labUserData.prioritySamples?.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 fw-bold font-monospace text-primary">{s.barcode}</td>
                        <td className="fw-semibold">{s.patientName}</td>
                        <td>{s.testPackageName}</td>
                        <td><Badge bg="secondary">{s.sampleType}</Badge></td>
                        <td>
                          <Badge bg={s.priority === 'Stat' ? 'danger' : 'warning'}>{s.priority}</Badge>
                        </td>
                        <td><Badge bg="info">{s.status}</Badge></td>
                        <td className="text-end px-4">
                          <Button size="sm" variant="outline-primary" className="fw-semibold">
                            Mở Phiếu
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {selectedRole === 'Doctor' && stats.doctorData && (
            <Card className="border-0 shadow-sm rounded-4 mb-4">
              <Card.Header className="bg-white border-0 py-3 px-4">
                <h5 className="fw-bold mb-0 text-primary">
                  <i className="bi bi-clock-history me-2"></i>Lịch Trực Lâm Sàng Hôm Nay
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="px-4">Mã Hẹn</th>
                      <th>Bệnh nhân</th>
                      <th>Chỉ định xét nghiệm</th>
                      <th>Giờ khám</th>
                      <th>Trạng thái</th>
                      <th className="text-end px-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.doctorData.todaySchedule?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 font-monospace fw-bold">{item.appointmentCode}</td>
                        <td className="fw-semibold">{item.patientName}</td>
                        <td>{item.packageName}</td>
                        <td>{item.appointmentTime}</td>
                        <td><Badge bg="warning">{item.status}</Badge></td>
                        <td className="text-end px-4">
                          <Button size="sm" variant="primary">Khám & Chỉ Định</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {selectedRole === 'Patient' && stats.patientData && (
            <Row className="g-3">
              <Col md={7}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Header className="bg-white border-0 py-3 px-4">
                    <h5 className="fw-bold mb-0 text-primary">Lịch Khám Sắp Tới</h5>
                  </Card.Header>
                  <Card.Body className="p-4">
                    {stats.patientData.recentAppointments?.map((apt) => (
                      <div key={apt.id} className="p-3 bg-light rounded-3 mb-2">
                        <div className="d-flex justify-content-between mb-1">
                          <strong className="text-primary">{apt.packageName}</strong>
                          <Badge bg="success">{apt.status}</Badge>
                        </div>
                        <div className="small text-muted mb-1">Mã lịch hẹn: {apt.appointmentCode}</div>
                        <div className="small text-muted">Thời gian: {apt.appointmentTime} | Bác sĩ: {apt.doctorName}</div>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={5}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Header className="bg-white border-0 py-3 px-4">
                    <h5 className="fw-bold mb-0 text-success">Tra Cứu Nhanh</h5>
                  </Card.Header>
                  <Card.Body className="p-4 d-flex flex-column justify-content-center gap-3">
                    <Button variant="primary" size="lg" className="fw-semibold">
                      <i className="bi bi-calendar-plus me-2"></i>Đặt Lịch Xét Nghiệm Mới
                    </Button>
                    <Button variant="outline-success" size="lg" className="fw-semibold">
                      <i className="bi bi-qr-code me-2"></i>Xem Mã QR Check-in Tại Quầy
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </>
      ) : null}
    </div>
  );
};

export default RoleBasedDashboard;
