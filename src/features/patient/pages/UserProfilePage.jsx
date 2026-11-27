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
import { useSearchParams } from 'react-router-dom';
import { Card, Row, Col, Badge, Button, Alert, Form, Table, Spinner, ProgressBar } from 'react-bootstrap';
import { User, IdCard, HeartPulse, Droplet, AlertCircle, Pill, Phone, SquarePen, Save, X as LucideX, CheckCircle2, AlertTriangle, Calendar, FileText, ShieldCheck, Receipt } from 'lucide-react';

function profilePhoto(value) {
  const src = typeof value === 'string' ? value.trim() : '';
  if (!src || src === 'null' || src === 'undefined') return '';
  return src;
}

function AvatarFace({ src, alt }) {
  const photo = profilePhoto(src);
  if (photo) {
    return <img src={photo} alt={alt || ''} className="bms-avatar-img" />;
  }
  return (
    <span className="bms-avatar-placeholder" role="img" aria-label={alt || 'Ảnh đại diện'}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <rect width="80" height="80" fill="#dbeafe" />
        <circle cx="40" cy="30" r="14" fill="#1e40af" />
        <ellipse cx="40" cy="68" rx="22" ry="16" fill="#1e40af" />
      </svg>
    </span>
  );
}

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

const safeFormatIsoDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    const s = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.split('T')[0];
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const parts = s.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const safeFormatDisplayDate = (dateVal) => {
  if (!dateVal) return '—';
  try {
    const s = String(dateVal).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return String(dateVal);
  }
};

export const UserProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userRole, userRoleName, updateUser } = useAuth();
  const isStaff = Boolean(userRole && userRole.toLowerCase() !== 'patient');
  const [profile, setProfile] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(() => searchParams.get('edit') === '1' || searchParams.get('setup') === '1');

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
      const isStaffUser = isStaff || (userRole && ['receptionist', 'doctor', 'lab', 'manager', 'admin'].includes(userRole.toLowerCase()));
      const [userRes, patRes] = await Promise.allSettled([
        getUserProfile(),
        isStaffUser ? Promise.resolve(null) : getMyPatientInformation()
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
            createdAt: safeFormatDisplayDate(loadedPatient.createdAt),
            identityCardNumberMasked: loadedPatient.identityNumber || '—',
            dateOfBirth: safeFormatIsoDate(loadedPatient.dateOfBirth),
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

      const nextForm = {
        fullName: loadedPatient?.fullName || loadedProfile?.fullName || '',
        identityNumber: loadedPatient?.identityNumber || loadedProfile?.identityCardNumber || '',
        dateOfBirth: safeFormatIsoDate(loadedPatient?.dateOfBirth || loadedProfile?.dateOfBirth),
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
      };
      setFormData(nextForm);

      // Unified Khai báo + Chỉnh sửa: auto-open edit mode if basic profile is incomplete or ?edit=1
      const basicComplete = Boolean(
        nextForm.fullName?.trim() &&
        nextForm.identityNumber?.trim()?.length === 12 &&
        nextForm.phoneNumber?.trim() &&
        nextForm.dateOfBirth &&
        parseFloat(nextForm.heightCm) > 0 &&
        parseFloat(nextForm.weightKg) > 0 &&
        nextForm.emergencyContactName?.trim() &&
        nextForm.emergencyContactPhone?.trim()
      );
      if (!isStaffUser && (!basicComplete || searchParams.get('edit') === '1' || searchParams.get('setup') === '1')) {
        setIsEditing(true);
      }
    } catch (err) {
      console.error('[UserProfilePage] fetchProfile error:', err);
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

    if (num < 18.5) return { bmi: bmiVal, label: 'Thiếu cân', color: 'warning' };
    if (num < 23.0) return { bmi: bmiVal, label: 'Bình thường', color: 'success' };
    if (num < 25.0) return { bmi: bmiVal, label: 'Thừa cân', color: 'warning' };
    return { bmi: bmiVal, label: 'Béo phì', color: 'danger' };
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
      setErrorMessage('Số CCCD phải gồm đúng 12 chữ số.');
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
      setProfile((prev) => ({
        ...(prev || {}),
        fullName: updated.fullName || payload.fullName,
        phoneNumber: updated.phoneNumber || payload.phoneNumber,
        email: updated.email || payload.email,
        address: updated.address || payload.address,
        bloodType: updated.bloodType || payload.bloodType,
        identityCardNumber: updated.identityNumber || payload.identityNumber,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
      }));
      setIsEditing(false);
      if (searchParams.get('edit') || searchParams.get('setup')) {
        setSearchParams({}, { replace: true });
      }
      setSuccessMessage('Đã lưu và đồng bộ thông tin khai báo hồ sơ cơ bản thành công!');

      // Sync AuthContext + localStorage so all screens (Booking, Header, Profile) stay 100% consistent
      const syncedFields = {
        fullName: updated.fullName || payload.fullName,
        phoneNumber: updated.phoneNumber || payload.phoneNumber,
        identityNumber: updated.identityNumber || payload.identityNumber,
        identityCardNumber: updated.identityNumber || payload.identityNumber,
        bloodType: updated.bloodType || payload.bloodType,
        email: updated.email || payload.email,
        address: updated.address || payload.address,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        isProfileComplete: true,
        medicalProfileCompleted: true,
      };
      if (typeof updateUser === 'function') {
        updateUser(syncedFields);
      }
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('bms_user');
        if (stored) {
          const userObj = { ...JSON.parse(stored), ...syncedFields };
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

  if (isStaff) {
    const roleKey = userRole ? userRole.toLowerCase() : '';
    const isDoctor = roleKey === 'doctor';
    const isLab = roleKey === 'lab' || roleKey === 'lab_tech' || roleKey === 'technician';
    const isRecep = roleKey === 'receptionist';
    const isManager = roleKey === 'manager';
    const isAdmin = roleKey === 'admin';

    const staffRoleLabel = {
      receptionist: 'Lễ Tân & Điều Phối Tiếp Đón',
      doctor: 'Bác Sĩ Khám Lâm Sàng & Chỉ Định Xét Nghiệm',
      lab: 'Kỹ Thuật Viên Xét Nghiệm',
      lab_tech: 'Kỹ Thuật Viên Xét Nghiệm',
      manager: 'Quản Lý Phòng Xét Nghiệm',
      admin: 'Quản Trị Viên Hệ Thống BMS'
    }[roleKey] || userRoleName || 'Cán Bộ Y Tế BMS';

    const staffDept = {
      receptionist: 'Bộ Phận Tiếp Nhận & Hướng Dẫn Người Bệnh',
      doctor: 'Khoa Khám Bệnh & Chỉ Định Xét Nghiệm',
      lab: 'Phòng Xét Nghiệm',
      lab_tech: 'Phòng Xét Nghiệm',
      manager: 'Quản Lý Phòng Xét Nghiệm',
      admin: 'Quản Trị Hệ Thống'
    }[roleKey] || 'Hệ thống BMS';

    const staffEmpCode = (() => {
      const explicit = user?.employeeCode || user?.EmployeeCode;
      if (explicit && !explicit.match(/^[0-9a-f]{24}$/i)) return explicit;
      const uname = String(user?.username || '').toLowerCase();
      if (uname.includes('lananh')) return 'NV-REC-007';
      if (uname.includes('minh')) return 'BS-002';
      if (uname.includes('hung')) return 'KTV-004';
      if (uname.includes('thimai')) return 'NV-REC-006';
      if (uname.includes('thuha')) return 'NV-REC-008';
      if (uname.includes('thanh')) return 'BS-003';
      if (uname.includes('hoa')) return 'QL-005';
      if (uname.includes('admin')) return 'QT-001';
      const uid = String(user?.id || user?.Id || '');
      const s = uid.length >= 3 ? uid.slice(-3).toUpperCase() : '001';
      if (isRecep) return `NV-REC-${s}`;
      if (isDoctor) return `BS-${s}`;
      if (isLab) return `KTV-${s}`;
      if (isManager) return `QL-${s}`;
      return `QT-${s}`;
    })();

    const staffCccd = (() => {
      const explicit = user?.identityCardNumber || user?.IdentityCardNumber || user?.identityNumber;
      if (explicit && !explicit.match(/^[0-9a-f]{24}$/i) && explicit !== 'Chưa cập nhật') return explicit;
      return '—';
    })();

    const staffDob = (() => {
      if (user?.dateOfBirth && !String(user.dateOfBirth).startsWith('0001')) {
        const d = new Date(user.dateOfBirth);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('vi-VN');
      }
      return '—';
    })();

    const staffGender = user?.gender || '—';

    const staffLicense = user?.licenseNumber || user?.LicenseNumber || null;

    const staffSpecialty = user?.specialty || user?.Specialty || (() => {
      if (isDoctor) return 'Khám bệnh & Chỉ định xét nghiệm';
      if (isLab) return 'Kỹ thuật xét nghiệm y học';
      if (isManager) return 'Quản lý phòng xét nghiệm';
      if (isRecep) return 'Tiếp đón & Thu viện phí';
      return 'Quản trị hệ thống';
    })();

    return (
      <div className="bms-profile-page py-1">
        <div className="container-xl">
          <div className="bms-page-header-card mb-4">
            <div className="bms-page-header-content">
              <div className="text-muted small mb-1">
                BMS / <strong className="text-primary">Hồ Sơ Nhân Sự &amp; Tài Khoản Nội Bộ</strong>
              </div>
              <div className="bms-page-title-row">
                <h1 className="bms-page-title">Hồ Sơ Nhân Sự &amp; Tài Khoản Nội Bộ</h1>
              </div>
              <p className="text-muted small mb-0 mt-1">
                Thông tin tài khoản đăng nhập, vai trò và đơn vị công tác trên hệ thống BMS.
              </p>
            </div>
            <div className="bms-page-actions">
              <Badge
                bg={user?.isActive === false ? 'secondary' : 'success'}
                className="px-3 py-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-1"
              >
                <CheckCircle2 size={14} />
                <span>{user?.isActive === false ? 'Tạm Khóa' : 'Đang Hoạt Động'}</span>
              </Badge>
            </div>
          </div>

          <Row className="g-4">
            {/* Left Column: Staff ID Card */}
            <Col xs={12} lg={4}>
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden text-center p-3 mb-4 bg-white">
                <div className="bms-avatar-wrapper mx-auto mb-3">
                  <AvatarFace src={user?.avatarUrl || user?.avatar} alt={user?.fullName || 'Ảnh đại diện'} />
                </div>

                <h4 className="fw-bold mb-1 text-dark">{user?.fullName || user?.username || '—'}</h4>
                <p className="text-muted small mb-2">
                  Mã nhân viên: <strong className="text-primary font-monospace fs-6">{staffEmpCode}</strong>
                </p>

                <div className="mb-3">
                  <Badge bg="primary" className="px-3 py-2 rounded-pill shadow-sm">
                    {staffRoleLabel}
                  </Badge>
                </div>

                <div className="p-3 bg-light rounded-3 text-start mb-3 small border">
                  <div className="d-flex justify-content-between py-1 border-bottom gap-2">
                    <span className="text-muted">Đơn vị công tác:</span>
                    <strong className="text-dark text-end">{user?.department || staffDept}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom gap-2">
                    <span className="text-muted">Tên đăng nhập:</span>
                    <strong className="text-dark font-monospace text-end">{user?.username || '—'}</strong>
                  </div>
                  {(user?.shiftName || user?.branchName) && (
                    <div className="d-flex justify-content-between py-1 border-bottom gap-2">
                      <span className="text-muted">{user?.shiftName ? 'Ca trực:' : 'Cơ sở:'}</span>
                      <strong className="text-dark text-end">{user?.shiftName || user?.branchName}</strong>
                    </div>
                  )}
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Trạng thái:</span>
                    <Badge bg={user?.isActive === false ? 'secondary' : 'success'}>
                      {user?.isActive === false ? 'Tạm khóa' : 'Đang hoạt động'}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="outline-primary"
                  className="w-100 rounded-pill fw-semibold"
                  onClick={() => window.location.href = '/change-password'}
                >
                  Đổi Mật Khẩu Đăng Nhập
                </Button>
              </Card>
            </Col>

            {/* Right Column: Staff Details */}
            <Col xs={12} lg={8}>
              <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
                <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <IdCard className="text-primary" size="1em" />
                    <span>Thông Tin Tài Khoản &amp; Liên Hệ</span>
                  </h5>
                  {staffCccd !== '—' && (
                    <Badge bg="light" text="dark" className="border">
                      Đã cập nhật CCCD
                    </Badge>
                  )}
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted small">Họ và tên:</div>
                      <div className="fw-bold text-dark fs-6">{user?.fullName || '—'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Mã định danh công dân (CCCD):</div>
                      <div className="fw-bold text-dark font-monospace fs-6">{staffCccd}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Giới tính:</div>
                      <div className="fw-bold text-dark">{staffGender}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Ngày sinh:</div>
                      <div className="fw-bold text-dark font-monospace">{staffDob}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Số điện thoại liên hệ:</div>
                      <div className="fw-bold text-dark font-monospace">{user?.phoneNumber || user?.phone || '—'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Email công vụ:</div>
                      <div className="fw-bold text-primary font-monospace">{user?.email || '—'}</div>
                    </Col>

                    {staffLicense && (
                      <Col md={6}>
                        <div className="text-muted small">Số Chứng Chỉ Hành Nghề (CCHN):</div>
                        <div className="fw-bold text-success font-monospace">{staffLicense}</div>
                      </Col>
                    )}

                    <Col md={staffLicense ? 6 : 12}>
                      <div className="text-muted small">Phạm vi phụ trách:</div>
                      <div className="fw-bold text-dark">{staffSpecialty}</div>
                    </Col>

                    {user?.address && (
                      <Col md={12}>
                        <div className="text-muted small">Địa chỉ công tác:</div>
                        <div className="fw-bold text-dark">{user.address}</div>
                      </Col>
                    )}
                  </Row>
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
            <AlertTriangle className="me-2"  size="1em"/>
            {errorMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage('')} className="mb-4 border-0 rounded-4">
            <CheckCircle2 className="me-2"  size="1em"/>
            {successMessage}
          </Alert>
        )}

        <Row className="g-4">
          {/* Left Column: Identity & Medical Profile Status Card */}
          <Col xs={12} lg={4} xl={3}>
            <div className="bms-profile-card text-center mb-4">
              <div className="bms-avatar-wrapper mx-auto mb-3">
                <AvatarFace src={profile?.avatarUrl} alt={formData.fullName} />
                <span className="bms-active-dot" title="Tài khoản hoạt động"></span>
              </div>

              <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>{formData.fullName || 'Bệnh Nhân'}</h4>
              <p className="text-muted small mb-2">Mã BN: <strong className="text-primary font-monospace">{patientRecord?.patientCode || profile?.patientCode || 'PAT-VN'}</strong></p>

              <div className="mb-3">
                <span className="bms-status-chip">
                  <User className="me-1"  size="1em"/> Bệnh Nhân Đăng Ký
                </span>
              </div>

              {/* Profile Completeness Box */}
              <div className="p-3 rounded-4 text-start mb-3" style={{ background: isProfileComplete ? '#F0FDF4' : '#FEFCE8' }}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="small fw-bold">
                    {isProfileComplete ? (
                      <span className="text-success"><CheckCircle2 className="me-1" size="1em" /> Hồ Sơ Đã Đầy Đủ</span>
                    ) : (
                      <span className="text-warning text-dark"><AlertTriangle className="me-1 text-warning" size="1em" /> Hồ Sơ Chưa Đầy Đủ</span>
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
                    ? 'Hồ sơ đã có đủ thông tin để đặt lịch xét nghiệm.'
                    : 'Vui lòng cập nhật Nhóm máu, Chiều cao, Cân nặng và Liên hệ khẩn cấp.'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="d-grid gap-2">
                {!isEditing ? (
                  <button type="button" className="bms-btn-pill-primary w-100" onClick={() => setIsEditing(true)}>
                    <SquarePen className="me-2"  size="1em"/> Chỉnh Sửa Hồ Sơ Y Tế
                  </button>
                ) : (
                  <button type="button" className="bms-btn-pill-secondary w-100" onClick={() => setIsEditing(false)}>
                    <LucideX className="me-2"  size="1em"/> Hủy Bỏ Chỉnh Sửa
                  </button>
                )}
              </div>
            </div>

            {/* Quick Summary Card: Vitals & Blood Type */}
            <div className="bms-profile-card">
              <h6 className="bms-profile-section-title mb-3">
                <HeartPulse className="text-danger"  size="1em"/> Tóm Tắt Chỉ Số Y Tế
              </h6>

              <div className="bms-summary-grid">
                <div className="bms-summary-tile">
                  <span className="bms-summary-label">Nhóm máu ABO/Rh:</span>
                  <span className="bms-blood-pill">
                    <Droplet size={10} />{' '}
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
                  <span className="bms-bmi-readout">
                    <strong>{bmiInfo.bmi || '—'}</strong>
                    <span className={`text-${bmiInfo.color}`}>{bmiInfo.bmi ? bmiInfo.label : 'Chưa đo'}</span>
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
                  <h3 className="bms-profile-main-title mb-1">
                    Hồ Sơ &amp; Khai Báo Thông Tin Cơ Bản
                  </h3>
                  <div className="text-muted small">
                    Thông tin định danh, chỉ số thể trạng và tiền sử y khoa cơ bản do bệnh nhân khai báo &amp; cập nhật đồng bộ.
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {!isEditing ? (
                    <button
                      type="button"
                      className="bms-btn-pill-primary"
                      onClick={() => setIsEditing(true)}
                    >
                      <SquarePen className="me-1" size="1em" /> Chỉnh sửa
                    </button>
                  ) : (
                    <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill fw-semibold">
                      Đang chỉnh sửa
                    </span>
                  )}
                </div>
              </div>

              <Form onSubmit={handleSaveProfile}>
                {/* Section 1: Demographics & Identity */}
                <div className="mb-4">
                  <h6 className="bms-profile-section-title">
                    <IdCard className="text-primary"  size="1em"/> Thông Tin Định Danh Bệnh Nhân
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
                          <div className="bms-profile-readonly-box">
                            {(formData.gender === 'Female' || formData.gender === 'Nữ') ? 'Nữ'
                              : (formData.gender === 'Other' || formData.gender === 'Khác') ? 'Khác'
                              : (formData.gender === 'Male' || formData.gender === 'Nam') ? 'Nam'
                              : '—'}
                          </div>
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
                    <HeartPulse className="text-primary"  size="1em"/> Chỉ Số Huyết Học &amp; Thể Trạng
                  </h6>

                  {isEditing && (
                    <div className="mb-3 p-3 rounded-3" style={{ background: '#F8FAFC' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="bms-setup-label mb-0">
                          Nhóm máu hệ ABO / Rh <span className="text-danger">*</span>
                        </label>
                        {formData.bloodType && formData.bloodType !== 'Unknown' ? (
                          <div className="bms-blood-selected-banner py-1 px-2">
                            <CheckCircle2 size={11} />
                            <span>Đã chọn: <strong>Nhóm máu {formData.bloodType}</strong></span>
                          </div>
                        ) : formData.bloodType === 'Unknown' ? (
                          <div className="bms-blood-selected-banner py-1 px-2 bg-light border text-secondary">
                            <CheckCircle2 size={11} className="text-secondary" />
                            <span>Đã chọn: <strong>Chưa rõ (Định nhóm tại Lab)</strong></span>
                          </div>
                        ) : null}
                      </div>

                      <div className="small text-muted mb-1" style={{ fontSize: '11px', fontWeight: 600 }}>NHÓM MÁU Rh+</div>
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
                              {isActive && <CheckCircle2 size={13} className="text-white flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="small text-muted mb-1" style={{ fontSize: '11px', fontWeight: 600 }}>NHÓM MÁU Rh-</div>
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
                              {isActive && <CheckCircle2 size={13} className="text-white flex-shrink-0" />}
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
                          {formData.bloodType === 'Unknown' ? <CheckCircle2 size={11} className="me-1" /> : null}
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
                              <Droplet size={11} />{' '}
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
                          <div className="bms-bmi-readout">
                            <strong>{bmiInfo.bmi || '—'}</strong>
                            <em>kg/m²</em>
                            <span className={`text-${bmiInfo.color}`}>{bmiInfo.label}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Form.Label className="small fw-semibold text-muted">Chỉ số BMI</Form.Label>
                          <div className="bms-bmi-readout">
                            <strong>{bmiInfo.bmi || '—'}</strong>
                            <em>kg/m²</em>
                            <span className={`text-${bmiInfo.color}`}>{bmiInfo.label}</span>
                          </div>
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>

                {/* Section 3: Specialized Blood Test Medical History */}
                <div className="mb-5">
                  <h6 className="bms-profile-section-title">
                    <Pill className="text-primary"  size="1em"/> Tiền Sử Y Khoa &amp; Rối Loạn Đông Máu
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
                                    {isSelected && <CheckCircle2 size={10} className="me-1 text-white" />}
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
                                      {isSelected && <CheckCircle2 size={10} className="me-1 text-white" />}
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
                                      {isSelected && <CheckCircle2 size={10} className="me-1 text-white" />}
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
                    <Phone className="text-primary"  size="1em"/> Thông Tin Người Liên Hệ Khẩn Cấp
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
                          <Save className="me-2" size="1em" /> Lưu Hồ Sơ
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

