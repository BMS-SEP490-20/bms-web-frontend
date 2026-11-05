/**
 * @file InitialMedicalProfileSetup.jsx
 * @description Mandatory First-Time Clinical Intake Screen for Patients.
 * Prompts newly registered patients (or patients with incomplete clinical profile)
 * to declare medical history, allergies, blood type, vitals, and emergency contact
 * in compliance with Ministry of Health (Thông tư 46/2018/TT-BYT & QĐ 2429/QĐ-BYT)
 * and ISO 15189 pre-analytical quality criteria.
 * 
 * Once saved:
 * - Updates patient record via PUT /api/patients/me
 * - Sets medicalProfileCompleted = true in database & session
 * - Redirects patient to Home Page (/home).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Form,
  Button,
  Alert,
  Badge,
  Spinner
} from 'react-bootstrap';
import {
  FaHeartbeat,
  FaTint,
  FaAllergies,
  FaNotesMedical,
  FaPills,
  FaPhoneAlt,
  FaSave,
  FaArrowRight,
  FaShieldAlt,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaIdCard
} from 'react-icons/fa';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getStoredUser } from '../../../constants/roles';
import {
  getMyPatientInformation,
  updateMyPatientInformation
} from '../../../services/patientService';
import './InitialMedicalProfileSetup.css';

// Blood type options
const BLOOD_TYPES = [
  { code: 'O+', label: 'Nhóm Máu O+', desc: 'Phổ biến nhất (Rh+)' },
  { code: 'O-', label: 'Nhóm Máu O-', desc: 'Nhóm máu hiếm (Rh-)' },
  { code: 'A+', label: 'Nhóm Máu A+', desc: 'Kháng nguyên A (Rh+)' },
  { code: 'A-', label: 'Nhóm Máu A-', desc: 'Nhóm máu hiếm (Rh-)' },
  { code: 'B+', label: 'Nhóm Máu B+', desc: 'Kháng nguyên B (Rh+)' },
  { code: 'B-', label: 'Nhóm Máu B-', desc: 'Nhóm máu hiếm (Rh-)' },
  { code: 'AB+', label: 'Nhóm Máu AB+', desc: 'Kháng nguyên AB (Rh+)' },
  { code: 'AB-', label: 'Nhóm Máu AB-', desc: 'Cực hiếm (Rh-)' },
  { code: 'Unknown', label: 'Chưa Rõ Nhóm Máu', desc: 'Sẽ xét nghiệm tại phòng Lab' }
];

// Common allergy options
const COMMON_ALLERGIES = [
  'Kháng sinh Penicillin / Amoxicillin',
  'Kháng sinh Cephalosporin',
  'Thuốc giảm đau Aspirin / Paracetamol',
  'Thuốc chống viêm NSAIDs (Ibuprofen...)',
  'Dị ứng Hải sản (Tôm, Cua, Mực)',
  'Dị ứng Trứng / Sữa / Đậu phộng',
  'Phấn hoa / Bụi nhà / Thời tiết',
  'Cồn sát trùng / Povidine / Băng keo y tế'
];

// Common chronic medical conditions
const COMMON_CONDITIONS = [
  'Tăng huyết áp (Cao huyết áp)',
  'Đái tháo đường (Tiểu đường)',
  'Bệnh lý Tim mạch / Thiếu máu cục bộ',
  'Viêm gan siêu vi B / C',
  'Bệnh thận mạn tính / Suy thận',
  'Hen phế quản (Suyễn) / COPD',
  'Rối loạn lipid máu (Mỡ máu cao)',
  'Bệnh lý Tuyến giáp (Bướu cổ, Basedow)',
  'Viêm loét dạ dày - tá tràng / Trào ngược (GERD)',
  'Bệnh lý Động kinh / Thần kinh'
];

// Relationships
const RELATIONSHIPS = [
  'Vợ / Chồng',
  'Bố / Mẹ',
  'Con cái',
  'Anh / Chị / Em',
  'Người giám hộ hợp pháp',
  'Người thân khác'
];

export default function InitialMedicalProfileSetup() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Demographic & administrative data (verified)
  const [demographics, setDemographics] = useState({
    fullName: '',
    identityNumber: '',
    dateOfBirth: '',
    gender: 'Nam',
    phoneNumber: '',
    email: '',
    address: '',
    patientCode: ''
  });

  // Clinical profile state
  const [bloodType, setBloodType] = useState('O+');
  const [hasNoCoagulation, setHasNoCoagulation] = useState(true);
  const [coagulationNotes, setCoagulationNotes] = useState('');

  const [hasNoAllergies, setHasNoAllergies] = useState(true);
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [allergiesNotes, setAllergiesNotes] = useState('');

  const [hasNoMedicalHistory, setHasNoMedicalHistory] = useState(true);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [medicalHistoryNotes, setMedicalHistoryNotes] = useState('');

  const [hasNoMedications, setHasNoMedications] = useState(true);
  const [medicationsNotes, setMedicationsNotes] = useState('');

  // Vitals
  const [heightCm, setHeightCm] = useState('168');
  const [weightKg, setWeightKg] = useState('62');
  const [bloodPressure, setBloodPressure] = useState('120/80');

  // Emergency contact
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('Vợ / Chồng');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Additional optional MOH fields
  const [healthInsuranceNumber, setHealthInsuranceNumber] = useState('');
  const [occupation, setOccupation] = useState('');

  // Legal Consent
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  // Field validation tracking
  const [errors, setErrors] = useState({});

  // 1. Fetch current profile on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const stored = getStoredUser() || user || {};
        
        let pat = null;
        try {
          pat = await getMyPatientInformation();
        } catch {
          // Fallback to stored user session
        }

        const fullName = pat?.fullName || stored?.fullName || stored?.FullName || 'Bệnh Nhân';
        const identityNumber = pat?.identityCardNumber || pat?.identityNumber || stored?.identityCardNumber || stored?.IdentityCardNumber || '';
        const phoneNumber = pat?.phoneNumber || pat?.phone || stored?.phoneNumber || stored?.PhoneNumber || '';
        const email = pat?.email || stored?.email || stored?.Email || '';
        const address = pat?.address || stored?.address || stored?.Address || '';
        const gender = pat?.gender || pat?.genderString || stored?.gender || stored?.Gender || 'Nam';
        const patientCode = pat?.patientCode || pat?.id || stored?.patientCode || '';
        
        let dobStr = '';
        const rawDob = pat?.dateOfBirth || stored?.dateOfBirth;
        if (rawDob) {
          try {
            dobStr = new Date(rawDob).toISOString().split('T')[0];
          } catch {
            dobStr = String(rawDob);
          }
        }

        setDemographics({
          fullName,
          identityNumber,
          dateOfBirth: dobStr,
          gender,
          phoneNumber,
          email,
          address,
          patientCode
        });

        // Prefill existing values if present
        if (pat?.bloodType && pat.bloodType !== 'Unknown') {
          setBloodType(pat.bloodType);
        }
        if (pat?.emergencyContactName) {
          setEmergencyContactName(pat.emergencyContactName);
        }
        if (pat?.emergencyContactPhone) {
          setEmergencyContactPhone(pat.emergencyContactPhone);
        }
        if (pat?.emergencyContactRelationship) {
          setEmergencyContactRelationship(pat.emergencyContactRelationship);
        }
        if (pat?.vitals?.heightCm) {
          setHeightCm(String(pat.vitals.heightCm));
        }
        if (pat?.vitals?.weightKg) {
          setWeightKg(String(pat.vitals.weightKg));
        }
        if (pat?.vitals?.bloodPressure) {
          setBloodPressure(pat.vitals.bloodPressure);
        }

      } catch (err) {
        setErrorMessage('Không thể tải dữ liệu hồ sơ bệnh nhân. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // 2. BMI Calculation & Interpretation
  const bmiCalculation = useMemo(() => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) {
      return { value: '--', label: 'Chưa đủ dữ liệu', color: 'secondary' };
    }
    const hMeter = h / 100;
    const val = (w / (hMeter * hMeter)).toFixed(1);
    const num = parseFloat(val);

    if (num < 18.5) {
      return { value: val, label: 'Thể trạng gầy (Thiếu cân)', color: 'warning' };
    } else if (num < 23.0) {
      return { value: val, label: 'Thể trạng chuẩn (WHO Châu Á)', color: 'success' };
    } else if (num < 25.0) {
      return { value: val, label: 'Tiền béo phì (Thừa cân nhẹ)', color: 'warning' };
    } else if (num < 30.0) {
      return { value: val, label: 'Béo phì độ 1', color: 'danger' };
    } else {
      return { value: val, label: 'Béo phì độ 2 (Nguy cơ cao)', color: 'danger' };
    }
  }, [heightCm, weightKg]);

  // Tag togglers
  const toggleAllergy = (item) => {
    setHasNoAllergies(false);
    setSelectedAllergies(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const toggleCondition = (item) => {
    setHasNoMedicalHistory(false);
    setSelectedConditions(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  // 3. Form Validation
  const validateForm = () => {
    const newErrors = {};

    if (!bloodType) {
      newErrors.bloodType = 'Vui lòng chọn nhóm máu hệ ABO / Rh.';
    }

    if (!emergencyContactName.trim() || emergencyContactName.trim().length < 2) {
      newErrors.emergencyContactName = 'Vui lòng nhập họ và tên người liên hệ khẩn cấp (tối thiểu 2 ký tự).';
    }

    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
    if (!emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = 'Vui lòng nhập số điện thoại người liên hệ khẩn cấp.';
    } else if (!phoneRegex.test(emergencyContactPhone.trim())) {
      newErrors.emergencyContactPhone = 'Số điện thoại khẩn cấp không hợp lệ (phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
    }

    if (!consentConfirmed) {
      newErrors.consent = 'Bạn cần tích xác nhận cam đoan thông tin khai báo y tế là trung thực và chính xác.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 4. Save clinical intake
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) {
      setErrorMessage('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc được đánh dấu đỏ.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);

      // Build payload matching UpdatePatientProfileRequest
      const payload = {
        fullName: demographics.fullName,
        identityNumber: demographics.identityNumber,
        dateOfBirth: demographics.dateOfBirth ? new Date(demographics.dateOfBirth).toISOString() : new Date().toISOString(),
        gender: demographics.gender,
        phoneNumber: demographics.phoneNumber,
        email: demographics.email,
        address: demographics.address,
        bloodType: bloodType,
        vitals: {
          heightCm: heightCm ? parseFloat(heightCm) : null,
          weightKg: weightKg ? parseFloat(weightKg) : null,
          bloodPressure: bloodPressure.trim() || '120/80',
          heartRateBpm: null,
          temperatureC: null,
          spo2Percent: null
        },
        medicalHistory: hasNoMedicalHistory
          ? 'Không có tiền sử bệnh lý mạn tính'
          : [
              ...selectedConditions,
              ...(medicalHistoryNotes.trim() ? [medicalHistoryNotes.trim()] : [])
            ].join('; ') || 'Không có',
        coagulationDisorders: hasNoCoagulation
          ? 'Không có'
          : coagulationNotes.trim() || 'Có tiền sử rối loạn đông máu',
        currentMedications: hasNoMedications
          ? 'Không có'
          : medicationsNotes.trim() || 'Không có',
        allergies: hasNoAllergies
          ? ['Không có tiền sử dị ứng đã biết (NKDA)']
          : [
              ...selectedAllergies,
              ...(allergiesNotes.trim() ? [allergiesNotes.trim()] : [])
            ],
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        emergencyContactRelationship: emergencyContactRelationship.trim() || 'Người thân'
      };

      // Call API
      await updateMyPatientInformation(payload);

      // Update local storage & Auth context
      const stored = getStoredUser() || {};
      const updatedUser = {
        ...stored,
        medicalProfileCompleted: true,
        bloodType: bloodType
      };
      localStorage.setItem('bms_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('bms_user', JSON.stringify(updatedUser));
      if (updateUser) {
        updateUser({ medicalProfileCompleted: true, bloodType: bloodType });
      }

      setSuccessMessage('Hồ sơ bệnh án và tiền sử sức khỏe ban đầu đã được lưu thành công! Đang chuyển hướng bạn đến Trang Chủ...');

      // Redirect to Home Page (/home)
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 700);

    } catch (err) {
      setErrorMessage(err.message || 'Không thể lưu hồ sơ bệnh án. Vui lòng kiểm tra lại kết nối và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <div className="mt-3 text-muted fw-semibold">Đang tải hồ sơ y tế từ máy chủ BMS...</div>
      </div>
    );
  }

  return (
    <div className="initial-setup-page">
      {/* Hero Directive Banner */}
      <div className="setup-hero-banner">
        <div className="d-flex align-items-center gap-2 mb-2">
          <Badge bg="light" text="primary" className="fw-bold px-3 py-2 rounded-pill">
            <FaShieldAlt className="me-1" /> Quy định Bộ Y Tế & ISO 15189
          </Badge>
          <Badge bg="warning" text="dark" className="fw-bold px-3 py-2 rounded-pill">
            Bắt Buộc Nhập Lần Đầu
          </Badge>
        </div>
        <h2 className="h3 fw-bold mb-2">
          Thiết Lập Hồ Sơ Sức Khỏe & Tiền Sử Bệnh Án
        </h2>
        <p className="mb-0 text-white-50" style={{ maxWidth: '840px', fontSize: '14.5px', lineHeight: 1.5 }}>
          Chào mừng bạn đến với Cổng Y Tế BMS. Theo <strong>Luật Khám bệnh, chữa bệnh 2023</strong> và <strong>Thông tư 46/2018/TT-BYT</strong>, 
          bệnh nhân cần hoàn tất các thông tin lâm sàng tối thiểu nhằm đảm bảo an toàn sinh học tiền phân tích, đối chiếu kết quả xét nghiệm 
          và liên hệ kịp thời trong các tình huống y khoa khẩn cấp.
        </p>
      </div>

      {/* Global Notifications */}
      {errorMessage && (
        <Alert variant="danger" className="d-flex align-items-center gap-2 shadow-sm mb-4" dismissible onClose={() => setErrorMessage('')}>
          <FaExclamationTriangle className="flex-shrink-0 fs-5" />
          <div>{errorMessage}</div>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="d-flex align-items-center gap-2 shadow-sm mb-4">
          <FaCheckCircle className="flex-shrink-0 fs-5" />
          <div>{successMessage}</div>
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* SECTION 1: Administrative Identification (Verified & Read-only) */}
        <div className="setup-section-card">
          <div className="setup-section-header">
            <h2 className="setup-section-title">
              <span className="setup-section-icon bg-primary bg-opacity-10 text-primary">
                <FaIdCard />
              </span>
              1. Thông Tin Định Danh Bệnh Nhân (Đã Xác Thực CCCD)
            </h2>
            <Badge bg="success" className="d-flex align-items-center gap-1">
              <FaCheckCircle size={11} /> Đã Xác Minh
            </Badge>
          </div>
          <div className="setup-section-body">
            <Row className="g-3">
              <Col md={4} sm={6}>
                <div className="identity-meta-card">
                  <div className="identity-meta-label">Họ và tên bệnh nhân</div>
                  <div className="identity-meta-value">{demographics.fullName}</div>
                </div>
              </Col>
              <Col md={4} sm={6}>
                <div className="identity-meta-card">
                  <div className="identity-meta-label">Số CCCD / Định danh (12 số)</div>
                  <div className="identity-meta-value font-monospace">{demographics.identityNumber}</div>
                </div>
              </Col>
              <Col md={4} sm={6}>
                <div className="identity-meta-card">
                  <div className="identity-meta-label">Ngày sinh & Giới tính</div>
                  <div className="identity-meta-value">
                    {demographics.dateOfBirth || '--'} ({demographics.gender})
                  </div>
                </div>
              </Col>
              <Col md={4} sm={6}>
                <div className="identity-meta-card">
                  <div className="identity-meta-label">Số điện thoại liên hệ</div>
                  <div className="identity-meta-value font-monospace">{demographics.phoneNumber}</div>
                </div>
              </Col>
              <Col md={8} sm={12}>
                <div className="identity-meta-card">
                  <div className="identity-meta-label">Địa chỉ thường trú</div>
                  <div className="identity-meta-value">{demographics.address || 'Chưa cập nhật'}</div>
                </div>
              </Col>
            </Row>

            <Row className="g-3 mt-1">
              <Col md={6}>
                <Form.Group controlId="healthInsuranceNumber">
                  <Form.Label className="small fw-semibold text-secondary">
                    Mã thẻ BHYT (Bảo hiểm Y Tế - Tùy chọn)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ví dụ: GD4792010099881 (15 ký tự)"
                    value={healthInsuranceNumber}
                    onChange={(e) => setHealthInsuranceNumber(e.target.value.toUpperCase())}
                    maxLength={15}
                  />
                  <Form.Text className="text-muted small">
                    Nhập mã thẻ BHYT để phục vụ đồng bộ thanh toán và danh mục BHYT chi trả.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="occupation">
                  <Form.Label className="small fw-semibold text-secondary">
                    Nghề nghiệp / Lĩnh vực công tác (Tùy chọn)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ví dụ: Kỹ sư, Giáo viên, Nhân viên văn phòng..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </div>

        {/* SECTION 2: Blood Type & Coagulation Disorders (Mandatory) */}
        <div className="setup-section-card">
          <div className="setup-section-header">
            <h2 className="setup-section-title">
              <span className="setup-section-icon bg-danger bg-opacity-10 text-danger">
                <FaTint />
              </span>
              2. Nhóm Máu Hệ ABO / Rh & Tiền Sử Rối Loạn Đông Máu <span className="text-danger">*</span>
            </h2>
            <span className="badge bg-danger bg-opacity-10 text-danger fw-bold">Bắt Buộc</span>
          </div>
          <div className="setup-section-body">
            <Form.Label className="fw-semibold text-dark mb-2">
              Chọn Nhóm Máu Hiện Tại Của Bạn:
            </Form.Label>
            <div className="blood-type-grid mb-3">
              {BLOOD_TYPES.map((bt) => (
                <div
                  key={bt.code}
                  className={`blood-type-btn ${bloodType === bt.code ? 'active' : ''}`}
                  onClick={() => setBloodType(bt.code)}
                >
                  <div className="blood-type-name">{bt.code}</div>
                  <div className="blood-type-desc">{bt.desc}</div>
                </div>
              ))}
            </div>
            {errors.bloodType && (
              <div className="text-danger small fw-semibold mb-3">{errors.bloodType}</div>
            )}

            <hr className="my-3 text-muted" />

            <Form.Label className="fw-semibold text-dark mb-2">
              Tiền Sử Rối Loạn Đông Máu & Dùng Thuốc Chống Đông:
            </Form.Label>
            <Form.Check
              type="checkbox"
              id="no-coagulation"
              label={
                <span className="fw-semibold text-dark">
                  Tôi KHÔNG CÓ tiền sử rối loạn đông máu (máu khó đông, xuất huyết giảm tiểu cầu, v.v.)
                </span>
              }
              checked={hasNoCoagulation}
              onChange={(e) => {
                setHasNoCoagulation(e.target.checked);
                if (e.target.checked) setCoagulationNotes('');
              }}
              className="mb-2"
            />

            {!hasNoCoagulation && (
              <div className="mt-2 p-3 bg-light rounded-3 border">
                <Form.Label className="small fw-bold text-danger">
                  Mô tả tình trạng rối loạn đông máu hoặc thuốc chống đông đang sử dụng:
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ví dụ: Bệnh Hemophilia A, Giảm tiểu cầu vô căn, Hoặc đang uống thuốc Warfarin/Sintrom/Aspirin..."
                  value={coagulationNotes}
                  onChange={(e) => setCoagulationNotes(e.target.value)}
                />
                <small className="text-muted mt-1 d-block">
                  * Bác sĩ xét nghiệm cần thông tin này để áp dụng quy trình an toàn khi lấy mẫu máu tĩnh mạch.
                </small>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Allergies (Mandatory Declaration) */}
        <div className="setup-section-card">
          <div className="setup-section-header">
            <h2 className="setup-section-title">
              <span className="setup-section-icon bg-warning bg-opacity-10 text-warning">
                <FaAllergies />
              </span>
              3. Tiền Sử Dị Ứng Thuốc, Hóa Chất & Thực Phẩm <span className="text-danger">*</span>
            </h2>
            <span className="badge bg-warning bg-opacity-10 text-dark fw-bold">Quan Trọng</span>
          </div>
          <div className="setup-section-body">
            <Form.Check
              type="checkbox"
              id="no-allergies"
              label={
                <span className="fw-bold text-success">
                  Tôi KHÔNG CÓ tiền sử dị ứng đã biết (NKDA - No Known Drug Allergies)
                </span>
              }
              checked={hasNoAllergies}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasNoAllergies(checked);
                if (checked) {
                  setSelectedAllergies([]);
                  setAllergiesNotes('');
                }
              }}
              className="mb-3"
            />

            <div className="small fw-semibold text-muted mb-1">
              Hoặc chọn nhanh các tác nhân dị ứng (nếu có):
            </div>
            <div className="fast-tag-group mb-3">
              {COMMON_ALLERGIES.map((alg) => {
                const isSelected = selectedAllergies.includes(alg);
                return (
                  <div
                    key={alg}
                    className={`fast-tag-item ${isSelected ? 'selected' : ''} ${hasNoAllergies ? 'disabled' : ''}`}
                    onClick={() => !hasNoAllergies && toggleAllergy(alg)}
                  >
                    {alg}
                  </div>
                );
              })}
            </div>

            {!hasNoAllergies && (
              <Form.Group controlId="allergiesNotes" className="mt-2">
                <Form.Label className="small fw-semibold text-secondary">
                  Ghi chú chi tiết biểu hiện dị ứng khác (nếu có):
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ví dụ: Nổi mề đay khi uống Amoxicillin, khó thở khi ăn tôm cua..."
                  value={allergiesNotes}
                  onChange={(e) => setAllergiesNotes(e.target.value)}
                />
              </Form.Group>
            )}
          </div>
        </div>

        {/* SECTION 4: Medical History & Chronic Conditions */}
        <div className="setup-section-card">
          <div className="setup-section-header">
            <h2 className="setup-section-title">
              <span className="setup-section-icon bg-info bg-opacity-10 text-info">
                <FaNotesMedical />
              </span>
              4. Tiền Sử Bệnh Lý Bản Thân & Bệnh Mạn Tính <span className="text-danger">*</span>
            </h2>
            <span className="badge bg-info bg-opacity-10 text-info fw-bold">Theo Dõi Trọn Đời</span>
          </div>
          <div className="setup-section-body">
            <Form.Check
              type="checkbox"
              id="no-medical-history"
              label={
                <span className="fw-bold text-success">
                  Tôi KHÔNG CÓ tiền sử mắc các bệnh lý mạn tính
                </span>
              }
              checked={hasNoMedicalHistory}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasNoMedicalHistory(checked);
                if (checked) {
                  setSelectedConditions([]);
                  setMedicalHistoryNotes('');
                }
              }}
              className="mb-3"
            />

            <div className="small fw-semibold text-muted mb-1">
              Hoặc chọn các bệnh lý đã từng hoặc đang được chẩn đoán:
            </div>
            <div className="fast-tag-group mb-3">
              {COMMON_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <div
                    key={cond}
                    className={`fast-tag-item ${isSelected ? 'selected' : ''} ${hasNoMedicalHistory ? 'disabled' : ''}`}
                    onClick={() => !hasNoMedicalHistory && toggleCondition(cond)}
                  >
                    {cond}
                  </div>
                );
              })}
            </div>

            {!hasNoMedicalHistory && (
              <Form.Group controlId="medicalHistoryNotes" className="mt-2">
                <Form.Label className="small fw-semibold text-secondary">
                  Bệnh lý khác hoặc tiền sử phẫu thuật / can thiệp (nếu có):
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ví dụ: Từng mổ ruột thừa năm 2020, đang điều trị viêm gan B theo phác đồ..."
                  value={medicalHistoryNotes}
                  onChange={(e) => setMedicalHistoryNotes(e.target.value)}
                />
              </Form.Group>
            )}
          </div>
        </div>

        {/* SECTION 5: Current Medications */}
        <div className="setup-section-card">
          <div className="setup-section-header">
            <h2 className="setup-section-title">
              <span className="setup-section-icon bg-primary bg-opacity-10 text-primary">
                <FaPills />
              </span>
              5. Thuốc Đang Sử Dụng Định Kỳ
            </h2>
            <span className="badge bg-secondary bg-opacity-10 text-secondary">Hiệu Chỉnh Xét Nghiệm</span>
          </div>
          <div className="setup-section-body">
            <Form.Check
              type="checkbox"
              id="no-medications"
              label={
                <span className="fw-semibold text-dark">
                  Hiện tại tôi KHÔNG sử dụng thuốc điều trị định kỳ
                </span>
              }
              checked={hasNoMedications}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasNoMedications(checked);
                if (checked) setMedicationsNotes('');
              }}
              className="mb-2"
            />

            {!hasNoMedications && (
              <div className="mt-2 p-3 bg-light rounded-3 border">
                <Form.Label className="small fw-bold text-dark">
                  Danh sách các loại thuốc, liều lượng đang dùng hàng ngày:
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ví dụ: Amlodipine 5mg (1 viên sáng), Metformin 500mg (2 viên sau ăn)..."
                  value={medicationsNotes}
                  onChange={(e) => setMedicationsNotes(e.target.value)}
                />
                <small className="text-muted mt-1 d-block">
                  * Thuốc đang sử dụng có thể ảnh hưởng đến kết quả sinh hóa (đường huyết, men gan, chức năng thận...).
                </small>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 6: Physical Vitals & Live BMI */}
        <div className="setup-section-card">
          <div className="setup-section-header">
            <h2 className="setup-section-title">
              <span className="setup-section-icon bg-success bg-opacity-10 text-success">
                <FaHeartbeat />
              </span>
              6. Thể Trạng Cơ Bản & Chỉ Số Sinh Trắc Học Ban Đầu
            </h2>
            <span className="badge bg-success bg-opacity-10 text-success fw-bold">Đánh Giá BMI</span>
          </div>
          <div className="setup-section-body">
            <Row className="g-3 align-items-center">
              <Col md={3} sm={6}>
                <Form.Group controlId="heightCm">
                  <Form.Label className="small fw-semibold text-secondary">
                    Chiều cao (cm)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={50}
                    max={250}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="Ví dụ: 170"
                  />
                </Form.Group>
              </Col>

              <Col md={3} sm={6}>
                <Form.Group controlId="weightKg">
                  <Form.Label className="small fw-semibold text-secondary">
                    Cân nặng (kg)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={10}
                    max={250}
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="Ví dụ: 65"
                  />
                </Form.Group>
              </Col>

              <Col md={3} sm={6}>
                <Form.Group controlId="bloodPressure">
                  <Form.Label className="small fw-semibold text-secondary">
                    Huyết áp tham chiếu (mmHg)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ví dụ: 120/80"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                  />
                </Form.Group>
              </Col>

              <Col md={3} sm={6}>
                <div className="bmi-metric-box">
                  <div className="small text-muted fw-bold">CHỈ SỐ BMI TỰ ĐỘNG</div>
                  <div className="bmi-value-display my-1">{bmiCalculation.value}</div>
                  <Badge bg={bmiCalculation.color} className="fw-bold px-2 py-1">
                    {bmiCalculation.label}
                  </Badge>
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* SECTION 7: Emergency Contact (Mandatory by MOH) */}
        <div className="setup-section-card">
          <div className="setup-section-header">
            <h2 className="setup-section-title">
              <span className="setup-section-icon bg-danger bg-opacity-10 text-danger">
                <FaPhoneAlt />
              </span>
              7. Thông Tin Người Liên Hệ Khẩn Cấp (Quy Định Bộ Y Tế) <span className="text-danger">*</span>
            </h2>
            <span className="badge bg-danger bg-opacity-10 text-danger fw-bold">Bắt Buộc</span>
          </div>
          <div className="setup-section-body">
            <Alert variant="info" className="small d-flex align-items-center gap-2 mb-3 py-2">
              <FaInfoCircle />
              <span>
                Phòng xét nghiệm BMS cần thông tin liên hệ khẩn cấp để thông báo ngay lập tức khi phát hiện 
                <strong> Giá trị báo động (Panic/Critical Value)</strong> cần can thiệp y tế khẩn cấp.
              </span>
            </Alert>

            <Row className="g-3">
              <Col md={4} sm={12}>
                <Form.Group controlId="emergencyContactName">
                  <Form.Label className="small fw-semibold text-secondary">
                    Họ và tên người thân / liên hệ <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn Bình"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    isInvalid={!!errors.emergencyContactName}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.emergencyContactName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={4} sm={6}>
                <Form.Group controlId="emergencyContactRelationship">
                  <Form.Label className="small fw-semibold text-secondary">
                    Mối quan hệ với bệnh nhân
                  </Form.Label>
                  <Form.Select
                    value={emergencyContactRelationship}
                    onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4} sm={6}>
                <Form.Group controlId="emergencyContactPhone">
                  <Form.Label className="small fw-semibold text-secondary">
                    Số điện thoại khẩn cấp (10 số) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="Ví dụ: 0912345678"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    isInvalid={!!errors.emergencyContactPhone}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.emergencyContactPhone}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </div>
        </div>

        {/* SECTION 8: Legal Consent & Submit */}
        <div className="setup-section-card border-primary">
          <div className="setup-section-body">
            <Form.Check
              type="checkbox"
              id="consentConfirmed"
              label={
                <span className="fw-semibold text-dark">
                  Tôi xin cam đoan các thông tin tiền sử bệnh án, dị ứng và thể trạng trên được khai báo trung thực, 
                  chính xác theo quy định của <strong>Luật Khám bệnh, chữa bệnh 2023</strong> để làm căn cứ lập Hồ sơ bệnh án điện tử và 
                  phục vụ quá trình phân tích, biện luận kết quả xét nghiệm y khoa tại BMS.
                </span>
              }
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              isInvalid={!!errors.consent}
              className="mb-2"
            />
            {errors.consent && (
              <div className="text-danger small fw-semibold ps-4">{errors.consent}</div>
            )}
          </div>
        </div>

        {/* Clean In-Flow Action Footer Bar */}
        <div className="setup-actions-bar">
          <div className="d-flex align-items-center gap-2 text-muted small">
            <FaShieldAlt className="text-success fs-5 flex-shrink-0" />
            <span>Dữ liệu y tế được mã hóa và bảo mật nghiêm ngặt theo chuẩn HIPAA & QĐ 2429/QĐ-BYT.</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="d-flex align-items-center justify-content-center gap-2 fw-bold px-4 py-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Đang Lưu Hồ Sơ...</span>
              </>
            ) : (
              <>
                <FaSave />
                <span>Lưu Hồ Sơ Sức Khỏe & Tiếp Tục Đến Trang Chủ</span>
                <FaArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}
