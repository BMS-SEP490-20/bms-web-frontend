/**
 * @file InitialMedicalProfileSetup.jsx
 * @description Clean Patient Medical Profile Setup & Clinical Intake Form.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Alert, Spinner, Row, Col, Button } from 'react-bootstrap';
import { CheckCircle2, AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getStoredUser } from '../../../constants/roles';
import PortalNavbar from '../../home/components/PortalNavbar';
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

const BLOOD_TYPES_RH_POS = ['O+', 'A+', 'B+', 'AB+'];
const BLOOD_TYPES_RH_NEG = ['O-', 'A-', 'B-', 'AB-'];

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

const COAGULATION_PRESETS = [
  'Hemophilia (máu khó đông)',
  'Xuất huyết giảm tiểu cầu',
  'Dễ chảy máu / bầm tím',
  'Dùng thuốc chống đông'
];

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

  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('Vợ / Chồng');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const [healthInsuranceNumber, setHealthInsuranceNumber] = useState('');
  const [occupation, setOccupation] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);

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
          // Fallback to stored session
        }

        const fullName = pat?.fullName || stored?.fullName || stored?.FullName || '';
        const identityNumber = pat?.identityCardNumber || pat?.identityNumber || stored?.identityCardNumber || stored?.IdentityCardNumber || '';
        const phoneNumber = pat?.phoneNumber || pat?.phone || stored?.phoneNumber || stored?.PhoneNumber || '';
        const email = pat?.email || stored?.email || stored?.Email || '';
        const address = pat?.address || stored?.address || stored?.Address || '';
        const rawGender = String(pat?.gender || pat?.genderString || stored?.gender || stored?.Gender || '').trim();
        const gender = (rawGender === 'Nam' || rawGender === 'Male') ? 'Male'
          : (rawGender === 'Nữ' || rawGender === 'Female') ? 'Female'
          : (rawGender === 'Khác' || rawGender === 'Other') ? 'Other'
          : '';
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

        if (pat?.bloodType) setBloodType(pat.bloodType);

        if (pat?.coagulationDisorders) {
          const isNo = isNoCoagulation(pat.coagulationDisorders);
          setHasNoCoagulation(isNo);
          setCoagulationNotes(isNo ? '' : pat.coagulationDisorders);
        }

        if (pat?.allergies) {
          const rawAllergies = Array.isArray(pat.allergies) ? pat.allergies : [String(pat.allergies)];
          if (rawAllergies.length > 0) {
            if (isEntireListNkda(rawAllergies)) {
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
              if (other.length > 0) setAllergiesNotes(other.join('; '));
            }
          }
        }

        if (pat?.emergencyContactName) setEmergencyContactName(pat.emergencyContactName);
        if (pat?.emergencyContactPhone) setEmergencyContactPhone(pat.emergencyContactPhone);
        if (pat?.emergencyContactRelationship) setEmergencyContactRelationship(pat.emergencyContactRelationship);
        if (pat?.vitals?.heightCm) setHeightCm(String(pat.vitals.heightCm));
        if (pat?.vitals?.weightKg) setWeightKg(String(pat.vitals.weightKg));
        if (pat?.vitals?.bloodPressure) setBloodPressure(pat.vitals.bloodPressure);
      } catch {
        setErrorMessage('Không thể tải dữ liệu hồ sơ bệnh nhân. Vui lòng thử lại.');
      } finally {
        loadedRef.current = true;
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const bmiCalculation = useMemo(() => {
    const h = parseFloat(String(heightCm || '').replace(',', '.'));
    const w = parseFloat(String(weightKg || '').replace(',', '.'));
    if (!h || !w || h <= 0 || w <= 0) {
      return { value: '—', label: 'Chưa đủ dữ liệu', color: '#64748B' };
    }
    const hMeter = h / 100;
    const val = (w / (hMeter * hMeter)).toFixed(1);
    const num = parseFloat(val);
    if (num < 18.5) return { value: val, label: 'Thiếu cân', color: '#D97706' };
    if (num < 23.0) return { value: val, label: 'Bình thường', color: '#059669' };
    if (num < 25.0) return { value: val, label: 'Thừa cân', color: '#D97706' };
    return { value: val, label: 'Béo phì', color: '#DC2626' };
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
    setSelectedConditions((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const toggleCoagulationPreset = (preset) => {
    setHasNoCoagulation(false);
    setCoagulationNotes((prev) => {
      if (prev.includes(preset)) {
        return prev.replace(preset, '').replace(/;\s*$/, '').trim();
      }
      return prev ? `${prev}; ${preset}` : preset;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;

    if (!demographics.fullName.trim() || demographics.fullName.trim().length < 2) {
      newErrors.fullName = 'Vui lòng nhập họ và tên.';
    }
    if (!/^[0-9]{12}$/.test((demographics.identityNumber || '').trim())) {
      newErrors.identityNumber = 'Số CCCD phải gồm đúng 12 chữ số.';
    }
    if (!phoneRegex.test((demographics.phoneNumber || '').trim())) {
      newErrors.phoneNumber = 'Số điện thoại không hợp lệ (10 số, đầu 03/05/07/08/09).';
    }
    if (!demographics.dateOfBirth) newErrors.dateOfBirth = 'Vui lòng chọn ngày sinh.';
    if (!demographics.gender) newErrors.gender = 'Vui lòng chọn giới tính.';
    if (!bloodType) newErrors.bloodType = 'Vui lòng chọn nhóm máu hoặc "Chưa rõ nhóm máu".';
    if (!heightCm) newErrors.heightCm = 'Vui lòng nhập chiều cao.';
    if (!weightKg) newErrors.weightKg = 'Vui lòng nhập cân nặng.';
    if (!hasNoCoagulation && !coagulationNotes.trim()) {
      newErrors.coagulation = 'Vui lòng chọn "Không có" hoặc ghi rõ tình trạng đông máu.';
    }
    if (!hasNoMedicalHistory && selectedConditions.length === 0 && !medicalHistoryNotes.trim()) {
      newErrors.medicalHistory = 'Vui lòng chọn "Không có" hoặc chọn/nhập bệnh lý mạn tính.';
    }
    if (!hasNoAllergies && selectedAllergies.length === 0 && !allergiesNotes.trim()) {
      newErrors.allergies = 'Vui lòng chọn "Không có" hoặc chọn/nhập tiền sử dị ứng.';
    }
    if (!hasNoMedications && !medicationsNotes.trim()) {
      newErrors.medications = 'Vui lòng chọn "Không dùng" hoặc ghi tên thuốc đang dùng.';
    }
    if (!emergencyContactName.trim() || emergencyContactName.trim().length < 2) {
      newErrors.emergencyContactName = 'Vui lòng nhập họ tên người liên hệ khẩn cấp.';
    }
    if (!phoneRegex.test(emergencyContactPhone.trim())) {
      newErrors.emergencyContactPhone = 'Số điện thoại khẩn cấp không hợp lệ.';
    }
    if (!consentConfirmed) {
      newErrors.consent = 'Vui lòng tích xác nhận thông tin bên trên là chính xác.';
    }

    setErrors(newErrors);
    const messages = Object.values(newErrors);
    if (messages.length > 0) {
      setErrorMessage(messages[0]);
      const firstKey = Object.keys(newErrors)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) return;

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
        bloodType,
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
        bloodType
      };
      localStorage.setItem('bms_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('bms_user', JSON.stringify(updatedUser));
      if (updateUser) {
        updateUser({ medicalProfileCompleted: true, bloodType });
      }

      setSuccessMessage('Đã lưu hồ sơ sức khỏe thành công.');
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể lưu hồ sơ. Vui lòng thử lại sau.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-secondary small">Đang tải hồ sơ...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F4F7F9', minHeight: '100vh' }}>
      <PortalNavbar user={user} />

      <div className="bms-intake-page">
        <div className="bms-intake-container">
          {/* Header Card */}
          <div className="bms-page-header-card mb-4">
            <div className="bms-page-header-content">
              <div className="bms-page-title-row">
                <h1 className="bms-page-title">Đăng Ký Hồ Sơ Sức Khỏe</h1>
              </div>
              <p className="text-muted small m-0 mt-1">
                Khai báo thông tin hành chính và tiền sử y khoa phục vụ khám và xét nghiệm. Mục có dấu * là bắt buộc.
              </p>
            </div>
            <div className="bms-page-actions">
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                className="rounded-pill px-3 py-2 d-flex align-items-center gap-2 fw-semibold"
                onClick={() => navigate('/home')}
              >
                <ArrowLeft size={14} />
                <span>Trang Chủ</span>
              </Button>
            </div>
          </div>

          {errorMessage && (
            <Alert variant="danger" className="d-flex align-items-center gap-2 mb-4 rounded-3 border-0" dismissible onClose={() => setErrorMessage('')}>
              <AlertTriangle size={16} className="flex-shrink-0" />
              <div className="small fw-medium">{errorMessage}</div>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" className="d-flex align-items-center gap-2 mb-4 rounded-3 border-0">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <div className="small fw-medium">{successMessage}</div>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Section 1: Demographics */}
            <div className="bms-intake-card">
              <div className="bms-intake-card-head">
                <h2 className="bms-intake-card-title">
                  <span className="bms-intake-step-num">1</span>
                  Thông Tin Hành Chính
                </h2>
                <p className="bms-intake-card-sub">Thông tin định danh bệnh nhân</p>
              </div>

              <Row className="g-3">
                <Col md={7} id="field-fullName">
                  <label className="bms-intake-label" htmlFor="fullName">Họ và tên *</label>
                  <Form.Control
                    id="fullName"
                    value={demographics.fullName}
                    isInvalid={!!errors.fullName}
                    placeholder="Nguyễn Văn A"
                    onChange={(e) => {
                      clearError('fullName');
                      setDemographics((c) => ({ ...c, fullName: e.target.value }));
                    }}
                  />
                  {errors.fullName && <small className="bms-intake-err">{errors.fullName}</small>}
                </Col>

                <Col md={5} id="field-identityNumber">
                  <label className="bms-intake-label" htmlFor="identityNumber">Số CCCD *</label>
                  <Form.Control
                    id="identityNumber"
                    inputMode="numeric"
                    className="font-monospace"
                    placeholder="12 chữ số"
                    value={demographics.identityNumber}
                    isInvalid={!!errors.identityNumber}
                    onChange={(e) => {
                      clearError('identityNumber');
                      setDemographics((c) => ({ ...c, identityNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }));
                    }}
                  />
                  {errors.identityNumber && <small className="bms-intake-err">{errors.identityNumber}</small>}
                </Col>

                <Col md={4} id="field-dateOfBirth">
                  <label className="bms-intake-label" htmlFor="dateOfBirth">Ngày sinh *</label>
                  <Form.Control
                    id="dateOfBirth"
                    type="date"
                    value={demographics.dateOfBirth}
                    isInvalid={!!errors.dateOfBirth}
                    onChange={(e) => {
                      clearError('dateOfBirth');
                      setDemographics((c) => ({ ...c, dateOfBirth: e.target.value }));
                    }}
                  />
                  {errors.dateOfBirth && <small className="bms-intake-err">{errors.dateOfBirth}</small>}
                </Col>

                <Col md={4} id="field-gender">
                  <label className="bms-intake-label" htmlFor="gender">Giới tính *</label>
                  <Form.Select
                    id="gender"
                    value={demographics.gender}
                    isInvalid={!!errors.gender}
                    onChange={(e) => {
                      clearError('gender');
                      setDemographics((c) => ({ ...c, gender: e.target.value }));
                    }}
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </Form.Select>
                  {errors.gender && <small className="bms-intake-err">{errors.gender}</small>}
                </Col>

                <Col md={4} id="field-phoneNumber">
                  <label className="bms-intake-label" htmlFor="phoneNumber">Số điện thoại *</label>
                  <Form.Control
                    id="phoneNumber"
                    inputMode="numeric"
                    className="font-monospace"
                    placeholder="0912345678"
                    value={demographics.phoneNumber}
                    isInvalid={!!errors.phoneNumber}
                    onChange={(e) => {
                      clearError('phoneNumber');
                      setDemographics((c) => ({ ...c, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }));
                    }}
                  />
                  {errors.phoneNumber && <small className="bms-intake-err">{errors.phoneNumber}</small>}
                </Col>

                <Col md={12}>
                  <label className="bms-intake-label" htmlFor="address">Địa chỉ thường trú</label>
                  <Form.Control
                    id="address"
                    value={demographics.address}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    onChange={(e) => setDemographics((c) => ({ ...c, address: e.target.value }))}
                  />
                </Col>

                <Col md={6}>
                  <label className="bms-intake-label" htmlFor="healthInsuranceNumber">Mã thẻ BHYT (nếu có)</label>
                  <Form.Control
                    id="healthInsuranceNumber"
                    className="font-monospace"
                    value={healthInsuranceNumber}
                    placeholder="VD: DN479..."
                    maxLength={15}
                    onChange={(e) => setHealthInsuranceNumber(e.target.value.toUpperCase())}
                  />
                </Col>

                <Col md={6}>
                  <label className="bms-intake-label" htmlFor="occupation">Nghề nghiệp</label>
                  <Form.Control
                    id="occupation"
                    value={occupation}
                    placeholder="Tùy chọn"
                    onChange={(e) => setOccupation(e.target.value)}
                  />
                </Col>
              </Row>
            </div>

            {/* Section 2: Blood Type & Vitals */}
            <div className="bms-intake-card" id="field-bloodType">
              <div className="bms-intake-card-head">
                <h2 className="bms-intake-card-title">
                  <span className="bms-intake-step-num">2</span>
                  Nhóm Máu &amp; Chỉ Số Cơ Thể
                </h2>
                <p className="bms-intake-card-sub">Phục vụ đối chiếu kết quả xét nghiệm</p>
              </div>

              <div className="mb-4">
                <label className="bms-intake-label mb-2">Nhóm máu (ABO / Rh) *</label>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="small text-muted fw-semibold mb-2">Rh Dương (Rh+)</div>
                    <div className="bms-intake-blood-grid">
                      {BLOOD_TYPES_RH_POS.map((code) => (
                        <button
                          key={code}
                          type="button"
                          className={`bms-intake-blood-btn${bloodType === code ? ' is-active' : ''}`}
                          onClick={() => { clearError('bloodType'); setBloodType(code); }}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="small text-muted fw-semibold mb-2">Rh Âm (Rh-)</div>
                    <div className="bms-intake-blood-grid">
                      {BLOOD_TYPES_RH_NEG.map((code) => (
                        <button
                          key={code}
                          type="button"
                          className={`bms-intake-blood-btn${bloodType === code ? ' is-active' : ''}`}
                          onClick={() => { clearError('bloodType'); setBloodType(code); }}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </Col>
                </Row>

                <button
                  type="button"
                  className={`bms-intake-blood-unknown${bloodType === 'Unknown' ? ' is-active' : ''}`}
                  onClick={() => { clearError('bloodType'); setBloodType('Unknown'); }}
                >
                  Chưa xác định nhóm máu
                </button>
                {errors.bloodType && <small className="bms-intake-err">{errors.bloodType}</small>}
              </div>

              <div className="pt-4 border-top" style={{ borderColor: '#F1F5F9' }}>
                <Row className="g-3 align-items-end">
                  <Col xs={6} md={3} id="field-heightCm">
                    <label className="bms-intake-label" htmlFor="heightCm">Chiều cao (cm) *</label>
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
                    {errors.heightCm && <small className="bms-intake-err">{errors.heightCm}</small>}
                  </Col>

                  <Col xs={6} md={3} id="field-weightKg">
                    <label className="bms-intake-label" htmlFor="weightKg">Cân nặng (kg) *</label>
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
                    {errors.weightKg && <small className="bms-intake-err">{errors.weightKg}</small>}
                  </Col>

                  <Col xs={6} md={3}>
                    <label className="bms-intake-label" htmlFor="bloodPressure">Huyết áp (mmHg)</label>
                    <Form.Control
                      id="bloodPressure"
                      value={bloodPressure}
                      placeholder="120/80"
                      onChange={(e) => setBloodPressure(e.target.value)}
                    />
                  </Col>

                  <Col xs={6} md={3}>
                    <label className="bms-intake-label">Chỉ số BMI</label>
                    <div className="bms-intake-bmi-box">
                      <span className="fw-bold text-dark" style={{ fontSize: 15 }}>{bmiCalculation.value}</span>
                      <span className="small fw-semibold" style={{ color: bmiCalculation.color }}>{bmiCalculation.label}</span>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Section 3: Medical History & Allergies */}
            <div className="bms-intake-card">
              <div className="bms-intake-card-head">
                <h2 className="bms-intake-card-title">
                  <span className="bms-intake-step-num">3</span>
                  Tiền Sử Y Khoa &amp; Dị Ứng
                </h2>
                <p className="bms-intake-card-sub">Bật công tắc nếu không có</p>
              </div>

              {/* Coagulation */}
              <div className="bms-intake-history-item" id="field-coagulation">
                <div className="bms-intake-history-top">
                  <div className="bms-intake-history-title">Rối loạn đông máu / Dùng kháng đông *</div>
                  <Form.Check
                    type="switch"
                    id="switch-no-coag"
                    label="Không có"
                    checked={hasNoCoagulation}
                    onChange={(e) => {
                      clearError('coagulation');
                      setHasNoCoagulation(e.target.checked);
                      if (e.target.checked) setCoagulationNotes('');
                    }}
                    className="small fw-semibold text-secondary"
                  />
                </div>
                {!hasNoCoagulation && (
                  <>
                    <div className="bms-intake-picks">
                      {COAGULATION_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`bms-intake-pick-btn${coagulationNotes.includes(preset) ? ' is-active' : ''}`}
                          onClick={() => toggleCoagulationPreset(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Ghi rõ thuốc chống đông đang dùng hoặc tình trạng chảy máu..."
                      value={coagulationNotes}
                      onChange={(e) => { clearError('coagulation'); setCoagulationNotes(e.target.value); }}
                    />
                  </>
                )}
                {errors.coagulation && <small className="bms-intake-err">{errors.coagulation}</small>}
              </div>

              {/* Chronic Conditions */}
              <div className="bms-intake-history-item" id="field-medicalHistory">
                <div className="bms-intake-history-top">
                  <div className="bms-intake-history-title">Bệnh lý mạn tính *</div>
                  <Form.Check
                    type="switch"
                    id="switch-no-history"
                    label="Không có"
                    checked={hasNoMedicalHistory}
                    onChange={(e) => {
                      clearError('medicalHistory');
                      setHasNoMedicalHistory(e.target.checked);
                      if (e.target.checked) {
                        setSelectedConditions([]);
                        setMedicalHistoryNotes('');
                      }
                    }}
                    className="small fw-semibold text-secondary"
                  />
                </div>
                {!hasNoMedicalHistory && (
                  <>
                    <div className="bms-intake-picks">
                      {COMMON_CONDITIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`bms-intake-pick-btn${selectedConditions.includes(item) ? ' is-active' : ''}`}
                          onClick={() => { clearError('medicalHistory'); toggleCondition(item); }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Ghi thêm bệnh lý khác hoặc tiền sử phẫu thuật..."
                      value={medicalHistoryNotes}
                      onChange={(e) => { clearError('medicalHistory'); setMedicalHistoryNotes(e.target.value); }}
                    />
                  </>
                )}
                {errors.medicalHistory && <small className="bms-intake-err">{errors.medicalHistory}</small>}
              </div>

              {/* Allergies */}
              <div className="bms-intake-history-item" id="field-allergies">
                <div className="bms-intake-history-top">
                  <div className="bms-intake-history-title">Tiền sử dị ứng (thuốc, thực phẩm, hóa chất) *</div>
                  <Form.Check
                    type="switch"
                    id="switch-no-allergy"
                    label="Không có"
                    checked={hasNoAllergies}
                    onChange={(e) => {
                      clearError('allergies');
                      setHasNoAllergies(e.target.checked);
                      if (e.target.checked) {
                        setSelectedAllergies([]);
                        setAllergiesNotes('');
                      }
                    }}
                    className="small fw-semibold text-secondary"
                  />
                </div>
                {!hasNoAllergies && (
                  <>
                    <div className="bms-intake-picks">
                      {COMMON_ALLERGIES.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`bms-intake-pick-btn${selectedAllergies.some((saved) => isAllergyMatch(item, saved)) ? ' is-active' : ''}`}
                          onClick={() => { clearError('allergies'); toggleAllergy(item); }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <Form.Control
                      placeholder="Ghi thêm tác nhân dị ứng khác..."
                      value={allergiesNotes}
                      onChange={(e) => { clearError('allergies'); setAllergiesNotes(e.target.value); }}
                    />
                  </>
                )}
                {errors.allergies && <small className="bms-intake-err">{errors.allergies}</small>}
              </div>

              {/* Medications */}
              <div className="bms-intake-history-item" id="field-medications">
                <div className="bms-intake-history-top">
                  <div className="bms-intake-history-title">Thuốc đang sử dụng định kỳ *</div>
                  <Form.Check
                    type="switch"
                    id="switch-no-meds"
                    label="Không dùng"
                    checked={hasNoMedications}
                    onChange={(e) => {
                      clearError('medications');
                      setHasNoMedications(e.target.checked);
                      if (e.target.checked) setMedicationsNotes('');
                    }}
                    className="small fw-semibold text-secondary"
                  />
                </div>
                {!hasNoMedications && (
                  <div className="mt-3">
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Tên thuốc và liều dùng (ví dụ: Amlodipine 5mg mỗi sáng)..."
                      value={medicationsNotes}
                      onChange={(e) => { clearError('medications'); setMedicationsNotes(e.target.value); }}
                    />
                  </div>
                )}
                {errors.medications && <small className="bms-intake-err">{errors.medications}</small>}
              </div>
            </div>

            {/* Section 4: Emergency Contact & Submit */}
            <div className="bms-intake-card">
              <div className="bms-intake-card-head">
                <h2 className="bms-intake-card-title">
                  <span className="bms-intake-step-num">4</span>
                  Người Liên Hệ Khẩn Cấp
                </h2>
                <p className="bms-intake-card-sub">Liên hệ khi cần thiết</p>
              </div>

              <Row className="g-3">
                <Col md={5} id="field-emergencyContactName">
                  <label className="bms-intake-label" htmlFor="emergencyContactName">Họ tên người thân *</label>
                  <Form.Control
                    id="emergencyContactName"
                    placeholder="Nguyễn Thị B"
                    value={emergencyContactName}
                    isInvalid={!!errors.emergencyContactName}
                    onChange={(e) => { clearError('emergencyContactName'); setEmergencyContactName(e.target.value); }}
                  />
                  {errors.emergencyContactName && <small className="bms-intake-err">{errors.emergencyContactName}</small>}
                </Col>

                <Col md={3}>
                  <label className="bms-intake-label" htmlFor="emergencyContactRelationship">Quan hệ</label>
                  <Form.Select
                    id="emergencyContactRelationship"
                    value={emergencyContactRelationship}
                    onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  >
                    {RELATIONSHIPS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col md={4} id="field-emergencyContactPhone">
                  <label className="bms-intake-label" htmlFor="emergencyContactPhone">Số điện thoại *</label>
                  <Form.Control
                    id="emergencyContactPhone"
                    inputMode="numeric"
                    className="font-monospace"
                    placeholder="0901234567"
                    value={emergencyContactPhone}
                    isInvalid={!!errors.emergencyContactPhone}
                    onChange={(e) => {
                      clearError('emergencyContactPhone');
                      setEmergencyContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    }}
                  />
                  {errors.emergencyContactPhone && <small className="bms-intake-err">{errors.emergencyContactPhone}</small>}
                </Col>
              </Row>

              <div className="mt-4 pt-3 border-top" style={{ borderColor: '#F1F5F9' }} id="field-consent">
                <Form.Check
                  type="checkbox"
                  id="consentConfirmed"
                  checked={consentConfirmed}
                  onChange={(e) => { clearError('consent'); setConsentConfirmed(e.target.checked); }}
                  label="Tôi xác nhận các thông tin khai báo trên là chính xác."
                  className="small text-secondary fw-medium"
                />
                {errors.consent && <small className="bms-intake-err">{errors.consent}</small>}
              </div>

              <div className="d-flex justify-content-end align-items-center gap-3 mt-4 pt-3 border-top" style={{ borderColor: '#F1F5F9' }}>
                <Button
                  type="button"
                  variant="outline-secondary"
                  className="rounded-pill px-4 py-2 fw-semibold"
                  onClick={() => navigate('/home')}
                  disabled={submitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                  disabled={submitting}
                  style={{ background: '#1E60E6', borderColor: '#1E60E6' }}
                >
                  <Save size={15} />
                  <span>{submitting ? 'Đang lưu...' : 'Lưu Hồ Sơ Sức Khỏe'}</span>
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
