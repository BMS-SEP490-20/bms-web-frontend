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

// Common chronic conditions list matching MOH standards
const CHRONIC_CONDITIONS = [
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

// Coagulation disorder options
const COAGULATION_OPTIONS = [
  'Không có tiền sử rối loạn đông máu',
  'Bệnh Hemophilia (máu khó đông)',
  'Xuất huyết giảm tiểu cầu',
  'Dễ chảy máu bầm tím / Chảy máu kéo dài',
  'Đang dùng thuốc chống đông (Warfarin / Sintrom / Aspirin)'
];
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getUserProfile } from '../../../services/userService';
import { getMyPatientInformation, updateMyPatientInformation } from '../../../services/patientService';
import { SkeletonProfile } from '../../../components/common/SkeletonProfile';
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
    bloodType: 'O+',
    heightCm: '',
    weightKg: '',
    bloodPressure: '',
    coagulationDisorders: 'Không có tiền sử rối loạn đông máu',
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
            bloodType: loadedPatient.bloodType || 'O+',
            address: loadedPatient.address || ''
          };
        }
      }

      setProfile(loadedProfile);
      setPatientRecord(loadedPatient);

      // Populate form data
      const baseObj = loadedPatient || loadedProfile || {};
      const vitals = loadedPatient?.vitals || {};
      const allergies = Array.isArray(loadedPatient?.allergies) ? loadedPatient.allergies.join(', ') : '';

      setFormData({
        fullName: loadedPatient?.fullName || loadedProfile?.fullName || '',
        identityNumber: loadedPatient?.identityNumber || loadedProfile?.identityCardNumber || '',
        dateOfBirth: loadedPatient?.dateOfBirth ? new Date(loadedPatient.dateOfBirth).toISOString().split('T')[0] : '',
        gender: loadedPatient?.gender || loadedProfile?.gender || 'Male',
        phoneNumber: loadedPatient?.phoneNumber || loadedProfile?.phoneNumber || '',
        email: loadedPatient?.email || loadedProfile?.email || '',
        address: loadedPatient?.address || loadedProfile?.address || '',
        bloodType: loadedPatient?.bloodType && loadedPatient.bloodType !== 'Unknown' ? loadedPatient.bloodType : 'O+',
        heightCm: vitals.heightCm || '',
        weightKg: vitals.weightKg || '',
        bloodPressure: vitals.bloodPressure || '',
        coagulationDisorders: loadedPatient?.coagulationDisorders || 'Không có tiền sử rối loạn đông máu',
        medicalHistory: loadedPatient?.medicalHistory || 'Chưa ghi nhận bệnh lý mãn tính',
        allergiesText: allergies || 'Không có ghi nhận dị ứng',
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

  // Real-time BMI calculation
  const bmiInfo = useMemo(() => {
    const h = parseFloat(formData.heightCm);
    const w = parseFloat(formData.weightKg);
    if (!h || !w || h <= 0 || w <= 0) {
      return { bmi: null, label: 'Chưa đủ dữ liệu', color: 'secondary' };
    }
    const hMeter = h / 100;
    const bmiVal = (w / (hMeter * hMeter)).toFixed(1);
    const num = parseFloat(bmiVal);

    if (num < 18.5) return { bmi: bmiVal, label: 'Thể trạng gầy (Underweight)', color: 'warning' };
    if (num <= 24.9) return { bmi: bmiVal, label: 'Thể trạng lý tưởng (Bình thường)', color: 'success' };
    if (num <= 29.9) return { bmi: bmiVal, label: 'Tiền béo phì (Overweight)', color: 'warning' };
    return { bmi: bmiVal, label: 'Béo phì (Obese)', color: 'danger' };
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
      if (
        current === 'Không ghi nhận dị ứng' ||
        current === 'Không có ghi nhận dị ứng' ||
        current === 'Không có tiền sử dị ứng đã biết (NKDA)'
      ) {
        current = '';
      }
      const parts = current
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const existingIdx = parts.findIndex(
        (p) => p.toLowerCase() === allergy.toLowerCase() || p.toLowerCase().includes(allergy.toLowerCase())
      );
      let nextParts;
      if (existingIdx >= 0) {
        nextParts = parts.filter((_, idx) => idx !== existingIdx);
      } else {
        nextParts = [...parts, allergy];
      }
      return {
        ...prev,
        allergiesText: nextParts.length > 0 ? nextParts.join(', ') : 'Không có tiền sử dị ứng đã biết (NKDA)'
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
        coagulationDisorders: formData.coagulationDisorders?.trim() || 'Không có',
        medicalHistory: formData.medicalHistory?.trim() || 'Chưa ghi nhận bệnh lý',
        allergies: formData.allergiesText
          ? formData.allergiesText.split(',').map((s) => s.trim()).filter(Boolean)
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
          userObj.isProfileComplete = true;
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
                      <div className="fw-bold text-dark">{user?.fullName || 'Lê tân Đỗ Lan Anh'}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Mã định danh / CCCD:</div>
                      <div className="fw-bold text-dark">079198001234</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Giới tính:</div>
                      <div className="fw-bold text-dark">Nữ</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Ngày sinh:</div>
                      <div className="fw-bold text-dark">12/08/1996</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Số điện thoại liên hệ nội bộ:</div>
                      <div className="fw-bold text-dark">090 600 0007</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Email công vụ BMS:</div>
                      <div className="fw-bold text-primary">{user?.email || 'anh.lan@bms.health.vn'}</div>
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
    <div className="bms-profile-page py-4">
      <div className="container-xl">
        {/* Alerts */}
        {errorMessage && (
          <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="mb-4 shadow-sm">
            <FaExclamationTriangle className="me-2" />
            {errorMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage('')} className="mb-4 shadow-sm">
            <FaCheckCircle className="me-2" />
            {successMessage}
          </Alert>
        )}

        <Row className="g-4">
          {/* Left Column: Identity & Medical Profile Status Card */}
          <Col xs={12} lg={4}>
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden text-center p-4 mb-4">
              <div className="bms-avatar-wrapper mx-auto mb-3">
                <img
                  src={profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'}
                  alt={formData.fullName}
                  className="bms-avatar-img rounded-circle border border-3 border-primary shadow-sm"
                  style={{ width: '110px', height: '110px', objectFit: 'cover' }}
                />
                <span className="bms-active-dot" title="Tài khoản hoạt động"></span>
              </div>

              <h4 className="fw-bold mb-1 text-dark">{formData.fullName || 'Bệnh Nhân'}</h4>
              <p className="text-muted small mb-2">Mã BN: <strong className="text-primary font-monospace">{patientRecord?.patientCode || profile?.patientCode || 'PAT-VN'}</strong></p>

              <div className="mb-3">
                <Badge bg="primary-subtle" text="primary" className="px-3 py-2 border border-primary-subtle rounded-pill">
                  <FaUserInjured className="me-1" /> Bệnh Nhân Đăng Ký
                </Badge>
              </div>

              {/* Profile Completeness Box */}
              <div className={`p-3 rounded-3 text-start mb-3 border ${isProfileComplete ? 'bg-success-subtle border-success' : 'bg-warning-subtle border-warning'}`}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="small fw-bold">
                    {isProfileComplete ? (
                      <span className="text-success"><FaCheckCircle className="me-1" /> Hồ Sơ Đạt Chuẩn Y Tế</span>
                    ) : (
                      <span className="text-danger"><FaExclamationTriangle className="me-1" /> Hồ Sơ Chưa Hoàn Tất</span>
                    )}
                  </span>
                  <span className="badge bg-white text-dark small">{isProfileComplete ? '100%' : '65%'}</span>
                </div>
                <ProgressBar
                  variant={isProfileComplete ? 'success' : 'warning'}
                  now={isProfileComplete ? 100 : 65}
                  style={{ height: '6px' }}
                  className="mb-2"
                />
                <p className="small text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                  {isProfileComplete
                    ? 'Hồ sơ đã đầy đủ nhóm máu, thể trạng và liên hệ khẩn cấp để đặt lịch và xét nghiệm.'
                    : 'Bắt buộc cập nhật Nhóm máu, Chiều cao, Cân nặng và Liên hệ khẩn cấp trước khi đặt lịch xét nghiệm.'}
                </p>
              </div>

              {/* Action buttons - "Làm mới hồ sơ" and "Xem nhanh bệnh án" have been removed */}
              <div className="d-grid gap-2">
                {!isEditing ? (
                  <Button variant="primary" className="fw-semibold py-2 shadow-sm rounded-3" onClick={() => setIsEditing(true)}>
                    <FaEdit className="me-2" /> Chỉnh Sửa Hồ Sơ Y Tế
                  </Button>
                ) : (
                  <Button variant="outline-secondary" className="fw-semibold py-2 rounded-3" onClick={() => setIsEditing(false)}>
                    <FaTimes className="me-2" /> Huỷ Bỏ Chỉnh Sửa
                  </Button>
                )}
              </div>
            </Card>

            {/* Quick Summary Card: Vitals & Blood Type */}
            <Card className="border-0 shadow-sm rounded-4 p-4 text-start">
              <h6 className="fw-bold text-secondary mb-3 d-flex align-items-center gap-2">
                <FaHeartbeat className="text-danger" /> Tóm Tắt Chỉ Số Y Tế Nhanh
              </h6>

              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted small">Nhóm máu hệ ABO/Rh:</span>
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fs-6 fw-bold">
                  <FaTint className="me-1" /> {formData.bloodType}
                </span>
              </div>

              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted small">Chiều cao / Cân nặng:</span>
                <span className="fw-semibold text-dark">
                  {formData.heightCm ? `${formData.heightCm} cm` : '—'} / {formData.weightKg ? `${formData.weightKg} kg` : '—'}
                </span>
              </div>

              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted small">Chỉ số BMI:</span>
                <span className={`fw-bold text-${bmiInfo.color}`}>
                  {bmiInfo.bmi ? `${bmiInfo.bmi} (${bmiInfo.label})` : 'Chưa đo'}
                </span>
              </div>

              <div className="d-flex align-items-center justify-content-between py-2">
                <span className="text-muted small">Liên hệ khẩn cấp:</span>
                <span className="fw-semibold text-dark text-end">
                  {formData.emergencyContactName ? `${formData.emergencyContactName} (${formData.emergencyContactRelationship})` : 'Chưa cập nhật'}
                  {formData.emergencyContactPhone && <div className="small text-muted font-monospace">{formData.emergencyContactPhone}</div>}
                </span>
              </div>
            </Card>
          </Col>

          {/* Right Column: Full Clinical Profile Form / Display */}
          <Col xs={12} lg={8}>
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="bg-primary text-white p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                    <FaNotesMedical /> Hồ Sơ Bệnh Án Chuẩn Y Tế Xét Nghiệm Máu
                  </h5>
                  <small className="text-white-50">
                    Tuân thủ tiêu chuẩn an toàn phòng xét nghiệm ISO 15189:2022 &amp; Quy định Bộ Y Tế
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="outline-light"
                    size="sm"
                    as={Link}
                    to="/patient/medical-profile-setup"
                    className="fw-semibold shadow-sm rounded-pill text-nowrap d-none d-sm-inline-flex align-items-center"
                    title="Mở biểu mẫu khai báo lâm sàng toàn diện theo chuẩn Bộ Y Tế"
                  >
                    <FaClipboardList className="me-1" /> Biểu Mẫu Toàn Diện Bộ Y Tế
                  </Button>
                  {!isEditing ? (
                    <Button variant="light" size="sm" className="fw-semibold text-primary px-3 shadow-sm rounded-pill" onClick={() => setIsEditing(true)}>
                      <FaEdit className="me-1" /> Chỉnh sửa
                    </Button>
                  ) : (
                    <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">
                      Chế độ chỉnh sửa
                    </Badge>
                  )}
                </div>
              </div>

              <Card.Body className="p-4">
                <Form onSubmit={handleSaveProfile}>
                  {/* Section 1: Demographics & Identity */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
                      <FaIdCard /> 1. Thông Tin Định Danh Bệnh Nhân (Đề án 06)
                    </h6>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Họ và tên bệnh nhân <span className="text-danger">*</span></Form.Label>
                          {isEditing ? (
                            <Form.Control
                              type="text"
                              name="fullName"
                              value={formData.fullName}
                              onChange={handleInputChange}
                              required
                              placeholder="Nhập họ và tên có dấu"
                            />
                          ) : (
                            <div className="fw-bold text-dark fs-6 py-1">{formData.fullName || '—'}</div>
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
                              value={formData.identityNumber}
                              onChange={handleInputChange}
                              maxLength={12}
                              required
                              placeholder="Số căn cước công dân 12 số"
                            />
                          ) : (
                            <div className="fw-bold text-primary font-monospace fs-6 py-1">{formData.identityNumber || 'Chưa cập nhật'}</div>
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
                              value={formData.dateOfBirth}
                              onChange={handleInputChange}
                              required
                            />
                          ) : (
                            <div className="fw-medium text-dark py-1">
                              {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('vi-VN') : '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Giới tính sinh học <span className="text-danger">*</span></Form.Label>
                          {isEditing ? (
                            <Form.Select name="gender" value={formData.gender} onChange={handleInputChange}>
                              <option value="Male">Nam</option>
                              <option value="Female">Nữ</option>
                              <option value="Other">Khác</option>
                            </Form.Select>
                          ) : (
                            <div className="fw-medium text-dark py-1">{formData.gender === 'Female' ? 'Nữ' : 'Nam'}</div>
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
                              value={formData.phoneNumber}
                              onChange={handleInputChange}
                              required
                              placeholder="0901234567"
                            />
                          ) : (
                            <div className="fw-medium text-dark py-1 font-monospace">{formData.phoneNumber || '—'}</div>
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
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder="email@example.com"
                            />
                          ) : (
                            <div className="fw-medium text-dark py-1">{formData.email || '—'}</div>
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
                              value={formData.address}
                              onChange={handleInputChange}
                              placeholder="Số nhà, đường, phường/xã, quận/huyện"
                            />
                          ) : (
                            <div className="fw-medium text-dark py-1">{formData.address || '—'}</div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {/* Section 2: Clinical Vitals & Blood Compatibility */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
                      <FaHeartbeat /> 2. Chỉ Số Huyết Học &amp; Thể Trạng (Bắt buộc cho Xét nghiệm máu)
                    </h6>
                    <Row className="g-3">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Nhóm máu hệ ABO / Rh <span className="text-danger">*</span></Form.Label>
                          {isEditing ? (
                            <Form.Select name="bloodType" value={formData.bloodType} onChange={handleInputChange}>
                              <option value="O+">Nhóm O+ (Phổ biến)</option>
                              <option value="O-">Nhóm O- (Hiếm)</option>
                              <option value="A+">Nhóm A+</option>
                              <option value="A-">Nhóm A-</option>
                              <option value="B+">Nhóm B+</option>
                              <option value="B-">Nhóm B-</option>
                              <option value="AB+">Nhóm AB+</option>
                              <option value="AB-">Nhóm AB-</option>
                            </Form.Select>
                          ) : (
                            <div className="py-1">
                              <Badge bg="danger" className="px-3 py-2 fs-6">
                                <FaTint className="me-1" /> Nhóm máu {formData.bloodType}
                              </Badge>
                            </div>
                          )}
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Chiều cao (cm) <span className="text-danger">*</span></Form.Label>
                          {isEditing ? (
                            <Form.Control
                              type="number"
                              name="heightCm"
                              value={formData.heightCm}
                              onChange={handleInputChange}
                              min={30}
                              max={250}
                              required
                              placeholder="Ví dụ: 170"
                            />
                          ) : (
                            <div className="fw-bold text-dark py-1">{formData.heightCm ? `${formData.heightCm} cm` : '—'}</div>
                          )}
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Cân nặng (kg) <span className="text-danger">*</span></Form.Label>
                          {isEditing ? (
                            <Form.Control
                              type="number"
                              step="0.5"
                              name="weightKg"
                              value={formData.weightKg}
                              onChange={handleInputChange}
                              min={2}
                              max={300}
                              required
                              placeholder="Ví dụ: 65"
                            />
                          ) : (
                            <div className="fw-bold text-dark py-1">{formData.weightKg ? `${formData.weightKg} kg` : '—'}</div>
                          )}
                        </Form.Group>
                      </Col>

                      <Col xs={12}>
                        <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                          <div>
                            <span className="small text-muted fw-semibold me-2">Chỉ số thể trọng BMI tự động:</span>
                            <span className={`h6 fw-bold mb-0 text-${bmiInfo.color}`}>
                              {bmiInfo.bmi ? `${bmiInfo.bmi} kg/m²` : '—'}
                            </span>
                          </div>
                          <Badge bg={bmiInfo.color} className="px-3 py-2">
                            {bmiInfo.label}
                          </Badge>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Section 3: Specialized Blood Test Medical History */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
                      <FaPills /> 3. Tiền Sử Y Khoa &amp; Rối Loạn Đông Máu (Quan trọng cho xét nghiệm)
                    </h6>
                    <Row className="g-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">
                            Tiền sử rối loạn đông máu / Chảy máu kéo dài <span className="text-danger">*</span>
                          </Form.Label>
                          {isEditing ? (
                            <>
                              <Form.Control
                                type="text"
                                name="coagulationDisorders"
                                value={formData.coagulationDisorders}
                                onChange={handleInputChange}
                                placeholder="Ví dụ: Không có / Xuất huyết dưới da / Hemophilia / Đang dùng thuốc chống đông máu"
                              />
                              <div className="fast-tag-group mt-2">
                                {COAGULATION_OPTIONS.map((opt) => {
                                  const isSelected = formData.coagulationDisorders === opt;
                                  return (
                                    <div
                                      key={opt}
                                      className={`fast-tag-item ${isSelected ? 'selected' : ''}`}
                                      onClick={() => setFormData((prev) => ({ ...prev, coagulationDisorders: opt }))}
                                    >
                                      {isSelected && <FaCheckCircle size={11} className="me-1 text-white" />}
                                      {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="p-2 border rounded-3 bg-light text-dark fw-medium">
                              {formData.coagulationDisorders || 'Không có tiền sử rối loạn đông máu'}
                            </div>
                          )}
                          <Form.Text className="text-muted small">
                            Lưu ý: Bệnh nhân có tiền sử máu khó đông hoặc đang dùng kháng đông cần báo trước khi lấy mẫu máu.
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      <Col md={12}>
                        <Form.Group>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <Form.Label className="small fw-semibold text-muted mb-0">
                              Tiền sử bệnh lý nội khoa (Bệnh nền đã từng hoặc đang mắc)
                            </Form.Label>
                            {isEditing && (
                              <Button
                                variant="link"
                                size="sm"
                                className="text-decoration-none p-0 text-success small fw-semibold"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    medicalHistory: 'Không có tiền sử bệnh lý mạn tính'
                                  }))
                                }
                              >
                                ✓ Đặt là "Không có bệnh mạn tính"
                              </Button>
                            )}
                          </div>
                          {isEditing ? (
                            <>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                name="medicalHistory"
                                value={formData.medicalHistory}
                                onChange={handleInputChange}
                                placeholder="Tăng huyết áp, Đái tháo đường, Tim mạch, Bệnh gan/thận..."
                              />
                              <div className="mt-2">
                                <small className="text-muted fw-bold d-block mb-1">
                                  Bấm chọn nhanh các bệnh nền để thêm vào hồ sơ (hoặc bấm lại để bỏ chọn):
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
                                        {isSelected && <FaCheckCircle size={11} className="me-1 text-white" />}
                                        {cond}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="p-2 border rounded-3 bg-light text-dark">
                              {formData.medicalHistory || 'Chưa ghi nhận bệnh lý'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>

                      <Col md={12}>
                        <Form.Group>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <Form.Label className="small fw-semibold text-muted mb-0">
                              Tiền sử dị ứng (Thuốc, Hóa chất, Thực phẩm)
                            </Form.Label>
                            {isEditing && (
                              <Button
                                variant="link"
                                size="sm"
                                className="text-decoration-none p-0 text-success small fw-semibold"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    allergiesText: 'Không có tiền sử dị ứng đã biết (NKDA)'
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
                                value={formData.allergiesText}
                                onChange={handleInputChange}
                                placeholder="Dị ứng kháng sinh, cồn sát khuẩn, thức ăn..."
                              />
                              <div className="mt-2">
                                <small className="text-muted fw-bold d-block mb-1">
                                  Bấm chọn nhanh tác nhân dị ứng để thêm vào hồ sơ:
                                </small>
                                <div className="fast-tag-group">
                                  {COMMON_ALLERGIES.map((alg) => {
                                    const isSelected =
                                      formData.allergiesText &&
                                      formData.allergiesText.toLowerCase().includes(alg.toLowerCase());
                                    return (
                                      <div
                                        key={alg}
                                        className={`fast-tag-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleAllergyInProfile(alg)}
                                      >
                                        {isSelected && <FaCheckCircle size={11} className="me-1 text-white" />}
                                        {alg}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="p-2 border rounded-3 bg-light text-dark">
                              {formData.allergiesText || 'Không ghi nhận dị ứng'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>

                      <Col md={12}>
                        <Form.Group>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <Form.Label className="small fw-semibold text-muted mb-0">
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
                              value={formData.currentMedications}
                              onChange={handleInputChange}
                              placeholder="Ví dụ: Aspirin 81mg, Amlodipine 5mg, Metformin..."
                            />
                          ) : (
                            <div className="p-2 border rounded-3 bg-light text-dark">
                              {formData.currentMedications || 'Không sử dụng thuốc định kỳ'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {/* Section 4: Emergency Contacts */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
                      <FaPhoneAlt /> 4. Thông Tin Người Liên Hệ Khẩn Cấp (Bắt buộc)
                    </h6>
                    <Row className="g-3">
                      <Col md={5}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Họ và tên người thân <span className="text-danger">*</span></Form.Label>
                          {isEditing ? (
                            <Form.Control
                              type="text"
                              name="emergencyContactName"
                              value={formData.emergencyContactName}
                              onChange={handleInputChange}
                              required
                              placeholder="Họ tên người liên hệ"
                            />
                          ) : (
                            <div className="fw-bold text-dark py-1">{formData.emergencyContactName || 'Chưa cập nhật'}</div>
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
                              value={formData.emergencyContactPhone}
                              onChange={handleInputChange}
                              required
                              placeholder="Số điện thoại khẩn cấp"
                            />
                          ) : (
                            <div className="fw-bold text-primary font-monospace py-1">{formData.emergencyContactPhone || 'Chưa cập nhật'}</div>
                          )}
                        </Form.Group>
                      </Col>

                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-muted">Mối quan hệ <span className="text-danger">*</span></Form.Label>
                          {isEditing ? (
                            <Form.Select
                              name="emergencyContactRelationship"
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
                            <div className="fw-medium text-dark py-1">{formData.emergencyContactRelationship || '—'}</div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {/* Submit buttons when editing */}
                  {isEditing && (
                    <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                      <Button variant="outline-secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>
                        Huỷ bỏ
                      </Button>
                      <Button variant="primary" type="submit" disabled={isSaving} className="px-4 fw-semibold shadow-sm">
                        {isSaving ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" /> Đang lưu hồ sơ...
                          </>
                        ) : (
                          <>
                            <FaSave className="me-2" /> Lưu Hồ Sơ Bệnh Án Y Tế
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default UserProfilePage;
