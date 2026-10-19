/**
 * @file SampleQueuePage.jsx
 * @description Laboratory Specimen Worklist Queue dashboard (UC17 - Võ Gia Huy / Phương Gia Lạc).
 * Displays incoming specimens, STAT priority tags, accession timestamps, and sample rerun triggers (UC47).
 * Conforms to: BR-LAB-01 (Turnaround Time SLA), BR-PHL-01 & AGENTS-DESIGN.md.
 * @module features/laboratory/pages/SampleQueuePage
 */

import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col, Modal, Spinner, InputGroup, Alert } from 'react-bootstrap';
import api from '../../../config/api';

/**
 * Laboratory specimen tracking and turnaround queue management interface.
 *
 * @returns {JSX.Element} Rendered sample queue dashboard.
 */
const SampleQueuePage = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modal Rerun State (UC47)
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [rerunReason, setRerunReason] = useState('');
  const [rerunLoading, setRerunLoading] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/laboratory/samples/queue', {
        params: {
          search: searchTerm,
          status: statusFilter,
          priority: priorityFilter
        }
      });
      if (res.data?.success) {
        setSamples(res.data.data || []);
      } else {
        setSamples([]);
        setErrorMsg(res.data?.message || 'Không thể tải hàng đợi xét nghiệm.');
      }
    } catch (err) {
      setSamples([]);
      setErrorMsg('Không thể kết nối máy chủ phòng xét nghiệm: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, priorityFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQueue();
  };

  const handleUpdateStatus = async (sampleId, newStatus) => {
    try {
      await api.put(`/laboratory/samples/${sampleId}/status`, { status: newStatus });
      setSuccessMsg(`Đã cập nhật trạng thái mẫu sang: ${newStatus}`);
      // Optimistic update
      setSamples(prev => prev.map(s => s.id === sampleId ? { ...s, status: newStatus } : s));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái mẫu trên cơ sở dữ liệu.');
    }
  };

  const openRerunModal = (sample) => {
    setSelectedSample(sample);
    setRerunReason('');
    setShowRerunModal(true);
  };

  const handleConfirmRerun = async (e) => {
    e.preventDefault();
    if (!rerunReason.trim()) return;

    setRerunLoading(true);
    try {
      await api.post(`/laboratory/samples/${selectedSample.id}/rerun`, {
        reason: rerunReason,
        requestedBy: 'KTV Hiện Tại'
      });
      setSuccessMsg(`Đã gửi yêu cầu chạy lại cho mẫu ${selectedSample.barcode}`);
      setShowRerunModal(false);
      setSamples(prev => prev.map(s => s.id === selectedSample.id ? { ...s, status: 'RerunRequested', priority: 'Stat' } : s));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể gửi yêu cầu chạy lại mẫu.');
    } finally {
      setRerunLoading(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Received': return <Badge bg="primary">Đã nhận mẫu</Badge>;
      case 'Processing': return <Badge bg="warning" text="dark">Đang chạy máy</Badge>;
      case 'Completed': return <Badge bg="success">Hoàn thành</Badge>;
      case 'RerunRequested': return <Badge bg="danger">Chạy lại (Rerun)</Badge>;
      case 'Rejected': return <Badge bg="dark">Từ chối mẫu</Badge>;
      default: return <Badge bg="secondary">{st}</Badge>;
    }
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'Stat': return <Badge bg="danger" className="p-1 px-2 fw-bold"><i className="bi bi-lightning-fill me-1"></i>STAT</Badge>;
      case 'Urgent': return <Badge bg="warning" text="dark" className="p-1 px-2 fw-bold"><i className="bi bi-clock-fill me-1"></i>Khẩn</Badge>;
      default: return <Badge bg="light" text="dark" className="border">Thường</Badge>;
    }
  };

  return (
    <div className="w-100 py-1">
      {/* Page Title */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-primary mb-1">
            <i className="bi bi-list-check me-2"></i>Hàng Đợi Xét Nghiệm Lâm Sàng (Lab Specimen Queue)
          </h3>
          <p className="text-muted small mb-0">
            Theo dõi thời gian thực, quét mã barcode và điều phối ống mẫu máu phòng lab chuẩn ISO 15189
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={fetchQueue} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>Làm mới
          </Button>
          <Button variant="primary">
            <i className="bi bi-upc-scan me-1"></i>Quét Barcode Mẫu
          </Button>
        </div>
      </div>

      {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}
      {errorMsg && <Alert variant="danger" dismissible onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}

      {/* Filter and Search Bar */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            <Col md={5}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <InputGroup.Text className="bg-white"><i className="bi bi-search"></i></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Tìm theo Barcode, Tên bệnh nhân hoặc Gói..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="primary" type="submit">Tìm kiếm</Button>
                </InputGroup>
              </Form>
            </Col>

            <Col md={3}>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">Tất cả trạng thái</option>
                <option value="Received">Đã nhận mẫu (Received)</option>
                <option value="Processing">Đang chạy máy (Processing)</option>
                <option value="Completed">Hoàn thành (Completed)</option>
                <option value="RerunRequested">Yêu cầu chạy lại (Rerun)</option>
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="All">Mọi mức độ ưu tiên</option>
                <option value="Normal">Bình thường</option>
                <option value="Urgent">Khẩn cấp (Urgent)</option>
                <option value="Stat">Cực khẩn (STAT)</option>
              </Form.Select>
            </Col>

            <Col md={2} className="text-end">
              <span className="small text-muted fw-semibold">Tổng: {samples.length} mẫu</span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Samples Queue Table */}
      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Đang tải danh sách hàng đợi...</p>
            </div>
          ) : samples.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 text-secondary"></i>
              <p className="mt-2">Không tìm thấy mẫu nào trong hàng đợi.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="px-4">Mã Barcode</th>
                  <th>Bệnh nhân</th>
                  <th>Gói xét nghiệm</th>
                  <th>Loại mẫu</th>
                  <th>Mức ưu tiên</th>
                  <th>Phòng Lab</th>
                  <th>Trạng thái</th>
                  <th className="text-end px-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4">
                      <div className="fw-bold font-monospace text-primary">{s.barcode}</div>
                      <small className="text-muted">{s.id}</small>
                    </td>
                    <td>
                      <div className="fw-semibold">{s.patientName}</div>
                      <small className="text-muted">{s.patientGender}, {s.patientAge} tuổi</small>
                    </td>
                    <td>
                      <div className="fw-medium">{s.testPackageName}</div>
                      {s.notes && <small className="text-danger"><i className="bi bi-info-circle me-1"></i>{s.notes}</small>}
                    </td>
                    <td>
                      <Badge bg="secondary" className="fw-normal">{s.sampleType}</Badge>
                    </td>
                    <td>{getPriorityBadge(s.priority)}</td>
                    <td><small className="text-muted">{s.labRoom || 'Chưa gán'}</small></td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td className="text-end px-4">
                      <div className="btn-group btn-group-sm">
                        {s.status === 'Received' && (
                          <Button variant="warning" onClick={() => handleUpdateStatus(s.id, 'Processing')}>
                            <i className="bi bi-play-fill me-1"></i>Chạy máy
                          </Button>
                        )}
                        {s.status === 'Processing' && (
                          <Button variant="success" onClick={() => handleUpdateStatus(s.id, 'Completed')}>
                            <i className="bi bi-check-lg me-1"></i>Nhập KQ
                          </Button>
                        )}
                        <Button variant="outline-danger" onClick={() => openRerunModal(s)}>
                          <i className="bi bi-arrow-repeat me-1"></i>Rerun
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Rerun Request Modal (UC47) */}
      <Modal show={showRerunModal} onHide={() => setShowRerunModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-danger">
            <i className="bi bi-arrow-repeat me-2"></i>Yêu Cầu Chạy Lại Mẫu Xét Nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedSample && (
            <div className="mb-3 p-3 bg-light rounded-3 small">
              <div><strong>Mã Barcode:</strong> {selectedSample.barcode}</div>
              <div><strong>Bệnh nhân:</strong> {selectedSample.patientName}</div>
              <div><strong>Xét nghiệm:</strong> {selectedSample.testPackageName}</div>
            </div>
          )}
          <Form onSubmit={handleConfirmRerun}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Lý do yêu cầu chạy lại <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="VD: Chỉ số APTT bất thường nghi đông dây máu, cần chạy kiểm chứng..."
                value={rerunReason}
                onChange={(e) => setRerunReason(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => setShowRerunModal(false)}>Hủy</Button>
              <Button variant="danger" type="submit" disabled={rerunLoading}>
                {rerunLoading ? <Spinner animation="border" size="sm" /> : 'Xác Nhận Yêu Cầu Rerun'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SampleQueuePage;
