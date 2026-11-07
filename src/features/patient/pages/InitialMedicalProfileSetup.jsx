/**
 * @file InitialMedicalProfileSetup.jsx
 * @description Mandatory First-Time Clinical Intake Screen for Patients.
 * Styled in the clean, flat, borderless Home design language (bms-status-chip, pure flat 2D).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Form,
  Alert,
  Spinner
} from 'react-bootstrap';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaSave,
  FaArrowRight,
  FaCheck
} from 'react-icons/fa';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getStoredUser } from '../../../constants/roles';
import {
  getMyPatientInformation,
  updateMyPatientInformation
} from '../../../services/patientService';
import {
  isNoCoagulation,
  isCanonicalNkda,
  isEntireListNkda,
  isAllergyMatch,
  splitAllergyTokens,
  splitFreeTextNotes,
  CANONICAL_NO_COAGULATION,
  CANONICAL_NKDA
} from '../utils/clinicalProfileUtils';
import './InitialMedicalProfileSetup.css';

// Blood type options (Hệ ABO/Rh) - Structured Matrix
const BLOOD_TYPES_RH_POS = [
  { code: 'O+', label: 'O+', sub: 'Rh+ Phổ biến (~45%)' },
  { code: 'A+', label: 'A+', sub: 'Rh+ Kháng nguyên A (~20%)' },
  { code: 'B+', label: 'B+', sub: 'Rh+ Kháng nguyên B (~30%)' },
  { code: 'AB+', label: 'AB+', sub: 'Rh+ Kháng nguyên AB (~5%)' }
];

const BLOOD_TYPES_RH_NEG = [
  { code: 'O-', label: 'O-', sub: 'Rh- Nhóm máu hiếm' },
  { code: 'A-', label: 'A-', sub: 'Rh- Nhóm máu hiếm' },
  { code: 'B-', label: 'B-', sub: 'Rh- Nhóm máu hiếm' },
  { code: 'AB-', label: 'AB-', sub: 'Rh- Cực kỳ hiếm' }
];

const BLOOD_TYPES = [...BLOOD_TYPES_RH_POS, ...BLOOD_TYPES_RH_NEG, { code: 'Unknown', label: 'Chưa rõ' }];

// Common allergy options (concise typography)
const COMMON_ALLERGIES = [
  'Penicillin / Amox',
  'Cephalosporin',
  'Aspirin / Paracetamol',
  'Kháng viêm NSAIDs',
  'Hải sản (Tôm, Cua)',
  'Trứng / Sữa / Đậu phộng',
  'Phấn hoa / Bụi nhà',
  'Cồn / Povidine'
];

// Common chronic medical conditions (concise typography)
const COMMON_CONDITIONS = [
  'Tăng huyết áp',
  'Đái tháo đường',
  'Bệnh tim mạch',
  'Viêm gan B / C',
  'Bệnh thận mạn',
  'Hen suyễn / COPD',
  'Mỡ máu cao',
  'Bệnh tuyến giáp',
  'Dạ dày / Trào ngược'
];

// Quick coagulation flags (concise clinical typography)
const COAGULATION_PRESETS = [
  'Hemophilia (máu khó đông)',
  'Xuất huyết giảm tiểu cầu',
  'Dễ chảy máu / bầm tím',
  'Dùng thuốc chống đông'
];

// Relationships
const RELATIONSHIPS = [
  'Vợ / Chồng',
  'Bố / Mẹ',
  'Con cái',
  'Anh / Chị / Em',
  'Người giám hộ',
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
    gender: '',
    phoneNumber: '',
    email: '',
    address: '',
    patientCode: ''
  });

  // Clinical profile state
  const [bloodType, setBloodType] = useState('');
  const [hasNoCoagulation, setHasNoCoagulation] = useState(false);
  const [coagulationNotes, setCoagulationNotes] = useState('');

  const [hasNoAllergies, setHasNoAllergies] = useState(false);
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [allergiesNotes, setAllergiesNotes] = useState('');

  const [hasNoMedicalHistory, setHasNoMedicalHistory] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [medicalHistoryNotes, setMedicalHistoryNotes] = useState('');

  const [hasNoMedications, setHasNoMedications] = useState(false);
  const [medicationsNotes, setMedicationsNotes] = useState('');

  // Vitals
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');

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
  const loadedRef = useRef(false);

  const clearError = (key) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  // 1. Fetch current profile once. A later user-object change must not wipe what the patient typed.
  useEffect(() => {
    async function loadData() {
      if (loadedRef.current) return;
      setLoading(true);
      try {
        const stored = getStoredUser() || user || {};

        let pat = null;
        try {
          pat = await getMyPatientInformation();
        } catch {
          // Fallback to stored user session
        }

        const fullName = pat?.fullName || stored?.fullName || stored?.FullName || '';
        const identityNumber = pat?.identityCardNumber || pat?.identityNumber || stored?.identityCardNumber || stored?.IdentityCardNumber || '';
        const phoneNumber = pat?.phoneNumber || pat?.phone || stored?.phoneNumber || stored?.PhoneNumber || '';
        const email = pat?.email || stored?.email || stored?.Email || '';
        const address = pat?.address || stored?.address || stored?.Address || '';
        const rawGender = pat?.gender || pat?.genderString || stored?.gender || stored?.Gender || '';
        const gender = ['Nam', 'Nữ', 'Khác', 'Male', 'Female', 'Other'].includes(rawGender) ? rawGender : '';
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

        if (pat?.bloodType) {
          setBloodType(pat.bloodType);
        }
        if (pat?.coagulationDisorders) {
          const isNo = isNoCoagulation(pat.coagulationDisorders);
          setHasNoCoagulation(isNo);
          setCoagulationNotes(isNo ? '' : pat.coagulationDisorders);
        }
        if (pat?.allergies && Array.isArray(pat.allergies) && pat.allergies.length > 0) {
          const isNkda = isEntireListNkda(pat.allergies);
          if (isNkda) {
            setHasNoAllergies(true);
            setSelectedAllergies([]);
            setAllergiesNotes('');
          } else {
            setHasNoAllergies(false);
            const loaded = [];
            const other = [];
            pat.allergies.forEach((a) => {
              if (isCanonicalNkda(a)) return; // skip redundant NKDA string if mixed with real allergies
              const matched = COMMON_ALLERGIES.find((ca) => isAllergyMatch(ca, a));
              if (matched) {
                if (!loaded.includes(matched)) loaded.push(matched);
              } else {
                other.push(a);
              }
            });
            setSelectedAllergies(loaded);
            if (other.length > 0) {
              setAllergiesNotes(other.join('; '));
            }
          }
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
        loadedRef.current = true;
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // 2. BMI Calculation (Unified WHO Asian Standard)
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
      return { value: val, label: 'Thiếu cân (< 18.5)', bg: '#FEF3C7', color: '#92400E' };
    } else if (num < 23.0) {
      return { value: val, label: 'Bình thường (WHO Châu Á 18.5 - 22.9)', bg: '#DCFCE7', color: '#166534' };
    } else if (num < 25.0) {
      return { value: val, label: 'Thừa cân (Tiền béo phì 23 - 24.9)', bg: '#FEF3C7', color: '#92400E' };
    } else {
      return { value: val, label: 'Béo phì (≥ 25.0)', bg: '#FEE2E2', color: '#991B1B' };
    }
  }, [heightCm, weightKg]);

  const toggleAllergy = (item) => {
    setHasNoAllergies(false);
    setSelectedAllergies((prev) => {
      const exists = prev.some((x) => isAllergyMatch(item, x));
      return exists ? prev.filter((x) => !isAllergyMatch(item, x)) : [...prev, item];
    });
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
    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;

    if (!/^[0-9]{12}$/.test((demographics.identityNumber || '').trim())) {
      newErrors.identityNumber = 'Số CCCD phải gồm đúng 12 chữ số.';
    }
    if (!phoneRegex.test((demographics.phoneNumber || '').trim())) {
      newErrors.phoneNumber = 'Số điện thoại liên hệ phải gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
    }
    if (!demographics.dateOfBirth) {
      newErrors.dateOfBirth = 'Ngày sinh là bắt buộc.';
    }
    if (!demographics.gender) {
      newErrors.gender = 'Giới tính là bắt buộc.';
    }
    if (!bloodType) {
      newErrors.bloodType = 'Chọn nhóm máu, hoặc chọn "Chưa rõ nhóm máu".';
    }
    if (!heightCm) {
      newErrors.heightCm = 'Chiều cao là bắt buộc.';
    }
    if (!weightKg) {
      newErrors.weightKg = 'Cân nặng là bắt buộc.';
    }
    if (!hasNoCoagulation && !coagulationNotes.trim()) {
      newErrors.coagulation = 'Chọn "Tôi không có tiền sử rối loạn đông máu", hoặc ghi tình trạng.';
    }
    if (!hasNoMedicalHistory && selectedConditions.length === 0 && !medicalHistoryNotes.trim()) {
      newErrors.medicalHistory = 'Chọn "Tôi không có tiền sử bệnh", hoặc chọn ít nhất một bệnh.';
    }
    if (!hasNoAllergies && selectedAllergies.length === 0 && !allergiesNotes.trim()) {
      newErrors.allergies = 'Chọn "Tôi không có dị ứng", hoặc chọn ít nhất một dị ứng.';
    }
    if (!hasNoMedications && !medicationsNotes.trim()) {
      newErrors.medications = 'Chọn "Tôi không dùng thuốc định kỳ", hoặc ghi tên thuốc.';
    }
    if (!emergencyContactName.trim() || emergencyContactName.trim().length < 2) {
      newErrors.emergencyContactName = 'Nhập họ tên người liên hệ khẩn cấp.';
    }
    if (!phoneRegex.test(emergencyContactPhone.trim())) {
      newErrors.emergencyContactPhone = 'Số điện thoại khẩn cấp phải gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
    }
    if (!consentConfirmed) {
      newErrors.consent = 'Cần tích ô cam đoan thông tin là chính xác.';
    }

    setErrors(newErrors);
    const messages = Object.values(newErrors);
    if (messages.length > 0) {
      setErrorMessage(messages.join(' '));
      const firstKey = Object.keys(newErrors)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  // 4. Save clinical intake
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        fullName: demographics.fullName,
        identityNumber: demographics.identityNumber,
        dateOfBirth: new Date(demographics.dateOfBirth).toISOString(),
        gender: demographics.gender,
        phoneNumber: demographics.phoneNumber,
        email: demographics.email,
        address: demographics.address,
        bloodType: bloodType,
        vitals: {
          heightCm: heightCm ? parseFloat(heightCm) : null,
          weightKg: weightKg ? parseFloat(weightKg) : null,
          bloodPressure: bloodPressure.trim() || null,
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
          ? CANONICAL_NO_COAGULATION
          : coagulationNotes.trim() || 'Có tiền sử rối loạn đông máu',
        currentMedications: hasNoMedications
          ? 'Không có'
          : medicationsNotes.trim() || 'Không có',
        allergies: hasNoAllergies
          ? [CANONICAL_NKDA]
          : [
              ...selectedAllergies,
              ...(allergiesNotes.trim() ? splitFreeTextNotes(allergiesNotes) : [])
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

      setSuccessMessage('Hồ sơ sức khỏe ban đầu đã được lưu thành công! Đang chuyển hướng bạn đến Trang Chủ...');

      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 700);

    } catch (err) {
      setErrorMessage(err.message || 'Không thể lưu hồ sơ bệnh án. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-3" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" style={{ width: '2.5rem', height: '2.5rem' }} />
        <div className="mt-3 text-secondary small fw-medium">Đang tải thông tin hồ sơ...</div>
      </div>
    );
  }

  return (
    <div className="bms-setup-page-wrap">
      <div className="bms-setup-card">
        {/* Masthead Header (Matching Home Style) */}
        <div className="bms-setup-header">
          <h1 className="bms-setup-title">
            Hồ sơ sức khỏe
          </h1>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-4 border-0 rounded-3" dismissible onClose={() => setErrorMessage('')}>
            <FaExclamationTriangle className="flex-shrink-0" />
            <div className="small fw-medium">{errorMessage}</div>
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" className="d-flex align-items-center gap-2 mb-4 border-0 rounded-3">
            <FaCheckCircle className="flex-shrink-0" />
            <div className="small fw-medium">{successMessage}</div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit} className="bms-setup-form">
          {/* SECTION 1: Demographics */}
          <div className="bms-setup-section">
            <h2 className="bms-setup-section-title">
              <span>Thông tin định danh</span>
              {/^[0-9]{12}$/.test(demographics.identityNumber || '') ? (
                <span className="badge bg-success-subtle text-success fw-normal px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                  <FaCheckCircle className="me-1" size={10} /> Đã có CCCD
                </span>
              ) : null}
            </h2>

            <div className="bms-demographics-grid">
              <div className="bms-readonly-pill-box">
                <div className="bms-readonly-label">Họ và tên</div>
                <div className="bms-readonly-val">{demographics.fullName || '—'}</div>
              </div>

              <div id="field-identityNumber">
                <label className="bms-setup-label" htmlFor="identityNumber">Số CCCD (12 số)</label>
                <Form.Control
                  id="identityNumber"
                  inputMode="numeric"
                  className="bms-setup-input"
                  placeholder="12 chữ số"
                  value={demographics.identityNumber}
                  isInvalid={!!errors.identityNumber}
                  onChange={(e) => {
                    clearError('identityNumber');
                    setDemographics((current) => ({ ...current, identityNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }));
                  }}
                />
                {errors.identityNumber && <div className="text-danger small fw-semibold mt-1">{errors.identityNumber}</div>}
              </div>

              <div id="field-dateOfBirth">
                <label className="bms-setup-label" htmlFor="dateOfBirth">Ngày sinh</label>
                <Form.Control
                  id="dateOfBirth"
                  type="date"
                  className="bms-setup-input"
                  value={demographics.dateOfBirth}
                  isInvalid={!!errors.dateOfBirth}
                  onChange={(e) => {
                    clearError('dateOfBirth');
                    setDemographics((current) => ({ ...current, dateOfBirth: e.target.value }));
                  }}
                />
                {errors.dateOfBirth && <div className="text-danger small fw-semibold mt-1">{errors.dateOfBirth}</div>}
              </div>

              <div id="field-gender">
                <label className="bms-setup-label" htmlFor="gender">Giới tính</label>
                <Form.Select
                  id="gender"
                  className="bms-setup-input"
                  value={demographics.gender}
                  isInvalid={!!errors.gender}
                  onChange={(e) => {
                    clearError('gender');
                    setDemographics((current) => ({ ...current, gender: e.target.value }));
                  }}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </Form.Select>
                {errors.gender && <div className="text-danger small fw-semibold mt-1">{errors.gender}</div>}
              </div>

              <div id="field-phoneNumber">
                <label className="bms-setup-label" htmlFor="phoneNumber">Số điện thoại</label>
                <Form.Control
                  id="phoneNumber"
                  inputMode="numeric"
                  className="bms-setup-input"
                  placeholder="0912345678"
                  value={demographics.phoneNumber}
                  isInvalid={!!errors.phoneNumber}
                  onChange={(e) => {
                    clearError('phoneNumber');
                    setDemographics((current) => ({ ...current, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }));
                  }}
                />
                {errors.phoneNumber && <div className="text-danger small fw-semibold mt-1">{errors.phoneNumber}</div>}
              </div>

              <div className="bms-readonly-pill-box" style={{ gridColumn: 'span 2' }}>
                <div className="bms-readonly-label">Địa chỉ thường trú</div>
                <div className="bms-readonly-val">{demographics.address || 'Chưa cập nhật'}</div>
              </div>
            </div>

            <Row className="g-2 mt-1">
              <Col md={6}>
                <Form.Group controlId="healthInsuranceNumber">
                  <label className="bms-setup-label">Mã thẻ BHYT (Tùy chọn)</label>
                  <Form.Control
                    type="text"
                    className="bms-setup-input"
                    placeholder="Ví dụ: GD4792010099881"
                    value={healthInsuranceNumber}
                    onChange={(e) => setHealthInsuranceNumber(e.target.value.toUpperCase())}
                    maxLength={15}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="occupation">
                  <label className="bms-setup-label">Nghề nghiệp (Tùy chọn)</label>
                  <Form.Control
                    type="text"
                    className="bms-setup-input"
                    placeholder="Ví dụ: Kỹ sư, Giáo viên, Tự do..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 2: Blood Type (Structured Clinical Matrix) */}
          <div className="bms-setup-section">
            <h2 className="bms-setup-section-title">
              <span>Nhóm máu hệ ABO / Rh</span>
              <span className="bms-setup-section-badge">Bắt buộc</span>
            </h2>

            <div className="bms-blood-matrix-wrap" id="field-bloodType">
              <div className="bms-blood-rh-group-label">Yếu tố Rhesus dương tính (Rh+ · Phổ biến)</div>
              <div className="bms-blood-matrix-grid">
                {BLOOD_TYPES_RH_POS.map((bt) => {
                  const isActive = bloodType === bt.code;
                  return (
                    <div
                      key={bt.code}
                      className={`bms-blood-matrix-item ${isActive ? 'active' : ''}`}
                      onClick={() => { clearError('bloodType'); setBloodType(bt.code); }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <div className="bms-blood-code">{bt.label}</div>
                        <div className="bms-blood-meta">{bt.sub}</div>
                      </div>
                      {isActive && <FaCheckCircle size={14} className="text-white flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <div className="bms-blood-rh-group-label mt-2">Yếu tố Rhesus âm tính (Rh- · Nhóm máu hiếm)</div>
              <div className="bms-blood-matrix-grid">
                {BLOOD_TYPES_RH_NEG.map((bt) => {
                  const isActive = bloodType === bt.code;
                  return (
                    <div
                      key={bt.code}
                      className={`bms-blood-matrix-item ${isActive ? 'active' : ''}`}
                      onClick={() => { clearError('bloodType'); setBloodType(bt.code); }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <div className="bms-blood-code">{bt.label}</div>
                        <div className="bms-blood-meta">{bt.sub}</div>
                      </div>
                      {isActive && <FaCheckCircle size={14} className="text-white flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <div className="bms-blood-unknown-row">
                <div
                  className={`bms-blood-unknown-btn ${bloodType === 'Unknown' ? 'active' : ''}`}
                  onClick={() => { clearError('bloodType'); setBloodType('Unknown'); }}
                  role="button"
                  tabIndex={0}
                >
                  {bloodType === 'Unknown' ? <FaCheckCircle size={12} className="me-1" /> : null}
                  Chưa rõ nhóm máu (Sẽ xét nghiệm định nhóm máu tại phòng Lab)
                </div>

                {bloodType && bloodType !== 'Unknown' ? (
                  <div className="bms-blood-selected-banner">
                    <FaCheckCircle size={12} />
                    <span>Đã chọn: <strong>Nhóm máu {bloodType}</strong></span>
                  </div>
                ) : bloodType === 'Unknown' ? (
                  <div className="bms-blood-selected-banner bg-light border text-secondary">
                    <FaCheckCircle size={12} className="text-secondary" />
                    <span>Đã chọn: <strong>Chưa rõ (Sẽ định nhóm tại phòng Lab)</strong></span>
                  </div>
                ) : null}
              </div>
            </div>
            {errors.bloodType && (
              <div className="text-danger small fw-semibold mt-1">{errors.bloodType}</div>
            )}
          </div>

          {/* SECTION 3: Vitals & BMI */}
          <div className="bms-setup-section">
            <h2 className="bms-setup-section-title">
              <span>Chỉ số thể trạng ban đầu</span>
              <span className="bms-setup-section-badge">Bắt buộc</span>
            </h2>

            <div className="bms-vitals-row">
              <div id="field-heightCm">
                <label className="bms-setup-label" htmlFor="heightCm">Chiều cao (cm)</label>
                <Form.Control
                  id="heightCm"
                  type="number"
                  min={50}
                  max={250}
                  value={heightCm}
                  onChange={(e) => { clearError('heightCm'); setHeightCm(e.target.value); }}
                  placeholder="170"
                  className="bms-setup-input"
                  isInvalid={!!errors.heightCm}
                />
                {errors.heightCm && <div className="text-danger small fw-semibold mt-1">{errors.heightCm}</div>}
              </div>

              <div id="field-weightKg">
                <label className="bms-setup-label" htmlFor="weightKg">Cân nặng (kg)</label>
                <Form.Control
                  id="weightKg"
                  type="number"
                  min={10}
                  max={250}
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => { clearError('weightKg'); setWeightKg(e.target.value); }}
                  placeholder="65"
                  className="bms-setup-input"
                  isInvalid={!!errors.weightKg}
                />
                {errors.weightKg && <div className="text-danger small fw-semibold mt-1">{errors.weightKg}</div>}
              </div>

              <div>
                <label className="bms-setup-label" htmlFor="bloodPressure">Huyết áp (mmHg)</label>
                <Form.Control
                  id="bloodPressure"
                  type="text"
                  placeholder="120/80"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  className="bms-setup-input"
                />
              </div>

              <div className="bms-bmi-pill-card">
                <span className="text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>BMI TỰ ĐỘNG</span>
                <div className="bms-bmi-val">{bmiCalculation.value} kg/m²</div>
                <div
                  className="bms-bmi-badge"
                  style={{ backgroundColor: bmiCalculation.bg, color: bmiCalculation.color }}
                >
                  {bmiCalculation.label}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Coagulation */}
          <div className="bms-setup-section" id="field-coagulation">
            <h2 className="bms-setup-section-title">
              <span>Tiền sử rối loạn đông máu &amp; Kháng đông</span>
            </h2>

            <div className="bms-checkbox-pill-box">
              <Form.Check
                type="checkbox"
                id="no-coagulation"
                label={
                  <span className="bms-checkbox-label">
                    Tôi KHÔNG CÓ tiền sử rối loạn đông máu (máu khó đông, giảm tiểu cầu...)
                  </span>
                }
                checked={hasNoCoagulation}
                onChange={(e) => {
                  clearError('coagulation');
                  setHasNoCoagulation(e.target.checked);
                  if (e.target.checked) setCoagulationNotes('');
                }}
              />
            </div>

            {!hasNoCoagulation && (
              <div className="d-flex flex-column gap-2 mt-1">
                <div className="bms-chips-wrap">
                  {COAGULATION_PRESETS.map((preset) => {
                    const isSelected = coagulationNotes.includes(preset);
                    return (
                      <div
                        key={preset}
                        className={`bms-chip-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleCoagulationPreset(preset)}
                      >
                        {isSelected && <FaCheck size={10} />}
                        {preset}
                      </div>
                    );
                  })}
                </div>
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="bms-setup-input"
                  placeholder="Mô tả cụ thể rối loạn đông máu hoặc thuốc đang uống (Warfarin, Sintrom, Aspirin...)"
                  value={coagulationNotes}
                  onChange={(e) => setCoagulationNotes(e.target.value)}
                />
              </div>
            )}
            {errors.coagulation && <div className="text-danger small fw-semibold mt-1">{errors.coagulation}</div>}
          </div>

          {/* SECTION 5: Chronic Conditions */}
          <div className="bms-setup-section" id="field-medicalHistory">
            <h2 className="bms-setup-section-title">
              <span>Tiền sử bệnh mạn tính</span>
            </h2>

            <div className="bms-checkbox-pill-box">
              <Form.Check
                type="checkbox"
                id="no-medical-history"
                label={
                  <span className="bms-checkbox-label text-success">
                    Tôi KHÔNG CÓ tiền sử bệnh lý mạn tính
                  </span>
                }
                checked={hasNoMedicalHistory}
                onChange={(e) => {
                  clearError('medicalHistory');
                  const checked = e.target.checked;
                  setHasNoMedicalHistory(checked);
                  if (checked) {
                    setSelectedConditions([]);
                    setMedicalHistoryNotes('');
                  }
                }}
              />
            </div>

            <div className="bms-chips-wrap">
              {COMMON_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <div
                    key={cond}
                    className={`bms-chip-pill ${isSelected ? 'active' : ''} ${hasNoMedicalHistory ? 'disabled' : ''}`}
                    onClick={() => !hasNoMedicalHistory && toggleCondition(cond)}
                  >
                    {isSelected && <FaCheck size={10} />}
                    {cond}
                  </div>
                );
              })}
            </div>

            {!hasNoMedicalHistory && (
              <Form.Control
                as="textarea"
                rows={2}
                className="bms-setup-input mt-2"
                placeholder="Ghi chú thêm bệnh lý khác hoặc tiền sử can thiệp/phẫu thuật..."
                value={medicalHistoryNotes}
                onChange={(e) => setMedicalHistoryNotes(e.target.value)}
              />
            )}
            {errors.medicalHistory && <div className="text-danger small fw-semibold mt-1">{errors.medicalHistory}</div>}
          </div>

          {/* SECTION 6: Allergies */}
          <div className="bms-setup-section" id="field-allergies">
            <h2 className="bms-setup-section-title">
              <span>Tiền sử dị ứng (Thuốc, Hóa chất, Thức ăn)</span>
            </h2>

            <div className="bms-checkbox-pill-box">
              <Form.Check
                type="checkbox"
                id="no-allergies"
                label={
                  <span className="bms-checkbox-label text-success">
                    Tôi KHÔNG CÓ tiền sử dị ứng đã biết (NKDA)
                  </span>
                }
                checked={hasNoAllergies}
                onChange={(e) => {
                  clearError('allergies');
                  const checked = e.target.checked;
                  setHasNoAllergies(checked);
                  if (checked) {
                    setSelectedAllergies([]);
                    setAllergiesNotes('');
                  }
                }}
              />
            </div>

            <div className="bms-chips-wrap">
              {COMMON_ALLERGIES.map((alg) => {
                const isSelected = selectedAllergies.some((sa) => isAllergyMatch(alg, sa));
                return (
                  <div
                    key={alg}
                    className={`bms-chip-pill ${isSelected ? 'active' : ''} ${hasNoAllergies ? 'disabled' : ''}`}
                    onClick={() => !hasNoAllergies && toggleAllergy(alg)}
                  >
                    {isSelected && <FaCheck size={10} />}
                    {alg}
                  </div>
                );
              })}
            </div>

            {!hasNoAllergies && (
              <Form.Control
                type="text"
                className="bms-setup-input mt-2"
                placeholder="Ghi chú biểu hiện dị ứng khác (ví dụ: nổi mề đay, khó thở...)"
                value={allergiesNotes}
                onChange={(e) => setAllergiesNotes(e.target.value)}
              />
            )}
            {errors.allergies && <div className="text-danger small fw-semibold mt-1">{errors.allergies}</div>}
          </div>

          {/* SECTION 7: Current Medications */}
          <div className="bms-setup-section" id="field-medications">
            <h2 className="bms-setup-section-title">
              <span>Thuốc đang dùng định kỳ</span>
            </h2>

            <div className="bms-checkbox-pill-box">
              <Form.Check
                type="checkbox"
                id="no-medications"
                label={
                  <span className="bms-checkbox-label">
                    Hiện tại tôi KHÔNG sử dụng thuốc điều trị định kỳ
                  </span>
                }
                checked={hasNoMedications}
                onChange={(e) => {
                  clearError('medications');
                  const checked = e.target.checked;
                  setHasNoMedications(checked);
                  if (checked) setMedicationsNotes('');
                }}
              />
            </div>

            {!hasNoMedications && (
              <Form.Control
                as="textarea"
                rows={2}
                className="bms-setup-input mt-1"
                placeholder="Tên thuốc và liều dùng hàng ngày (ví dụ: Amlodipine 5mg 1 viên sáng...)"
                value={medicationsNotes}
                onChange={(e) => setMedicationsNotes(e.target.value)}
              />
            )}
            {errors.medications && <div className="text-danger small fw-semibold mt-1">{errors.medications}</div>}
          </div>

          {/* SECTION 8: Emergency Contact */}
          <div className="bms-setup-section" id="field-emergencyContactName">
            <h2 className="bms-setup-section-title">
              <span>Người liên hệ khẩn cấp</span>
              <span className="bms-setup-section-badge">Bắt buộc</span>
            </h2>

            <Row className="g-2">
              <Col md={4} sm={12}>
                <Form.Group controlId="emergencyContactName">
                  <label className="bms-setup-label">Họ tên người thân</label>
                  <Form.Control
                    type="text"
                    className="bms-setup-input"
                    placeholder="Ví dụ: Nguyễn Văn Bình"
                    value={emergencyContactName}
                    onChange={(e) => { clearError('emergencyContactName'); setEmergencyContactName(e.target.value); }}
                    isInvalid={!!errors.emergencyContactName}
                  />
                  <Form.Control.Feedback type="invalid" className="small">
                    {errors.emergencyContactName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={4} sm={6}>
                <Form.Group controlId="emergencyContactRelationship">
                  <label className="bms-setup-label">Mối quan hệ</label>
                  <Form.Select
                    className="bms-setup-input"
                    value={emergencyContactRelationship}
                    onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4} sm={6} id="field-emergencyContactPhone">
                <Form.Group controlId="emergencyContactPhone">
                  <label className="bms-setup-label">Số điện thoại khẩn cấp</label>
                  <Form.Control
                    type="tel"
                    className="bms-setup-input"
                    placeholder="0912345678"
                    value={emergencyContactPhone}
                    onChange={(e) => { clearError('emergencyContactPhone'); setEmergencyContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); }}
                    isInvalid={!!errors.emergencyContactPhone}
                  />
                  <Form.Control.Feedback type="invalid" className="small">
                    {errors.emergencyContactPhone}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* SECTION 9: Legal Consent */}
          <div className="bms-legal-pill-box" id="field-consent">
            <Form.Check
              type="checkbox"
              id="consentConfirmed"
              label={
                <span>
                  Tôi cam đoan các thông tin tiền sử bệnh án, thể trạng và dị ứng trên được khai báo trung thực, 
                  chính xác theo <strong>Luật Khám bệnh, chữa bệnh 2023</strong> để làm căn cứ phục vụ quá trình phân tích và đối chiếu kết quả xét nghiệm y khoa.
                </span>
              }
              checked={consentConfirmed}
              onChange={(e) => { clearError('consent'); setConsentConfirmed(e.target.checked); }}
              isInvalid={!!errors.consent}
            />
            {errors.consent && (
              <div className="text-danger small fw-semibold ps-4 mt-1">{errors.consent}</div>
            )}
          </div>

          {/* Bottom Actions Row */}
          <div className="bms-setup-actions">
            <div className="bms-security-text">
              <FaShieldAlt className="text-success fs-5 flex-shrink-0" />
              <span>Bảo mật theo tiêu chuẩn HIPAA &amp; Thông tư 46/2018/TT-BYT.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bms-btn-submit-pill"
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Lưu Hồ Sơ Sức Khỏe</span>
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
