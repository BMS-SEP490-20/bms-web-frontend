/**
 * @file MedicalRecordPage.jsx
 * @description UC33 – Electronic Medical Records (EMR) Clinical Workspace.
 * Quản lý bệnh án điện tử, dấu hiệu sinh tồn, chẩn đoán WHO ICD-10 và phác đồ điều trị.
 * Tuân thủ quy định khóa sửa sau 24 giờ và giải trình xóa hồ sơ phục vụ kiểm toán y tế.
 * Conforms to: Rule 19, Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Row,
  Col,
  Table,
  Form,
  Spinner,
  Alert,
  Modal,
  InputGroup
} from 'react-bootstrap';
import {
  FaNotesMedical,
  FaHeartbeat,
  FaStethoscope,
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaSearch,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserInjured,
  FaUserMd,
  FaCalendarAlt,
  FaPrescriptionBottleAlt,
  FaVial
} from 'react-icons/fa';
import { medicalRecordApi } from '../api/medicalRecordApi';

// Common WHO ICD-10 Catalog for clinical diagnosis
const COMMON_ICD10 = [
  { code: 'E11.9', name: 'Đái tháo đường typ 2 không biến chứng' },
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
  { code: 'J00', name: 'Viêm mũi họng cấp (Cảm lạnh)' },
  { code: 'J20.9', name: 'Viêm phế quản cấp' },
  { code: 'K29.7', name: 'Viêm dạ dày tá tràng' },
  { code: 'A09', name: 'Tiêu chảy và viêm dạ dày - ruột nhiễm trùng' },
  { code: 'D50.9', name: 'Thiếu máu do thiếu sắt' },
  { code: 'E78.5', name: 'Rối loạn chuyển hóa lipid máu (Tăng mỡ máu)' },
  { code: 'M10.9', name: 'Bệnh Gút (Gout)' },
  { code: 'N39.0', name: 'Nhiễm trùng đường tiết niệu' },
  { code: 'R50.9', name: 'Sốt không rõ nguyên nhân' },
  { code: 'Z00.0', name: 'Khám sức khỏe tổng quát định kỳ' },
];

const ICD10_REGEX = /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/;

export default function MedicalRecordPage() {
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId') || searchParams.get('patientCode') || '';

  const canAddNotes = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user') || localStorage.getItem('user') || 'null');
      return (user?.role || user?.roleName || '').toLowerCase() === 'doctor';
    } catch { return false; }
  }, []);

  const [patientId, setPatientId] = useState(() => queryPatientId || 'PAT-261019-0005');
  const [searchPatientInput, setSearchPatientInput] = useState(() => queryPatientId || 'PAT-261019-0005');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Soft Delete Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Form State
  const initialForm = {
    chiefComplaint: '',
    clinicalSymptoms: '',
    heartRate: 75,
    systolicBp: 120,
    diastolicBp: 80,
    temperature: 36.5,
    spo2: 98,
    heightCm: 170,
    weightKg: 65,
    icd10Code: 'E11.9',
    icd10Name: 'Đái tháo đường typ 2 không biến chứng',
    diagnosis: '',
    treatmentPlan: '',
    prescriptionNotes: '',
  };

  const [form, setForm] = useState(initialForm);

  // Sync if queryPatientId changes
  useEffect(() => {
    if (queryPatientId) {
      setPatientId(queryPatientId);
      setSearchPatientInput(queryPatientId);
    }
  }, [queryPatientId]);

  // Auto-calculated BMI & Category
  const { bmi, bmiCategory, bmiColor } = useMemo(() => {
    const h = Number(form.heightCm);
    const w = Number(form.weightKg);
    if (!h || h <= 0 || !w || w <= 0) return { bmi: 0, bmiCategory: 'Chưa tính', bmiColor: 'secondary' };

    const hMeters = h / 100.0;
    const calculated = (w / (hMeters * hMeters)).toFixed(2);
    const numBmi = parseFloat(calculated);

    let cat = 'Bình thường';
    let color = 'success';
    if (numBmi < 18.5) {
      cat = 'Thiếu cân';
      color = 'info';
    } else if (numBmi <= 22.9) {
      cat = 'Bình thường';
      color = 'success';
    } else if (numBmi <= 24.9) {
      cat = 'Thừa cân';
      color = 'warning';
    } else {
      cat = 'Béo phì';
      color = 'danger';
    }

    return { bmi: calculated, bmiCategory: cat, bmiColor: color };
  }, [form.heightCm, form.weightKg]);

  // Blood pressure invariant check: Systolic > Diastolic + 15
  const bpValidation = useMemo(() => {
    const sys = Number(form.systolicBp);
    const dia = Number(form.diastolicBp);
    if (!sys || !dia) return { valid: true };

    if (sys <= dia + 15) {
      return {
        valid: false,
        message: 'Huyết áp tâm thu phải lớn hơn huyết áp tâm trương ít nhất 15 mmHg.',
      };
    }
    return { valid: true };
  }, [form.systolicBp, form.diastolicBp]);

  // Load medical records for current patient
  const fetchRecords = useCallback(async (pid) => {
    if (!pid || !pid.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await medicalRecordApi.getPatientRecords(pid.trim());
      const rawList = res?.data ?? res?.items ?? res;
      const list = Array.isArray(rawList)
        ? rawList
        : (Array.isArray(rawList?.items) ? rawList.items : []);

      setRecords(list);
      if (list.length > 0) {
        setSelectedRecord(list[0]);
      } else {
        setSelectedRecord(null);
      }
    } catch (err) {
      console.error('Failed to load patient records:', err);
      setErrorMsg(err.message || 'Không thể tải lịch sử bệnh án của bệnh nhân.');
      setRecords([]);
      setSelectedRecord(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords(patientId);
  }, [fetchRecords, patientId]);

  // Select a record from history list
  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  // Switch to Create New Mode
  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setForm(initialForm);
  };

  // Switch to Edit Mode
  const handleStartEdit = (record) => {
    if (!record.canEdit) {
      setErrorMsg('Hồ sơ bệnh án đã quá thời hạn 24 giờ kể từ thời điểm tạo, không thể chỉnh sửa.');
      return;
    }
    setIsEditing(true);
    setIsCreatingNew(false);
    setSelectedRecord(record);

    setForm({
      chiefComplaint: record.chiefComplaint || '',
      clinicalSymptoms: record.clinicalSymptoms || '',
      heartRate: record.vitals?.heartRate || 75,
      systolicBp: record.vitals?.systolicBp || 120,
      diastolicBp: record.vitals?.diastolicBp || 80,
      temperature: record.vitals?.temperature || 36.5,
      spo2: record.vitals?.spo2 || 98,
      heightCm: record.vitals?.heightCm || 170,
      weightKg: record.vitals?.weightKg || 65,
      icd10Code: record.icd10Code || 'E11.9',
      icd10Name: record.icd10Name || '',
      diagnosis: record.diagnosis || '',
      treatmentPlan: record.treatmentPlan || '',
      prescriptionNotes: record.prescriptionNotes || '',
    });
  };

  // Cancel edit or create
  const handleCancelForm = () => {
    setIsEditing(false);
    setIsCreatingNew(false);
    if (records.length > 0) {
      setSelectedRecord(records[0]);
    }
  };

  // Handle Form Submit (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!bpValidation.valid) {
      setErrorMsg(bpValidation.message);
      return;
    }

    const upperIcd = form.icd10Code.trim().toUpperCase();
    if (!ICD10_REGEX.test(upperIcd)) {
      setErrorMsg(`Mã ICD-10 "${upperIcd}" không đúng định dạng chuẩn WHO (Ví dụ: E11.9, I10).`);
      return;
    }

    setSubmitLoading(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    const payload = {
      patientId: patientId.trim(),
      chiefComplaint: form.chiefComplaint.trim(),
      clinicalSymptoms: form.clinicalSymptoms?.trim() || '',
      vitals: {
        heartRate: Number(form.heartRate),
        systolicBp: Number(form.systolicBp),
        diastolicBp: Number(form.diastolicBp),
        temperature: Number(form.temperature),
        spo2: Number(form.spo2),
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
      },
      icd10Code: upperIcd,
      icd10Name: form.icd10Name?.trim() || '',
      diagnosis: form.diagnosis.trim(),
      treatmentPlan: form.treatmentPlan?.trim() || '',
      prescriptionNotes: form.prescriptionNotes?.trim() || '',
    };

    try {
      if (isCreatingNew) {
        const created = await medicalRecordApi.createRecord(payload);
        setFeedbackMsg(`Tạo bệnh án thành công! Mã bệnh án: ${created.recordCode || created.id}`);
        setIsCreatingNew(false);
        await fetchRecords(patientId);
      } else if (isEditing && selectedRecord) {
        const updated = await medicalRecordApi.updateRecord(selectedRecord.id, payload);
        setFeedbackMsg(`Cập nhật bệnh án ${updated.recordCode || selectedRecord.recordCode} thành công!`);
        setIsEditing(false);
        await fetchRecords(patientId);
      }
    } catch (err) {
      console.error('Error saving medical record:', err);
      setErrorMsg(err.message || 'Lỗi khi lưu bệnh án điện tử.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Soft Delete Record Confirmation
  const handleDeleteConfirm = async () => {
    if (!recordToDelete || deleteReason.trim().length < 15) {
      setErrorMsg('Lý do xóa bắt buộc tối thiểu 15 ký tự theo quy định kiểm toán y tế.');
      return;
    }

    setSubmitLoading(true);
    setErrorMsg(null);
    try {
      await medicalRecordApi.deleteRecord(recordToDelete.id, deleteReason.trim());
      setFeedbackMsg(`Đã xóa bệnh án ${recordToDelete.recordCode} thành công.`);
      setShowDeleteModal(false);
      setRecordToDelete(null);
      setDeleteReason('');
      await fetchRecords(patientId);
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMsg(err.message || 'Không thể xóa hồ sơ bệnh án.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4 px-lg-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-white p-3 rounded-4 shadow-sm border" style={{ borderColor: '#E5E9EB' }}>
        <div>
          <h3 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color: '#5E85E6' }}>
            <FaNotesMedical /> Phân Hệ Bệnh Án Điện Tử (EMR Workspace)
          </h3>
          <p className="small text-muted mb-0">
            Quản lý hồ sơ bệnh án, dấu hiệu sinh tồn, chẩn đoán ICD-10 và phác đồ điều trị lâm sàng.
          </p>
        </div>

        {/* Patient Code Search Bar & Create Button */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <InputGroup size="sm" style={{ width: '280px' }}>
            <InputGroup.Text className="bg-white"><FaUserInjured style={{ color: '#5E85E6' }} /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Nhập mã bệnh nhân (PAT-...)"
              value={searchPatientInput}
              onChange={(e) => setSearchPatientInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPatientId(searchPatientInput.trim());
                  setIsCreatingNew(false);
                  setIsEditing(false);
                }
              }}
            />
            <Button
              variant="primary"
              style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6' }}
              onClick={() => {
                setPatientId(searchPatientInput.trim());
                setIsCreatingNew(false);
                setIsEditing(false);
              }}
            >
              <FaSearch />
            </Button>
          </InputGroup>

          <Button
            size="sm"
            className="d-flex align-items-center gap-2 fw-semibold text-white px-3 shadow-sm"
            style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6', borderRadius: '9999px' }}
            onClick={handleStartCreate}
          >
            <FaPlus /> Tạo Bệnh Án Mới
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {feedbackMsg && (
        <Alert variant="success" dismissible onClose={() => setFeedbackMsg(null)} className="py-2 mb-3 shadow-sm">
          <FaCheckCircle className="me-2" />
          {feedbackMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="py-2 mb-3 shadow-sm">
          <FaExclamationTriangle className="me-2" />
          {errorMsg}
        </Alert>
      )}

      <Row className="g-4">
        {/* Left Column: Patient Medical History Timeline */}
        <Col lg={4}>
          <Card className="shadow-sm rounded-4 h-100 overflow-hidden" style={{ border: '1px solid #E5E9EB' }}>
            <Card.Header className="bg-light py-3 px-3 d-flex justify-content-between align-items-center border-bottom" style={{ borderColor: '#E5E9EB' }}>
              <div>
                <h6 className="fw-bold mb-0 text-dark">Lịch Sử Bệnh Án</h6>
                <small className="text-muted">Bệnh nhân: <strong className="font-monospace" style={{ color: '#5E85E6' }}>{patientId}</strong></small>
              </div>
              <Badge className="rounded-pill px-3 py-1.5" style={{ backgroundColor: '#5E85E6' }}>
                {records.length} Hồ sơ
              </Badge>
            </Card.Header>

            <Card.Body className="p-2 overflow-auto" style={{ maxHeight: '720px' }}>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" style={{ color: '#5E85E6' }} />
                  <div className="small text-muted mt-2">Đang tải hồ sơ bệnh án...</div>
                </div>
              ) : !Array.isArray(records) || records.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div className="fs-3 mb-2">📋</div>
                  <div className="fw-semibold">Chưa có hồ sơ bệnh án</div>
                  <div className="small">Bệnh nhân chưa có lịch sử khám nào tại cơ sở y tế.</div>
                </div>
              ) : (
                records.map((r) => {
                  const isSelected = selectedRecord?.id === r.id && !isCreatingNew;
                  const dateStr = r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRecord(r)}
                      className={`p-3 mb-2 rounded-4 border transition-all cursor-pointer ${
                        isSelected
                          ? 'shadow-sm'
                          : 'bg-white hover-bg-light'
                      }`}
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? '#5E85E6' : '#E5E9EB',
                        backgroundColor: isSelected ? 'rgba(94, 133, 230, 0.08)' : undefined
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold font-monospace small" style={{ color: '#5E85E6' }}>
                          {r.recordCode || r.id}
                        </span>
                        {r.canEdit ? (
                          <Badge className="small rounded-pill text-white" style={{ backgroundColor: '#16a34a' }}>
                            Có thể sửa
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="small rounded-pill d-flex align-items-center gap-1">
                            <FaLock size={10} /> Đã khóa sau 24h
                          </Badge>
                        )}
                      </div>

                      <div className="fw-semibold text-dark mb-1 small text-truncate">
                        {r.diagnosis || r.chiefComplaint}
                      </div>

                      <div className="d-flex justify-content-between align-items-center small text-muted">
                        <span>
                          <FaCalendarAlt className="me-1" />
                          {dateStr}
                        </span>
                        <Badge bg="light" text="dark" className="border rounded-pill font-monospace">
                          ICD: {r.icd10Code}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: EMR Detail Viewer or Form Editor */}
        <Col lg={8}>
          {isCreatingNew || isEditing ? (
            /* CREATE / EDIT FORM */
            <Card className="shadow-sm rounded-4 overflow-hidden" style={{ border: '1px solid #E5E9EB' }}>
              <Card.Header className="text-white py-3 px-4 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#5E85E6' }}>
                <span className="fw-bold text-uppercase fs-6">
                  {isCreatingNew ? 'Tạo Bệnh Án Điện Tử Mới' : `Chỉnh Sửa Bệnh Án #${selectedRecord?.recordCode}`}
                </span>
                <Button variant="light" size="sm" style={{ borderRadius: '9999px' }} onClick={handleCancelForm}>
                  Hủy bỏ
                </Button>
              </Card.Header>

              <Card.Body className="p-4">
                <Form onSubmit={handleSubmitForm}>
                  {/* Chief Complaint */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">
                      1. Lý do vào khám & Diễn biến cơ năng (S - Bệnh sử) <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ví dụ: Đau đầu kéo dài 3 ngày kèm sốt nhẹ, mệt mỏi..."
                      value={form.chiefComplaint}
                      onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                      required
                    />
                  </Form.Group>

                  {/* Clinical Symptoms */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">
                      2. Triệu chứng lâm sàng & Thăm khám thực thể (O - Khám thực thể)
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Ghi nhận triệu chứng cơ năng, thực thể của bệnh nhân..."
                      value={form.clinicalSymptoms}
                      onChange={(e) => setForm({ ...form, clinicalSymptoms: e.target.value })}
                    />
                  </Form.Group>

                  {/* Vitals Box with Clinical Ranges */}
                  <div className="p-3 rounded-4 mb-4 border" style={{ backgroundColor: '#F1F4F7', borderColor: '#E5E9EB' }}>
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: '#5E85E6' }}>
                      <FaHeartbeat /> Dấu Hiệu Sinh Tồn & Chỉ Số BMI
                    </h6>

                    {!bpValidation.valid && (
                      <Alert variant="danger" className="py-2 small mb-3">
                        <FaExclamationTriangle className="me-1" />
                        {bpValidation.message}
                      </Alert>
                    )}

                    <Row className="g-3">
                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Mạch (Nhịp tim)</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            min={30}
                            max={250}
                            value={form.heartRate}
                            onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
                            required
                          />
                          <InputGroup.Text>bpm</InputGroup.Text>
                        </InputGroup>
                      </Col>

                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Huyết áp tâm thu</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            min={60}
                            max={260}
                            value={form.systolicBp}
                            onChange={(e) => setForm({ ...form, systolicBp: e.target.value })}
                            required
                          />
                          <InputGroup.Text>mmHg</InputGroup.Text>
                        </InputGroup>
                      </Col>

                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Huyết áp tâm trương</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            min={40}
                            max={150}
                            value={form.diastolicBp}
                            onChange={(e) => setForm({ ...form, diastolicBp: e.target.value })}
                            required
                          />
                          <InputGroup.Text>mmHg</InputGroup.Text>
                        </InputGroup>
                      </Col>

                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Thân nhiệt</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            step="0.1"
                            min={34.0}
                            max={43.0}
                            value={form.temperature}
                            onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                            required
                          />
                          <InputGroup.Text>°C</InputGroup.Text>
                        </InputGroup>
                      </Col>

                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">SpO2</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            min={50}
                            max={100}
                            value={form.spo2}
                            onChange={(e) => setForm({ ...form, spo2: e.target.value })}
                            required
                          />
                          <InputGroup.Text>%</InputGroup.Text>
                        </InputGroup>
                      </Col>

                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Chiều cao</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            min={20}
                            max={250}
                            value={form.heightCm}
                            onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                            required
                          />
                          <InputGroup.Text>cm</InputGroup.Text>
                        </InputGroup>
                      </Col>

                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Cân nặng</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            step="0.5"
                            min={1}
                            max={300}
                            value={form.weightKg}
                            onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                            required
                          />
                          <InputGroup.Text>kg</InputGroup.Text>
                        </InputGroup>
                      </Col>

                      {/* Automated BMI Display */}
                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Chỉ số BMI (Tự động)</Form.Label>
                        <div className="d-flex align-items-center gap-2 pt-1">
                          <span className="fw-bold fs-6 text-dark font-monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>{bmi}</span>
                          <Badge bg={bmiColor} className="small rounded-pill">
                            {bmiCategory}
                          </Badge>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* ICD-10 Code & Disease Name */}
                  <Row className="g-3 mb-3">
                    <Col md={5}>
                      <Form.Label className="small fw-bold text-secondary">
                        Mã chẩn đoán ICD-10 <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={form.icd10Code}
                        onChange={(e) => {
                          const selected = COMMON_ICD10.find((x) => x.code === e.target.value);
                          setForm({
                            ...form,
                            icd10Code: e.target.value,
                            icd10Name: selected ? selected.name : form.icd10Name,
                          });
                        }}
                        required
                      >
                        {COMMON_ICD10.map((icd) => (
                          <option key={icd.code} value={icd.code}>
                            {icd.code} - {icd.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    <Col md={7}>
                      <Form.Label className="small fw-bold text-secondary">Tên bệnh lý theo chuẩn WHO</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.icd10Name}
                        onChange={(e) => setForm({ ...form, icd10Name: e.target.value })}
                        required
                      />
                    </Col>
                  </Row>

                  {/* Diagnosis */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">
                      3. Chẩn đoán xác định của Bác sĩ (A - Chẩn đoán ICD-10) <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Chẩn đoán xác định bệnh..."
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      required
                    />
                  </Form.Group>

                  {/* Treatment Plan */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">4. Hướng xử trí & Phác đồ điều trị (P - Kế hoạch)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Chỉ định xét nghiệm máu, theo dõi chế độ ăn..."
                      value={form.treatmentPlan}
                      onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
                    />
                  </Form.Group>

                  {/* Prescription Notes */}
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold text-secondary">5. Đơn thuốc & Tư vấn dặn dò (E - Đánh giá & Hẹn khám)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Đơn thuốc ngoại trú hoặc lưu ý uống thuốc..."
                      value={form.prescriptionNotes}
                      onChange={(e) => setForm({ ...form, prescriptionNotes: e.target.value })}
                    />
                  </Form.Group>

                  <div className="d-flex justify-content-end gap-2 pt-2 border-top" style={{ borderColor: '#E5E9EB' }}>
                    <Button variant="secondary" style={{ borderRadius: '9999px' }} onClick={handleCancelForm}>
                      Hủy bỏ
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={submitLoading || !bpValidation.valid}
                      className="px-4 fw-bold shadow-sm"
                      style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6', borderRadius: '9999px' }}
                    >
                      {submitLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Đang lưu hồ sơ...
                        </>
                      ) : (
                        'Lưu Bệnh Án'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          ) : selectedRecord ? (
            /* RECORD DETAIL VIEWER */
            <Card className="shadow-sm rounded-4 overflow-hidden" style={{ border: '1px solid #E5E9EB' }}>
              <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom flex-wrap gap-2" style={{ borderColor: '#E5E9EB' }}>
                <div>
                  <span className="small text-muted text-uppercase fw-bold">Chi Tiết Bệnh Án</span>
                  <div className="h4 fw-bold font-monospace mb-0" style={{ color: '#5E85E6' }}>
                    {selectedRecord.recordCode || selectedRecord.id}
                  </div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  {/* Direct Clinical Shortcut: Chỉ định xét nghiệm */}
                  <Button
                    as={Link}
                    to={`/doctor/orders/create?patientId=${encodeURIComponent(patientId)}&patientName=${encodeURIComponent(selectedRecord?.patientName || '')}`}
                    variant="primary"
                    size="sm"
                    className="d-flex align-items-center gap-1 shadow-sm"
                    style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6', borderRadius: '9999px' }}
                  >
                    <FaVial /> Chỉ Định Xét Nghiệm
                  </Button>

                  {/* Direct Clinical Shortcut: Ghi chú y khoa tiến trình */}
                  {canAddNotes && (
                    <Button
                      as={Link}
                      variant="outline-primary"
                      size="sm"
                      to={`/doctor/medical-notes?recordId=${encodeURIComponent(selectedRecord.id)}`}
                      className="d-flex align-items-center gap-1"
                      style={{ borderRadius: '9999px' }}
                    >
                      <FaNotesMedical /> Ghi Chú Y Khoa
                    </Button>
                  )}

                  {selectedRecord.canEdit ? (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      style={{ borderRadius: '9999px' }}
                      onClick={() => handleStartEdit(selectedRecord)}
                    >
                      <FaEdit /> Sửa Bệnh Án
                    </Button>
                  ) : (
                    <Badge bg="secondary" className="px-3 py-2 d-flex align-items-center gap-1 rounded-pill">
                      <FaLock /> Đã Khóa Sau 24h
                    </Badge>
                  )}

                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '9999px' }}
                    onClick={() => {
                      setRecordToDelete(selectedRecord);
                      setShowDeleteModal(true);
                    }}
                  >
                    <FaTrashAlt /> Hủy / Xóa
                  </Button>
                </div>
              </Card.Header>

              <Card.Body className="p-4">
                {/* Meta header */}
                <Row className="g-3 mb-4 p-3 rounded-4 border" style={{ backgroundColor: '#F1F4F7', borderColor: '#E5E9EB' }}>
                  <Col sm={6}>
                    <div className="small text-muted">Bệnh nhân</div>
                    <div className="fw-bold fs-5 text-dark">
                      <FaUserInjured className="me-2" style={{ color: '#5E85E6' }} />
                      {selectedRecord.patientName || 'Bệnh nhân'} ({selectedRecord.patientId})
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Bác sĩ khám</div>
                    <div className="fw-bold fs-6 text-dark">
                      <FaUserMd className="text-success me-2" />
                      {selectedRecord.doctorName || 'BS. Chuyên Khoa'}
                    </div>
                    <div className="small text-muted">
                      Thời điểm khám:{' '}
                      {selectedRecord.createdAt
                        ? new Date(selectedRecord.createdAt).toLocaleString('vi-VN')
                        : '—'}
                    </div>
                  </Col>
                </Row>

                {/* Vitals summary cards */}
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: '#5E85E6' }}>
                  <FaHeartbeat /> Dấu Hiệu Sinh Tồn Đo Được
                </h6>

                <Row className="g-3 mb-4">
                  <Col md={3} sm={6}>
                    <div className="border rounded-4 p-3 text-center bg-white shadow-xs" style={{ borderColor: '#E5E9EB' }}>
                      <div className="small text-muted">Mạch (Nhịp tim)</div>
                      <div className="fs-4 fw-bold font-monospace" style={{ color: '#5E85E6', fontVariantNumeric: 'tabular-nums' }}>
                        {selectedRecord.vitals?.heartRate ?? '—'} <small className="fs-6 text-muted">bpm</small>
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="border rounded-4 p-3 text-center bg-white shadow-xs" style={{ borderColor: '#E5E9EB' }}>
                      <div className="small text-muted">Huyết Áp</div>
                      <div className="fs-4 fw-bold text-dark font-monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {selectedRecord.vitals?.systolicBp ?? '—'}/{selectedRecord.vitals?.diastolicBp ?? '—'}{' '}
                        <small className="fs-6 text-muted">mmHg</small>
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="border rounded-4 p-3 text-center bg-white shadow-xs" style={{ borderColor: '#E5E9EB' }}>
                      <div className="small text-muted">Thân Nhiệt & SpO2</div>
                      <div className="fs-4 fw-bold text-dark font-monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {selectedRecord.vitals?.temperature ?? '—'}°C | {selectedRecord.vitals?.spo2 ?? '—'}%
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="border rounded-4 p-3 text-center bg-white shadow-xs" style={{ borderColor: '#E5E9EB' }}>
                      <div className="small text-muted">Chỉ số BMI</div>
                      <div className="fs-4 fw-bold text-success font-monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {selectedRecord.vitals?.bmi ?? '—'}{' '}
                        {selectedRecord.vitals?.bmiCategory && (
                          <Badge bg="success" className="fs-7 fw-normal ms-1 rounded-pill">
                            {selectedRecord.vitals.bmiCategory}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* Diagnosis and ICD-10 */}
                <div className="mb-4">
                  <h6 className="fw-bold text-secondary text-uppercase small mb-2">Chẩn Đoán Bệnh</h6>
                  <div className="p-3 rounded-4 border" style={{ backgroundColor: '#F1F4F7', borderColor: '#E5E9EB' }}>
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                      <Badge className="font-monospace fs-6 px-3 py-1.5 rounded-pill text-white" style={{ backgroundColor: '#5E85E6' }}>
                        ICD-10: {selectedRecord.icd10Code}
                      </Badge>
                      <span className="fw-semibold text-dark">{selectedRecord.icd10Name}</span>
                    </div>
                    <div className="fs-5 fw-bold text-dark">{selectedRecord.diagnosis}</div>
                  </div>
                </div>

                {/* Chief Complaint & Symptoms */}
                <div className="mb-4">
                  <h6 className="fw-bold text-secondary text-uppercase small mb-2">Lý Do Khám & Triệu Chứng</h6>
                  <p className="mb-1">
                    <strong>Lý do vào khám:</strong> {selectedRecord.chiefComplaint}
                  </p>
                  {selectedRecord.clinicalSymptoms && (
                    <p className="text-muted mb-0">
                      <strong>Triệu chứng lâm sàng:</strong> {selectedRecord.clinicalSymptoms}
                    </p>
                  )}
                </div>

                {/* Treatment plan & prescription */}
                <Row className="g-3">
                  <Col md={6}>
                    <div className="border rounded-4 p-3 h-100 bg-white" style={{ borderColor: '#E5E9EB' }}>
                      <h6 className="fw-bold text-secondary mb-2 d-flex align-items-center gap-2">
                        <FaStethoscope style={{ color: '#5E85E6' }} /> Hướng Xử Trí & Phác Đồ
                      </h6>
                      <p className="text-dark mb-0 small">
                        {selectedRecord.treatmentPlan || 'Theo dõi định kỳ theo chỉ định.'}
                      </p>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="border rounded-4 p-3 h-100 bg-white" style={{ borderColor: '#E5E9EB' }}>
                      <h6 className="fw-bold text-secondary mb-2 d-flex align-items-center gap-2">
                        <FaPrescriptionBottleAlt style={{ color: '#16a34a' }} /> Đơn Thuốc & Dặn Dò
                      </h6>
                      <p className="text-dark mb-0 small">
                        {selectedRecord.prescriptionNotes || 'Tái khám sau 1 tuần hoặc khi có dấu hiệu bất thường.'}
                      </p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ) : (
            <Card className="shadow-sm rounded-4 text-center py-5" style={{ border: '1px solid #E5E9EB' }}>
              <div className="display-1 text-muted opacity-25 mb-3">
                <FaNotesMedical />
              </div>
              <h5 className="fw-bold text-secondary mb-2">Chưa chọn hồ sơ bệnh án</h5>
              <p className="text-muted small mb-4">
                Chọn một hồ sơ bệnh án từ danh sách bên trái hoặc nhấn &quot;Tạo Bệnh Án Mới&quot; để bắt đầu phiên khám bệnh.
              </p>
              <div>
                <Button
                  variant="primary"
                  onClick={handleStartCreate}
                  style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6', borderRadius: '9999px' }}
                  className="shadow-sm"
                >
                  <FaPlus className="me-2" /> Tạo Bệnh Án Mới
                </Button>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* Soft Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold" style={{ color: '#dc2626' }}>Hủy / Xóa Hồ Sơ Bệnh Án</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-3">
            Theo quy định bảo mật và toàn vẹn dữ liệu y tế, hồ sơ bệnh án chỉ được xóa mềm và bắt buộc phải giải trình lý do rõ ràng vào hệ thống kiểm toán (Audit Logs).
          </p>

          <Form.Group>
            <Form.Label className="small fw-semibold text-secondary">
              Lý do xóa / hủy bệnh án <span className="text-danger">*</span> (Tối thiểu 15 ký tự):
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Nhập giải trình lý do hủy hồ sơ bệnh án (tối thiểu 15 ký tự)..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              required
            />
            <div className="text-end small text-muted mt-1">
              Đã nhập: {deleteReason.trim().length}/15 ký tự
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" style={{ borderRadius: '9999px' }} onClick={() => setShowDeleteModal(false)}>
            Hủy Bỏ
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteConfirm}
            disabled={submitLoading || deleteReason.trim().length < 15}
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', borderRadius: '9999px' }}
          >
            {submitLoading ? 'Đang xử lý...' : 'Xác Nhận Xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
