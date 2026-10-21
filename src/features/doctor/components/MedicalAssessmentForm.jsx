/**
 * @file MedicalAssessmentForm.jsx
 * @description UC50 – Complete Doctor Clinical Assessment & WHO ICD-10 Entry Form (Iteration 3).
 * Supports Patient and Encounter Association, Vital Signs with Real-Time BMI Calculation,
 * WHO ICD-10 Autocomplete, Clinical Risk Severity, and Test Order Recommendations.
 * Conforms to: BR-DOC-01, ISO 15189, and AGENTS-DESIGN.md.
 * @module features/doctor/components/MedicalAssessmentForm
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Form,
  Row,
  Col,
  Button,
  Badge,
  Alert,
  Spinner,
  InputGroup,
  ListGroup
} from 'react-bootstrap';
import {
  FaUserInjured,
  FaHeartbeat,
  FaStethoscope,
  FaNotesMedical,
  FaFilePrescription,
  FaCalendarCheck,
  FaCheckCircle,
  FaSave,
  FaLock,
  FaExclamationTriangle,
  FaSearch,
  FaTimes
} from 'react-icons/fa';
import { medicalAssessmentApi } from '../api/medicalAssessmentApi';

// Standard WHO ICD-10 Catalog for clinical guidance
export const COMMON_ICD10_LIST = [
  { code: 'E11', name: 'Đái tháo đường typ 2 (Type 2 diabetes mellitus)' },
  { code: 'I10', name: 'Tăng huyết áp vô căn (Essential hypertension)' },
  { code: 'J00', name: 'Viêm mũi họng cấp / Cảm lạnh (Acute nasopharyngitis)' },
  { code: 'J20', name: 'Viêm phế quản cấp (Acute bronchitis)' },
  { code: 'K29', name: 'Viêm dạ dày và tá tràng (Gastritis and duodenitis)' },
  { code: 'K76', name: 'Các bệnh gan khác / Tăng men gan (Other diseases of liver)' },
  { code: 'E78', name: 'Rối loạn chuyển hóa lipoprotein và lipid máu (Dyslipidemia)' },
  { code: 'D50', name: 'Thiếu máu do thiếu sắt (Iron deficiency anaemia)' },
  { code: 'M10', name: 'Bệnh Gút (Gout)' },
  { code: 'N39', name: 'Rối loạn hệ tiết niệu (Disorders of urinary system)' },
  { code: 'R50', name: 'Sốt không rõ nguyên nhân (Fever of unknown origin)' },
  { code: 'Z00', name: 'Khám sức khỏe tổng quát (General examination)' },
];

export const AVAILABLE_TEST_PACKAGES = [
  'Gói Xét Nghiệm Tổng Quát Định Kỳ',
  'Gói Tầm Soát Đái Tháo Đường & HbA1c',
  'Gói Đánh Giá Chức Năng Gan (AST, ALT, GGT)',
  'Gói Đánh Giá Chức Năng Thận (Ure, Creatinine)',
  'Bộ Mỡ Máu Toàn Phần (Lipid Profile)',
  'Tổng Phân Tích Tế Bào Máu Ngoại Vi (CBC 24 Thông Số)',
  'Điện Giải Đồ (Na+, K+, Cl-)'
];

export default function MedicalAssessmentForm({
  initialData = null,
  isEditMode = false,
  onSuccess,
  onCancel
}) {
  const [currentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [formData, setFormData] = useState({
    patientId: initialData?.patientId || 'USR-PAT-01',
    patientCode: initialData?.patientCode || 'PAT-261019-0005',
    patientName: initialData?.patientName || 'Bệnh Nhân Võ Gia Huy',
    patientDob: initialData?.patientDob ? new Date(initialData.patientDob).toISOString().split('T')[0] : '1995-05-20',
    patientGender: initialData?.patientGender || 'Male',
    encounterId: initialData?.encounterId || 'ENC-261021-001',
    encounterType: initialData?.encounterType || 'ClinicVisit',
    doctorId: initialData?.doctorId || currentUser?.id || 'USR-DOC-01',
    doctorName: initialData?.doctorName || currentUser?.fullName || 'BS. Nguyễn Văn An',
    department: initialData?.department || 'Khoa Khám Bệnh',
    assessmentDate: initialData?.assessmentDate ? new Date(initialData.assessmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    chiefComplaint: initialData?.chiefComplaint || '',
    clinicalSymptoms: initialData?.clinicalSymptoms || '',
    vitals: {
      heartRate: initialData?.vitals?.heartRate ?? 75,
      systolicBp: initialData?.vitals?.systolicBp ?? 120,
      diastolicBp: initialData?.vitals?.diastolicBp ?? 80,
      temperature: initialData?.vitals?.temperature ?? 36.5,
      spo2: initialData?.vitals?.spo2 ?? 98,
      heightCm: initialData?.vitals?.heightCm ?? 170,
      weightKg: initialData?.vitals?.weightKg ?? 65,
    },
    physicalExamination: initialData?.physicalExamination || '',
    icd10Code: initialData?.icd10Code || 'E11',
    icd10Name: initialData?.icd10Name || 'Đái tháo đường typ 2 (Type 2 diabetes mellitus)',
    preliminaryDiagnosis: initialData?.preliminaryDiagnosis || '',
    finalDiagnosis: initialData?.finalDiagnosis || '',
    severity: initialData?.severity || 'Mild',
    riskLevel: initialData?.riskLevel || 'Low',
    clinicalImpression: initialData?.clinicalImpression || '',
    recommendedTestPackages: initialData?.recommendedTestPackages || [],
    treatmentPlan: initialData?.treatmentPlan || '',
    prescriptionNotes: initialData?.prescriptionNotes || '',
    followUpDate: initialData?.followUpDate ? new Date(initialData.followUpDate).toISOString().split('T')[0] : '',
    followUpNotes: initialData?.followUpNotes || '',
    status: initialData?.status || 'Draft'
  });

  const [encounters, setEncounters] = useState([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [icdSearchTerm, setIcdSearchTerm] = useState('');
  const [showIcdSuggestions, setShowIcdSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Auto-calculated BMI & Category
  const { bmi, bmiCategory, bmiColor } = useMemo(() => {
    const h = Number(formData.vitals.heightCm);
    const w = Number(formData.vitals.weightKg);
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
  }, [formData.vitals.heightCm, formData.vitals.weightKg]);

  // Blood pressure invariant validation: Systolic > Diastolic + 15
  const bpValidation = useMemo(() => {
    const sys = Number(formData.vitals.systolicBp);
    const dia = Number(formData.vitals.diastolicBp);
    if (!sys || !dia) return { valid: true };

    if (sys <= dia + 15) {
      return {
        valid: false,
        message: 'Huyết áp tâm thu phải lớn hơn huyết áp tâm trương ít nhất 15 mmHg.',
      };
    }
    return { valid: true };
  }, [formData.vitals.systolicBp, formData.vitals.diastolicBp]);

  // Load Patient Encounters
  const fetchEncounters = useCallback(async (pid) => {
    if (!pid) return;
    setLoadingEncounters(true);
    try {
      const res = await medicalAssessmentApi.getPatientEncounters(pid);
      if (res?.data && res.data.length > 0) {
        setEncounters(res.data);
      }
    } catch {
      // Keep existing default
    } finally {
      setLoadingEncounters(false);
    }
  }, []);

  useEffect(() => {
    if (formData.patientId) {
      fetchEncounters(formData.patientId);
    }
  }, [formData.patientId, fetchEncounters]);

  // Filter ICD-10 list by search term
  const filteredIcd10 = useMemo(() => {
    if (!icdSearchTerm.trim()) return COMMON_ICD10_LIST;
    const kw = icdSearchTerm.toLowerCase();
    return COMMON_ICD10_LIST.filter(
      (item) => item.code.toLowerCase().includes(kw) || item.name.toLowerCase().includes(kw)
    );
  }, [icdSearchTerm]);

  const handleSelectIcd = (item) => {
    setFormData((prev) => ({
      ...prev,
      icd10Code: item.code,
      icd10Name: item.name,
      finalDiagnosis: prev.finalDiagnosis ? prev.finalDiagnosis : item.name
    }));
    setShowIcdSuggestions(false);
    setIcdSearchTerm('');
  };

  const handleVitalChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: value
      }
    }));
  };

  const handleTogglePackage = (pkgName) => {
    setFormData((prev) => {
      const exists = prev.recommendedTestPackages.includes(pkgName);
      return {
        ...prev,
        recommendedTestPackages: exists
          ? prev.recommendedTestPackages.filter((p) => p !== pkgName)
          : [...prev.recommendedTestPackages, pkgName]
      };
    });
  };

  const handleSubmit = async (submitStatus = 'Draft') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Front-end validations
    if (!formData.patientId?.trim()) {
      setErrorMessage('Vui lòng nhập hoặc chọn mã bệnh nhân.');
      return;
    }
    if (!formData.chiefComplaint?.trim() || formData.chiefComplaint.trim().length < 3) {
      setErrorMessage('Lý do khám (Chief Complaint) không được để trống và tối thiểu 3 ký tự.');
      return;
    }
    if (!formData.icd10Code?.trim()) {
      setErrorMessage('Vui lòng chọn hoặc nhập mã chẩn đoán ICD-10 theo quy định.');
      return;
    }
    if (!formData.finalDiagnosis?.trim()) {
      setErrorMessage('Chẩn đoán xác định / Kết luận y khoa không được để trống.');
      return;
    }
    if (!bpValidation.valid) {
      setErrorMessage(bpValidation.message);
      return;
    }

    const payload = {
      patientId: formData.patientId.trim(),
      patientCode: formData.patientCode?.trim(),
      patientName: formData.patientName?.trim(),
      patientDob: formData.patientDob ? new Date(formData.patientDob) : null,
      patientGender: formData.patientGender,
      encounterId: formData.encounterId?.trim(),
      encounterType: formData.encounterType,
      doctorId: formData.doctorId,
      doctorName: formData.doctorName,
      department: formData.department,
      assessmentDate: formData.assessmentDate ? new Date(formData.assessmentDate) : new Date(),
      chiefComplaint: formData.chiefComplaint.trim(),
      clinicalSymptoms: formData.clinicalSymptoms?.trim(),
      vitals: {
        heartRate: Number(formData.vitals.heartRate),
        systolicBp: Number(formData.vitals.systolicBp),
        diastolicBp: Number(formData.vitals.diastolicBp),
        temperature: Number(formData.vitals.temperature),
        spo2: Number(formData.vitals.spo2),
        heightCm: Number(formData.vitals.heightCm),
        weightKg: Number(formData.vitals.weightKg),
      },
      physicalExamination: formData.physicalExamination?.trim(),
      icd10Code: formData.icd10Code.trim().toUpperCase(),
      icd10Name: formData.icd10Name?.trim(),
      preliminaryDiagnosis: formData.preliminaryDiagnosis?.trim(),
      finalDiagnosis: formData.finalDiagnosis.trim(),
      severity: formData.severity,
      riskLevel: formData.riskLevel,
      clinicalImpression: formData.clinicalImpression?.trim(),
      recommendedTestPackages: formData.recommendedTestPackages,
      treatmentPlan: formData.treatmentPlan?.trim(),
      prescriptionNotes: formData.prescriptionNotes?.trim(),
      followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : null,
      followUpNotes: formData.followUpNotes?.trim(),
      status: submitStatus
    };

    setSubmitting(true);
    try {
      let result;
      if (isEditMode && initialData?.id) {
        result = await medicalAssessmentApi.updateAssessment(initialData.id, payload);
        if (submitStatus === 'Finalized') {
          await medicalAssessmentApi.finalizeAssessment(initialData.id, 'Hoàn tất đánh giá lâm sàng');
        }
      } else {
        result = await medicalAssessmentApi.createAssessment(payload);
      }

      setSuccessMessage(
        submitStatus === 'Finalized'
          ? 'Đã hoàn tất và khóa hồ sơ đánh giá y khoa thành công!'
          : 'Đã lưu bản nháp đánh giá y khoa thành công!'
      );

      if (onSuccess) {
        onSuccess(result?.data || result);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu đánh giá y khoa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
      <Card.Header className="bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <FaStethoscope /> {isEditMode ? 'Cập Nhật Đánh Giá Y Khoa' : 'Thêm Mới Đánh Giá Y Khoa (Medical Assessment)'}
          </h5>
          <small className="opacity-75">
            Tiêu chuẩn EMR Bộ Y Tế & Chẩn đoán Quốc tế WHO ICD-10 (UC50)
          </small>
        </div>
        {initialData?.assessmentCode && (
          <Badge bg="light" text="primary" className="px-3 py-2 fs-6">
            {initialData.assessmentCode}
          </Badge>
        )}
      </Card.Header>

      <Card.Body className="p-4 bg-light bg-opacity-25">
        {errorMessage && (
          <Alert variant="danger" dismissible onClose={() => setErrorMessage(null)} className="d-flex align-items-center gap-2">
            <FaExclamationTriangle />
            <div>{errorMessage}</div>
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="d-flex align-items-center gap-2">
            <FaCheckCircle />
            <div>{successMessage}</div>
          </Alert>
        )}

        <Form onSubmit={(e) => { e.preventDefault(); handleSubmit('Draft'); }}>
          {/* SECTION 1: Patient and Encounter Association */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
              <FaUserInjured /> 1. Thông Tin Bệnh Nhân & Liên Kết Lượt Khám (Encounter Association)
            </h6>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Mã Bệnh Nhân (Patient ID) <span className="text-danger">*</span></Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={formData.patientId}
                      onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      placeholder="VD: USR-PAT-01 hoặc PAT-..."
                      required
                    />
                    <Button variant="outline-secondary" onClick={() => fetchEncounters(formData.patientId)} title="Tải lượt khám">
                      <FaSearch />
                    </Button>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Họ và Tên Bệnh Nhân</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Giới Tính</Form.Label>
                  <Form.Select
                    value={formData.patientGender}
                    onChange={(e) => setFormData({ ...formData, patientGender: e.target.value })}
                  >
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ngày Sinh</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.patientDob}
                    onChange={(e) => setFormData({ ...formData, patientDob: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Lượt Khám / Encounter <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.encounterId}
                    onChange={(e) => setFormData({ ...formData, encounterId: e.target.value })}
                  >
                    {encounters.map((enc) => (
                      <option key={enc.encounterId} value={enc.encounterId}>
                        {enc.encounterId} - {new Date(enc.encounterDate).toLocaleDateString('vi-VN')} ({enc.status})
                      </option>
                    ))}
                    {!encounters.some((e) => e.encounterId === formData.encounterId) && (
                      <option value={formData.encounterId}>{formData.encounterId} (Hiện tại)</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Loại Tiếp Nhận (Encounter Type)</Form.Label>
                  <Form.Select
                    value={formData.encounterType}
                    onChange={(e) => setFormData({ ...formData, encounterType: e.target.value })}
                  >
                    <option value="ClinicVisit">Khám phòng khám ngoại trú (Clinic Visit)</option>
                    <option value="FollowUp">Tái khám theo hẹn (Follow-up)</option>
                    <option value="Emergency">Cấp cứu khẩn (Emergency STAT)</option>
                    <option value="RoutineCheckup">Khám sức khỏe định kỳ</option>
                    <option value="Consultation">Hội chẩn / Tư vấn chuyên khoa</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Bác Sĩ Thực Hiện Đánh Giá</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    readOnly={!currentUser?.role?.includes('Admin')}
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 2: Vital Signs & Live BMI */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
                <FaHeartbeat /> 2. Dấu Hiệu Sinh Tồn & Thể Trạng (Vital Signs & Clinical Biometrics)
              </h6>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Chỉ số BMI:</span>
                <Badge bg={bmiColor} className="px-2 py-1 fs-6">
                  {bmi} ({bmiCategory})
                </Badge>
              </div>
            </div>

            {!bpValidation.valid && (
              <Alert variant="warning" className="py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <FaExclamationTriangle /> {bpValidation.message}
              </Alert>
            )}

            <Row className="g-3">
              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mạch (Heart Rate)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      min={30}
                      max={250}
                      value={formData.vitals.heartRate}
                      onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                    />
                    <InputGroup.Text className="small">lần/phút</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Huyết Áp Tâm Thu (Systolic)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      min={60}
                      max={260}
                      value={formData.vitals.systolicBp}
                      onChange={(e) => handleVitalChange('systolicBp', e.target.value)}
                    />
                    <InputGroup.Text className="small">mmHg</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Huyết Áp Tâm Trương (Diastolic)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      min={40}
                      max={150}
                      value={formData.vitals.diastolicBp}
                      onChange={(e) => handleVitalChange('diastolicBp', e.target.value)}
                    />
                    <InputGroup.Text className="small">mmHg</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Thân Nhiệt (Temperature)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.1"
                      min={34}
                      max={43}
                      value={formData.vitals.temperature}
                      onChange={(e) => handleVitalChange('temperature', e.target.value)}
                    />
                    <InputGroup.Text className="small">°C</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Độ Bão Hòa Oxy (SpO2)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      min={50}
                      max={100}
                      value={formData.vitals.spo2}
                      onChange={(e) => handleVitalChange('spo2', e.target.value)}
                    />
                    <InputGroup.Text className="small">%</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Chiều Cao (Height)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min={20}
                      max={250}
                      value={formData.vitals.heightCm}
                      onChange={(e) => handleVitalChange('heightCm', e.target.value)}
                    />
                    <InputGroup.Text className="small">cm</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Cân Nặng (Weight)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min={1}
                      max={300}
                      value={formData.vitals.weightKg}
                      onChange={(e) => handleVitalChange('weightKg', e.target.value)}
                    />
                    <InputGroup.Text className="small">kg</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Phân Loại Thể Trạng</Form.Label>
                  <Form.Control
                    type="text"
                    value={bmiCategory}
                    readOnly
                    className="bg-light fw-semibold text-secondary"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 3: Subjective Symptoms & Physical Exam */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
              <FaNotesMedical /> 3. Triệu Chứng Chủ Quan & Khám Thực Thể
            </h6>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Lý Do Khám Bệnh (Chief Complaint) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.chiefComplaint}
                    onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                    placeholder="Mô tả ngắn gọn lý do bệnh nhân đến khám (VD: Đau ngực trái, mệt mỏi sụt cân, sốt kéo dài...)"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Triệu Chứng Lâm Sàng & Tiền Sử</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.clinicalSymptoms}
                    onChange={(e) => setFormData({ ...formData, clinicalSymptoms: e.target.value })}
                    placeholder="Thời gian khởi phát, diễn tiến triệu chứng, tiền sử dị ứng, thuốc đang dùng..."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Kết Quả Khám Thực Thể (Physical Examination)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.physicalExamination}
                    onChange={(e) => setFormData({ ...formData, physicalExamination: e.target.value })}
                    placeholder="Khám các cơ quan: Tim, Phổi, Bụng, Thần kinh, Cơ xương khớp, Hạch..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 4: Diagnosis & WHO ICD-10 */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
              <FaStethoscope /> 4. Chẩn Đoán Y Khoa & Mã Bệnh WHO ICD-10 (Bắt buộc theo BR-DOC-01)
            </h6>
            <Row className="g-3">
              <Col md={4} className="position-relative">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Mã ICD-10 Quốc Tế <span className="text-danger">*</span>
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={formData.icd10Code}
                      onChange={(e) => setFormData({ ...formData, icd10Code: e.target.value })}
                      placeholder="VD: E11, I10, J00"
                      required
                    />
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowIcdSuggestions(!showIcdSuggestions)}
                      title="Chọn nhanh mã ICD-10 phổ biến"
                    >
                      <FaSearch />
                    </Button>
                  </InputGroup>
                </Form.Group>

                {/* Suggestions Dropdown */}
                {showIcdSuggestions && (
                  <Card className="position-absolute shadow-lg z-3 mt-1 w-100 border">
                    <Card.Header className="py-2 px-3 bg-light d-flex justify-content-between align-items-center">
                      <span className="small fw-bold">Danh mục ICD-10 phổ biến</span>
                      <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => setShowIcdSuggestions(false)}>
                        <FaTimes />
                      </Button>
                    </Card.Header>
                    <div className="p-2">
                      <Form.Control
                        size="sm"
                        placeholder="Tìm kiếm mã hoặc tên bệnh..."
                        value={icdSearchTerm}
                        onChange={(e) => setIcdSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    <ListGroup variant="flush" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {filteredIcd10.map((item) => (
                        <ListGroup.Item
                          key={item.code}
                          action
                          className="py-2 px-3 small d-flex justify-content-between align-items-center"
                          onClick={() => handleSelectIcd(item)}
                        >
                          <div>
                            <span className="fw-bold text-primary me-2">{item.code}</span>
                            <span>{item.name}</span>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Card>
                )}
              </Col>

              <Col md={8}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Tên Bệnh Lý Theo ICD-10</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.icd10Name}
                    onChange={(e) => setFormData({ ...formData, icd10Name: e.target.value })}
                    placeholder="Tên danh pháp y khoa chuẩn WHO"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Chẩn Đoán Sơ Bộ (Preliminary Diagnosis)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.preliminaryDiagnosis}
                    onChange={(e) => setFormData({ ...formData, preliminaryDiagnosis: e.target.value })}
                    placeholder="Chẩn đoán phân biệt hoặc nghi ngờ ban đầu"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Chẩn Đoán Xác Định (Final Diagnosis) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.finalDiagnosis}
                    onChange={(e) => setFormData({ ...formData, finalDiagnosis: e.target.value })}
                    placeholder="Kết luận chẩn đoán chính thức"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Mức Độ Nghiêm Trọng (Severity)</Form.Label>
                  <Form.Select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="Mild">Nhẹ (Mild)</option>
                    <option value="Moderate">Trung bình (Moderate)</option>
                    <option value="Severe">Nặng (Severe)</option>
                    <option value="Critical">Nguy kịch (Critical)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Phân Cấp Nguy Cơ (Risk Level)</Form.Label>
                  <Form.Select
                    value={formData.riskLevel}
                    onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                  >
                    <option value="Low">Thấp (Low Risk)</option>
                    <option value="Medium">Trung bình (Medium Risk)</option>
                    <option value="High">Cao (High Risk)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ngày Đánh Giá Lâm Sàng</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.assessmentDate}
                    onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Nhận Định Lâm Sàng Tổng Quát (Clinical Impression)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.clinicalImpression}
                    onChange={(e) => setFormData({ ...formData, clinicalImpression: e.target.value })}
                    placeholder="Ghi nhận đánh giá chuyên môn của bác sĩ về tình trạng bệnh nhân..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 5: Treatment Plan & Test Orders */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
              <FaFilePrescription /> 5. Kế Hoạch Xử Trí & Đề Xuất Chỉ Định Xét Nghiệm (Plan & Orders)
            </h6>

            <div className="mb-3">
              <Form.Label className="fw-semibold">Đề Xuất Chỉ Định Xét Nghiệm Cận Lâm Sàng</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {AVAILABLE_TEST_PACKAGES.map((pkg) => {
                  const selected = formData.recommendedTestPackages.includes(pkg);
                  return (
                    <Button
                      key={pkg}
                      variant={selected ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => handleTogglePackage(pkg)}
                      className="rounded-pill"
                    >
                      {selected && <FaCheckCircle className="me-1" />}
                      {pkg}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Hướng Dẫn Điều Trị & Chế Độ Sinh Hoạt</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.treatmentPlan}
                    onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                    placeholder="Chế độ ăn uống, kiêng cữ, chế độ vận động thể lực..."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ghi Chú Đơn Thuốc / Dặn Dò Dược</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.prescriptionNotes}
                    onChange={(e) => setFormData({ ...formData, prescriptionNotes: e.target.value })}
                    placeholder="Đơn thuốc tạm thời hoặc dặn dò sau khi có kết quả xét nghiệm..."
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ngày Hẹn Tái Khám</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Dặn Dò Tái Khám & Lưu Ý Cấp Cứu</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.followUpNotes}
                    onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                    placeholder="Các dấu hiệu nguy hiểm cần tái khám ngay: sốt cao, khó thở, đau tức ngực..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Action Bar */}
          <div className="d-flex justify-content-between align-items-center pt-2">
            <div>
              {onCancel && (
                <Button variant="outline-secondary" onClick={onCancel} disabled={submitting}>
                  Quay lại
                </Button>
              )}
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={() => handleSubmit('Draft')}
                disabled={submitting}
                className="d-flex align-items-center gap-2"
              >
                {submitting ? <Spinner size="sm" animation="border" /> : <FaSave />}
                Lưu Bản Nháp (Draft)
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSubmit('Finalized')}
                disabled={submitting}
                className="d-flex align-items-center gap-2 px-4 shadow-sm"
              >
                {submitting ? <Spinner size="sm" animation="border" /> : <FaLock />}
                Hoàn Tất & Khóa Đánh Giá (Finalize)
              </Button>
            </div>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
