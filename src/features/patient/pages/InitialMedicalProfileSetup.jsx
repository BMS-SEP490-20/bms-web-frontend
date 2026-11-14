/**
 * @file InitialMedicalProfileSetup.jsx
 * @description Mandatory First-Time Clinical Intake Screen for Patients.
 * Clinical registration sheet. Identity and blood type lead the form.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Alert,
  Spinner
} from 'react-bootstrap';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt
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
        if (pat?.allergies) {
          const rawAllergies = Array.isArray(pat.allergies) ? pat.allergies : [String(pat.allergies)];
          if (rawAllergies.length > 0) {
            const isNkda = isEntireListNkda(rawAllergies);
            if (isNkda) {
              setHasNoAllergies(true);
              setSelectedAllergies([]);
              setAllergiesNotes('');
            } else {
              setHasNoAllergies(false);
              const loaded = [];
              const other = [];
              rawAllergies.forEach((a) => {
                const aStr = typeof a === 'string' ? a : (a?.name || a?.allergyName || String(a || ''));
                if (isCanonicalNkda(aStr)) return;
                const matched = COMMON_ALLERGIES.find((ca) => isAllergyMatch(ca, aStr));
                if (matched) {
                  if (!loaded.includes(matched)) loaded.push(matched);
                } else {
                  other.push(aStr);
                }
              });
              setSelectedAllergies(loaded);
              if (other.length > 0) {
                setAllergiesNotes(other.join('; '));
              }
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
    const h = parseFloat(String(heightCm || '').replace(',', '.'));
    const w = parseFloat(String(weightKg || '').replace(',', '.'));
    if (!h || !w || h <= 0 || w <= 0) {
      return { value: '--', label: 'Chưa đủ dữ liệu', bg: '#F1F5F9', color: '#64748B' };
    }
    const hMeter = h / 100;
    const val = (w / (hMeter * hMeter)).toFixed(1);
    const num = parseFloat(val);

    if (num < 18.5) {
      return { value: val, label: 'Thiếu cân', bg: '#FEF3C7', color: '#92400E' };
    } else if (num < 23.0) {
      return { value: val, label: 'Bình thường', bg: '#DCFCE7', color: '#166534' };
    } else if (num < 25.0) {
      return { value: val, label: 'Thừa cân', bg: '#FEF3C7', color: '#92400E' };
    } else {
      return { value: val, label: 'Béo phì', bg: '#FEE2E2', color: '#991B1B' };
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

    if (!demographics.fullName.trim() || demographics.fullName.trim().length < 2) {
      newErrors.fullName = 'Họ và tên là bắt buộc.';
    }
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
          heightCm: heightCm ? parseFloat(String(heightCm).replace(',', '.')) : null,
          weightKg: weightKg ? parseFloat(String(weightKg).replace(',', '.')) : null,
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

      setSuccessMessage('Đã lưu hồ sơ sức khỏe.');

      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 1600);

    } catch (err) {
      setErrorMessage(err.message || 'Không thể lưu hồ sơ bệnh án. Vui lòng thử lại sau.');
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
    <div className="bms-chart-page">
      {successMessage && (
        <div className="bms-chart-toast" role="status">
          {successMessage}
        </div>
      )}
      <Form onSubmit={handleSubmit} className="bms-chart">
        <header className="bms-chart-head">
          <h1>Đăng Ký Hồ Sơ Sức Khỏe</h1>
          <p>Phiếu khai báo trước khi lấy mẫu. Mục có dấu * là bắt buộc.</p>
        </header>

        <div className="alert alert-info border-0 rounded-3 p-3 mb-4 d-flex align-items-center gap-3" style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6' }}>
          <FaShieldAlt className="text-primary fs-4 flex-shrink-0" />
          <div className="small text-dark" style={{ lineHeight: 1.5 }}>
            <strong>Cam kết bảo mật y tế:</strong> Mọi thông tin sức khỏe cá nhân được mã hóa an toàn theo tiêu chuẩn ISO 15189:2022 và Nghị định 13/2023/NĐ-CP. Dữ liệu chỉ phục vụ Bác sĩ đối chiếu khoảng tham chiếu sinh học và đảm bảo an toàn tuyệt đối khi lấy mẫu xét nghiệm máu.
          </div>
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

        <section className="bms-chart-section">
          <h2><span>01</span> Định danh</h2>

          <div className="bms-chart-identity">
            <div id="field-fullName">
              <label htmlFor="fullName">Họ và tên *</label>
              <Form.Control
                id="fullName"
                className="bms-chart-identity-input"
                value={demographics.fullName}
                isInvalid={!!errors.fullName}
                onChange={(e) => {
                  clearError('fullName');
                  setDemographics((current) => ({ ...current, fullName: e.target.value }));
                }}
              />
              {errors.fullName && <small>{errors.fullName}</small>}
            </div>
            <div id="field-identityNumber">
              <label htmlFor="identityNumber">Số CCCD *</label>
              <Form.Control
                id="identityNumber"
                inputMode="numeric"
                className="bms-chart-identity-input is-mono"
                placeholder="12 chữ số"
                value={demographics.identityNumber}
                isInvalid={!!errors.identityNumber}
                onChange={(e) => {
                  clearError('identityNumber');
                  setDemographics((current) => ({ ...current, identityNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }));
                }}
              />
              {errors.identityNumber && <small>{errors.identityNumber}</small>}
            </div>
          </div>

          <div className="bms-chart-grid">
            <div id="field-dateOfBirth">
              <label htmlFor="dateOfBirth">Ngày sinh *</label>
              <Form.Control
                id="dateOfBirth"
                type="date"
                value={demographics.dateOfBirth}
                isInvalid={!!errors.dateOfBirth}
                onChange={(e) => {
                  clearError('dateOfBirth');
                  setDemographics((current) => ({ ...current, dateOfBirth: e.target.value }));
                }}
              />
              {errors.dateOfBirth && <small>{errors.dateOfBirth}</small>}
            </div>
            <div id="field-gender">
              <label htmlFor="gender">Giới tính *</label>
              <Form.Select
                id="gender"
                value={demographics.gender}
                isInvalid={!!errors.gender}
                onChange={(e) => {
                  clearError('gender');
                  setDemographics((current) => ({ ...current, gender: e.target.value }));
                }}
              >
                <option value="">Chọn</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </Form.Select>
              {errors.gender && <small>{errors.gender}</small>}
            </div>
            <div id="field-phoneNumber">
              <label htmlFor="phoneNumber">Số điện thoại *</label>
              <Form.Control
                id="phoneNumber"
                inputMode="numeric"
                placeholder="0912345678"
                value={demographics.phoneNumber}
                isInvalid={!!errors.phoneNumber}
                onChange={(e) => {
                  clearError('phoneNumber');
                  setDemographics((current) => ({ ...current, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }));
                }}
              />
              {errors.phoneNumber && <small>{errors.phoneNumber}</small>}
            </div>
            <div className="is-wide">
              <label htmlFor="address">Địa chỉ thường trú</label>
              <Form.Control
                id="address"
                value={demographics.address}
                placeholder="Số nhà, đường, phường, tỉnh"
                onChange={(e) => setDemographics((current) => ({ ...current, address: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="healthInsuranceNumber">Mã thẻ BHYT</label>
              <Form.Control
                id="healthInsuranceNumber"
                value={healthInsuranceNumber}
                placeholder="Không bắt buộc"
                maxLength={15}
                onChange={(e) => setHealthInsuranceNumber(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label htmlFor="occupation">Nghề nghiệp</label>
              <Form.Control
                id="occupation"
                value={occupation}
                placeholder="Không bắt buộc"
                onChange={(e) => setOccupation(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="bms-chart-section" id="field-bloodType">
          <h2><span>02</span> Nhóm máu *</h2>
          <div className="bms-abo">
            <div>
              <p>Rh dương</p>
              <div>
                {BLOOD_TYPES_RH_POS.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={bloodType === item.code ? 'is-on' : ''}
                    onClick={() => { clearError('bloodType'); setBloodType(item.code); }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p>Rh âm</p>
              <div>
                {BLOOD_TYPES_RH_NEG.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={bloodType === item.code ? 'is-on' : ''}
                    onClick={() => { clearError('bloodType'); setBloodType(item.code); }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            className={`bms-abo-unknown${bloodType === 'Unknown' ? ' is-on' : ''}`}
            onClick={() => { clearError('bloodType'); setBloodType('Unknown'); }}
          >
            Chưa rõ nhóm máu
          </button>
          {errors.bloodType && <small className="bms-chart-error">{errors.bloodType}</small>}
        </section>

        <section className="bms-chart-section">
          <h2><span>03</span> Thể trạng</h2>
          <div className="bms-chart-grid is-vitals">
            <div id="field-heightCm">
              <label htmlFor="heightCm">Chiều cao (cm) *</label>
              <Form.Control
                id="heightCm"
                type="number"
                min={50}
                max={250}
                value={heightCm}
                placeholder="170"
                isInvalid={!!errors.heightCm}
                onChange={(e) => { clearError('heightCm'); setHeightCm(e.target.value); }}
              />
              {errors.heightCm && <small>{errors.heightCm}</small>}
            </div>
            <div id="field-weightKg">
              <label htmlFor="weightKg">Cân nặng (kg) *</label>
              <Form.Control
                id="weightKg"
                type="number"
                min={10}
                max={250}
                step="0.5"
                value={weightKg}
                placeholder="65"
                isInvalid={!!errors.weightKg}
                onChange={(e) => { clearError('weightKg'); setWeightKg(e.target.value); }}
              />
              {errors.weightKg && <small>{errors.weightKg}</small>}
            </div>
            <div>
              <label htmlFor="bloodPressure">Huyết áp</label>
              <Form.Control
                id="bloodPressure"
                value={bloodPressure}
                placeholder="120/80"
                onChange={(e) => setBloodPressure(e.target.value)}
              />
            </div>
            <div className="bms-chart-bmi">
              <span>BMI</span>
              <strong>{bmiCalculation.value}</strong>
              <em style={{ color: bmiCalculation.color }}>{bmiCalculation.label}</em>
            </div>
          </div>
        </section>

        <section className="bms-chart-section" id="field-coagulation">
          <header>
            <h2><span>04</span> Đông máu</h2>
            <label>
              <input
                type="checkbox"
                checked={hasNoCoagulation}
                onChange={(e) => {
                  clearError('coagulation');
                  setHasNoCoagulation(e.target.checked);
                  if (e.target.checked) setCoagulationNotes('');
                }}
              />
              Không có
            </label>
          </header>
          {!hasNoCoagulation && (
            <>
              <div className="bms-chart-picks">
                {COAGULATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={coagulationNotes.includes(preset) ? 'is-on' : ''}
                    onClick={() => toggleCoagulationPreset(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Ghi thuốc chống đông hoặc tình trạng chảy máu"
                value={coagulationNotes}
                onChange={(e) => setCoagulationNotes(e.target.value)}
              />
            </>
          )}
          {errors.coagulation && <small className="bms-chart-error">{errors.coagulation}</small>}
        </section>

        <section className="bms-chart-section" id="field-medicalHistory">
          <header>
            <h2><span>05</span> Bệnh mạn tính</h2>
            <label>
              <input
                type="checkbox"
                checked={hasNoMedicalHistory}
                onChange={(e) => {
                  clearError('medicalHistory');
                  setHasNoMedicalHistory(e.target.checked);
                  if (e.target.checked) {
                    setSelectedConditions([]);
                    setMedicalHistoryNotes('');
                  }
                }}
              />
              Không có
            </label>
          </header>
          {!hasNoMedicalHistory && (
            <>
              <div className="bms-chart-picks">
                {COMMON_CONDITIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={selectedConditions.includes(item) ? 'is-on' : ''}
                    onClick={() => toggleCondition(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Bệnh khác hoặc phẫu thuật đã mổ"
                value={medicalHistoryNotes}
                onChange={(e) => setMedicalHistoryNotes(e.target.value)}
              />
            </>
          )}
          {errors.medicalHistory && <small className="bms-chart-error">{errors.medicalHistory}</small>}
        </section>

        <section className="bms-chart-section" id="field-allergies">
          <header>
            <h2><span>06</span> Dị ứng</h2>
            <label>
              <input
                type="checkbox"
                checked={hasNoAllergies}
                onChange={(e) => {
                  clearError('allergies');
                  setHasNoAllergies(e.target.checked);
                  if (e.target.checked) {
                    setSelectedAllergies([]);
                    setAllergiesNotes('');
                  }
                }}
              />
              Không có
            </label>
          </header>
          {!hasNoAllergies && (
            <>
              <div className="bms-chart-picks">
                {COMMON_ALLERGIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={selectedAllergies.some((saved) => isAllergyMatch(item, saved)) ? 'is-on' : ''}
                    onClick={() => toggleAllergy(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <Form.Control
                placeholder="Dị ứng khác"
                value={allergiesNotes}
                onChange={(e) => setAllergiesNotes(e.target.value)}
              />
            </>
          )}
          {errors.allergies && <small className="bms-chart-error">{errors.allergies}</small>}
        </section>

        <section className="bms-chart-section" id="field-medications">
          <header>
            <h2><span>07</span> Thuốc đang dùng</h2>
            <label>
              <input
                type="checkbox"
                checked={hasNoMedications}
                onChange={(e) => {
                  clearError('medications');
                  setHasNoMedications(e.target.checked);
                  if (e.target.checked) setMedicationsNotes('');
                }}
              />
              Không dùng
            </label>
          </header>
          {!hasNoMedications && (
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Tên thuốc và liều, ví dụ Amlodipine 5mg mỗi sáng"
              value={medicationsNotes}
              onChange={(e) => setMedicationsNotes(e.target.value)}
            />
          )}
          {errors.medications && <small className="bms-chart-error">{errors.medications}</small>}
        </section>

        <section className="bms-chart-section">
          <h2><span>08</span> Người liên hệ khẩn cấp</h2>
          <div className="bms-chart-grid">
            <div id="field-emergencyContactName">
              <label htmlFor="emergencyContactName">Họ tên *</label>
              <Form.Control
                id="emergencyContactName"
                value={emergencyContactName}
                isInvalid={!!errors.emergencyContactName}
                onChange={(e) => { clearError('emergencyContactName'); setEmergencyContactName(e.target.value); }}
              />
              {errors.emergencyContactName && <small>{errors.emergencyContactName}</small>}
            </div>
            <div>
              <label htmlFor="emergencyContactRelationship">Quan hệ</label>
              <Form.Select
                id="emergencyContactRelationship"
                value={emergencyContactRelationship}
                onChange={(e) => setEmergencyContactRelationship(e.target.value)}
              >
                {RELATIONSHIPS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Form.Select>
            </div>
            <div id="field-emergencyContactPhone">
              <label htmlFor="emergencyContactPhone">Số điện thoại *</label>
              <Form.Control
                id="emergencyContactPhone"
                inputMode="numeric"
                value={emergencyContactPhone}
                isInvalid={!!errors.emergencyContactPhone}
                onChange={(e) => {
                  clearError('emergencyContactPhone');
                  setEmergencyContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                }}
              />
              {errors.emergencyContactPhone && <small>{errors.emergencyContactPhone}</small>}
            </div>
          </div>
        </section>

        <label className="bms-chart-consent" id="field-consent">
          <input
            type="checkbox"
            checked={consentConfirmed}
            onChange={(e) => { clearError('consent'); setConsentConfirmed(e.target.checked); }}
          />
          <span>Tôi xác nhận các thông tin trên là đúng và được dùng cho việc lấy mẫu, phân tích và trả kết quả xét nghiệm.</span>
        </label>
        {errors.consent && <small className="bms-chart-error">{errors.consent}</small>}

        <div className="bms-chart-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </div>
      </Form>
    </div>
  );
}
