/**
 * @file InitialMedicalProfileSetup.jsx
 * @description Mandatory First-Time Clinical Intake Screen for Patients.
 * Styled in the clean, flat, borderless Home design language (bms-status-chip, pure flat 2D).
 */

import React, { useState, useEffect, useMemo } from 'react';
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

// Known negative coagulation strings for exact clinical matching (avoiding false positives like 'Hemophilia. Không dùng Warfarin')
export const NO_COAGULATION_STRINGS = [
  'không có',
  'không có tiền sử đông máu',
  'không có tiền sử rối loạn đông máu',
  'không có ghi nhận'
];

export const isNoCoagulation = (val) => {
  if (!val) return true;
  const normalized = val.trim().toLowerCase();
  return NO_COAGULATION_STRINGS.includes(normalized);
};

// Backward-compatible allergy matcher (maps legacy 'Trứng / Sữa / Đậu' to 'Trứng / Sữa / Đậu phộng')
export const isAllergyMatch = (targetAllergy, recordedText) => {
  if (!targetAllergy || !recordedText) return false;
  const t = targetAllergy.toLowerCase().trim();
  const r = recordedText.toLowerCase().trim();
  if (t === r || r.includes(t)) return true;

  if (t === 'trứng / sữa / đậu phộng' && (r.includes('trứng / sữa / đậu') || r.includes('trứng, sữa, đậu') || r.includes('dị ứng trứng'))) {
    return true;
  }
  if (t === 'hải sản (tôm, cua)' && (r.includes('hải sản') || r.includes('tôm') || r.includes('cua'))) {
    return true;
  }
  if (t === 'penicillin / amox' && (r.includes('penicillin') || r.includes('amox') || r.includes('amoxicillin'))) {
    return true;
  }
  if (t === 'aspirin / paracetamol' && (r.includes('aspirin') || r.includes('paracetamol'))) {
    return true;
  }
  if (t === 'kháng viêm nsaids' && (r.includes('nsaids') || r.includes('kháng viêm'))) {
    return true;
  }
  if (t === 'phấn hoa / bụi nhà' && (r.includes('phấn hoa') || r.includes('bụi nhà'))) {
    return true;
  }
  if (t === 'cồn / povidine' && (r.includes('cồn') || r.includes('povidine'))) {
    return true;
  }
  return false;
};

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
    gender: 'Nam',
    phoneNumber: '',
    email: '',
    address: '',
    patientCode: ''
  });

  // Clinical profile state
  const [bloodType, setBloodType] = useState('Unknown');
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

        if (pat?.bloodType) {
          setBloodType(pat.bloodType);
        } else {
          setBloodType('Unknown');
        }
        if (pat?.coagulationDisorders) {
          const isNo = isNoCoagulation(pat.coagulationDisorders);
          setHasNoCoagulation(isNo);
          setCoagulationNotes(isNo ? '' : pat.coagulationDisorders);
        }
        if (pat?.allergies && Array.isArray(pat.allergies) && pat.allergies.length > 0) {
          const isNkda = pat.allergies.some((a) => a.includes('NKDA') || a.includes('Không có'));
          if (isNkda) {
            setHasNoAllergies(true);
            setSelectedAllergies([]);
          } else {
            setHasNoAllergies(false);
            const loaded = [];
            const other = [];
            pat.allergies.forEach((a) => {
              const matched = COMMON_ALLERGIES.find((ca) => isAllergyMatch(ca, a));
              if (matched) {
                if (!loaded.includes(matched)) loaded.push(matched);
              } else {
                other.push(a);
              }
            });
            setSelectedAllergies(loaded);
            if (other.length > 0) {
              setAllergiesNotes(other.join(', '));
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

    if (!bloodType) {
      newErrors.bloodType = 'Vui lòng chọn nhóm máu.';
    }

    if (!emergencyContactName.trim() || emergencyContactName.trim().length < 2) {
      newErrors.emergencyContactName = 'Vui lòng nhập họ và tên người liên hệ khẩn cấp.';
    }

    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
    if (!emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = 'Vui lòng nhập số điện thoại người liên hệ.';
    } else if (!phoneRegex.test(emergencyContactPhone.trim())) {
      newErrors.emergencyContactPhone = 'Số điện thoại gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).';
    }

    if (!consentConfirmed) {
      newErrors.consent = 'Vui lòng tích xác nhận cam đoan thông tin khai báo là chính xác.';
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
      setErrorMessage('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc.');
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
          ? 'Không có tiền sử rối loạn đông máu'
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
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
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
          <div className="bms-status-chip">
            THÔNG TƯ 46/2018/TT-BYT · CHUẨN XÉT NGHIỆM BMS
          </div>
          <h1 className="bms-setup-title">
            Hồ Sơ Sức Khỏe &amp; Tiền Sử Y Tế
          </h1>
          <p className="bms-setup-desc">
            Khai báo thông tin lâm sàng ban đầu để bác sĩ đối chiếu kết quả xét nghiệm máu và kích hoạt liên hệ kịp thời trong các tình huống khẩn cấp.
          </p>
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
              <span className="badge bg-success-subtle text-success fw-normal px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                <FaCheckCircle className="me-1" size={10} /> Đã đối soát CCCD
              </span>
            </h2>

            <div className="bms-demographics-grid">
              <div className="bms-readonly-pill-box">
                <div className="bms-readonly-label">Họ và tên</div>
                <div className="bms-readonly-val">{demographics.fullName || '—'}</div>
              </div>

              <div className="bms-readonly-pill-box">
                <div className="bms-readonly-label">Số CCCD (12 số)</div>
                <div className="bms-readonly-val font-monospace">{demographics.identityNumber || 'Chưa cập nhật'}</div>
              </div>

              <div className="bms-readonly-pill-box">
                <div className="bms-readonly-label">Ngày sinh &amp; Giới tính</div>
                <div className="bms-readonly-val">
                  {demographics.dateOfBirth || '—'} ({demographics.gender})
                </div>
              </div>

              <div className="bms-readonly-pill-box">
                <div className="bms-readonly-label">Số điện thoại</div>
                <div className="bms-readonly-val font-monospace">{demographics.phoneNumber || '—'}</div>
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

            <div className="bms-blood-matrix-wrap">
              <div className="bms-blood-rh-group-label">Yếu tố Rhesus dương tính (Rh+ · Phổ biến)</div>
              <div className="bms-blood-matrix-grid">
                {BLOOD_TYPES_RH_POS.map((bt) => {
                  const isActive = bloodType === bt.code;
                  return (
                    <div
                      key={bt.code}
                      className={`bms-blood-matrix-item ${isActive ? 'active' : ''}`}
                      onClick={() => setBloodType(bt.code)}
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
                      onClick={() => setBloodType(bt.code)}
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
                  onClick={() => setBloodType('Unknown')}
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
              <div>
                <label className="bms-setup-label" htmlFor="heightCm">Chiều cao (cm)</label>
                <Form.Control
                  id="heightCm"
                  type="number"
                  min={50}
                  max={250}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  className="bms-setup-input"
                />
              </div>

              <div>
                <label className="bms-setup-label" htmlFor="weightKg">Cân nặng (kg)</label>
                <Form.Control
                  id="weightKg"
                  type="number"
                  min={10}
                  max={250}
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="65"
                  className="bms-setup-input"
                />
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
          <div className="bms-setup-section">
            <h2 className="bms-setup-section-title">
              <span>Tiền sử rối loạn đông máu &amp; Kháng đông</span>
              <span className="bms-setup-section-badge">Bắt buộc</span>
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
          </div>

          {/* SECTION 5: Chronic Conditions */}
          <div className="bms-setup-section">
            <h2 className="bms-setup-section-title">
              <span>Tiền sử bệnh mạn tính</span>
              <span className="bms-setup-section-badge">Bắt buộc</span>
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
          </div>

          {/* SECTION 6: Allergies */}
          <div className="bms-setup-section">
            <h2 className="bms-setup-section-title">
              <span>Tiền sử dị ứng (Thuốc, Hóa chất, Thức ăn)</span>
              <span className="bms-setup-section-badge">Bắt buộc</span>
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
          </div>

          {/* SECTION 7: Current Medications */}
          <div className="bms-setup-section">
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
          </div>

          {/* SECTION 8: Emergency Contact */}
          <div className="bms-setup-section">
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
                    onChange={(e) => setEmergencyContactName(e.target.value)}
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

              <Col md={4} sm={6}>
                <Form.Group controlId="emergencyContactPhone">
                  <label className="bms-setup-label">Số điện thoại khẩn cấp</label>
                  <Form.Control
                    type="tel"
                    className="bms-setup-input"
                    placeholder="0912345678"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
          <div className="bms-legal-pill-box">
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
              onChange={(e) => setConsentConfirmed(e.target.checked)}
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
