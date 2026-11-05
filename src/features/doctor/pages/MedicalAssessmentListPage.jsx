/**
 * @file MedicalAssessmentListPage.jsx
 * @description UC50 – Medical Assessment Management and Query List.
 * Quản lý danh sách đánh giá y khoa lâm sàng, chẩn đoán WHO ICD-10,
 * phân loại mức độ nguy cơ, xem chi tiết và liên kết tạo mới đánh giá y khoa.
 * Conforms to: Rule 19, Production Standards & AGENTS-DESIGN.md.
 * @module features/doctor/pages/MedicalAssessmentListPage
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Row,
  Col,
  Form,
  InputGroup,
  Spinner,
  Alert,
  Modal
} from 'react-bootstrap';
import {
  FaPlus,
  FaSearch,
  FaStethoscope,
  FaHeartbeat,
  FaEye,
  FaEdit,
  FaTrashAlt,
  FaPrint,
  FaLock,
  FaClock,
  FaTimes,
  FaUserMd
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { medicalAssessmentApi } from '../api/medicalAssessmentApi';
import { getStoredUser, hasRole, ROLES } from '../../../constants/roles';

export default function MedicalAssessmentListPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const canManageAssessments = hasRole(currentUser, ROLES.DOCTOR);
  const [assessments, setAssessments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 15;

  // Detail Modal
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch assessments from API with multi-tiered defensive checks
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await medicalAssessmentApi.getAssessments({
        keyword: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        pageNumber,
        pageSize
      });
      const raw = res?.data ?? res?.items ?? res;
      const list = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw?.data) ? raw.data : []));

      setAssessments(list);
      setTotalCount(
        Number.isFinite(res?.total)
          ? res.total
          : (Number.isFinite(res?.totalCount) ? res.totalCount : list.length)
      );
    } catch (err) {
      if (err.status === 401 || err.message?.includes('401')) {
        setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập với tài khoản Bác sĩ để xem và quản lý đánh giá y khoa.');
      } else {
        setErrorMsg(err.message || 'Không thể tải danh sách đánh giá y khoa.');
      }
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, pageNumber]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleOpenDetail = (item) => {
    setSelectedAssessment(item);
    setShowDetailModal(true);
  };

  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setDeleteReason('Sai sót thông tin lâm sàng cần tạo lại');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteError(null);
    if (!deleteReason || deleteReason.trim().length < 5) {
      setDeleteError('Vui lòng nhập lý do xóa tối thiểu 5 ký tự.');
      return;
    }

    setDeleting(true);
    try {
      await medicalAssessmentApi.deleteAssessment(itemToDelete.id, deleteReason.trim());
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchAssessments();
    } catch (err) {
      setDeleteError(err.message || 'Lỗi khi xóa hồ sơ đánh giá y khoa.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'Critical': return <Badge bg="danger">Nguy kịch</Badge>;
      case 'Severe': return <Badge bg="warning" text="dark">Nặng</Badge>;
      case 'Moderate': return <Badge bg="info" className="text-white">Trung bình</Badge>;
      case 'Mild':
      default:
        return <Badge bg="success">Nhẹ</Badge>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'High': return <Badge bg="danger" className="ms-1">Nguy cơ cao</Badge>;
      case 'Medium': return <Badge bg="warning" text="dark" className="ms-1">Nguy cơ TB</Badge>;
      case 'Low':
      default:
        return <Badge bg="light" text="dark" className="ms-1 border">Nguy cơ thấp</Badge>;
    }
  };

  return (
    <Container fluid className="py-4 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-white p-3 rounded-3 shadow-sm border" style={{ borderColor: '#e2e8f0' }}>
        <div>
          <h4 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color: '#0284c7' }}>
            <FaStethoscope /> Hồ Sơ Đánh Giá Y Khoa Lâm Sàng
          </h4>
          <p className="text-muted small mb-0">
            Quản lý bệnh án khám bệnh, mã chẩn đoán quốc tế WHO ICD-10 và đề xuất cận lâm sàng.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/doctor/console')}
            className="d-flex align-items-center gap-2 rounded-3 shadow-sm"
          >
            <FaUserMd /> Bàn Khám Bác Sĩ
          </Button>
          {canManageAssessments && (
            <Button
              variant="primary"
              onClick={() => navigate('/medical-assessments/add')}
              className="d-flex align-items-center gap-2 px-3 py-2 shadow-sm rounded-3 fw-semibold text-white"
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
            >
              <FaPlus /> Thêm Đánh Giá Y Khoa
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-0 shadow-sm rounded-3 mb-4" style={{ borderColor: '#e2e8f0' }}>
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo mã đánh giá, tên bệnh nhân, mã ICD-10 hoặc kết luận chẩn đoán..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0 ps-0"
                />
                {searchTerm && (
                  <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                    <FaTimes />
                  </Button>
                )}
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Draft">Bản nháp</option>
                <option value="Finalized">Đã hoàn tất (Đã khóa)</option>
              </Form.Select>
            </Col>
            <Col md={3} className="text-md-end text-muted small">
              Tổng số hồ sơ: <strong className="text-dark font-monospace">{totalCount}</strong>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Error alert */}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="shadow-sm">
          {errorMsg}
        </Alert>
      )}

      {/* Data Table */}
      <Card className="border-0 shadow-sm rounded-3 overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Đang tải dữ liệu đánh giá y khoa...</p>
            </div>
          ) : !Array.isArray(assessments) || assessments.length === 0 ? (
            <div className="text-center py-5">
              <FaStethoscope className="text-muted display-4 mb-3" />
              <h5 className="text-secondary">Chưa có bản ghi đánh giá y khoa nào</h5>
              <p className="text-muted small">
                Bác sĩ bấm &quot;Thêm Đánh Giá Y Khoa&quot; để ghi nhận bệnh án và chẩn đoán ICD-10.
              </p>
              {canManageAssessments && (
                <Button
                  variant="outline-primary"
                  onClick={() => navigate('/medical-assessments/add')}
                  className="mt-2"
                  style={{ color: '#0284c7', borderColor: '#0284c7' }}
                >
                  <FaPlus className="me-2" /> Tạo đánh giá ngay
                </Button>
              )}
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th className="ps-4 text-start">Mã Đánh Giá</th>
                  <th className="text-start">Bệnh Nhân</th>
                  <th className="text-start">Lượt Khám / Bác Sĩ</th>
                  <th className="text-start">Chẩn Đoán (ICD-10)</th>
                  <th className="text-center">Đánh Giá Nguy Cơ</th>
                  <th className="text-center">Trạng Thái</th>
                  <th className="text-end">Thời Gian Khám</th>
                  <th className="text-center pe-4">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-4 text-start">
                      <span className="fw-bold font-monospace" style={{ color: '#0284c7' }}>
                        {item.assessmentCode || item.id}
                      </span>
                    </td>
                    <td className="text-start">
                      <div className="fw-semibold text-dark">{item.patientName}</div>
                      <small className="text-muted font-monospace">
                        Mã: {item.patientCode || item.patientId} | {item.patientGender === 'Female' ? 'Nữ' : 'Nam'}
                      </small>
                    </td>
                    <td className="text-start">
                      <div>
                        <Badge bg="secondary" className="me-1">
                          {item.encounterType === 'ClinicVisit' ? 'Khám ngoại trú' : (item.encounterType || 'Khám bệnh')}
                        </Badge>
                        <small className="text-muted font-monospace">{item.encounterId}</small>
                      </div>
                      <small className="text-muted">BS: {item.doctorName}</small>
                    </td>
                    <td className="text-start">
                      <div className="d-flex align-items-center gap-1">
                        <Badge bg="primary" className="font-monospace">{item.icd10Code}</Badge>
                        <span className="text-truncate" style={{ maxWidth: '240px' }}>
                          {item.finalDiagnosis || item.icd10Name}
                        </span>
                      </div>
                      {item.chiefComplaint && (
                        <small className="text-muted d-block text-truncate" style={{ maxWidth: '260px' }}>
                          Lý do: {item.chiefComplaint}
                        </small>
                      )}
                    </td>
                    <td className="text-center">
                      {getSeverityBadge(item.severity)}
                      {getRiskBadge(item.riskLevel)}
                    </td>
                    <td className="text-center">
                      {item.status === 'Finalized' ? (
                        <Badge bg="success" className="px-2 py-1 d-inline-flex align-items-center gap-1" style={{ backgroundColor: '#059669' }}>
                          <FaLock size={11} /> Đã Khóa
                        </Badge>
                      ) : (
                        <Badge bg="warning" text="dark" className="px-2 py-1 d-inline-flex align-items-center gap-1">
                          <FaClock size={11} /> Bản Nháp
                        </Badge>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="fw-semibold small">
                        {new Date(item.assessmentDate || item.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      <small className="text-muted">
                        {new Date(item.assessmentDate || item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </td>
                    <td className="text-center pe-4">
                      <div className="d-flex justify-content-center gap-1">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleOpenDetail(item)}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </Button>
                        {canManageAssessments && item.canEdit && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => navigate(`/medical-assessments/${item.id}/edit`)}
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </Button>
                        )}
                        {canManageAssessments && item.canEdit && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleOpenDelete(item)}
                            title="Xóa mềm"
                          >
                            <FaTrashAlt />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* DETAIL INSPECTION MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        {selectedAssessment && (
          <>
            <Modal.Header closeButton className="text-white" style={{ backgroundColor: '#0284c7' }}>
              <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
                <FaStethoscope /> Phiếu Đánh Giá Y Khoa Lâm Sàng: {selectedAssessment.assessmentCode}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4" id="printable-assessment">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">{selectedAssessment.patientName}</h5>
                  <p className="text-muted small mb-0 font-monospace">
                    Mã BN: {selectedAssessment.patientCode || selectedAssessment.patientId} | Giới tính: {selectedAssessment.patientGender === 'Female' ? 'Nữ' : 'Nam'} | Lượt khám: {selectedAssessment.encounterId}
                  </p>
                </div>
                <div className="text-end">
                  <Badge bg={selectedAssessment.status === 'Finalized' ? 'success' : 'warning'} className="fs-6 px-3 py-1">
                    {selectedAssessment.status === 'Finalized' ? 'ĐÃ KHÓA' : 'BẢN NHÁP'}
                  </Badge>
                  <div className="small text-muted mt-1">
                    Ngày khám: {new Date(selectedAssessment.assessmentDate || selectedAssessment.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Vitals Summary */}
              <div className="bg-light p-3 rounded-3 mb-3 border">
                <h6 className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: '#0284c7' }}>
                  <FaHeartbeat /> Dấu Hiệu Sinh Tồn & Thể Trạng
                </h6>
                <Row className="g-2 text-center small">
                  <Col xs={4} md={2}>
                    <div className="text-muted">Mạch</div>
                    <div className="fw-bold fs-6 font-monospace">{selectedAssessment.vitals?.heartRate ?? '—'} bpm</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">Huyết áp</div>
                    <div className="fw-bold fs-6 font-monospace">{selectedAssessment.vitals?.systolicBp ?? '—'}/{selectedAssessment.vitals?.diastolicBp ?? '—'}</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">Nhiệt độ</div>
                    <div className="fw-bold fs-6 font-monospace">{selectedAssessment.vitals?.temperature ?? '—'}°C</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">SpO2</div>
                    <div className="fw-bold fs-6 font-monospace">{selectedAssessment.vitals?.spo2 ?? '—'}%</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">BMI</div>
                    <div className="fw-bold fs-6 font-monospace text-primary">{selectedAssessment.vitals?.bmi ?? '—'}</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">Thể trạng</div>
                    <div className="fw-bold small">{selectedAssessment.vitals?.bmiCategory ?? '—'}</div>
                  </Col>
                </Row>
              </div>

              {/* Chief Complaint & Symptoms */}
              <div className="mb-3">
                <div className="fw-bold text-secondary small">LÝ DO ĐẾN KHÁM:</div>
                <p className="mb-2 fw-semibold text-dark">{selectedAssessment.chiefComplaint}</p>

                {selectedAssessment.clinicalSymptoms && (
                  <>
                    <div className="fw-bold text-secondary small">TRIỆU CHỨNG LÂM SÀNG:</div>
                    <p className="mb-2 text-muted">{selectedAssessment.clinicalSymptoms}</p>
                  </>
                )}

                {selectedAssessment.physicalExamination && (
                  <>
                    <div className="fw-bold text-secondary small">KHÁM THỰC THỂ:</div>
                    <p className="mb-2 text-muted">{selectedAssessment.physicalExamination}</p>
                  </>
                )}
              </div>

              {/* Diagnosis and ICD-10 */}
              <div className="p-3 rounded-4 mb-3 border" style={{ backgroundColor: 'var(--bms-surface-card, #EEF2F6)', borderColor: 'var(--bms-border, rgba(15, 23, 42, 0.05))' }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold" style={{ color: '#648CF4' }}>CHẨN ĐOÁN XÁC ĐỊNH & MÃ WHO ICD-10:</span>
                  <Badge className="fs-6 px-2.5 py-1 font-monospace rounded-pill" style={{ backgroundColor: '#648CF4' }}>{selectedAssessment.icd10Code}</Badge>
                </div>
                <h5 className="fw-bold text-dark mb-1">{selectedAssessment.finalDiagnosis}</h5>
                <small className="text-muted d-block">{selectedAssessment.icd10Name}</small>
                {selectedAssessment.preliminaryDiagnosis && (
                  <small className="text-muted mt-1 d-block">Sơ bộ: {selectedAssessment.preliminaryDiagnosis}</small>
                )}
              </div>

              {/* Plan and Recommendations */}
              <div className="mb-3">
                {Array.isArray(selectedAssessment.recommendedTestPackages) && selectedAssessment.recommendedTestPackages.length > 0 && (
                  <div className="mb-2">
                    <div className="fw-bold text-secondary small mb-1">XÉT NGHIỆM ĐỀ XUẤT:</div>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedAssessment.recommendedTestPackages.map((p, idx) => (
                        <Badge key={idx} bg="secondary" className="px-2 py-1">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAssessment.treatmentPlan && (
                  <div className="mb-2">
                    <div className="fw-bold text-secondary small">KẾ HOẠCH ĐIỀU TRỊ:</div>
                    <p className="mb-0 text-muted">{selectedAssessment.treatmentPlan}</p>
                  </div>
                )}

                {selectedAssessment.prescriptionNotes && (
                  <div className="mb-2">
                    <div className="fw-bold text-secondary small">HƯỚNG DẪN DƯỢC / TOA THUỐC:</div>
                    <p className="mb-0 text-muted">{selectedAssessment.prescriptionNotes}</p>
                  </div>
                )}

                {selectedAssessment.followUpDate && (
                  <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-danger small">HẸN TÁI KHÁM:</span>
                    <span className="fw-semibold">
                      {new Date(selectedAssessment.followUpDate).toLocaleDateString('vi-VN')} {selectedAssessment.followUpNotes && `(${selectedAssessment.followUpNotes})`}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-end text-muted small border-top pt-2">
                Bác sĩ phụ trách: <strong>{selectedAssessment.doctorName}</strong> ({selectedAssessment.department || 'Khoa Khám Bệnh'})
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={handlePrint} className="d-flex align-items-center gap-1">
                <FaPrint /> In Phiếu
              </Button>
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Đóng
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* SOFT DELETE MODAL */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold" style={{ color: '#dc2626' }}>Xác Nhận Xóa Mềm Đánh Giá Y Khoa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError && (
            <Alert variant="danger" className="py-2 small">
              {deleteError}
            </Alert>
          )}
          <p>
            Bạn có chắc chắn muốn xóa hồ sơ đánh giá y khoa mã <strong>{itemToDelete?.assessmentCode}</strong> của bệnh nhân <strong>{itemToDelete?.patientName}</strong>?
          </p>
          <Form.Group>
            <Form.Label className="fw-semibold">Lý do hủy/xóa giải trình kiểm toán y tế <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="VD: Sai thông tin triệu chứng hoặc chẩn đoán ICD-10 cần lập phiếu mới..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Hủy Bỏ
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
            {deleting ? <Spinner size="sm" animation="border" /> : 'Xác Nhận Xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
