/**
 * @file MedicalAssessmentListPage.jsx
 * @description UC50 – Medical Assessment Management and Query List (Iteration 3).
 * Provides searchable, filterable data table of clinical assessments with WHO ICD-10 diagnosis,
 * live severity badges, detail inspection modal, and quick navigation to Add Assessment.
 * Conforms to: Production Standards & AGENTS-DESIGN.md.
 * @module features/doctor/pages/MedicalAssessmentListPage
 */

import React, { useState, useEffect, useCallback, useTransition } from 'react';
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
  Modal,
  ListGroup
} from 'react-bootstrap';
import {
  FaPlus,
  FaSearch,
  FaFilter,
  FaStethoscope,
  FaHeartbeat,
  FaEye,
  FaEdit,
  FaTrashAlt,
  FaPrint,
  FaLock,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaCalendarAlt,
  FaFilePrescription
} from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import { medicalAssessmentApi } from '../api/medicalAssessmentApi';

export default function MedicalAssessmentListPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

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

  // Fetch assessments from API
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
      if (res?.data) {
        setAssessments(res.data);
        setTotalCount(res.total || res.data.length);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tải danh sách đánh giá y khoa.');
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
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    if (!deleteReason || deleteReason.trim().length < 5) {
      alert('Vui lòng nhập lý do xóa tối thiểu 5 ký tự.');
      return;
    }

    setDeleting(true);
    try {
      await medicalAssessmentApi.deleteAssessment(itemToDelete.id, deleteReason);
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchAssessments();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa hồ sơ đánh giá.');
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
      case 'Moderate': return <Badge bg="info">Trung bình</Badge>;
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
    <Container fluid className="py-4 px-md-4">
      {/* Header bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <FaStethoscope className="text-primary" />
            Hồ Sơ Đánh Giá Y Khoa Lâm Sàng (Medical Assessments)
          </h4>
          <p className="text-muted small mb-0">
            Quản lý bệnh án khám bệnh, mã chẩn đoán quốc tế WHO ICD-10 và đề xuất cận lâm sàng (UC50)
          </p>
        </div>
        <div className="mt-3 mt-sm-0 d-flex gap-2">
          <Button
            variant="primary"
            onClick={() => navigate('/medical-assessments/add')}
            className="d-flex align-items-center gap-2 px-3 py-2 shadow-sm rounded-3 fw-semibold"
          >
            <FaPlus /> Thêm Đánh Giá Y Khoa
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo mã ASM, tên bệnh nhân, mã ICD-10 hoặc chẩn đoán..."
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
                <option value="Draft">Bản nháp (Draft)</option>
                <option value="Finalized">Đã hoàn tất / Đã khóa (Finalized)</option>
              </Form.Select>
            </Col>
            <Col md={3} className="text-md-end text-muted small">
              Tổng số hồ sơ: <strong className="text-dark">{totalCount}</strong>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Error alert */}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Data Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Đang tải dữ liệu đánh giá y khoa...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-5">
              <FaStethoscope className="text-muted display-4 mb-3" />
              <h5 className="text-secondary">Chưa có bản ghi đánh giá y khoa nào</h5>
              <p className="text-muted small">
                Bác sĩ có thể bấm "Thêm Đánh Giá Y Khoa" để bắt đầu ghi nhận bệnh án và chẩn đoán ICD-10.
              </p>
              <Button
                variant="outline-primary"
                onClick={() => navigate('/medical-assessments/add')}
                className="mt-2"
              >
                <FaPlus className="me-2" /> Tạo đánh giá ngay
              </Button>
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th className="ps-4">Mã Đánh Giá</th>
                  <th>Bệnh Nhân</th>
                  <th>Lượt Khám / Bác Sĩ</th>
                  <th>Chẩn Đoán (ICD-10)</th>
                  <th className="text-center">Đánh Giá Nguy Cơ</th>
                  <th className="text-center">Trạng Thái</th>
                  <th className="text-end">Thời Gian Khám</th>
                  <th className="text-center pe-4">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-4">
                      <span className="fw-bold text-primary">{item.assessmentCode}</span>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{item.patientName}</div>
                      <small className="text-muted">
                        Mã: {item.patientCode || item.patientId} | {item.patientGender === 'Female' ? 'Nữ' : 'Nam'}
                      </small>
                    </td>
                    <td>
                      <div>
                        <Badge bg="secondary" className="me-1">
                          {item.encounterType || 'ClinicVisit'}
                        </Badge>
                        <small className="text-muted">{item.encounterId}</small>
                      </div>
                      <small className="text-muted">BS: {item.doctorName}</small>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <Badge bg="primary">{item.icd10Code}</Badge>
                        <span className="text-truncate" style={{ maxWidth: '220px' }}>
                          {item.finalDiagnosis || item.icd10Name}
                        </span>
                      </div>
                      {item.chiefComplaint && (
                        <small className="text-muted d-block text-truncate" style={{ maxWidth: '250px' }}>
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
                        <Badge bg="success" className="px-2 py-1 d-inline-flex align-items-center gap-1">
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
                        {item.canEdit && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => navigate(`/medical-assessments/${item.id}/edit`)}
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </Button>
                        )}
                        {item.canEdit && (
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
            <Modal.Header closeButton className="bg-primary text-white">
              <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
                <FaStethoscope /> Phiếu Đánh Giá Y Khoa Lâm Sàng: {selectedAssessment.assessmentCode}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4" id="printable-assessment">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">{selectedAssessment.patientName}</h5>
                  <p className="text-muted small mb-0">
                    Mã BN: {selectedAssessment.patientCode || selectedAssessment.patientId} | Giới tính: {selectedAssessment.patientGender} | Lượt khám: {selectedAssessment.encounterId}
                  </p>
                </div>
                <div className="text-end">
                  <Badge bg={selectedAssessment.status === 'Finalized' ? 'success' : 'warning'} className="fs-6 px-3 py-1">
                    {selectedAssessment.status === 'Finalized' ? 'ĐÃ KHÓA (FINALIZED)' : 'BẢN NHÁP (DRAFT)'}
                  </Badge>
                  <div className="small text-muted mt-1">
                    Ngày khám: {new Date(selectedAssessment.assessmentDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Vitals Summary */}
              <div className="bg-light p-3 rounded-3 mb-3">
                <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                  <FaHeartbeat /> Dấu Hiệu Sinh Tồn & Thể Trạng
                </h6>
                <Row className="g-2 text-center small">
                  <Col xs={4} md={2}>
                    <div className="text-muted">Mạch</div>
                    <div className="fw-bold fs-6">{selectedAssessment.vitals?.heartRate} bpm</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">Huyết áp</div>
                    <div className="fw-bold fs-6">{selectedAssessment.vitals?.systolicBp}/{selectedAssessment.vitals?.diastolicBp}</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">Nhiệt độ</div>
                    <div className="fw-bold fs-6">{selectedAssessment.vitals?.temperature}°C</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">SpO2</div>
                    <div className="fw-bold fs-6">{selectedAssessment.vitals?.spo2}%</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">BMI</div>
                    <div className="fw-bold fs-6 text-primary">{selectedAssessment.vitals?.bmi}</div>
                  </Col>
                  <Col xs={4} md={2}>
                    <div className="text-muted">Thể trạng</div>
                    <div className="fw-bold small">{selectedAssessment.vitals?.bmiCategory}</div>
                  </Col>
                </Row>
              </div>

              {/* Chief Complaint & Symptoms */}
              <div className="mb-3">
                <div className="fw-bold text-secondary small">LÝ DO ĐẾN KHÁM (CHIEF COMPLAINT):</div>
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
              <div className="p-3 bg-primary bg-opacity-10 rounded-3 mb-3 border border-primary border-opacity-25">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold text-primary">CHẨN ĐOÁN XÁC ĐỊNH & MÃ WHO ICD-10:</span>
                  <Badge bg="primary" className="fs-6 px-2">{selectedAssessment.icd10Code}</Badge>
                </div>
                <h5 className="fw-bold text-dark mb-1">{selectedAssessment.finalDiagnosis}</h5>
                <small className="text-muted d-block">{selectedAssessment.icd10Name}</small>
                {selectedAssessment.preliminaryDiagnosis && (
                  <small className="text-muted mt-1 d-block">Sơ bộ: {selectedAssessment.preliminaryDiagnosis}</small>
                )}
              </div>

              {/* Plan and Recommendations */}
              <div className="mb-3">
                {selectedAssessment.recommendedTestPackages && selectedAssessment.recommendedTestPackages.length > 0 && (
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
                Bác sĩ phụ trách: <strong>{selectedAssessment.doctorName}</strong> ({selectedAssessment.department})
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
          <Modal.Title className="fs-5 text-danger fw-bold">Xác Nhận Xóa Mềm Đánh Giá Y Khoa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
          <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? <Spinner size="sm" animation="border" /> : 'Xác Nhận Xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
