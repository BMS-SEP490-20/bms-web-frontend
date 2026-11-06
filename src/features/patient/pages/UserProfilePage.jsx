/**
 * @file UserProfilePage.jsx
 * @description Patient Clinical Medical Profile & Identity Management Screen.
 * Fully compliant with Hematology/Clinical Laboratory Standards (ISO 15189 / Ministry of Health).
 * Features:
 * - Direct inline medical record management (replaces obsolete modals and quick views).
 * - Mandatory laboratory profile enforcement: Blood type (ABO/Rh), Vitals (Height, Weight, BMI),
 *   Coagulation disorder history, Medical history, Allergies, Current medications, Emergency contacts.
 * - Dynamic BMI calculation and clinical risk status indicator.
 * - Self-service profile modification with real-time validation and sync to localStorage.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Badge, Button, Alert, Form, Table, Spinner, ProgressBar } from 'react-bootstrap';
import {
  FaUserInjured,
  FaIdCard,
  FaHeartbeat,
  FaTint,
  FaAllergies,
  FaPills,
  FaPhoneAlt,
  FaEdit,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaNotesMedical,
  FaShieldAlt,
  FaFileInvoiceDollar,
  FaClipboardList
} from 'react-icons/fa';

// Common chronic conditions list (clean, concise typography)
const CHRONIC_CONDITIONS = [
  'Tăng huyết áp',
  'Đái tháo đường',
  'Bệnh tim mạch',
  'Viêm gan B / C',
  'Bệnh thận mạn',
  'Hen suyễn / COPD',
  'Mỡ máu cao',
  'Bệnh tuyến giáp',
  'Dạ dày / Trào ngược',
  'Động kinh / Thần kinh'
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

// Coagulation disorder options (clinically standardized)
const COAGULATION_OPTIONS = [
  CANONICAL_NO_COAGULATION,
  'Hemophilia (máu khó đông)',
  'Xuất huyết giảm tiểu cầu',
  'Dễ chảy máu / bầm tím',
  'Dùng thuốc chống đông'
];

// Structured blood types for clinical clarity
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
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getUserProfile } from '../../../services/userService';
import { getMyPatientInformation, updateMyPatientInformation } from '../../../services/patientService';
import { SkeletonProfile } from '../../../components/common/SkeletonProfile';
import {
  isNoCoagulation,
  isCanonicalNkda,
  isAllergyMatch,
  splitAllergyTokens,
  CANONICAL_NO_COAGULATION,
  CANONICAL_NKDA
} from '../utils/clinicalProfileUtils';
import './UserProfilePage.css';

export const UserProfilePage = () => {
  const { user, userRole, userRoleName } = useAuth();
  const [profile, setProfile] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Clinical profile form state
  const [formData, setFormData] = useState({
    fullName: '',
    identityNumber: '',
    dateOfBirth: '',
    gender: 'Male',
    phoneNumber: '',
    email: '',
    address: '',
    bloodType: 'Unknown',
    heightCm: '',
    weightKg: '',
    bloodPressure: '',
    coagulationDisorders: CANONICAL_NO_COAGULATION,
    medicalHistory: '',
    allergiesText: '',
    currentMedications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: 'Vợ/Chồng'
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [userRes, patRes] = await Promise.allSettled([
        getUserProfile(),
        getMyPatientInformation()
      ]);

      let loadedProfile = null;
      let loadedPatient = null;

      if (userRes.status === 'fulfilled' && userRes.value?.isSuccess && userRes.value?.data) {
        loadedProfile = userRes.value.data;
      }

      if (patRes.status === 'fulfilled' && patRes.value) {
        loadedPatient = patRes.value;
        if (!loadedProfile) {
          loadedProfile = {
            fullName: loadedPatient.fullName,
            username: loadedPatient.patientCode || loadedPatient.id,
            patientCode: loadedPatient.patientCode || loadedPatient.id,
            role: 'Patient',
            createdAt: loadedPatient.createdAt ? new Date(loadedPatient.createdAt).toLocaleDateString('vi-VN') : '—',
            identityCardNumberMasked: loadedPatient.identityNumber || '—',
            dateOfBirth: loadedPatient.dateOfBirth ? new Date(loadedPatient.dateOfBirth).toISOString().split('T')[0] : '',
            gender: loadedPatient.gender || 'Male',
            phoneNumber: loadedPatient.phoneNumber || '',
            email: loadedPatient.email || '',
            bloodType: loadedPatient.bloodType || 'Unknown',
            address: loadedPatient.address || ''
          };
        }
      }

      setProfile(loadedProfile);
      setPatientRecord(loadedPatient);

      // Populate form data
      const baseObj = loadedPatient || loadedProfile || {};
      const vitals = loadedPatient?.vitals || {};
      const allergies = Array.isArray(loadedPatient?.allergies) ? loadedPatient.allergies.join('; ') : '';

      setFormData({
        fullName: loadedPatient?.fullName || loadedProfile?.fullName || '',
        identityNumber: loadedPatient?.identityNumber || loadedProfile?.identityCardNumber || '',
        dateOfBirth: loadedPatient?.dateOfBirth ? new Date(loadedPatient.dateOfBirth).toISOString().split('T')[0] : '',
        gender: loadedPatient?.gender || loadedProfile?.gender || 'Male',
        phoneNumber: loadedPatient?.phoneNumber || loadedProfile?.phoneNumber || '',
        email: loadedPatient?.email || loadedProfile?.email || '',
        address: loadedPatient?.address || loadedProfile?.address || '',
        bloodType: loadedPatient?.bloodType || loadedProfile?.bloodType || 'Unknown',
        heightCm: vitals.heightCm || '',
        weightKg: vitals.weightKg || '',
        bloodPressure: vitals.bloodPressure || '',
        coagulationDisorders: loadedPatient?.coagulationDisorders || CANONICAL_NO_COAGULATION,
        medicalHistory: loadedPatient?.medicalHistory || 'Chưa ghi nhận bệnh lý mãn tính',
        allergiesText: allergies || CANONICAL_NKDA,
        currentMedications: loadedPatient?.currentMedications || 'Không sử dụng thuốc định kỳ',
        emergencyContactName: loadedPatient?.emergencyContactName || '',
        emergencyContactPhone: loadedPatient?.emergencyContactPhone || '',
        emergencyContactRelationship: loadedPatient?.emergencyContactRelationship || 'Vợ/Chồng'
      });
    } catch {
      setErrorMessage('Không thể kết nối đến hệ thống hồ sơ bệnh nhân BMS.');
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time BMI calculation (Unified WHO Asian Standard)
  const bmiInfo = useMemo(() => {
    const h = parseFloat(formData.heightCm);
    const w = parseFloat(formData.weightKg);
    if (!h || !w || h <= 0 || w <= 0) {
      return { bmi: null, label: 'Chưa đủ dữ liệu', color: 'secondary' };
    }
    const hMeter = h / 100;
    const bmiVal = (w / (hMeter * hMeter)).toFixed(1);
    const num = parseFloat(bmiVal);

    if (num < 18.5) return { bmi: bmiVal, label: 'Thiếu cân (< 18.5)', color: 'warning' };
    if (num < 23.0) return { bmi: bmiVal, label: 'Bình thường (WHO Châu Á 18.5 - 22.9)', color: 'success' };
    if (num < 25.0) return { bmi: bmiVal, label: 'Thừa cân (Tiền béo phì 23 - 24.9)', color: 'warning' };
    return { bmi: bmiVal, label: 'Béo phì (≥ 25.0)', color: 'danger' };
  }, [formData.heightCm, formData.weightKg]);

  // Profile completion status check
  const isProfileComplete = useMemo(() => {
    return Boolean(
      formData.fullName?.trim() &&
      formData.identityNumber?.trim()?.length === 12 &&
      formData.phoneNumber?.trim() &&
      formData.dateOfBirth &&
      formData.bloodType &&
      formData.bloodType !== 'Unknown' &&
      parseFloat(formData.heightCm) > 0 &&
      parseFloat(formData.weightKg) > 0 &&
      formData.emergencyContactName?.trim() &&
      formData.emergencyContactPhone?.trim()
    );
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle Chronic Condition in Profile Edit
  const toggleConditionInProfile = (cond) => {
    setFormData((prev) => {
      let current = prev.medicalHistory || '';
      if (
        current === 'Chưa ghi nhận bệnh lý' ||
        current === 'Chưa ghi nhận bệnh lý mãn tính' ||
        current === 'Không có tiền sử bệnh lý mạn tính'
      ) {
        current = '';
      }
      const parts = current
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const existingIdx = parts.findIndex(
        (p) => p.toLowerCase() === cond.toLowerCase() || p.toLowerCase().includes(cond.toLowerCase())
      );
      let nextParts;
      if (existingIdx >= 0) {
        nextParts = parts.filter((_, idx) => idx !== existingIdx);
      } else {
        nextParts = [...parts, cond];
      }
      return {
        ...prev,
        medicalHistory: nextParts.length > 0 ? nextParts.join('; ') : 'Không có tiền sử bệnh lý mạn tính'
      };
    });
  };

  // Toggle Allergy in Profile Edit
  const toggleAllergyInProfile = (allergy) => {
    setFormData((prev) => {
      let current = prev.allergiesText || '';
      if (isCanonicalNkda(current)) {
        current = '';
      }
      const parts = splitAllergyTokens(current).filter((p) => !isCanonicalNkda(p));
      const existingIdx = parts.findIndex((p) => isAllergyMatch(allergy, p));
      let nextParts;
      if (existingIdx >= 0) {
        nextParts = parts.filter((_, idx) => idx !== existingIdx);
      } else {
        nextParts = [...parts, allergy];
      }
      return {
        ...prev,
        allergiesText: nextParts.length > 0 ? nextParts.join('; ') : CANONICAL_NKDA
      };
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    if (!formData.fullName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên bệnh nhân.');
      return;
    }
    if (!formData.identityNumber || formData.identityNumber.trim().length !== 12) {
      setErrorMessage('Số CCCD (Căn cước công dân) phải gồm đúng 12 chữ số theo quy định Đề án 06.');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setErrorMessage('Số điện thoại liên lạc là bắt buộc.');
      return;
    }
    if (!formData.heightCm || !formData.weightKg) {
      setErrorMessage('Vui lòng nhập Chiều cao (cm) và Cân nặng (kg) để xác định liều lượng và đánh giá xét nghiệm máu.');
      return;
    }
    if (!formData.emergencyContactName.trim() || !formData.emergencyContactPhone.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ Người liên hệ khẩn cấp (Họ tên và Số điện thoại).');
      return;
    }

    setIsSaving(true);
    try {
      const rawCoag = formData.coagulationDisorders?.trim();
      const normalizedCoag = (!rawCoag || isNoCoagulation(rawCoag))
        ? CANONICAL_NO_COAGULATION
        : rawCoag;

      const payload = {
        fullName: formData.fullName.trim(),
        identityNumber: formData.identityNumber.trim(),
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        gender: formData.gender,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email?.trim() || null,
        address: formData.address?.trim() || null,
        bloodType: formData.bloodType,
        vitals: {
          heightCm: parseFloat(formData.heightCm) || null,
          weightKg: parseFloat(formData.weightKg) || null,
          bloodPressure: formData.bloodPressure?.trim() || null
        },
        coagulationDisorders: normalizedCoag,
        medicalHistory: formData.medicalHistory?.trim() || 'Chưa ghi nhận bệnh lý',
        allergies: formData.allergiesText
          ? (isCanonicalNkda(formData.allergiesText) ? [CANONICAL_NKDA] : splitAllergyTokens(formData.allergiesText))
          : [],
        currentMedications: formData.currentMedications?.trim() || 'Không có',
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: formData.emergencyContactPhone.trim(),
        emergencyContactRelationship: formData.emergencyContactRelationship.trim()
      };

      const updated = await updateMyPatientInformation(payload);
      setPatientRecord(updated);
      setIsEditing(false);
      setSuccessMessage('Hồ sơ bệnh án xét nghiệm y tế đã được lưu và cập nhật thành công!');

      // Update user in localStorage
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('bms_user');
        if (stored) {
          const userObj = JSON.parse(stored);
          userObj.fullName = updated.fullName;
          userObj.phoneNumber = updated.phoneNumber;
          userObj.identityNumber = updated.identityNumber;
          userObj.bloodType = updated.bloodType;
          userObj.isProfileComplete = isProfileComplete;
          userObj.medicalProfileCompleted = true;
          localStorage.setItem('user', JSON.stringify(userObj));
          localStorage.setItem('bms_user', JSON.stringify(userObj));
        }
      } catch (err) {
        console.warn('Local storage sync warning:', err);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Không thể lưu hồ sơ bệnh nhân. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bms-profile-page">
        <SkeletonProfile />
      </div>
    );
  }

  const isStaff = userRole && userRole.toLowerCase() !== 'patient';

  if (isStaff) {
    const roleKey = userRole ? userRole.toLowerCase() : '';
    const staffRoleLabel = {
      receptionist: 'Lễ Tân & Điều Phối Tiếp Đón',
      doctor: 'Bác Sĩ Xét Nghiệm & Tham Vấn',
      lab_tech: 'Kỹ Thuật Viên Phòng Lab',
      manager: 'Quản Lý Khoa Xét Nghiệm',
      admin: 'Quản Trị Viên Hệ Thống'
    }[roleKey] || userRoleName || 'Nhân Viên Y Tế';

    const staffDept = {
      receptionist: 'Khoa Khám Bệnh & Quầy Tiếp Nhận',
      doctor: 'Khoa Tham Vấn & Diễn Giải Kết Quả',
      lab_tech: 'Phòng Xét Nghiệm Trung Tâm & Sinh Hóa',
      manager: 'Ban Quản Lý Chất Lượng Xét Nghiệm',
      admin: 'Phòng Công Nghệ Thông Tin & Quản Trị'
    }[roleKey] || 'Cơ sở 1 BMS MedLab';

    return (
      <div className="bms-profile-page py-4">
        <div className="container-xl">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
            <div>
              <div className="text-muted small">
                BMS / <strong className="text-primary">Hồ Sơ Nhân Sự & Tài Khoản Nội Bộ</strong>
              </div>
              <h3 className="fw-bold mb-1 text-dark">Hồ Sơ Nhân Sự Y Tế BMS MedLab</h3>
              <p className="text-muted small mb-0">
                Quản lý thông tin cán bộ y tế, chức danh chuyên môn và phân công nghiệp vụ tại cơ sở.
              </p>
            </div>
            <Badge bg="success" className="px-3 py-2 fs-6 fw-normal shadow-sm">
              <FaCheckCircle className="me-1" /> Đang Trong Ca Trực (Active)
            </Badge>
          </div>

          <Row className="g-4">
            {/* Left Column: Staff ID Card */}
            <Col xs={12} lg={4}>
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden text-center p-4 mb-4">
                <div className="bms-avatar-wrapper mx-auto mb-3">
                  <img
                    src="https://images.unsplash.com/photo-1594824813587-8488e0b68a57?w=200&h=200&fit=crop"
                    alt={user?.fullName}
                    className="bms-avatar-img rounded-circle border border-3 border-primary shadow-sm"
                    style={{ width: '110px', height: '110px', objectFit: 'cover' }}
                  />
                </div>

                <h4 className="fw-bold mb-1 text-dark">{user?.fullName || 'Lê tân Đỗ Lan Anh'}</h4>
                <p className="text-muted small mb-2">
                  Mã nhân viên: <strong className="text-primary font-monospace">{user?.id || 'NV-REC-01'}</strong>
                </p>

                <div className="mb-3">
                  <Badge bg="primary" className="px-3 py-2 rounded-pill">
                    <FaShieldAlt className="me-1" /> {staffRoleLabel}
                  </Badge>
                </div>

                <div className="p-3 bg-light rounded-3 text-start mb-3 small">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Đơn vị công tác:</span>
                    <strong className="text-dark">{staffDept}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Cơ sở:</span>
                    <strong className="text-dark">BMS Cơ sở 1 (Trung tâm)</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Ca trực hôm nay:</span>
                    <strong className="text-success">Ca sáng (07:00 - 15:00)</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Trạng thái công tác:</span>
                    <Badge bg="success">Chính thức</Badge>
                  </div>
                </div>

                <Button
                  variant="outline-primary"
                  className="w-100 rounded-3 fw-bold"
                  onClick={() => window.location.href = '/change-password'}
                >
                  Đổi Mật Khẩu Đăng Nhập
                </Button>
              </Card>
            </Col>

            {/* Right Column: Staff Details & Permissions */}
            <Col xs={12} lg={8}>
              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold text-dark">
                    <FaIdCard className="text-primary me-2" />
                    Thông Tin Nhân Sự (Đề án 06 Bộ Y Tế)
                  </h5>
                  <Badge bg="light" text="dark" className="border">
                    Hồ sơ cán bộ y tế
                  </Badge>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted small">Họ và tên nhân viên:</div>
                      <div className="fw-bold text-dark">{user?.fullName || 'Chưa cập nhật'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Mã định danh / CCCD:</div>
                      <div className="fw-bold text-dark">{user?.identityCardNumber || user?.identityNumber || 'Chưa cập nhật'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Giới tính:</div>
                      <div className="fw-bold text-dark">{user?.gender || '—'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Ngày sinh:</div>
                      <div className="fw-bold text-dark">{user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : '—'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Số điện thoại liên hệ nội bộ:</div>
                      <div className="fw-bold text-dark">{user?.phoneNumber || '—'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Email công vụ BMS:</div>
                      <div className="fw-bold text-primary">{user?.email || '—'}</div>
                    </Col>
                    <Col md={12}>
                      <div className="text-muted small">Địa chỉ công tác thường trú:</div>
                      <div className="fw-bold text-dark">Quận 1, TP. Hồ Chí Minh, Việt Nam</div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Header className="bg-white border-bottom py-3">
                  <h5 className="mb-0 fw-bold text-dark">
                    <FaShieldAlt className="text-primary me-2" />
                    Phạm Vi Phân Công Nghiệp Vụ & Quyền Hạn
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="p-3 bg-light rounded-3 mb-3">
                    <div className="fw-bold text-primary mb-2">Quyền hạn hệ thống: {staffRoleLabel}</div>
                    <ul className="mb-0 ps-3 small text-muted">
                      <li>Tiếp đón người bệnh, quét mã QR check-in hẹn trực tuyến tại quầy.</li>
                      <li>Điều phối hàng đợi và cấp số thứ tự lấy mẫu máu (Phòng 101).</li>
                      <li>Đối soát viện phí, thu ngân và phát hành Hóa đơn điện tử VAT.</li>
                      <li>Tiếp nhận và lập hồ sơ người bệnh vãng lai chưa có tài khoản.</li>
                    </ul>
                  </div>
                  <div className="d-flex justify-content-between align-items-center small text-muted">
                    <span>Tên đăng nhập: <strong>{user?.username || 'recep_lananh'}</strong></span>
                    <Badge bg="info" text="dark">Xác thực 2 lớp: Đã kích hoạt</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  return (
    <div className="bms-profile-page">
      <div className="container-xl">
        {/* Alerts */}
        {errorMessage && (
          <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="mb-4 border-0 rounded-4">
            <FaExclamationTriangle className="me-2" />
            {errorMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage('')} className="mb-4 border-0 rounded-4">
            <FaCheckCircle className="me-2" />
            {successMessage}
          </Alert>
        )}

        <Row className="g-4">
          {/* Left Column: Identity & Medical Profile Status Card */}
          <Col xs={12} lg={4} xl={3}>
            <div className="bms-profile-card text-center mb-4">
              <div className="bms-avatar-wrapper mx-auto mb-3">
                <img
                  src={profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'}
                  alt={formData.fullName}
                  className="bms-avatar-img"
                />
                <span className="bms-active-dot" title="Tài khoản hoạt động"></span>
              </div>

              <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>{formData.fullName || 'Bệnh Nhân'}</h4>
              <p className="text-muted small mb-2">Mã BN: <strong className="text-primary font-monospace">{patientRecord?.patientCode || profile?.patientCode || 'PAT-VN'}</strong></p>

              <div className="mb-3">
                <span className="bms-status-chip">
                  <FaUserInjured className="me-1" /> Bệnh Nhân Đăng Ký
                </span>
              </div>

              {/* Profile Completeness Box */}
              <div className="p-3 rounded-4 text-start mb-3" style={{ background: isProfileComplete ? '#F0FDF4' : '#FEFCE8' }}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="small fw-bold">
                    {isProfileComplete ? (
                      <span className="text-success"><FaCheckCircle className="me-1" /> Hồ Sơ Đạt Chuẩn Y Tế</span>
                    ) : (
                      <span className="text-warning text-dark"><FaExclamationTriangle className="me-1 text-warning" /> Hồ Sơ Chưa Hoàn Tất</span>
                    )}
                  </span>
                  <span className="badge bg-white text-dark small" style={{ borderRadius: '999px' }}>{isProfileComplete ? '100%' : '65%'}</span>
                </div>
                <ProgressBar
                  variant={isProfileComplete ? 'success' : 'warning'}
                  now={isProfileComplete ? 100 : 65}
                  style={{ height: '5px', borderRadius: '999px' }}
                  className="mb-2"
                />
                <p className="small text-muted mb-0" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                  {isProfileComplete
                    ? 'Hồ sơ đã đầy đủ nhóm máu, thể trạng và liên hệ khẩn cấp để đặt lịch và xét nghiệm.'
                    : 'Bắt buộc cập nhật Nhóm máu, Chiều cao, Cân nặng và Liên hệ khẩn cấp trước khi đặt lịch xét nghiệm.'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="d-grid gap-2">
                {!isEditing ? (
                  <button type="button" className="bms-btn-pill-primary w-100" onClick={() => setIsEditing(true)}>
                    <FaEdit className="me-2" /> Chỉnh Sửa Hồ Sơ Y Tế
                  </button>
                ) : (
                  <button type="button" className="bms-btn-pill-secondary w-100" onClick={() => setIsEditing(false)}>
                    <FaTimes className="me-2" /> Hủy Bỏ Chỉnh Sửa
                  </button>
                )}
              </div>
            </div>

            {/* Quick Summary Card: Vitals & Blood Type */}
            <div className="bms-profile-card">
              <h6 className="bms-profile-section-title mb-3">
                <FaHeartbeat className="text-danger" /> Tóm Tắt Chỉ Số Y Tế
              </h6>

              <div className="bms-summary-grid">
                <div className="bms-summary-tile">
                  <span className="bms-summary-label">Nhóm máu ABO/Rh:</span>
                  <span className="bms-blood-pill">
                    <FaTint size={10} />{' '}
                    {formData.bloodType === 'Unknown'
                      ? 'Chưa rõ (Định nhóm tại Lab)'
                      : formData.bloodType}
                  </span>
                </div>

                <div className="bms-summary-tile">
                  <span className="bms-summary-label">Chiều cao / Cân nặng:</span>
                  <span className="bms-summary-val">
                    {formData.heightCm ? `${formData.heightCm} cm` : '—'} / {formData.weightKg ? `${formData.weightKg} kg` : '—'}
                  </span>
                </div>

                <div className="bms-summary-tile">
                  <span className="bms-summary-label">Chỉ số BMI:</span>
                  <span className={`bms-summary-val text-${bmiInfo.color}`}>
                    {bmiInfo.bmi ? `${bmiInfo.bmi} (${bmiInfo.label})` : 'Chưa đo'}
                  </span>
                </div>

                <div className="bms-summary-tile">
                  <span className="bms-summary-label">Liên hệ khẩn cấp:</span>
                  <span className="bms-summary-val">
                    {formData.emergencyContactName ? (
                      <div>
                        <div className="fw-semibold text-dark">
                          {formData.emergencyContactName}
                          {formData.emergencyContactRelationship && (
                            <span className="text-secondary fw-normal ms-1">
                              ({formData.emergencyContactRelationship})
                            </span>
                          )}
                        </div>
                        {formData.emergencyContactPhone && (
                          <div className="small text-muted font-monospace mt-0.5">
                            {formData.emergencyContactPhone}
                          </div>
                        )}
                      </div>
                    ) : (
                      'Chưa cập nhật'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Col>

          {/* Right Column: Full Clinical Profile Form / Display */}
          <Col xs={12} lg={8} xl={9}>
            <div className="bms-profile-card">
              <div className="bms-profile-masthead">
                <div>
                  <div className="bms-status-chip">
                    TIÊU CHUẨN ISO 15189 · HỒ SƠ Y TẾ ĐIỆN TỬ
                  </div>
                  <h3 className="bms-profile-main-title">
                    Hồ Sơ Bệnh Án Chuẩn Y Tế Xét Nghiệm Máu
                  </h3>
                  <p className="bms-profile-main-subtitle">
                    Tuân thủ tiêu chuẩn an toàn phòng xét nghiệm ISO 15189:2022 &amp; Quy định Bộ Y Tế
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Link
                    to="/patient/medical-profile-setup"
                    className="bms-btn-pill-outline text-decoration-none"
                    title="Mở biểu mẫu khai báo lâm sàng toàn diện theo chuẩn Bộ Y Tế"
                  >
                    <FaClipboardList className="me-1" /> Biểu Mẫu Toàn Diện
                  </Link>
                  {!isEditing ? (
                    <button
                      type="button"
                      className="bms-btn-pill-primary"
                      onClick={() => setIsEditing(true)}
                    >
                      <FaEdit className="me-1" /> Chỉnh sửa
                    </button>
                  ) : (
                    <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill fw-semibold">
                      Chế độ chỉnh sửa
                    </span>
                  )}
                </div>
              </div>

              <Form onSubmit={handleSaveProfile}>
                {/* Section 1: Demographics & Identity */}
                <div className="mb-4">
                  <h6 className="bms-profile-section-title">
                    <FaIdCard className="text-primary" /> Thông Tin Định Danh Bệnh Nhân
                  </h6>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Họ và tên bệnh nhân <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="text"
                            name="fullName"
                            className="bms-profile-input"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                            placeholder="Nhập họ và tên có dấu"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.fullName || '—'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Số CCCD (12 chữ số) <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="text"
                            name="identityNumber"
                            className="bms-profile-input font-monospace"
                            value={formData.identityNumber}
                            onChange={handleInputChange}
                            maxLength={12}
                            required
                            placeholder="Số căn cước công dân 12 số"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box font-monospace text-primary">{formData.identityNumber || 'Chưa cập nhật'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Ngày sinh <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="date"
                            name="dateOfBirth"
                            className="bms-profile-input"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            required
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">
                            {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('vi-VN') : '—'}
                          </div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Giới tính sinh học <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Select
                            name="gender"
                            className="bms-profile-input"
                            value={formData.gender}
                            onChange={handleInputChange}
                          >
                            <option value="Male">Nam</option>
                            <option value="Female">Nữ</option>
                            <option value="Other">Khác</option>
                          </Form.Select>
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.gender === 'Female' ? 'Nữ' : 'Nam'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Số điện thoại liên hệ <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="text"
                            name="phoneNumber"
                            className="bms-profile-input font-monospace"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            required
                            placeholder="0901234567"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box font-monospace">{formData.phoneNumber || '—'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Email nhận kết quả xét nghiệm</Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="email"
                            name="email"
                            className="bms-profile-input"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="email@example.com"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.email || '—'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Địa chỉ thường trú</Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="text"
                            name="address"
                            className="bms-profile-input"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Số nhà, đường, phường/xã, quận/huyện"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.address || '—'}</div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Section 2: Clinical Vitals & Blood Compatibility */}
                <div className="mb-4">
                  <h6 className="bms-profile-section-title">
                    <FaHeartbeat className="text-primary" /> Chỉ Số Huyết Học &amp; Thể Trạng
                  </h6>

                  {isEditing && (
                    <div className="mb-3 p-3 rounded-3" style={{ background: '#F8FAFC' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="bms-setup-label mb-0">
                          Nhóm máu hệ ABO / Rh <span className="text-danger">*</span>
                        </label>
                        {formData.bloodType && formData.bloodType !== 'Unknown' ? (
                          <div className="bms-blood-selected-banner py-1 px-2">
                            <FaCheckCircle size={11} />
                            <span>Đã chọn: <strong>Nhóm máu {formData.bloodType}</strong></span>
                          </div>
                        ) : formData.bloodType === 'Unknown' ? (
                          <div className="bms-blood-selected-banner py-1 px-2 bg-light border text-secondary">
                            <FaCheckCircle size={11} className="text-secondary" />
                            <span>Đã chọn: <strong>Chưa rõ (Định nhóm tại Lab)</strong></span>
                          </div>
                        ) : null}
                      </div>

                      <div className="small text-muted mb-1" style={{ fontSize: '11px', fontWeight: 600 }}>YẾU TỐ RHESUS DƯƠNG (Rh+ · PHỔ BIẾN)</div>
                      <div className="bms-blood-matrix-grid mb-2">
                        {BLOOD_TYPES_RH_POS.map((bt) => {
                          const isActive = formData.bloodType === bt.code;
                          return (
                            <div
                              key={bt.code}
                              className={`bms-blood-matrix-item ${isActive ? 'active' : ''}`}
                              onClick={() => setFormData(prev => ({ ...prev, bloodType: bt.code }))}
                              role="button"
                              tabIndex={0}
                            >
                              <div>
                                <div className="bms-blood-code">{bt.label}</div>
                                <div className="bms-blood-meta">{bt.sub}</div>
                              </div>
                              {isActive && <FaCheckCircle size={13} className="text-white flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="small text-muted mb-1" style={{ fontSize: '11px', fontWeight: 600 }}>YẾU TỐ RHESUS ÂM (Rh- · NHÓM MÁU HIẾM)</div>
                      <div className="bms-blood-matrix-grid mb-2">
                        {BLOOD_TYPES_RH_NEG.map((bt) => {
                          const isActive = formData.bloodType === bt.code;
                          return (
                            <div
                              key={bt.code}
                              className={`bms-blood-matrix-item ${isActive ? 'active' : ''}`}
                              onClick={() => setFormData(prev => ({ ...prev, bloodType: bt.code }))}
                              role="button"
                              tabIndex={0}
                            >
                              <div>
                                <div className="bms-blood-code">{bt.label}</div>
                                <div className="bms-blood-meta">{bt.sub}</div>
                              </div>
                              {isActive && <FaCheckCircle size={13} className="text-white flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-1">
                        <div
                          className={`bms-blood-unknown-btn ${formData.bloodType === 'Unknown' ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, bloodType: 'Unknown' }))}
                          role="button"
                          tabIndex={0}
                        >
                          {formData.bloodType === 'Unknown' ? <FaCheckCircle size={11} className="me-1" /> : null}
                          Chưa rõ nhóm máu (Định nhóm tại Lab)
                        </div>
                      </div>
                    </div>
                  )}

                  <Row className="g-3">
                    {!isEditing && (
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Nhóm máu hệ ABO / Rh <span className="text-danger">*</span></Form.Label>
                          <div className="pt-1">
                            <span className="bms-blood-pill">
                              <FaTint size={11} />{' '}
                              {formData.bloodType === 'Unknown'
                                ? 'Chưa rõ (Định nhóm tại Lab)'
                                : `Nhóm máu ${formData.bloodType}`}
                            </span>
                          </div>
                        </Form.Group>
                      </Col>
                    )}

                    <Col md={isEditing ? 4 : 3}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Chiều cao (cm) <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="number"
                            name="heightCm"
                            className="bms-profile-input"
                            value={formData.heightCm}
                            onChange={handleInputChange}
                            min={30}
                            max={250}
                            required
                            placeholder="Ví dụ: 170"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.heightCm ? `${formData.heightCm} cm` : '—'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={isEditing ? 4 : 3}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Cân nặng (kg) <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="number"
                            step="0.5"
                            name="weightKg"
                            className="bms-profile-input"
                            value={formData.weightKg}
                            onChange={handleInputChange}
                            min={2}
                            max={300}
                            required
                            placeholder="Ví dụ: 65"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.weightKg ? `${formData.weightKg} kg` : '—'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={isEditing ? 4 : 3}>
                      {isEditing ? (
                        <div className="h-100 d-flex flex-column justify-content-end">
                          <div className="p-2 px-3 rounded-2 d-flex align-items-center justify-content-between" style={{ background: '#F8FAFC', minHeight: '38px', border: '1px solid #E2E8F0' }}>
                            <span className="small text-muted fw-semibold">BMI: {bmiInfo.bmi ? `${bmiInfo.bmi} kg/m²` : '—'}</span>
                            <Badge bg={bmiInfo.color} className="px-2 py-1 rounded-pill small">
                              {bmiInfo.label}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Form.Label className="small fw-semibold text-muted">Chỉ số BMI</Form.Label>
                          <div className="bms-profile-readonly-box d-flex justify-content-between">
                            <span className={`fw-bold text-${bmiInfo.color}`}>
                              {bmiInfo.bmi ? `${bmiInfo.bmi} kg/m²` : '—'}
                            </span>
                            <Badge bg={bmiInfo.color} className="px-2 py-1 rounded-pill small">
                              {bmiInfo.label}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>

                {/* Section 3: Specialized Blood Test Medical History */}
                <div className="mb-5">
                  <h6 className="bms-profile-section-title">
                    <FaPills className="text-primary" /> Tiền Sử Y Khoa &amp; Rối Loạn Đông Máu
                  </h6>
                  <Row className="g-4">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="bms-field-label">
                          Rối loạn đông máu / Dùng kháng đông <span className="text-danger">*</span>
                        </Form.Label>
                        {isEditing ? (
                          <>
                            <Form.Control
                              type="text"
                              name="coagulationDisorders"
                              className="bms-profile-input mb-2"
                              value={formData.coagulationDisorders}
                              onChange={handleInputChange}
                              placeholder="Ví dụ: Không có / Xuất huyết dưới da / Hemophilia / Đang dùng thuốc chống đông..."
                            />
                            <div className="fast-tag-group">
                              {COAGULATION_OPTIONS.map((opt) => {
                                const curr = (formData.coagulationDisorders || '').trim();
                                const isSelected = opt === CANONICAL_NO_COAGULATION
                                  ? isNoCoagulation(curr)
                                  : (curr.toLowerCase() === opt.toLowerCase() || curr.toLowerCase().includes(opt.toLowerCase()));
                                return (
                                  <div
                                    key={opt}
                                    className={`fast-tag-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setFormData((prev) => ({ ...prev, coagulationDisorders: opt }))}
                                  >
                                    {isSelected && <FaCheckCircle size={10} className="me-1 text-white" />}
                                    {opt}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="bms-profile-readonly-box">
                            {formData.coagulationDisorders || CANONICAL_NO_COAGULATION}
                          </div>
                        )}
                        <Form.Text className="text-muted small mt-1 d-block" style={{ fontSize: '11.5px' }}>
                          Lưu ý: Báo trước cho kỹ thuật viên nếu đang dùng thuốc chống đông máu.
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <Form.Label className="bms-field-label mb-0">
                            Bệnh lý mạn tính (nội khoa)
                          </Form.Label>
                          {isEditing && (
                            <Button
                              variant="link"
                              size="sm"
                              className="text-decoration-none p-0 text-success small fw-semibold"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  medicalHistory: 'Không có tiền sử bệnh lý mãn tính'
                                }))
                              }
                            >
                              ✓ Đặt là "Không có bệnh"
                            </Button>
                          )}
                        </div>
                        {isEditing ? (
                          <>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              name="medicalHistory"
                              className="bms-profile-input mb-2"
                              value={formData.medicalHistory}
                              onChange={handleInputChange}
                              placeholder="Tăng huyết áp, Đái tháo đường, Tim mạch, Bệnh gan/thận..."
                            />
                            <div>
                              <small className="text-muted fw-semibold d-block mb-1" style={{ fontSize: '11px' }}>
                                Gợi ý chọn nhanh:
                              </small>
                              <div className="fast-tag-group">
                                {CHRONIC_CONDITIONS.map((cond) => {
                                  const isSelected =
                                    formData.medicalHistory &&
                                    formData.medicalHistory.toLowerCase().includes(cond.toLowerCase());
                                  return (
                                    <div
                                      key={cond}
                                      className={`fast-tag-item ${isSelected ? 'selected' : ''}`}
                                      onClick={() => toggleConditionInProfile(cond)}
                                    >
                                      {isSelected && <FaCheckCircle size={10} className="me-1 text-white" />}
                                      {cond}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bms-profile-readonly-box">
                            {formData.medicalHistory || 'Chưa ghi nhận bệnh lý'}
                          </div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <Form.Label className="bms-field-label mb-0">
                            Tiền sử dị ứng (thuốc, thực phẩm)
                          </Form.Label>
                          {isEditing && (
                            <Button
                              variant="link"
                              size="sm"
                              className="text-decoration-none p-0 text-success small fw-semibold"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  allergiesText: CANONICAL_NKDA
                                }))
                              }
                            >
                              ✓ Đặt là "Không có dị ứng (NKDA)"
                            </Button>
                          )}
                        </div>
                        {isEditing ? (
                          <>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              name="allergiesText"
                              className="bms-profile-input mb-2"
                              value={formData.allergiesText}
                              onChange={handleInputChange}
                              placeholder="Dị ứng kháng sinh, cồn sát khuẩn, thức ăn..."
                            />
                            <div>
                              <small className="text-muted fw-semibold d-block mb-1" style={{ fontSize: '11px' }}>
                                Gợi ý tác nhân dị ứng:
                              </small>
                              <div className="fast-tag-group">
                                {COMMON_ALLERGIES.map((alg) => {
                                  const isSelected =
                                    formData.allergiesText &&
                                    isAllergyMatch(alg, formData.allergiesText);
                                  return (
                                    <div
                                      key={alg}
                                      className={`fast-tag-item ${isSelected ? 'selected' : ''}`}
                                      onClick={() => toggleAllergyInProfile(alg)}
                                    >
                                      {isSelected && <FaCheckCircle size={10} className="me-1 text-white" />}
                                      {alg}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bms-profile-readonly-box">
                            {formData.allergiesText || CANONICAL_NKDA}
                          </div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <Form.Label className="bms-field-label mb-0">
                            Thuốc đang sử dụng định kỳ
                          </Form.Label>
                          {isEditing && (
                            <Button
                              variant="link"
                              size="sm"
                              className="text-decoration-none p-0 text-success small fw-semibold"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  currentMedications: 'Không sử dụng thuốc định kỳ'
                                }))
                              }
                            >
                              ✓ Đặt là "Không dùng thuốc"
                            </Button>
                          )}
                        </div>
                        {isEditing ? (
                          <Form.Control
                            type="text"
                            name="currentMedications"
                            className="bms-profile-input"
                            value={formData.currentMedications}
                            onChange={handleInputChange}
                            placeholder="Ví dụ: Aspirin 81mg, Amlodipine 5mg, Metformin..."
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">
                            {formData.currentMedications || 'Không sử dụng thuốc định kỳ'}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Section 4: Emergency Contacts */}
                <div className="mb-4">
                  <h6 className="bms-profile-section-title">
                    <FaPhoneAlt className="text-primary" /> Thông Tin Người Liên Hệ Khẩn Cấp
                  </h6>
                  <Row className="g-3">
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Họ và tên người thân <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="text"
                            name="emergencyContactName"
                            className="bms-profile-input"
                            value={formData.emergencyContactName}
                            onChange={handleInputChange}
                            required
                            placeholder="Họ tên người liên hệ"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.emergencyContactName || 'Chưa cập nhật'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Số điện thoại người thân <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Control
                            type="text"
                            name="emergencyContactPhone"
                            className="bms-profile-input font-monospace"
                            value={formData.emergencyContactPhone}
                            onChange={handleInputChange}
                            required
                            placeholder="Số điện thoại khẩn cấp"
                          />
                        ) : (
                          <div className="bms-profile-readonly-box font-monospace text-primary">{formData.emergencyContactPhone || 'Chưa cập nhật'}</div>
                        )}
                      </Form.Group>
                    </Col>

                    <Col md={3}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-muted">Mối quan hệ <span className="text-danger">*</span></Form.Label>
                        {isEditing ? (
                          <Form.Select
                            name="emergencyContactRelationship"
                            className="bms-profile-input"
                            value={formData.emergencyContactRelationship}
                            onChange={handleInputChange}
                          >
                            <option value="Vợ/Chồng">Vợ/Chồng</option>
                            <option value="Bố/Mẹ">Bố/Mẹ</option>
                            <option value="Con cái">Con cái</option>
                            <option value="Anh/Chị/Em">Anh/Chị/Em</option>
                            <option value="Người giám hộ">Người giám hộ</option>
                            <option value="Khác">Khác</option>
                          </Form.Select>
                        ) : (
                          <div className="bms-profile-readonly-box">{formData.emergencyContactRelationship || '—'}</div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Submit buttons when editing */}
                {isEditing && (
                  <div className="d-flex justify-content-end gap-2 pt-3">
                    <button
                      type="button"
                      className="bms-btn-pill-secondary"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="bms-btn-pill-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" /> Đang lưu hồ sơ...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" /> Lưu Hồ Sơ Bệnh Án Y Tế
                        </>
                      )}
                    </button>
                  </div>
                )}
              </Form>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default UserProfilePage;

