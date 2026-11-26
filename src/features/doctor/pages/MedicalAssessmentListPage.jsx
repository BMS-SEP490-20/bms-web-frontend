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
import { Plus, Search as LucideSearch, Stethoscope, HeartPulse, Eye, SquarePen, Trash2, Printer, Lock, Clock, X as LucideX } from 'lucide-react';
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
    <div className="w-100 py-1">
      {/* Header bar */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Hồ sơ đánh giá lâm sàng (ICD-10)</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Quản lý hồ sơ khám bệnh, chẩn đoán xác định và kết luận bệnh án điện tử.
          </p>
        </div>
        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate('/doctor/console')}
            className="d-inline-flex align-items-center gap-2 rounded-pill px-3 fw-semibold text-nowrap"
          >
            <Stethoscope  size="1em"/> <span>Bàn khám bác sĩ</span>
          </Button>
          {canManageAssessments && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/medical-assessments/add')}
              className="d-inline-flex align-items-center gap-2 rounded-pill px-3 fw-semibold text-white text-nowrap"
              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
            >
              <Plus  size="1em"/> <span>Thêm đánh giá</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <LucideSearch className="bms-search-icon"  size="1em"/>
          <input
            type="text"
            placeholder="Tìm theo mã đánh giá, tên bệnh nhân, mã ICD-10..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="bms-search-clear"
              onClick={() => setSearchTerm('')}
              title="Xóa tìm kiếm"
            >
              <LucideX size={12} />
            </button>
          )}
        </div>

        <Form.Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Draft">Bản nháp</option>
          <option value="Finalized">Đã hoàn tất (Đã khóa)</option>
        </Form.Select>

        {(searchTerm || statusFilter) && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
            }}
          >
            Đặt lại
          </Button>
        )}

        <span className="bms-filter-meta">
          Hiển thị <strong>{assessments.length}</strong> / {totalCount} hồ sơ
        </span>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="shadow-sm">
          {errorMsg}
        </Alert>
      )}

      {/* Standalone Data Table */}
      <section className="bms-table-standalone-section">
        <div className="bms-table-standalone-header">
          <div>
            <h2 className="bms-table-standalone-title">Danh sách đánh giá y khoa</h2>
            <p className="bms-table-standalone-subtitle">Hồ sơ khám lâm sàng, phân loại mức độ bệnh và mã ICD-10</p>
          </div>
        </div>
        <div className="bms-table-standalone-body">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" variant="primary" />
              <p className="mt-2 mb-0 text-muted small">Đang tải dữ liệu đánh giá y khoa...</p>
            </div>
          ) : !Array.isArray(assessments) || assessments.length === 0 ? (
            <div className="text-center py-5">
              <Stethoscope className="text-muted fs-1 opacity-50 mb-3"  size="1em"/>
              <h6 className="text-secondary fw-bold">Chưa có bản ghi đánh giá y khoa nào</h6>
              <p className="text-muted small mb-3">
                Nhấn &quot;Thêm đánh giá&quot; để ghi nhận bệnh án và chẩn đoán ICD-10.
              </p>
              {canManageAssessments && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => navigate('/medical-assessments/add')}
                  className="rounded-pill px-3 text-nowrap"
                >
                  <Plus className="me-1"  size="1em"/> Tạo đánh giá ngay
                </Button>
              )}
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th className="ps-4 text-start">Mã đánh giá</th>
                  <th className="text-start">Bệnh nhân</th>
                  <th className="text-start">Lượt khám / Bác sĩ</th>
                  <th className="text-start">Chẩn đoán (ICD-10)</th>
                  <th className="text-center">Đánh giá nguy cơ</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-end">Thời gian khám</th>
                  <th className="text-center pe-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-4 text-start">
                      <span className="fw-bold font-monospace" style={{ color: '#1E60E6' }}>
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
                        <Badge bg="secondary-subtle" text="secondary" className="me-1 border rounded-pill">
                          {item.encounterType === 'ClinicVisit' ? 'Khám ngoại trú' : (item.encounterType || 'Khám bệnh')}
                        </Badge>
                        <small className="text-muted font-monospace">{item.encounterId}</small>
                      </div>
                      <small className="text-muted">BS: {item.doctorName}</small>
                    </td>
                    <td className="text-start">
                      <div className="d-flex align-items-center gap-1">
                        <Badge bg="primary-subtle" text="primary" className="font-monospace border border-primary-subtle rounded-pill">{item.icd10Code}</Badge>
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
                        <Badge bg="success-subtle" text="success" className="px-2.5 py-1 rounded-pill border border-success-subtle d-inline-flex align-items-center gap-1">
                          <Lock size={10} /> Đã khóa
                        </Badge>
                      ) : (
                        <Badge bg="warning-subtle" text="warning-emphasis" className="px-2.5 py-1 rounded-pill border border-warning-subtle d-inline-flex align-items-center gap-1">
                          <Clock size={10} /> Bản nháp
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
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-2.5 text-nowrap"
                          onClick={() => handleOpenDetail(item)}
                          title="Xem chi tiết"
                        >
                          <Eye  size="1em"/>
                        </Button>
                        {canManageAssessments && item.canEdit && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="rounded-pill px-2.5 text-nowrap"
                            onClick={() => navigate(`/medical-assessments/${item.id}/edit`)}
                            title="Chỉnh sửa"
                          >
                            <SquarePen  size="1em"/>
                          </Button>
                        )}
                        {canManageAssessments && item.canEdit && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill px-2.5 text-nowrap"
                            onClick={() => handleOpenDelete(item)}
                            title="Xóa mềm"
                          >
                            <Trash2  size="1em"/>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </section>

      {/* DETAIL INSPECTION MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        {selectedAssessment && (
          <>
            <Modal.Header closeButton style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
              <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
                <Stethoscope className="text-primary"  size="1em"/> Phiếu đánh giá y khoa lâm sàng: {selectedAssessment.assessmentCode}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body id="printable-assessment">
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
                  <HeartPulse  size="1em"/> Dấu Hiệu Sinh Tồn & Thể Trạng
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
                  <span className="fw-bold" style={{ color: '#1E60E6' }}>CHẨN ĐOÁN XÁC ĐỊNH & MÃ WHO ICD-10:</span>
                  <Badge className="fs-6 px-2.5 py-1 font-monospace rounded-pill" style={{ backgroundColor: '#1E60E6' }}>{selectedAssessment.icd10Code}</Badge>
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
                <Printer  size="1em"/> In Phiếu
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
          <Button variant="outline-secondary" className="rounded-pill px-3" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Hủy bỏ
          </Button>
          <Button variant="danger" className="rounded-pill px-3" onClick={handleConfirmDelete} disabled={deleting} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
            {deleting ? <Spinner size="sm" animation="border" /> : 'Xác nhận xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
