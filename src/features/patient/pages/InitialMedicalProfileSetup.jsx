/**
 * @file InitialMedicalProfileSetup.jsx
 * @description Mandatory First-Time Clinical Intake Screen for Patients.
 * Conforms to:
 * - Ministry of Health: Thông tư 46/2018/TT-BYT & QĐ 2429/QĐ-BYT.
 * - ISO 15189:2022 Pre-analytical Quality Criteria.
 * - Minimalist, high-contrast, zero-shadow clinical document design.
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
  Spinner
} from 'react-bootstrap';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaSave,
  FaArrowRight,
  FaHeartbeat,
  FaTint,
  FaAllergies,
  FaNotesMedical,
  FaPills,
  FaPhoneAlt,
  FaIdCard,
  FaCheck
} from 'react-icons/fa';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getStoredUser } from '../../../constants/roles';
import {
  getMyPatientInformation,
  updateMyPatientInformation
} from '../../../services/patientService';
import './InitialMedicalProfileSetup.css';

// Blood type options (Hệ ABO/Rh)
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

// Quick coagulation flags
const COAGULATION_PRESETS = [
  'Bệnh Hemophilia (máu khó đông)',
  'Xuất huyết giảm tiểu cầu',
  'Dễ bầm tím / Chảy máu kéo dài',
  'Đang dùng thuốc chống đông (Warfarin / Sintrom / Aspirin)'
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
      return { value: '--', label: 'Chưa đủ dữ liệu', bg: '#F1F5F9', color: '#64748B' };
    }
    const hMeter = h / 100;
    const val = (w / (hMeter * hMeter)).toFixed(1);
    const num = parseFloat(val);

    if (num < 18.5) {
      return { value: val, label: 'Thiếu cân (BMI < 18.5)', bg: '#FEF3C7', color: '#92400E' };
    } else if (num < 23.0) {
      return { value: val, label: 'Bình thường (WHO Châu Á)', bg: '#DCFCE7', color: '#166534' };
    } else if (num < 25.0) {
      return { value: val, label: 'Tiền béo phì (Thừa cân nhẹ)', bg: '#FEF3C7', color: '#92400E' };
    } else if (num < 30.0) {
      return { value: val, label: 'Béo phì độ 1', bg: '#FEE2E2', color: '#991B1B' };
    } else {
      return { value: val, label: 'Béo phì độ 2 (Nguy cơ cao)', bg: '#FEE2E2', color: '#991B1B' };
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

  const toggleCoagulationPreset = (preset) => {
    setHasNoCoagulation(false);
    setCoagulationNotes(prev => {
      if (prev.includes(preset)) {
        return prev.replace(preset, '').replace(/;\s*$/, '').trim();
      }
      return prev ? `${prev}; ${preset}` : preset;
    });
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

      await updateMyPatientInformation(payload);

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
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" style={{ width: '2.5rem', height: '2.5rem' }} />
        <div className="mt-3 text-secondary small fw-medium">Đang tải hồ sơ y tế từ máy chủ BMS...</div>
      </div>
    );
  }

  return (
    <div className="clinical-intake-canvas">
      <div className="clinical-intake-sheet">
        {/* Official Masthead (Header) */}
        <div className="clinical-intake-masthead">
          <div className="clinical-intake-meta-bar">
            <div className="clinical-intake-badge-group">
              <span className="clinical-badge-official">
                <FaShieldAlt /> TIÊU CHUẨN ISO 15189:2022 &amp; TT 46/2018/TT-BYT
              </span>
              <span className="clinical-badge-mandatory">
                BẮT BUỘC KHAI BÁO
              </span>
            </div>
            <div className="clinical-intake-code">
              MÃ BỆNH NHÂN: <strong className="text-dark">{demographics.patientCode || 'PAT-VN'}</strong>
            </div>
          </div>

          <h1 className="clinical-intake-title">
            Phiếu Khai Báo Hồ Sơ Bệnh Án &amp; Tiền Sử Lâm Sàng
          </h1>
          <p className="clinical-intake-subtitle">
            Theo <strong>Luật Khám bệnh, chữa bệnh 2023</strong> và quy chuẩn tiền phân tích xét nghiệm máu, 
            bệnh nhân cần hoàn tất thông tin lâm sàng nhằm bảo đảm an toàn truyền mẫu, đối chiếu dải tham chiếu sinh hóa 
            và kích hoạt báo động khi xảy ra tình huống y khoa khẩn cấp.
          </p>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="px-4 pt-3">
            <Alert variant="danger" className="d-flex align-items-center gap-2 mb-0" dismissible onClose={() => setErrorMessage('')}>
              <FaExclamationTriangle className="flex-shrink-0" />
              <div className="small fw-medium">{errorMessage}</div>
            </Alert>
          </div>
        )}

        {successMessage && (
          <div className="px-4 pt-3">
            <Alert variant="success" className="d-flex align-items-center gap-2 mb-0">
              <FaCheckCircle className="flex-shrink-0" />
              <div className="small fw-medium">{successMessage}</div>
            </Alert>
          </div>
        )}

        <Form onSubmit={handleSubmit} className="clinical-intake-body">
          {/* SECTION 1: Patient Identification (Verified & Read-only) */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">01</span>
                <span>Thông Tin Định Danh Bệnh Nhân (Đã Xác Thực CCCD)</span>
              </h2>
              <span className="clinical-section-tag">
                <FaCheckCircle className="text-success me-1" /> Đã Đối Soát
              </span>
            </div>

            <div className="clinical-demographics-grid">
              <div className="clinical-field-readonly-box">
                <div className="clinical-readonly-label">Họ và tên bệnh nhân</div>
                <div className="clinical-readonly-value">{demographics.fullName || '—'}</div>
              </div>

              <div className="clinical-field-readonly-box">
                <div className="clinical-readonly-label">Số CCCD / Định danh (12 số)</div>
                <div className="clinical-readonly-value font-monospace">{demographics.identityNumber || 'Chưa cập nhật'}</div>
              </div>

              <div className="clinical-field-readonly-box">
                <div className="clinical-readonly-label">Ngày sinh &amp; Giới tính</div>
                <div className="clinical-readonly-value">
                  {demographics.dateOfBirth || '—'} ({demographics.gender})
                </div>
              </div>

              <div className="clinical-field-readonly-box">
                <div className="clinical-readonly-label">Số điện thoại liên hệ</div>
                <div className="clinical-readonly-value font-monospace">{demographics.phoneNumber || '—'}</div>
              </div>

              <div className="clinical-field-readonly-box" style={{ gridColumn: 'span 2' }}>
                <div className="clinical-readonly-label">Địa chỉ thường trú</div>
                <div className="clinical-readonly-value">{demographics.address || 'Chưa cập nhật'}</div>
              </div>
            </div>

            <Row className="g-3 mt-1">
              <Col md={6}>
                <Form.Group controlId="healthInsuranceNumber">
                  <label className="clinical-label">
                    Mã thẻ BHYT (Bảo hiểm Y Tế - Tùy chọn)
                  </label>
                  <Form.Control
                    type="text"
                    className="clinical-input"
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
                  <label className="clinical-label">
                    Nghề nghiệp / Lĩnh vực công tác (Tùy chọn)
                  </label>
                  <Form.Control
                    type="text"
                    className="clinical-input"
                    placeholder="Ví dụ: Kỹ sư, Giáo viên, Nhân viên văn phòng..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 2: Blood Type (Hệ ABO / Rh) */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">02</span>
                <span>Nhóm Máu Hệ ABO / Rh <span className="text-danger">*</span></span>
              </h2>
              <span className="clinical-section-tag required">Bắt Buộc Khai Báo</span>
            </div>

            <div>
              <span className="clinical-label mb-2">Chọn nhóm máu hiện tại của bạn:</span>
              <div className="blood-type-grid-clinical">
                {BLOOD_TYPES.map((bt) => {
                  const isActive = bloodType === bt.code;
                  return (
                    <div
                      key={bt.code}
                      className={`blood-type-cell ${isActive ? 'active' : ''}`}
                      onClick={() => setBloodType(bt.code)}
                    >
                      <div className="blood-type-cell-code">
                        {isActive && <FaCheck className="me-1" size={13} />}
                        {bt.label}
                      </div>
                      <div className="blood-type-cell-desc">{bt.desc}</div>
                    </div>
                  );
                })}
              </div>
              {errors.bloodType && (
                <div className="text-danger small fw-semibold mt-2">{errors.bloodType}</div>
              )}
            </div>
          </div>

          {/* SECTION 3: Vitals & Automated BMI */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">03</span>
                <span>Chỉ Số Thể Trạng Ban Đầu &amp; Đánh Giá BMI <span className="text-danger">*</span></span>
              </h2>
              <span className="clinical-section-tag required">Tham Chiếu Lâm Sàng</span>
            </div>

            <div className="vitals-grid-clinical">
              <div>
                <label className="clinical-label" htmlFor="heightCm">
                  Chiều cao (cm) <span className="text-danger">*</span>
                </label>
                <Form.Control
                  id="heightCm"
                  type="number"
                  min={50}
                  max={250}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="Ví dụ: 170"
                  className="clinical-input"
                />
              </div>

              <div>
                <label className="clinical-label" htmlFor="weightKg">
                  Cân nặng (kg) <span className="text-danger">*</span>
                </label>
                <Form.Control
                  id="weightKg"
                  type="number"
                  min={10}
                  max={250}
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Ví dụ: 65"
                  className="clinical-input"
                />
              </div>

              <div>
                <label className="clinical-label" htmlFor="bloodPressure">
                  Huyết áp tham chiếu (mmHg)
                </label>
                <Form.Control
                  id="bloodPressure"
                  type="text"
                  placeholder="120/80"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  className="clinical-input"
                />
              </div>

              <div className="bmi-indicator-card">
                <div className="bmi-indicator-label">CHỈ SỐ BMI TỰ ĐỘNG</div>
                <div className="bmi-indicator-value">{bmiCalculation.value} kg/m²</div>
                <div
                  className="bmi-badge-clinical"
                  style={{ backgroundColor: bmiCalculation.bg, color: bmiCalculation.color }}
                >
                  {bmiCalculation.label}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Coagulation History */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">04</span>
                <span>Tiền Sử Rối Loạn Đông Máu &amp; Thuốc Kháng Đông <span className="text-danger">*</span></span>
              </h2>
              <span className="clinical-section-tag required">An Toàn Tiền Phân Tích</span>
            </div>

            <div className="clinical-check-wrapper">
              <Form.Check
                type="checkbox"
                id="no-coagulation"
                label={
                  <span className="clinical-check-label">
                    Tôi KHÔNG CÓ tiền sử rối loạn đông máu (máu khó đông, xuất huyết giảm tiểu cầu, v.v.)
                  </span>
                }
                checked={hasNoCoagulation}
                onChange={(e) => {
                  setHasNoCoagulation(e.target.checked);
                  if (e.target.checked) setCoagulationNotes('');
                }}
              />
            </div>

            {!hasNoCoagulation && (
              <div className="clinical-sub-field-box">
                <div className="small text-muted fw-semibold mb-2">
                  Chọn nhanh tiền sử đông máu hoặc thuốc chống đông đang sử dụng:
                </div>
                <div className="clinical-chips-group mb-3">
                  {COAGULATION_PRESETS.map((preset) => {
                    const isSelected = coagulationNotes.includes(preset);
                    return (
                      <div
                        key={preset}
                        className={`clinical-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleCoagulationPreset(preset)}
                      >
                        {isSelected && <FaCheck size={11} />}
                        {preset}
                      </div>
                    );
                  })}
                </div>

                <label className="clinical-label text-danger" htmlFor="coagulationNotes">
                  Mô tả chi tiết tình trạng rối loạn đông máu hoặc thuốc đang dùng:
                </label>
                <Form.Control
                  id="coagulationNotes"
                  as="textarea"
                  rows={2}
                  className="clinical-input"
                  placeholder="Ví dụ: Bệnh Hemophilia A, Giảm tiểu cầu vô căn, hoặc đang uống thuốc Warfarin/Sintrom/Aspirin..."
                  value={coagulationNotes}
                  onChange={(e) => setCoagulationNotes(e.target.value)}
                />
                <small className="text-muted mt-1 d-block">
                  * Kỹ thuật viên cần thông tin này để chuẩn bị băng ép chuyên dụng và theo dõi sau lấy máu tĩnh mạch.
                </small>
              </div>
            )}
          </div>

          {/* SECTION 5: Chronic Medical History */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">05</span>
                <span>Tiền Sử Bệnh Lý Nội Khoa Mạn Tính <span className="text-danger">*</span></span>
              </h2>
              <span className="clinical-section-tag required">Bệnh Sử</span>
            </div>

            <div className="clinical-check-wrapper">
              <Form.Check
                type="checkbox"
                id="no-medical-history"
                label={
                  <span className="clinical-check-label text-success">
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
              />
            </div>

            <div className="small text-muted fw-semibold">
              Hoặc chọn các bệnh lý đã từng hoặc đang được điều trị:
            </div>
            <div className="clinical-chips-group">
              {COMMON_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <div
                    key={cond}
                    className={`clinical-chip ${isSelected ? 'active' : ''} ${hasNoMedicalHistory ? 'disabled' : ''}`}
                    onClick={() => !hasNoMedicalHistory && toggleCondition(cond)}
                  >
                    {isSelected && <FaCheck size={11} />}
                    {cond}
                  </div>
                );
              })}
            </div>

            {!hasNoMedicalHistory && (
              <div className="mt-3">
                <label className="clinical-label" htmlFor="medicalHistoryNotes">
                  Bệnh lý khác hoặc tiền sử phẫu thuật / can thiệp (nếu có):
                </label>
                <Form.Control
                  id="medicalHistoryNotes"
                  as="textarea"
                  rows={2}
                  className="clinical-input"
                  placeholder="Ví dụ: Phẫu thuật ruột thừa năm 2021, đang điều trị viêm gan B theo phác đồ..."
                  value={medicalHistoryNotes}
                  onChange={(e) => setMedicalHistoryNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* SECTION 6: Allergies */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">06</span>
                <span>Tiền Sử Dị Ứng Thuốc, Hóa Chất &amp; Thực Phẩm <span className="text-danger">*</span></span>
              </h2>
              <span className="clinical-section-tag required">An Toàn Dược Lâm Sàng</span>
            </div>

            <div className="clinical-check-wrapper">
              <Form.Check
                type="checkbox"
                id="no-allergies"
                label={
                  <span className="clinical-check-label text-success">
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
              />
            </div>

            <div className="small text-muted fw-semibold">
              Hoặc chọn nhanh các tác nhân dị ứng (nếu có):
            </div>
            <div className="clinical-chips-group">
              {COMMON_ALLERGIES.map((alg) => {
                const isSelected = selectedAllergies.includes(alg);
                return (
                  <div
                    key={alg}
                    className={`clinical-chip ${isSelected ? 'active' : ''} ${hasNoAllergies ? 'disabled' : ''}`}
                    onClick={() => !hasNoAllergies && toggleAllergy(alg)}
                  >
                    {isSelected && <FaCheck size={11} />}
                    {alg}
                  </div>
                );
              })}
            </div>

            {!hasNoAllergies && (
              <div className="mt-3">
                <label className="clinical-label" htmlFor="allergiesNotes">
                  Ghi chú chi tiết biểu hiện dị ứng khác (nếu có):
                </label>
                <Form.Control
                  id="allergiesNotes"
                  type="text"
                  className="clinical-input"
                  placeholder="Ví dụ: Nổi mề đay khi uống Amoxicillin, khó thở khi ăn hải sản..."
                  value={allergiesNotes}
                  onChange={(e) => setAllergiesNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* SECTION 7: Current Medications */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">07</span>
                <span>Thuốc Đang Sử Dụng Định Kỳ</span>
              </h2>
              <span className="clinical-section-tag">Hiệu Chỉnh Kết Quả</span>
            </div>

            <div className="clinical-check-wrapper">
              <Form.Check
                type="checkbox"
                id="no-medications"
                label={
                  <span className="clinical-check-label">
                    Hiện tại tôi KHÔNG sử dụng thuốc điều trị định kỳ
                  </span>
                }
                checked={hasNoMedications}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasNoMedications(checked);
                  if (checked) setMedicationsNotes('');
                }}
              />
            </div>

            {!hasNoMedications && (
              <div className="clinical-sub-field-box">
                <label className="clinical-label" htmlFor="medicationsNotes">
                  Danh sách các loại thuốc, liều lượng đang dùng hàng ngày:
                </label>
                <Form.Control
                  id="medicationsNotes"
                  as="textarea"
                  rows={2}
                  className="clinical-input"
                  placeholder="Ví dụ: Amlodipine 5mg (1 viên sáng), Metformin 500mg (2 viên sau ăn)..."
                  value={medicationsNotes}
                  onChange={(e) => setMedicationsNotes(e.target.value)}
                />
                <small className="text-muted mt-1 d-block">
                  * Thuốc điều trị có thể làm thay đổi kết quả đường huyết, men gan, chức năng đông máu hoặc điện giải.
                </small>
              </div>
            )}
          </div>

          {/* SECTION 8: Emergency Contact (Mandatory by MOH) */}
          <div className="clinical-section-block">
            <div className="clinical-section-header">
              <h2 className="clinical-section-heading">
                <span className="clinical-section-number">08</span>
                <span>Thông Tin Người Liên Hệ Khẩn Cấp <span className="text-danger">*</span></span>
              </h2>
              <span className="clinical-section-tag required">Bắt Buộc (QĐ Bộ Y Tế)</span>
            </div>

            <div className="p-3 bg-light rounded-2 border mb-3 small text-secondary">
              Phòng xét nghiệm BMS bắt buộc lưu thông tin liên hệ khẩn cấp nhằm xử trí kịp thời khi phát hiện 
              <strong className="text-danger"> Giá trị báo động y khoa (Panic/Critical Value)</strong> cần can thiệp cấp cứu.
            </div>

            <Row className="g-3">
              <Col md={4} sm={12}>
                <Form.Group controlId="emergencyContactName">
                  <label className="clinical-label">
                    Họ và tên người thân / liên hệ <span className="text-danger">*</span>
                  </label>
                  <Form.Control
                    type="text"
                    className="clinical-input"
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
                  <label className="clinical-label">
                    Mối quan hệ với bệnh nhân
                  </label>
                  <Form.Select
                    className="clinical-input"
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
                  <label className="clinical-label">
                    Số điện thoại khẩn cấp (10 số) <span className="text-danger">*</span>
                  </label>
                  <Form.Control
                    type="tel"
                    className="clinical-input"
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

          {/* SECTION 9: Legal Declaration & Submit */}
          <div className="clinical-legal-box">
            <Form.Check
              type="checkbox"
              id="consentConfirmed"
              label={
                <span className="clinical-legal-text">
                  Tôi xin cam đoan các thông tin tiền sử bệnh án, dị ứng và thể trạng trên được khai báo trung thực, 
                  chính xác theo quy định của <strong>Luật Khám bệnh, chữa bệnh 2023</strong> để làm căn cứ lập Hồ sơ bệnh án điện tử và 
                  phục vụ quá trình phân tích, biện luận kết quả xét nghiệm y khoa tại BMS.
                </span>
              }
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              isInvalid={!!errors.consent}
            />
            {errors.consent && (
              <div className="text-danger small fw-semibold ps-4 mt-2">{errors.consent}</div>
            )}
          </div>

          {/* Clean Flat Action Bar */}
          <div className="clinical-actions-bar">
            <div className="clinical-security-note">
              <FaShieldAlt className="text-success fs-5 flex-shrink-0" />
              <span>Dữ liệu y tế được bảo mật nghiêm ngặt theo tiêu chuẩn HIPAA &amp; Thông tư 46/2018/TT-BYT.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="clinical-btn-submit"
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Đang Lưu Hồ Sơ...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Lưu Hồ Sơ Sức Khỏe &amp; Tiếp Tục</span>
                  <FaArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
