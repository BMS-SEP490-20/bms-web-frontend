/**
 * @file MedicalRecordPage.jsx
 * @description UC33 – Electronic Medical Records (EMR) Clinical Workspace.
 * Full CRUD for medical records conforming to ISO 15189, Ministry of Health and WHO ICD-10 standards.
 * Features automated BMI calculation, blood pressure validation, ICD-10 autocomplete,
 * 24-hour edit lock enforcement, and audit-compliant soft deletion.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FaWeight,
  FaRulerVertical,
  FaThermometerHalf,
  FaLungs,
  FaPrescriptionBottleAlt
} from 'react-icons/fa';
import { medicalRecordApi } from '../api/medicalRecordApi';

// Common WHO ICD-10 Catalog for clinical auto-complete
const COMMON_ICD10 = [
  { code: 'E11', name: 'Đái tháo đường typ 2 (Type 2 diabetes mellitus)' },
  { code: 'I10', name: 'Tăng huyết áp vô căn (Essential hypertension)' },
  { code: 'J00', name: 'Viêm mũi họng cấp / Cảm lạnh (Acute nasopharyngitis)' },
  { code: 'J20', name: 'Viêm phế quản cấp (Acute bronchitis)' },
  { code: 'K29', name: 'Viêm dạ dày và tá tràng (Gastritis and duodenitis)' },
  { code: 'A09', name: 'Tiêu chảy và viêm dạ dày - ruột nhiễm trùng' },
  { code: 'D50', name: 'Thiếu máu do thiếu sắt (Iron deficiency anaemia)' },
  { code: 'E78', name: 'Rối loạn chuyển hóa lipoprotein và lipid máu (Dyslipidemia)' },
  { code: 'M10', name: 'Bệnh Gút (Gout)' },
  { code: 'N39', name: 'Rối loạn hệ tiết niệu (Disorders of urinary system)' },
  { code: 'R50', name: 'Sốt không rõ nguyên nhân (Fever of other and unknown origin)' },
  { code: 'Z00', name: 'Khám sức khỏe tổng quát (General examination)' },
];

export default function MedicalRecordPage() {
  const [patientId, setPatientId] = useState('PAT-261019-0005');
  const [searchPatientInput, setSearchPatientInput] = useState('PAT-261019-0005');
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
    icd10Code: 'E11',
    icd10Name: 'Đái tháo đường typ 2 (Type 2 diabetes mellitus)',
    diagnosis: '',
    treatmentPlan: '',
    prescriptionNotes: '',
  };

  const [form, setForm] = useState(initialForm);

  // Auto-calculated BMI & Category
  const { bmi, bmiCategory, bmiColor } = useMemo(() => {
    const h = Number(form.heightCm);
    const w = Number(form.weightKg);
    if (!h || h <= 0 || !w || w <= 0) return { bmi: 0, bmiCategory: 'N/A', bmiColor: 'secondary' };

    const hMeters = h / 100.0;
    const calculated = (w / (hMeters * hMeters)).toFixed(2);
    const numBmi = parseFloat(calculated);

    let cat = 'Bình thường';
    let color = 'success';
    if (numBmi < 18.5) {
      cat = 'Thiếu cân (Underweight)';
      color = 'info';
    } else if (numBmi <= 22.9) {
      cat = 'Bình thường (Normal)';
      color = 'success';
    } else if (numBmi <= 24.9) {
      cat = 'Thừa cân (Overweight)';
      color = 'warning';
    } else {
      cat = 'Béo phì (Obese)';
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
    if (!pid) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await medicalRecordApi.getPatientRecords(pid);
      const list = res.data || res || [];
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
      icd10Code: record.icd10Code || 'E11',
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

    setSubmitLoading(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    const payload = {
      patientId,
      chiefComplaint: form.chiefComplaint,
      clinicalSymptoms: form.clinicalSymptoms,
      vitals: {
        heartRate: Number(form.heartRate),
        systolicBp: Number(form.systolicBp),
        diastolicBp: Number(form.diastolicBp),
        temperature: Number(form.temperature),
        spo2: Number(form.spo2),
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
      },
      icd10Code: form.icd10Code.trim().toUpperCase(),
      icd10Name: form.icd10Name,
      diagnosis: form.diagnosis,
      treatmentPlan: form.treatmentPlan,
      prescriptionNotes: form.prescriptionNotes,
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
      setErrorMsg(err.message || 'Lỗi khi lưu bệnh án.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Soft Delete Record Confirmation
  const handleDeleteConfirm = async () => {
    if (!recordToDelete || deleteReason.trim().length < 15) {
      setErrorMsg('Lý do xóa bắt buộc tối thiểu 15 ký tự.');
      return;
    }

    setSubmitLoading(true);
    setErrorMsg(null);
    try {
      await medicalRecordApi.deleteRecord(recordToDelete.id, deleteReason);
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
    <div className="container-fluid py-4 px-lg-4">
      {/* Header bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-white p-3 rounded-3 shadow-sm border">
        <div>
          <h3 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
            <FaNotesMedical /> Phân Hệ Bệnh Án Điện Tử (EMR Workspace)
          </h3>
          <p className="small text-muted mb-0">
            Quản lý hồ sơ bệnh án, dấu hiệu sinh tồn, chẩn đoán ICD-10 và phác đồ điều trị lâm sàng.
          </p>
        </div>

        {/* Patient Code Search Bar */}
        <div className="d-flex align-items-center gap-2">
          <InputGroup size="sm" style={{ width: '260px' }}>
            <InputGroup.Text><FaUserInjured className="text-primary" /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Nhập mã bệnh nhân..."
              value={searchPatientInput}
              onChange={(e) => setSearchPatientInput(e.target.value)}
            />
            <Button
              variant="primary"
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
            variant="success"
            size="sm"
            className="d-flex align-items-center gap-2 fw-semibold text-white px-3"
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
          <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
            <Card.Header className="bg-light py-3 px-3 d-flex justify-content-between align-items-center border-bottom">
              <div>
                <h6 className="fw-bold mb-0 text-dark">Lịch Sử Khám ({records.length})</h6>
                <small className="text-muted">Mã: {patientId}</small>
              </div>
              <Badge bg="primary" className="rounded-pill px-2.5">
                {records.length} Hồ sơ
              </Badge>
            </Card.Header>

            <Card.Body className="p-2 overflow-auto" style={{ maxHeight: '720px' }}>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <div className="small text-muted mt-2">Đang tải hồ sơ bệnh án...</div>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div className="fs-3 mb-2">📋</div>
                  <div className="fw-semibold">Chưa có hồ sơ bệnh án</div>
                  <div className="small">Bệnh nhân chưa có lịch sử khám nào tại viện.</div>
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
                    : 'N/A';

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRecord(r)}
                      className={`p-3 mb-2 rounded-3 border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary bg-opacity-10 shadow-sm'
                          : 'bg-white hover-bg-light'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold font-monospace text-primary small">
                          {r.recordCode}
                        </span>
                        {r.canEdit ? (
                          <Badge bg="success" className="small">
                            Có thể sửa
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="small d-flex align-items-center gap-1">
                            <FaLock size={10} /> Đã khóa (24h)
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
                        <Badge bg="light" text="dark" className="border">
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
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
              <Card.Header className="bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-uppercase fs-6">
                  {isCreatingNew ? 'Tạo Bệnh Án Điện Tử Mới' : `Chỉnh Sửa Bệnh Án #${selectedRecord?.recordCode}`}
                </span>
                <Button variant="light" size="sm" onClick={handleCancelForm}>
                  Hủy bỏ
                </Button>
              </Card.Header>

              <Card.Body className="p-4">
                <Form onSubmit={handleSubmitForm}>
                  {/* Chief Complaint */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">
                      Lý do vào khám (Chief Complaint) <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ví dụ: Đau đầu kéo dài 3 ngày kèm sốt nhẹ..."
                      value={form.chiefComplaint}
                      onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                      required
                    />
                  </Form.Group>

                  {/* Clinical Symptoms */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">
                      Triệu chứng lâm sàng & Tiền sử bệnh
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Ghi nhận triệu chứng cơ năng, thực thể..."
                      value={form.clinicalSymptoms}
                      onChange={(e) => setForm({ ...form, clinicalSymptoms: e.target.value })}
                    />
                  </Form.Group>

                  {/* Vitals Box with Clinical Ranges */}
                  <div className="p-3 bg-light rounded-3 mb-4 border">
                    <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                      <FaHeartbeat /> Dấu Hiệu Sinh Tồn (Vital Signs & BMI)
                    </h6>

                    {!bpValidation.valid && (
                      <Alert variant="danger" className="py-2 small mb-3">
                        <FaExclamationTriangle className="me-1" />
                        {bpValidation.message}
                      </Alert>
                    )}

                    <Row className="g-3">
                      <Col md={3} sm={6}>
                        <Form.Label className="small fw-semibold text-secondary">Mạch (Heart Rate)</Form.Label>
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
                        <Form.Label className="small fw-semibold text-secondary">Tâm thu (Systolic)</Form.Label>
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
                        <Form.Label className="small fw-semibold text-secondary">Tâm trương (Diastolic)</Form.Label>
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
                        <Form.Label className="small fw-semibold text-secondary">Thân nhiệt (Temp)</Form.Label>
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
                          <span className="fw-bold fs-6 text-dark font-monospace">{bmi}</span>
                          <Badge bg={bmiColor} className="small">
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
                      Chẩn đoán xác định của Bác sĩ <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Chẩn đoán xác định..."
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      required
                    />
                  </Form.Group>

                  {/* Treatment Plan */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">Hướng xử trí & Phác đồ điều trị</Form.Label>
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
                    <Form.Label className="small fw-bold text-secondary">Đơn thuốc & Dặn dò bệnh nhân</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Đơn thuốc ngoại trú hoặc lưu ý uống thuốc..."
                      value={form.prescriptionNotes}
                      onChange={(e) => setForm({ ...form, prescriptionNotes: e.target.value })}
                    />
                  </Form.Group>

                  <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                    <Button variant="secondary" onClick={handleCancelForm}>
                      Hủy bỏ
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={submitLoading || !bpValidation.valid}
                      className="px-4 fw-bold"
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
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
              <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                <div>
                  <span className="small text-muted text-uppercase fw-bold">Chi Tiết Bệnh Án</span>
                  <div className="h4 fw-bold text-primary font-monospace mb-0">
                    {selectedRecord.recordCode}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  {selectedRecord.canEdit ? (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="d-flex align-items-center gap-2"
                      onClick={() => handleStartEdit(selectedRecord)}
                    >
                      <FaEdit /> Sửa Bệnh Án
                    </Button>
                  ) : (
                    <Badge bg="secondary" className="px-3 py-2 d-flex align-items-center gap-1">
                      <FaLock /> Đã Khóa Sau 24h
                    </Badge>
                  )}

                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="d-flex align-items-center gap-2"
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
                <Row className="g-3 mb-4 p-3 bg-light rounded-3 border">
                  <Col sm={6}>
                    <div className="small text-muted">Bệnh nhân</div>
                    <div className="fw-bold fs-5 text-dark">
                      <FaUserInjured className="text-primary me-2" />
                      {selectedRecord.patientName} ({selectedRecord.patientId})
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Bác sĩ khám</div>
                    <div className="fw-bold fs-6 text-dark">
                      <FaUserMd className="text-success me-2" />
                      {selectedRecord.doctorName}
                    </div>
                    <div className="small text-muted">
                      Thời điểm khám:{' '}
                      {selectedRecord.createdAt
                        ? new Date(selectedRecord.createdAt).toLocaleString('vi-VN')
                        : 'N/A'}
                    </div>
                  </Col>
                </Row>

                {/* Vitals summary cards */}
                <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                  <FaHeartbeat /> Dấu Hiệu Sinh Tồn Đo Được
                </h6>

                <Row className="g-3 mb-4">
                  <Col md={3} sm={6}>
                    <div className="border rounded-3 p-3 text-center bg-white shadow-xs">
                      <div className="small text-muted">Mạch (Heart Rate)</div>
                      <div className="fs-4 fw-bold text-primary font-monospace">
                        {selectedRecord.vitals?.heartRate} <small className="fs-6 text-muted">bpm</small>
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="border rounded-3 p-3 text-center bg-white shadow-xs">
                      <div className="small text-muted">Huyết Áp</div>
                      <div className="fs-4 fw-bold text-dark font-monospace">
                        {selectedRecord.vitals?.systolicBp}/{selectedRecord.vitals?.diastolicBp}{' '}
                        <small className="fs-6 text-muted">mmHg</small>
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="border rounded-3 p-3 text-center bg-white shadow-xs">
                      <div className="small text-muted">Thân Nhiệt & SpO2</div>
                      <div className="fs-4 fw-bold text-dark font-monospace">
                        {selectedRecord.vitals?.temperature}°C | {selectedRecord.vitals?.spo2}%
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="border rounded-3 p-3 text-center bg-white shadow-xs">
                      <div className="small text-muted">Chỉ số BMI</div>
                      <div className="fs-4 fw-bold text-success font-monospace">
                        {selectedRecord.vitals?.bmi}{' '}
                        <Badge bg="success" className="fs-7 fw-normal">
                          {selectedRecord.vitals?.bmiCategory}
                        </Badge>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* Diagnosis and ICD-10 */}
                <div className="mb-4">
                  <h6 className="fw-bold text-secondary text-uppercase small mb-2">Chẩn Đoán Bệnh</h6>
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Badge bg="primary" className="font-monospace fs-6 px-3 py-1.5">
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
                    <div className="border rounded-3 p-3 h-100 bg-white">
                      <h6 className="fw-bold text-secondary mb-2 d-flex align-items-center gap-2">
                        <FaStethoscope className="text-primary" /> Hướng Xử Trí & Phác Đồ
                      </h6>
                      <p className="text-dark mb-0 small">
                        {selectedRecord.treatmentPlan || 'Theo dõi định kỳ.'}
                      </p>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="border rounded-3 p-3 h-100 bg-white">
                      <h6 className="fw-bold text-secondary mb-2 d-flex align-items-center gap-2">
                        <FaPrescriptionBottleAlt className="text-success" /> Đơn Thuốc & Dặn Dò
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
            <Card className="border-0 shadow-sm rounded-4 text-center py-5">
              <div className="display-1 text-muted opacity-25 mb-3">
                <FaNotesMedical />
              </div>
              <h5 className="fw-bold text-secondary mb-2">Chưa chọn hồ sơ bệnh án</h5>
              <p className="text-muted small mb-4">
                Chọn một hồ sơ bệnh án từ danh sách bên trái hoặc nhấn &quot;Tạo Bệnh Án Mới&quot; để bắt đầu đợt khám.
              </p>
              <div>
                <Button variant="primary" onClick={handleStartCreate}>
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
          <Modal.Title className="h5 fw-bold text-danger">Hủy / Xóa Hồ Sơ Bệnh Án</Modal.Title>
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
          <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
            Hủy Bỏ
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteConfirm}
            disabled={submitLoading || deleteReason.trim().length < 15}
          >
            {submitLoading ? 'Đang xử lý...' : 'Xác Nhận Xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
