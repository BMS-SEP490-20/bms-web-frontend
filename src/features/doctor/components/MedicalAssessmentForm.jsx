/**
 * @file MedicalAssessmentForm.jsx
 * @description UC50 – Complete Doctor Clinical Assessment & WHO ICD-10 Entry Form (Iteration 3).
 * Supports Patient Profile auto-binding from Database (Read-only demographic lock),
 * Vital Signs with Real-Time BMI Calculation, WHO ICD-10 Autocomplete,
 * Clinical Risk Severity, and Dynamic Test Order Recommendations from Service Packages.
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
  ListGroup,
  Modal
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
  FaTimes,
  FaExchangeAlt,
  FaVials
} from 'react-icons/fa';
import { medicalAssessmentApi } from '../api/medicalAssessmentApi';
import { searchPatients, getPatientById } from '../../../services/patientService';
import { getPackages } from '../../admin/api/packageApi.jsx';

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
    patientId: initialData?.patientId || '',
    patientCode: initialData?.patientCode || '',
    patientName: initialData?.patientName || '',
    patientDob: initialData?.patientDob ? new Date(initialData.patientDob).toISOString().split('T')[0] : '',
    patientGender: initialData?.patientGender || 'Male',
    encounterId: initialData?.encounterId || 'ENC-DEFAULT-01',
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

  // Patient Profile state (Database driven - Locked from manual typing)
  const [patientProfile, setPatientProfile] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [showPatientSelectorModal, setShowPatientSelectorModal] = useState(false);
  const [patientList, setPatientList] = useState([]);
  const [patientSearchKeyword, setPatientSearchKeyword] = useState('');
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Dynamic Service Packages state from DB (ServicePackages catalog)
  const [servicePackages, setServicePackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [encounters, setEncounters] = useState([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [icdSearchTerm, setIcdSearchTerm] = useState('');
  const [showIcdSuggestions, setShowIcdSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load patient profile from DB by ID or Code
  const loadPatientProfile = useCallback(async (identifier) => {
    if (!identifier) return;
    setLoadingPatient(true);
    try {
      const patient = await getPatientById(identifier);
      if (patient) {
        setPatientProfile(patient);
        setFormData((prev) => ({
          ...prev,
          patientId: patient.id || identifier,
          patientCode: patient.patientCode || patient.id || '',
          patientName: patient.fullName || '',
          patientDob: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : prev.patientDob,
          patientGender: patient.gender || prev.patientGender,
          vitals: {
            ...prev.vitals,
            heightCm: patient.vitals?.heightCm ?? prev.vitals.heightCm,
            weightKg: patient.vitals?.weightKg ?? prev.vitals.weightKg,
            heartRate: patient.vitals?.heartRateBpm ?? prev.vitals.heartRate,
            temperature: patient.vitals?.temperatureC ?? prev.vitals.temperature,
            spo2: patient.vitals?.spo2Percent ?? prev.vitals.spo2
          }
        }));
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoadingPatient(false);
    }
  }, []);

  // Fetch Patient List for Search / Selection Modal
  const fetchPatientList = useCallback(async (keyword = '') => {
    setSearchingPatients(true);
    try {
      const res = await searchPatients({ search: keyword, pageSize: 30 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setPatientList(items);
    } catch {
      setPatientList([]);
    } finally {
      setSearchingPatients(false);
    }
  }, []);

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

  // Initial load: Patient & Service Packages from DB
  useEffect(() => {
    // 1. Load patient profile
    const targetPatientId = initialData?.patientId || formData.patientId;
    if (targetPatientId) {
      loadPatientProfile(targetPatientId);
      fetchEncounters(targetPatientId);
    } else {
      // If none provided, fetch first patient from DB as initial
      searchPatients({ pageSize: 1 })
        .then((res) => {
          const first = res?.items?.[0];
          if (first) {
            loadPatientProfile(first.id);
            fetchEncounters(first.id);
          }
        })
        .catch(() => {});
    }

    // 2. Load service packages from database (Service Packages catalog)
    setLoadingPackages(true);
    getPackages({ pageSize: 100 })
      .then((res) => {
        const list = res?.items || (Array.isArray(res) ? res : []);
        const active = list.filter((p) => !p.isDeleted && p.isActive !== false);
        setServicePackages(active);
      })
      .catch(() => {
        setServicePackages([]);
      })
      .finally(() => {
        setLoadingPackages(false);
      });
  }, [initialData, loadPatientProfile, fetchEncounters]);

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

  const handleTogglePackage = (pkgIdentifier) => {
    setFormData((prev) => {
      const exists = prev.recommendedTestPackages.includes(pkgIdentifier);
      return {
        ...prev,
        recommendedTestPackages: exists
          ? prev.recommendedTestPackages.filter((p) => p !== pkgIdentifier)
          : [...prev.recommendedTestPackages, pkgIdentifier]
      };
    });
  };

  const handleSubmit = async (submitStatus = 'Draft') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Front-end validations
    if (!formData.patientId?.trim()) {
      setErrorMessage('Vui lòng chọn bệnh nhân từ cơ sở dữ liệu hồ sơ bệnh nhân.');
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
      if (err.status === 401 || err.message?.includes('401')) {
        setErrorMessage('Phiên làm việc đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập tài khoản Bác sĩ để lưu đánh giá y khoa.');
      } else {
        setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu đánh giá y khoa.');
      }
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
          {/* SECTION 1: Patient and Encounter Association (LOCKED READ-ONLY FROM PROFILE) */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h6 className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
                  <FaUserInjured /> 1. Thông Tin Bệnh Nhân (Hồ Sơ Điện Tử) & Lượt Khám
                </h6>
                <small className="text-muted">
                  Thông tin hành chính được đồng bộ trực tiếp từ CSDL Hồ sơ bệnh nhân (Chỉ xem - Không điền tay).
                </small>
              </div>
              <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                <Badge bg="secondary-subtle" className="text-secondary border d-flex align-items-center gap-1 px-2 py-1">
                  <FaLock size={11} /> Dữ liệu hồ sơ gốc (Chỉ xem)
                </Badge>
                {!isEditMode && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="d-flex align-items-center gap-1 px-2 py-1 shadow-xs"
                    onClick={() => {
                      setShowPatientSelectorModal(true);
                      fetchPatientList('');
                    }}
                  >
                    <FaExchangeAlt size={11} /> Đổi bệnh nhân
                  </Button>
                )}
              </div>
            </div>

            {loadingPatient ? (
              <div className="text-center py-4 text-muted bg-light rounded-3 mb-3">
                <Spinner size="sm" animation="border" className="me-2 text-primary" />
                Đang nạp thông tin hồ sơ bệnh nhân từ cơ sở dữ liệu...
              </div>
            ) : (
              <div className="p-3 rounded-3 bg-light border mb-3">
                <Row className="g-3">
                  <Col md={3}>
                    <div className="text-muted small fw-medium">Họ và tên bệnh nhân</div>
                    <div className="fw-bold text-dark fs-6">
                      {patientProfile?.fullName || formData.patientName || 'Chưa chọn'}
                    </div>
                  </Col>

                  <Col md={3}>
                    <div className="text-muted small fw-medium">Mã Bệnh Nhân (Patient Code)</div>
                    <div>
                      <code className="text-primary fw-bold fs-6">
                        {patientProfile?.patientCode || patientProfile?.id || formData.patientCode || formData.patientId || '—'}
                      </code>
                    </div>
                  </Col>

                  <Col md={2}>
                    <div className="text-muted small fw-medium">Ngày sinh / Tuổi</div>
                    <div className="text-dark fw-semibold">
                      {patientProfile?.dateOfBirth ? new Date(patientProfile.dateOfBirth).toLocaleDateString('vi-VN') : (formData.patientDob || '—')}
                      {patientProfile?.age ? ` (${patientProfile.age} tuổi)` : ''}
                    </div>
                  </Col>

                  <Col md={2}>
                    <div className="text-muted small fw-medium">Giới tính</div>
                    <div>
                      <Badge bg="info-subtle" text="info-emphasis" className="border border-info-subtle">
                        {(patientProfile?.gender || formData.patientGender) === 'Male' ? 'Nam' : (patientProfile?.gender || formData.patientGender) === 'Female' ? 'Nữ' : 'Khác'}
                      </Badge>
                    </div>
                  </Col>

                  <Col md={2}>
                    <div className="text-muted small fw-medium">Nhóm máu</div>
                    <div>
                      <Badge bg="danger-subtle" text="danger" className="border border-danger-subtle font-monospace">
                        {patientProfile?.bloodType || 'Chưa xác định'}
                      </Badge>
                    </div>
                  </Col>

                  <Col md={3}>
                    <div className="text-muted small fw-medium">Số điện thoại</div>
                    <div className="text-dark small font-monospace">
                      {patientProfile?.phoneNumber || 'Chưa cập nhật'}
                    </div>
                  </Col>

                  <Col md={3}>
                    <div className="text-muted small fw-medium">Số CCCD / Định danh</div>
                    <div className="text-dark small font-monospace">
                      {patientProfile?.identityNumber || 'Chưa cập nhật'}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="text-muted small fw-medium">Tiền sử bệnh & Dị ứng</div>
                    <div className="text-dark small text-truncate" title={patientProfile?.medicalHistory || 'Không ghi nhận'}>
                      {patientProfile?.medicalHistory || (patientProfile?.allergies?.length ? `Dị ứng: ${patientProfile.allergies.join(', ')}` : 'Không ghi nhận tiền sử bệnh')}
                    </div>
                  </Col>
                </Row>
              </div>
            )}

            {/* Encounter Association */}
            <Row className="g-3">
              <Col md={6}>
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Loại Tiếp Nhận (Encounter Type)</Form.Label>
                  <Form.Select
                    value={formData.encounterType}
                    onChange={(e) => setFormData({ ...formData, encounterType: e.target.value })}
                  >
                    <option value="ClinicVisit">Khám phòng khám ngoại trú (Clinic Visit)</option>
                    <option value="FollowUp">Tái khám theo hẹn (Follow-up)</option>
                    <option value="Emergency">Cấp cứu / Tiếp nhận nhanh</option>
                    <option value="RoutineCheckup">Khám sức khỏe định kỳ</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 2: Chief Complaint & Symptoms */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
              <FaNotesMedical /> 2. Lý Do Khám & Triệu Chứng Lâm Sàng
            </h6>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Lý Do Đến Khám (Chief Complaint) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.chiefComplaint}
                    onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                    placeholder="VD: Đau ngực trái từng cơn kèm khó thở khi gắng sức..."
                    required
                  />
                  <Form.Text className="text-muted">Mô tả vắn tắt lý do chính khiến người bệnh đi khám.</Form.Text>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Triệu Chứng Cơ Năng & Bệnh Sử Hiện Tại</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.clinicalSymptoms}
                    onChange={(e) => setFormData({ ...formData, clinicalSymptoms: e.target.value })}
                    placeholder="Khởi phát cơn đau cách 3 ngày, tăng dần về chiều, kèm hồi hộp, đánh trống ngực..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 3: Vital Signs & Examination */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
                <FaHeartbeat /> 3. Dấu Hiệu Sinh Tồn (Vitals) & Khám Thực Thể
              </h6>
              {bmi > 0 && (
                <Badge bg={bmiColor} className="fs-6 py-1 px-3">
                  BMI: {bmi} kg/m² ({bmiCategory})
                </Badge>
              )}
            </div>

            <Row className="g-3 mb-3">
              <Col md={2} sm={4} xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mạch (BPM)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.vitals.heartRate}
                    onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                    min={30}
                    max={250}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={2} sm={4} xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tâm Thu (mmHg)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.vitals.systolicBp}
                    onChange={(e) => handleVitalChange('systolicBp', e.target.value)}
                    min={60}
                    max={260}
                    required
                    isInvalid={!bpValidation.valid}
                  />
                </Form.Group>
              </Col>
              <Col md={2} sm={4} xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tâm Trương (mmHg)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.vitals.diastolicBp}
                    onChange={(e) => handleVitalChange('diastolicBp', e.target.value)}
                    min={40}
                    max={160}
                    required
                    isInvalid={!bpValidation.valid}
                  />
                </Form.Group>
              </Col>
              <Col md={2} sm={4} xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nhiệt Độ (°C)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    value={formData.vitals.temperature}
                    onChange={(e) => handleVitalChange('temperature', e.target.value)}
                    min={34}
                    max={43}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={2} sm={4} xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">SpO2 (%)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.vitals.spo2}
                    onChange={(e) => handleVitalChange('spo2', e.target.value)}
                    min={50}
                    max={100}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={1} sm={2} xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Cao (cm)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.vitals.heightCm}
                    onChange={(e) => handleVitalChange('heightCm', e.target.value)}
                    min={30}
                    max={250}
                  />
                </Form.Group>
              </Col>
              <Col md={1} sm={2} xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nặng (kg)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.5"
                    value={formData.vitals.weightKg}
                    onChange={(e) => handleVitalChange('weightKg', e.target.value)}
                    min={2}
                    max={300}
                  />
                </Form.Group>
              </Col>
            </Row>

            {!bpValidation.valid && (
              <Alert variant="warning" className="py-2 small mb-3">
                <FaExclamationTriangle className="me-2" />
                {bpValidation.message}
              </Alert>
            )}

            <Row>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Khám Thực Thể (Physical Examination)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.physicalExamination}
                    onChange={(e) => setFormData({ ...formData, physicalExamination: e.target.value })}
                    placeholder="Tim đều rõ, T1 T2 nghe rõ, phổi không rale, bụng mềm gan lách không sờ chạm..."
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
                    placeholder="Nghi ngờ bệnh tim thiếu máu cục bộ..."
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

          {/* SECTION 5: Treatment Plan & Test Orders (DYNAMIC SERVICE PACKAGES FROM DB) */}
          <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm mb-4 border">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
              <FaFilePrescription /> 5. Kế Hoạch Xử Trí & Đề Xuất Chỉ Định Xét Nghiệm (Plan & Orders)
            </h6>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="fw-semibold mb-0 d-flex align-items-center gap-2">
                  <FaVials className="text-primary" />
                  Đề Xuất Chỉ Định Xét Nghiệm Cận Lâm Sàng
                </Form.Label>
                <small className="text-muted">Nguồn: Quản lý gói dịch vụ xét nghiệm (CSDL)</small>
              </div>

              {loadingPackages ? (
                <div className="text-muted small py-2">
                  <Spinner size="sm" animation="border" className="me-2 text-primary" />
                  Đang tải danh mục gói xét nghiệm từ hệ thống...
                </div>
              ) : servicePackages.length === 0 ? (
                <div className="text-muted small py-2">
                  Chưa có gói xét nghiệm nào trong hệ thống.
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {servicePackages.map((pkg) => {
                    const pkgTitle = pkg.name || pkg.packageName || pkg.code;
                    const selected = formData.recommendedTestPackages.includes(pkgTitle);
                    return (
                      <Button
                        key={pkg.id || pkg.code || pkgTitle}
                        variant={selected ? 'primary' : 'outline-secondary'}
                        size="sm"
                        className="rounded-pill d-flex align-items-center gap-1 shadow-xs px-3 py-1"
                        onClick={() => handleTogglePackage(pkgTitle)}
                      >
                        {selected && <FaCheckCircle size={12} />}
                        <span>{pkgTitle}</span>
                        {pkg.price ? (
                          <Badge
                            bg={selected ? 'light' : 'secondary'}
                            text={selected ? 'dark' : 'white'}
                            className="ms-1 font-monospace"
                          >
                            {Number(pkg.price).toLocaleString('vi-VN')} đ
                          </Badge>
                        ) : null}
                      </Button>
                    );
                  })}
                </div>
              )}
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

      {/* Patient Selector Modal */}
      <Modal show={showPatientSelectorModal} onHide={() => setShowPatientSelectorModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold text-primary d-flex align-items-center gap-2">
            <FaUserInjured /> Chọn Hồ Sơ Bệnh Nhân (Cơ Sở Dữ Liệu BMS)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-3">
            <InputGroup.Text><FaSearch /></InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo tên, mã bệnh nhân, SĐT hoặc CCCD..."
              value={patientSearchKeyword}
              onChange={(e) => {
                setPatientSearchKeyword(e.target.value);
                fetchPatientList(e.target.value);
              }}
            />
          </InputGroup>

          {searchingPatients ? (
            <div className="text-center py-4 text-muted"><Spinner size="sm" /> Đang tìm kiếm hồ sơ...</div>
          ) : patientList.length === 0 ? (
            <div className="text-center py-4 text-muted">Không tìm thấy bệnh nhân phù hợp.</div>
          ) : (
            <div className="list-group list-group-flush" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {patientList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 ${
                    p.id === formData.patientId ? 'active text-white' : ''
                  }`}
                  onClick={() => {
                    loadPatientProfile(p.id);
                    fetchEncounters(p.id);
                    setShowPatientSelectorModal(false);
                  }}
                >
                  <div>
                    <div className="fw-bold">{p.fullName}</div>
                    <div className="small font-monospace opacity-75">
                      Mã: {p.patientCode || p.id} • {p.gender === 'Male' ? 'Nam' : p.gender === 'Female' ? 'Nữ' : 'Khác'} • SĐT: {p.phoneNumber || '—'}
                    </div>
                  </div>
                  <Badge bg={p.id === formData.patientId ? 'light' : 'primary'} text={p.id === formData.patientId ? 'dark' : 'white'}>
                    {p.id === formData.patientId ? 'Đang chọn' : 'Chọn hồ sơ'}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Card>
  );
}
