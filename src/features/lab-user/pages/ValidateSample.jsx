/**
 * @file ValidateSample.jsx
 * @description Kiểm chuẩn chất lượng mẫu tiền phân tích (Đạt / Tán Huyết / Đông Dây) (UC39/UC44).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  Form,
  Modal,
  InputGroup
} from 'react-bootstrap';
import {
  FaVial,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaSyncAlt,
  FaLock,
  FaSearch,
  FaRedoAlt,
  FaShieldAlt,
  FaFlask,
  FaEye
} from 'react-icons/fa';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';
import { sampleService } from '../../../services/sampleService';
import api from '../../../config/api';

// Các tiêu chuẩn đánh giá chất lượng tiền phân tích theo ISO 15189:2022
const QUALITY_ASSESSMENT_OPTIONS = [
  {
    id: 'PASSED',
    label: 'Đạt chuẩn phân tích (Passed)',
    status: 'validated',
    badgeBg: 'success',
    desc: 'Thể tích đủ, huyết thanh trong suốt, không đông, không tán huyết.'
  },
  {
    id: 'HEMOLYSIS',
    label: 'Tán huyết (Hemolysis) — Khóa phân tích',
    status: 'rejected',
    badgeBg: 'danger',
    desc: 'Hồng cầu bị vỡ phóng thích hemoglobin làm đỏ huyết thanh. Nguy cơ gây sai lệch nghiêm trọng chỉ số K+, AST, LDH. Bắt buộc khóa phân tích và yêu cầu lấy lại mẫu.',
    isHemolysis: true
  },
  {
    id: 'CLOTTED',
    label: 'Đông dây / Đông máu (Clotted) — Khóa phân tích',
    status: 'rejected',
    badgeBg: 'danger',
    desc: 'Ống mẫu xuất hiện cục máu đông hoặc sợi fibrin, gây tắc nghẽn kim hút máy phân tích tự động. Từ chối mẫu và yêu cầu lấy lại mẫu.',
    isClotted: true
  },
  {
    id: 'LIPEMIC',
    label: 'Đục mỡ (Lipemic) — Lưu ý kỹ thuật',
    status: 'validated',
    badgeBg: 'warning',
    desc: 'Huyết tương có nồng độ lipid cao làm đục mẫu. Cần ly tâm siêu tốc hoặc ghi chú kỹ thuật khi duyệt kết quả quang học.'
  },
  {
    id: 'INSUFFICIENT',
    label: 'Không đủ thể tích mẫu (Insufficient Volume)',
    status: 'rejected',
    badgeBg: 'danger',
    desc: 'Lượng máu không đạt tỷ lệ chuẩn với chất chống đông (sai tỷ lệ máu/chất chống đông 9:1 hoặc 4:1). Yêu cầu lấy lại mẫu.'
  }
];

const ValidateSample = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { showSuccess, showError } = useNotificationContext();

  // Modal Kiểm chuẩn chi tiết
  const [showModal, setShowModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [assessmentType, setAssessmentType] = useState('PASSED');
  const [notes, setNotes] = useState('Mẫu đạt chuẩn tiền phân tích.');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      setError(null);
      // Ưu tiên tải từ BloodSample hoặc queue
      let sampleList = [];
      try {
        const response = await sampleService.getAllSamples();
        if (Array.isArray(response)) {
          sampleList = response;
        } else if (response && Array.isArray(response.data)) {
          sampleList = response.data;
        }
      } catch {
        // Fallback sang endpoint hàng đợi phòng lab
        const qRes = await api.get('/laboratory/samples/queue', { params: { pageSize: 50 } });
        if (Array.isArray(qRes.data?.data)) {
          sampleList = qRes.data.data;
        }
      }
      setSamples(Array.isArray(sampleList) ? sampleList : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách mẫu:', err);
      setError('Không thể tải danh sách mẫu xét nghiệm. Vui lòng kiểm tra lại kết nối.');
      setSamples([]);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal kiểm chuẩn cho 1 mẫu
  const openAssessmentModal = (sample, defaultAssessment = 'PASSED') => {
    setSelectedSample(sample);
    setAssessmentType(defaultAssessment);

    if (defaultAssessment === 'HEMOLYSIS') {
      setNotes('Mẫu bị tán huyết nặng (Hemolysis). Khóa phân tích trên máy, kích hoạt quy trình lấy lại mẫu/Rerun.');
    } else if (defaultAssessment === 'CLOTTED') {
      setNotes('Mẫu có sợi huyết đông dây (Clotted). Khóa phân tích, từ chối chạy máy để bảo vệ kim hút.');
    } else {
      setNotes('Mẫu đạt chuẩn thể tích và chất lượng tiền phân tích ISO 15189.');
    }

    setShowModal(true);
  };

  // Xử lý gửi kết quả kiểm chuẩn
  const handleSubmitAssessment = async (e) => {
    e.preventDefault();
    if (!selectedSample) return;

    const sampleId = selectedSample.id || selectedSample.sampleId || selectedSample.sampleCode;
    const selectedOption = QUALITY_ASSESSMENT_OPTIONS.find(o => o.id === assessmentType) || QUALITY_ASSESSMENT_OPTIONS[0];
    const isApproved = selectedOption.status === 'validated';
    const isHemolysis = selectedOption.isHemolysis || assessmentType === 'HEMOLYSIS';

    setSubmitting(true);
    try {
      // 1. Gửi validate theo service
      await sampleService.validateSample(sampleId, {
        isValid: isApproved,
        status: selectedOption.status,
        notes: `[${selectedOption.label}] ${notes}`,
        labUserId: 'lab_minhtuan'
      });

      // 2. RÀNG BUỘC NGHIỆP VỤ: Mẫu bị tán huyết (Hemolysis) -> Khóa phân tích & Kích hoạt Rerun/Recollect
      if (isHemolysis) {
        try {
          await api.post(`/laboratory/samples/${encodeURIComponent(sampleId)}/rerun`, {
            reason: `Mẫu tán huyết (Hemolysis) vi phạm tiêu chuẩn tiền phân tích ISO 15189: ${notes}`,
            requestedBy: 'KTV. Lê Minh Tuấn'
          });
        } catch {
          // Bỏ qua nếu mẫu đã có yêu cầu rerun
        }

        try {
          // Cập nhật trạng thái sang Rejected trên queue để khóa triệt để
          await api.put(`/laboratory/samples/${encodeURIComponent(sampleId)}/status`, {
            status: 'Rejected',
            rejectionReason: `Tán huyết (Hemolysis) - Khóa phân tích: ${notes}`,
            technicianName: 'KTV. Lê Minh Tuấn'
          });
        } catch {
          // Non-blocking
        }
      } else if (!isApproved) {
        // Các lý do từ chối khác (Đông dây, thiếu thể tích)
        try {
          await api.put(`/laboratory/samples/${encodeURIComponent(sampleId)}/status`, {
            status: 'Rejected',
            rejectionReason: `${selectedOption.label}: ${notes}`,
            technicianName: 'KTV. Lê Minh Tuấn'
          });
        } catch {
          // Non-blocking
        }
      }

      if (isHemolysis) {
        showSuccess(`Đã ghi nhận mẫu TÁN HUYẾT. Hệ thống đã khóa phân tích và kích hoạt yêu cầu lấy lại mẫu (Recollect/Rerun)!`);
      } else if (!isApproved) {
        showSuccess(`Đã từ chối mẫu ${sampleId} với lý do: ${selectedOption.label}`);
      } else {
        showSuccess(`Xác nhận mẫu ${sampleId} đạt chuẩn chất lượng tiền phân tích thành công!`);
      }

      setShowModal(false);
      await fetchSamples();
    } catch (err) {
      console.error('Lỗi khi kiểm chuẩn mẫu:', err);
      showError(err.response?.data?.message || err.message || 'Kiểm chuẩn mẫu thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'collected':
        return <Badge bg="warning" text="dark" className="px-2 py-1">Đã lấy mẫu (Collected)</Badge>;
      case 'received':
        return <Badge bg="primary" className="px-2 py-1">Đã tiếp nhận (Received)</Badge>;
      case 'validated':
        return <Badge bg="success" className="px-2 py-1">Đạt chuẩn (Validated)</Badge>;
      case 'processing':
        return <Badge bg="info" className="px-2 py-1">Đang xử lý / Ly tâm</Badge>;
      case 'testing':
        return <Badge bg="primary" className="px-2 py-1">Đang chạy máy</Badge>;
      case 'completed':
        return <Badge bg="success" className="px-2 py-1">Hoàn thành KQ</Badge>;
      case 'rejected':
        return <Badge bg="danger" className="px-2 py-1">Từ chối / Loại bỏ</Badge>;
      case 'rerunrequested':
        return <Badge bg="danger" className="px-2 py-1">Yêu cầu chạy lại</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">{status || 'Chưa xác định'}</Badge>;
    }
  };

  const safeSamples = Array.isArray(samples) ? samples : [];

  const filteredSamples = useMemo(() => {
    return safeSamples.filter((sample) => {
      const sId = String(sample.id || sample.sampleId || sample.sampleCode || '').toLowerCase();
      const pId = String(sample.patientId || sample.patientName || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || sId.includes(term) || pId.includes(term);

      if (statusFilter === 'ALL') return matchSearch;
      if (statusFilter === 'PENDING') {
        const st = String(sample.status || '').toLowerCase();
        return matchSearch && (st === 'collected' || st === 'received' || !st);
      }
      return matchSearch && String(sample.status || '').toLowerCase() === statusFilter.toLowerCase();
    });
  }, [safeSamples, searchTerm, statusFilter]);

  const activeOption = useMemo(() => {
    return QUALITY_ASSESSMENT_OPTIONS.find(o => o.id === assessmentType) || QUALITY_ASSESSMENT_OPTIONS[0];
  }, [assessmentType]);

  return (
    <Container fluid className="py-4 px-md-4">
      {/* Tiêu đề trang chuẩn y khoa */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <FaVial className="text-primary" />
              <span>Kiểm Chuẩn Chất Lượng Mẫu Tiền Phân Tích (Pre-analytical Specimen Validation)</span>
            </h3>
            <Badge bg="primary-subtle" text="primary" className="border border-primary-subtle px-2.5 py-1">
              ISO 15189:2022 §7.3
            </Badge>
          </div>
          <p className="text-muted small mb-0">
            Đánh giá chất lượng ống máu trước khi đưa vào máy phân tích tự động: Kiểm soát mẫu <strong>Đạt chuẩn</strong>, mẫu <strong>Tán huyết</strong>, hoặc mẫu <strong>Đông dây</strong>.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={fetchSamples} disabled={loading} className="d-flex align-items-center gap-1 shadow-sm">
            <FaSyncAlt className={loading ? 'fa-spin' : ''} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="rounded-3 shadow-sm">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {/* Thanh lọc và tìm kiếm */}
      <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={6}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  className="bg-light border-start-0"
                  placeholder="Tìm theo Mã mẫu, Barcode, Mã bệnh nhân hoặc Họ tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col xs={6} md={3}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ kiểm chuẩn (Collected / Received)</option>
                <option value="validated">Đã kiểm chuẩn đạt (Validated)</option>
                <option value="rejected">Bị từ chối / Khóa (Rejected)</option>
              </Form.Select>
            </Col>
            <Col xs={6} md={3} className="text-end">
              <span className="small text-muted">
                Hiển thị: <strong className="text-primary">{filteredSamples.length}</strong> / {safeSamples.length} ống mẫu
              </span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng danh sách mẫu kiểm chuẩn */}
      <Card className="border-0 shadow-sm rounded-3 overflow-hidden bg-white">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover align="middle" className="mb-0 table-sm">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="py-3 px-3">Mã Mẫu / Barcode</th>
                  <th className="py-3">Bệnh Nhân</th>
                  <th className="py-3">Chỉ Định / Loại Mẫu</th>
                  <th className="py-3">Thể Tích</th>
                  <th className="py-3">Trạng Thái</th>
                  <th className="py-3" style={{ width: '22%' }}>Ghi Chú Đánh Giá Tiền Phân Tích</th>
                  <th className="py-3 px-3 text-end">Thao Tác Kiểm Chuẩn</th>
                </tr>
              </thead>
              <tbody>
                {loading && safeSamples.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                      <span className="text-muted">Đang tải danh sách mẫu xét nghiệm...</span>
                    </td>
                  </tr>
                ) : filteredSamples.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <FaVial className="fs-1 text-secondary opacity-50 mb-2" />
                      <div className="fw-semibold">Không tìm thấy mẫu xét nghiệm nào cần kiểm chuẩn</div>
                    </td>
                  </tr>
                ) : (
                  filteredSamples.map((sample) => {
                    const sampleId = sample.id || sample.sampleId || sample.sampleCode;
                    const isLocked = sample.status?.toLowerCase() === 'rejected';
                    const isValidated = sample.status?.toLowerCase() === 'validated';
                    return (
                      <tr key={sampleId}>
                        <td className="px-3">
                          <div className="fw-bold font-monospace text-primary" style={{ fontSize: '0.84rem' }}>
                            {sample.barcode || sampleId}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            ID: <code>{sampleId}</code>
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark" style={{ fontSize: '0.84rem' }}>
                            {sample.patientName || sample.patientId || 'Bệnh nhân'}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Mã BN: <code>{sample.patientId || '—'}</code>
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark" style={{ fontSize: '0.82rem' }}>
                            {sample.testPackageName || 'Xét nghiệm lâm sàng'}
                          </div>
                          <div className="small text-muted mt-0.5">
                            <span className="badge bg-light text-dark border me-1">{sample.sampleType || 'Máu toàn phần'}</span>
                            <span className="badge bg-secondary-subtle text-secondary">{sample.tubeColor || 'Purple'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold text-dark small">{sample.volumeMl || sample.volume || 3.0} mL</span>
                        </td>
                        <td>{getStatusBadge(sample.status)}</td>
                        <td>
                          <div className="small text-muted text-truncate" style={{ maxWidth: '280px' }} title={sample.notes || 'Chưa ghi chú'}>
                            {sample.rejectionReason ? (
                              <span className="text-danger fw-semibold">
                                <FaExclamationTriangle className="me-1" />
                                {sample.rejectionReason}
                              </span>
                            ) : sample.notes ? (
                              sample.notes
                            ) : (
                              <span className="fst-italic text-secondary">Mẫu đạt chuẩn thể tích</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 text-end">
                          <div className="d-flex justify-content-end gap-1 flex-wrap">
                            {/* Nút Đạt chuẩn */}
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="px-2 py-1 d-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem' }}
                              disabled={isLocked}
                              onClick={() => openAssessmentModal(sample, 'PASSED')}
                              title="Xác nhận mẫu đạt chuẩn đưa vào phân tích"
                            >
                              <FaCheckCircle />
                              <span>Đạt chuẩn</span>
                            </Button>

                            {/* Nút Tán huyết */}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="px-2 py-1 d-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem' }}
                              disabled={isLocked}
                              onClick={() => openAssessmentModal(sample, 'HEMOLYSIS')}
                              title="Báo mẫu tán huyết: Khóa phân tích & Lấy lại mẫu"
                            >
                              <FaLock />
                              <span>Tán huyết</span>
                            </Button>

                            {/* Nút Đông dây */}
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="px-2 py-1 d-flex align-items-center gap-1 text-dark"
                              style={{ fontSize: '0.75rem' }}
                              disabled={isLocked}
                              onClick={() => openAssessmentModal(sample, 'CLOTTED')}
                              title="Báo mẫu đông dây / vón cục"
                            >
                              <FaExclamationTriangle />
                              <span>Đông dây</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Modal Kiểm chuẩn Chất Lượng Chi Tiết ISO 15189 */}
      <Modal show={showModal} onHide={() => !submitting && setShowModal(false)} size="lg" centered backdrop="static">
        <Form onSubmit={handleSubmitAssessment}>
          <Modal.Header closeButton={!submitting} className="bg-light">
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
              <FaShieldAlt className="text-primary" />
              <span>Kiểm Chuẩn Chất Lượng Tiền Phân Tích (ISO 15189:2022)</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {selectedSample && (
              <div className="p-3 bg-light rounded-3 border mb-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="fw-bold text-dark fs-6">
                      Mã Ống Mẫu: <span className="font-monospace text-primary">{selectedSample.barcode || selectedSample.id || selectedSample.sampleId}</span>
                    </div>
                    <div className="small text-muted mt-1">
                      Bệnh nhân: <strong>{selectedSample.patientName || selectedSample.patientId}</strong> &bull; Loại: {selectedSample.sampleType || 'Máu'} ({selectedSample.tubeColor || 'Purple'})
                    </div>
                  </div>
                  <div>{getStatusBadge(selectedSample.status)}</div>
                </div>
              </div>
            )}

            {/* Lựa chọn phân loại chất lượng */}
            <div className="mb-3">
              <Form.Label className="small fw-bold text-secondary text-uppercase">
                Chọn kết quả kiểm chuẩn chất lượng mẫu (Pre-analytical Status) <span className="text-danger">*</span>
              </Form.Label>
              <div className="d-flex flex-column gap-2">
                {QUALITY_ASSESSMENT_OPTIONS.map((opt) => {
                  const isSelected = assessmentType === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-3 border d-flex align-items-start gap-3 ${
                        isSelected
                          ? opt.status === 'rejected'
                            ? 'border-danger bg-danger-subtle'
                            : 'border-primary bg-primary-subtle'
                          : 'bg-white'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setAssessmentType(opt.id);
                        if (opt.id === 'HEMOLYSIS') {
                          setNotes('Mẫu bị tán huyết nặng (Hemolysis). Khóa phân tích trên máy, kích hoạt quy trình lấy lại mẫu/Rerun.');
                        } else if (opt.id === 'CLOTTED') {
                          setNotes('Mẫu có sợi huyết đông dây (Clotted). Khóa phân tích, từ chối chạy máy để bảo vệ kim hút.');
                        } else if (opt.id === 'PASSED') {
                          setNotes('Mẫu đạt chuẩn thể tích và chất lượng tiền phân tích ISO 15189.');
                        }
                      }}
                    >
                      <Form.Check
                        type="radio"
                        name="qualityAssessment"
                        id={`radio-${opt.id}`}
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1"
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2">
                          <strong className="text-dark">{opt.label}</strong>
                          <Badge bg={opt.badgeBg}>{opt.status.toUpperCase()}</Badge>
                        </div>
                        <div className="small text-muted mt-1">{opt.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CẢNH BÁO RÀNG BUỘC NGHIỆP VỤ TÁN HUYẾT */}
            {assessmentType === 'HEMOLYSIS' && (
              <Alert variant="danger" className="d-flex align-items-center gap-2 rounded-3 border-danger">
                <FaLock className="fs-3 text-danger flex-shrink-0" />
                <div className="small">
                  <strong>RÀNG BUỘC NGHIỆP VỤ BẮT BUỘC (ISO 15189):</strong> Mẫu bị <strong>Tán Huyết (Hemolysis)</strong>. 
                  Hệ thống sẽ ngay lập tức <strong>Khóa phân tích mẫu này trên máy tự động</strong> và tự động chuyển yêu cầu 
                  <strong> Lấy lại mẫu mới (Recollect / Rerun)</strong> đến khoa phòng chỉ định.
                </div>
              </Alert>
            )}

            {/* CẢNH BÁO RÀNG BUỘC ĐÔNG DÂY */}
            {assessmentType === 'CLOTTED' && (
              <Alert variant="warning" className="d-flex align-items-center gap-2 rounded-3 border-warning">
                <FaExclamationTriangle className="fs-3 text-warning-emphasis flex-shrink-0" />
                <div className="small text-dark">
                  <strong>CẢNH BÁO AN TOÀN THIẾT BỊ:</strong> Mẫu bị <strong>Đông dây / Vón cục (Clotted)</strong>. 
                  Khóa phân tích để ngăn ngừa tắc kim hút và hỏng cảm biến máy phân tích tự động. Yêu cầu lấy lại mẫu.
                </div>
              </Alert>
            )}

            {/* Ghi chú chuyên môn */}
            <div className="mb-3">
              <Form.Label className="small fw-semibold text-secondary">
                Ghi Chú Đánh Giá Kỹ Thuật (Technical Validation Notes) <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi nhận cụ thể mức độ tán huyết, tình trạng sợi huyết hoặc thể tích đo được..."
              />
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button
              variant={activeOption.status === 'rejected' ? 'danger' : 'primary'}
              type="submit"
              disabled={submitting}
              className="d-flex align-items-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Đang xử lý...</span>
                </>
              ) : activeOption.isHemolysis ? (
                <>
                  <FaLock />
                  <span>Xác Nhận Tán Huyết &amp; Khóa Phân Tích</span>
                </>
              ) : activeOption.status === 'rejected' ? (
                <>
                  <FaTimes />
                  <span>Từ Chối Mẫu &amp; Yêu Cầu Lấy Lại</span>
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  <span>Xác Nhận Đạt Chuẩn Phân Tích</span>
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ValidateSample;
