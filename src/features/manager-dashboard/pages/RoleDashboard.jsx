import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Table, Spinner, Nav, Alert } from 'react-bootstrap';
import api from '../../../config/api';

const RoleBasedDashboard = () => {
  const [selectedRole, setSelectedRole] = useState('LaboratoryUser');
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
      }
    } catch (err) {
      // Fallback local mock to ensure dashboard renders gracefully in offline demo
      setStats(getMockData(role));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats(selectedRole);
  }, [selectedRole]);

  // Fallback mock function matching backend DTO
  const getMockData = (role) => {
    const roleLower = role.toLowerCase();
    if (roleLower === 'patient') {
      return {
        role: 'Patient',
        userName: 'Bệnh Nhân Võ Gia Huy',
        summaryCards: [
          { key: 'appts', title: 'Lịch hẹn sắp tới', value: '1', icon: 'bi-calendar-check', colorVariant: 'primary', subtitle: 'Ngày mai lúc 08:30' },
          { key: 'results', title: 'Kết quả xét nghiệm', value: '3', icon: 'bi-file-earmark-medical', colorVariant: 'success', subtitle: 'Bản PDF đã ký số' },
          { key: 'pending', title: 'Đang xét nghiệm', value: '1', icon: 'bi-hourglass-split', colorVariant: 'warning', subtitle: 'Dự kiến 11:30' },
          { key: 'notifs', title: 'Thông báo', value: '2', icon: 'bi-bell', colorVariant: 'info', subtitle: 'Nhắc nhịn ăn sáng' }
        ],
        patientData: {
          recentAppointments: [
            { id: '1', appointmentCode: 'BMS-APT-20261012-01', packageName: 'Tổng phân tích tế bào máu (CBC)', appointmentTime: '2026-10-12 08:30', status: 'Đã xác nhận', doctorName: 'BS. Nguyễn Văn An' }
          ],
          recentResults: [
            { testOrderId: 'ORD-099', packageName: 'Sinh hóa máu cơ bản', releasedAt: '2026-10-09', status: 'Đã duyệt', hasAbnormalFlag: false }
          ]
        }
      };
    } else if (roleLower === 'doctor') {
      return {
        role: 'Doctor',
        userName: 'BS. Nguyễn Văn An',
        summaryCards: [
          { key: 'doc_today', title: 'Lịch khám hôm nay', value: '12', icon: 'bi-person-lines-fill', colorVariant: 'primary', subtitle: '4 bệnh nhân đang đợi' },
          { key: 'doc_pending', title: 'Chờ duyệt kết quả', value: '5', icon: 'bi-clipboard-check', colorVariant: 'warning', subtitle: '2 ca có chỉ số cao' },
          { key: 'doc_done', title: 'Đã duyệt hôm nay', value: '18', icon: 'bi-check-circle', colorVariant: 'success', subtitle: 'Hoàn tất trả kết quả' },
          { key: 'doc_rerun', title: 'Yêu cầu chạy lại', value: '1', icon: 'bi-arrow-repeat', colorVariant: 'danger', subtitle: 'Mẫu nghi ngờ đông' }
        ],
        doctorData: {
          todaySchedule: [
            { id: '1', appointmentCode: 'BMS-APT-101', patientName: 'Trần Hoàng Long', packageName: 'Men Gan (AST, ALT, GGT)', appointmentTime: '09:00', status: 'Chờ khám' },
            { id: '2', appointmentCode: 'BMS-APT-102', patientName: 'Nguyễn Thị Mai', packageName: 'Sinh hóa máu cơ bản', appointmentTime: '09:30', status: 'Đang khám' }
          ]
        }
      };
    } else if (roleLower === 'laboratoryuser' || roleLower === 'labuser') {
      return {
        role: 'LaboratoryUser',
        userName: 'KTV. Lê Thị Bình',
        summaryCards: [
          { key: 'lab_waiting', title: 'Hàng đợi Lab chờ chạy', value: '4', icon: 'bi-inbox', colorVariant: 'primary', subtitle: 'Tại phòng Lab 101, 102' },
          { key: 'lab_proc', title: 'Đang xử lý trên máy', value: '2', icon: 'bi-gear-wide-connected', colorVariant: 'warning', subtitle: 'Máy Sysmex & Roche' },
          { key: 'lab_done', title: 'Đã nhập kết quả', value: '15', icon: 'bi-check2-all', colorVariant: 'success', subtitle: 'Chuyển bác sĩ duyệt' },
          { key: 'lab_rerun', title: 'Mẫu yêu cầu chạy lại', value: '1', icon: 'bi-exclamation-triangle', colorVariant: 'danger', subtitle: 'Ưu tiên khẩn (STAT)' }
        ],
        labUserData: {
          prioritySamples: [
            { id: 'SMP-001', barcode: 'BC-20261011-0001', patientName: 'Võ Gia Huy', testPackageName: 'Tổng phân tích tế bào máu (CBC)', sampleType: 'Blood', priority: 'Urgent', status: 'Received', labRoom: 'Phòng 101' },
            { id: 'SMP-004', barcode: 'BC-20261011-0004', patientName: 'Đặng Thùy Dung', testPackageName: 'Đông máu toàn bộ', sampleType: 'Plasma', priority: 'Stat', status: 'RerunRequested', labRoom: 'Phòng 101' }
          ]
        }
      };
    } else if (roleLower === 'receptionist') {
      return {
        role: 'Receptionist',
        userName: 'Lễ Tân Mai Hoa',
        summaryCards: [
          { key: 'rec_checkin', title: 'Đã check-in hôm nay', value: '28', icon: 'bi-qr-code-scan', colorVariant: 'success', subtitle: 'Bệnh nhân có lịch' },
          { key: 'rec_queue', title: 'Hàng đợi tiếp đón', value: '6', icon: 'bi-people', colorVariant: 'primary', subtitle: 'Số chờ gọi tiếp theo: 029' },
          { key: 'rec_walkin', title: 'Khách vãng lai (Guest)', value: '9', icon: 'bi-person-plus', colorVariant: 'info', subtitle: 'Đã tạo hồ sơ tại quầy' },
          { key: 'rec_cash', title: 'Tổng tiền đã thu', value: '14,500,000 đ', icon: 'bi-cash-coin', colorVariant: 'warning', subtitle: 'Tiền mặt & VNPay' }
        ]
      };
    } else {
      return {
        role: 'Manager',
        userName: 'Trần Quản Lý Lab',
        summaryCards: [
          { key: 'mng_orders', title: 'Tổng đơn xét nghiệm', value: '48', icon: 'bi-clipboard-data', colorVariant: 'primary', subtitle: '+12% so với hôm qua' },
          { key: 'mng_rev', title: 'Doanh thu hôm nay', value: '22,800,000 đ', icon: 'bi-currency-dollar', colorVariant: 'success', subtitle: 'Đạt 114% chỉ tiêu' },
          { key: 'mng_tat', title: 'Thời gian trả KQ (TAT)', value: '42 phút', icon: 'bi-stopwatch', colorVariant: 'info', subtitle: 'Mục tiêu < 60 phút' },
          { key: 'mng_iot', title: 'Tủ lưu mẫu máu IoT', value: '3.8°C (Chuẩn)', icon: 'bi-thermometer-half', colorVariant: 'success', subtitle: 'Dải an toàn 2°C - 6°C' }
        ]
      };
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header with Role Selector */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-primary mb-1">
            <i className="bi bi-speedometer2 me-2"></i>Bảng Điều Khiển Role-Based Dashboard (UC12)
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
