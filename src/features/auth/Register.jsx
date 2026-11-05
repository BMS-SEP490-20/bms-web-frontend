/**
 * @file Register.jsx
 * @description Patient self-registration portal transformed into a 4-Step Medical Wizard (UC02, UC03, UC04).
 * Step 1: Thông tin cá nhân & định danh y tế (Họ tên, CCCD 12 số, SĐT, Email, Tên đăng nhập, Ngày sinh, Giới tính).
 * Step 2: Địa chỉ thường trú (Phân cấp hành chính 3 tầng Việt Nam: Tỉnh -> Huyện -> Xã + Số nhà bắt buộc).
 * Step 3: Thiết lập mật khẩu bảo mật (BR-IAM-01) & Đối soát hồ sơ lâm sàng trước khi đăng ký.
 * Step 4: Xác thực mã OTP 6 số (gửi về email, kích hoạt tài khoản & tạo hồ sơ bệnh nhân).
 * Conforms to: ISO 15189, Tiêu chí 3.1 QĐ 2429/QĐ-BYT, BR-IAM-01 & Clean Medical UI.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Form, Button, Alert, Row, Col, InputGroup, Spinner, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaMapMarkerAlt,
  FaLock,
  FaShieldAlt,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaIdCard,
  FaPhoneAlt,
  FaEnvelope,
  FaCalendarAlt,
  FaArrowRight,
  FaArrowLeft,
  FaCheck
} from 'react-icons/fa';
import api from '../../config/api';
import OtpInputGroup from '../../components/common/OtpInputGroup';
import './styles/RegisterWizard.css';

// 63 Tỉnh / Thành phố trực thuộc Trung ương của Việt Nam
const FALLBACK_PROVINCES = [
  { code: '92', name: 'Thành phố Cần Thơ' },
  { code: '48', name: 'Thành phố Đà Nẵng' },
  { code: '1', name: 'Thành phố Hà Nội' },
  { code: '31', name: 'Thành phố Hải Phòng' },
  { code: '79', name: 'Thành phố Hồ Chí Minh' },
  { code: '46', name: 'Thành phố Huế' },
  { code: '89', name: 'Tỉnh An Giang' },
  { code: '77', name: 'Tỉnh Bà Rịa - Vũng Tàu' },
  { code: '95', name: 'Tỉnh Bạc Liêu' },
  { code: '24', name: 'Tỉnh Bắc Giang' },
  { code: '6', name: 'Tỉnh Bắc Kạn' },
  { code: '27', name: 'Tỉnh Bắc Ninh' },
  { code: '83', name: 'Tỉnh Bến Tre' },
  { code: '74', name: 'Tỉnh Bình Dương' },
  { code: '52', name: 'Tỉnh Bình Định' },
  { code: '70', name: 'Tỉnh Bình Phước' },
  { code: '60', name: 'Tỉnh Bình Thuận' },
  { code: '96', name: 'Tỉnh Cà Mau' },
  { code: '4', name: 'Tỉnh Cao Bằng' },
  { code: '66', name: 'Tỉnh Đắk Lắk' },
  { code: '67', name: 'Tỉnh Đắk Nông' },
  { code: '11', name: 'Tỉnh Điện Biên' },
  { code: '75', name: 'Tỉnh Đồng Nai' },
  { code: '87', name: 'Tỉnh Đồng Tháp' },
  { code: '64', name: 'Tỉnh Gia Lai' },
  { code: '2', name: 'Tỉnh Hà Giang' },
  { code: '35', name: 'Tỉnh Hà Nam' },
  { code: '42', name: 'Tỉnh Hà Tĩnh' },
  { code: '30', name: 'Tỉnh Hải Dương' },
  { code: '93', name: 'Tỉnh Hậu Giang' },
  { code: '17', name: 'Tỉnh Hoà Bình' },
  { code: '33', name: 'Tỉnh Hưng Yên' },
  { code: '56', name: 'Tỉnh Khánh Hòa' },
  { code: '91', name: 'Tỉnh Kiên Giang' },
  { code: '62', name: 'Tỉnh Kon Tum' },
  { code: '12', name: 'Tỉnh Lai Châu' },
  { code: '20', name: 'Tỉnh Lạng Sơn' },
  { code: '10', name: 'Tỉnh Lào Cai' },
  { code: '68', name: 'Tỉnh Lâm Đồng' },
  { code: '80', name: 'Tỉnh Long An' },
  { code: '36', name: 'Tỉnh Nam Định' },
  { code: '40', name: 'Tỉnh Nghệ An' },
  { code: '37', name: 'Tỉnh Ninh Bình' },
  { code: '58', name: 'Tỉnh Ninh Thuận' },
  { code: '25', name: 'Tỉnh Phú Thọ' },
  { code: '54', name: 'Tỉnh Phú Yên' },
  { code: '44', name: 'Tỉnh Quảng Bình' },
  { code: '49', name: 'Tỉnh Quảng Nam' },
  { code: '51', name: 'Tỉnh Quảng Ngãi' },
  { code: '22', name: 'Tỉnh Quảng Ninh' },
  { code: '45', name: 'Tỉnh Quảng Trị' },
  { code: '94', name: 'Tỉnh Sóc Trăng' },
  { code: '14', name: 'Tỉnh Sơn La' },
  { code: '72', name: 'Tỉnh Tây Ninh' },
  { code: '34', name: 'Tỉnh Thái Bình' },
  { code: '19', name: 'Tỉnh Thái Nguyên' },
  { code: '38', name: 'Tỉnh Thanh Hóa' },
  { code: '82', name: 'Tỉnh Tiền Giang' },
  { code: '84', name: 'Tỉnh Trà Vinh' },
  { code: '8', name: 'Tỉnh Tuyên Quang' },
  { code: '86', name: 'Tỉnh Vĩnh Long' },
  { code: '26', name: 'Tỉnh Vĩnh Phúc' },
  { code: '15', name: 'Tỉnh Yên Bái' }
];

const WIZARD_STEPS = [
  { step: 1, title: 'Thông tin cá nhân', desc: 'Định danh & CCCD', icon: FaUser },
  { step: 2, title: 'Địa chỉ thường trú', desc: 'Phân cấp hành chính', icon: FaMapMarkerAlt },
  { step: 3, title: 'Mật khẩu bảo mật', desc: 'Quy chuẩn BR-IAM-01', icon: FaLock },
  { step: 4, title: 'Xác thực OTP', desc: 'Kích hoạt hồ sơ', icon: FaShieldAlt }
];

export default function Register() {
  const navigate = useNavigate();

  // Active step (1 to 4)
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    identityCard: '', // CCCD 12 số
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    gender: 'Nam',
    dateOfBirth: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    streetAddress: '' // Số nhà, tên đường (Bắt buộc)
  });

  // Administrative units state loaded dynamically from MongoDB
  const [provinces, setProvinces] = useState(FALLBACK_PROVINCES);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OTP Verification State
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // 1. Fetch Provinces from MongoDB backend API on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchProvinces() {
      setLoadingProvinces(true);
      try {
        const res = await api.get('/administrative/provinces');
        if (isMounted && res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          setProvinces(res.data.data);
        }
      } catch (err) {
        console.warn('[Register] Using fallback provinces list:', err);
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    }
    fetchProvinces();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch Districts when Province changes
  useEffect(() => {
    if (!formData.provinceCode) {
      setDistricts([]);
      setWards([]);
      return;
    }

    let isMounted = true;
    async function fetchDistricts() {
      setLoadingDistricts(true);
      try {
        const res = await api.get(`/administrative/districts?provinceCode=${formData.provinceCode}`);
        if (isMounted && res.data?.success && Array.isArray(res.data?.data)) {
          setDistricts(res.data.data);
        }
      } catch (err) {
        console.warn('[Register] Error fetching districts:', err);
        setDistricts([]);
      } finally {
        if (isMounted) setLoadingDistricts(false);
      }
    }
    fetchDistricts();
    return () => { isMounted = false; };
  }, [formData.provinceCode]);

  // 3. Fetch Wards when District changes
  useEffect(() => {
    if (!formData.districtCode) {
      setWards([]);
      return;
    }

    let isMounted = true;
    async function fetchWards() {
      setLoadingWards(true);
      try {
        const res = await api.get(`/administrative/wards?districtCode=${formData.districtCode}`);
        if (isMounted && res.data?.success && Array.isArray(res.data?.data)) {
          setWards(res.data.data);
        }
      } catch (err) {
        console.warn('[Register] Error fetching wards:', err);
        setWards([]);
      } finally {
        if (isMounted) setLoadingWards(false);
      }
    }
    fetchWards();
    return () => { isMounted = false; };
  }, [formData.districtCode]);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (currentStep === 4 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, countdown]);

  // Single-field validator for real-time per-field feedback
  const validateSingleField = (name, value, allData = formData) => {
    let error = '';
    const valStr = typeof value === 'string' ? value.trim() : (value || '');

    switch (name) {
      case 'fullName':
        if (!valStr) {
          error = 'Vui lòng nhập Họ và tên bệnh nhân đầy đủ (tối thiểu 2 ký tự).';
        } else if (valStr.length < 2) {
          error = 'Họ và tên bệnh nhân phải có tối thiểu 2 ký tự.';
        } else if (!/^[\p{L}\s'-]+$/u.test(valStr)) {
          error = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng (không chứa số, ký tự đặc biệt).';
        }
        break;

      case 'identityCard':
        if (!valStr) {
          error = 'Vui lòng nhập số Căn cước công dân (CCCD).';
        } else if (!/^[0-9]{12}$/.test(valStr)) {
          error = 'Số CCCD phải bao gồm chính xác 12 chữ số theo quy định Bộ Công An.';
        }
        break;

      case 'phoneNumber':
        if (!valStr) {
          error = 'Vui lòng nhập số điện thoại liên hệ.';
        } else if (!/^(03|05|07|08|09)[0-9]{8}$/.test(valStr)) {
          error = 'Số điện thoại không hợp lệ (phải gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).';
        }
        break;

      case 'email':
        if (!valStr) {
          error = 'Vui lòng nhập địa chỉ Email nhận kết quả & OTP.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
          error = 'Địa chỉ Email không đúng định dạng chuẩn (ví dụ: patient@example.com).';
        }
        break;

      case 'dateOfBirth':
        if (!value) {
          error = 'Vui lòng chọn ngày sinh của bệnh nhân.';
        } else {
          const dob = new Date(value);
          if (isNaN(dob.getTime())) {
            error = 'Ngày sinh không hợp lệ.';
          } else if (dob > new Date()) {
            error = 'Ngày sinh không được lớn hơn ngày hiện tại.';
          } else if (dob.getFullYear() < 1900) {
            error = 'Năm sinh không hợp lệ (phải từ năm 1900 trở lại đây).';
          }
        }
        break;

      case 'gender':
        if (!value) {
          error = 'Vui lòng chọn giới tính.';
        }
        break;

      case 'provinceCode':
        if (!value) {
          error = 'Vui lòng chọn Tỉnh / Thành phố thường trú.';
        }
        break;

      case 'districtCode':
        if (!value) {
          error = 'Vui lòng chọn Quận / Huyện thường trú.';
        }
        break;

      case 'wardCode':
        if (!value) {
          error = 'Vui lòng chọn Phường / Xã thường trú.';
        }
        break;

      case 'streetAddress':
        if (!valStr) {
          error = 'Vui lòng nhập số nhà, tên đường hoặc thôn/xóm (bắt buộc nhập).';
        } else if (valStr.length < 3) {
          error = 'Số nhà, tên đường phải có tối thiểu 3 ký tự (Tiêu chí 3.1 QĐ 2429/QĐ-BYT).';
        }
        break;

      case 'password':
        if (!value) {
          error = 'Vui lòng thiết lập mật khẩu bảo mật.';
        } else if (value.length < 8) {
          error = 'Mật khẩu bảo mật phải có độ dài tối thiểu 8 ký tự.';
        } else {
          const hasUpper = /[A-Z]/.test(value);
          const hasLower = /[a-z]/.test(value);
          const hasNumber = /[0-9]/.test(value);
          const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
          if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
            error = 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.';
          }
        }
        break;

      case 'confirmPassword':
        if (!value) {
          error = 'Vui lòng xác nhận lại mật khẩu.';
        } else if (value !== allData.password) {
          error = 'Mật khẩu xác nhận không trùng khớp với mật khẩu đã nhập.';
        }
        break;

      default:
        break;
    }
    return error;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateSingleField(name, value, formData);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    if (errorMsg) setErrorMsg('');

    if (touched[name]) {
      const err = validateSingleField(name, value, updated);
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
    }

    if (name === 'password' && touched.confirmPassword) {
      const confirmErr = validateSingleField('confirmPassword', formData.confirmPassword, updated);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleProvinceChange = (e) => {
    const selectedCode = e.target.value;
    const selectedObj = provinces.find((p) => p.code === selectedCode);
    const updated = {
      ...formData,
      provinceCode: selectedCode,
      provinceName: selectedObj ? selectedObj.name : '',
      districtCode: '',
      districtName: '',
      wardCode: '',
      wardName: ''
    };
    setFormData(updated);
    setTouched((prev) => ({ ...prev, provinceCode: true }));
    setFieldErrors((prev) => ({
      ...prev,
      provinceCode: validateSingleField('provinceCode', selectedCode, updated),
      districtCode: '',
      wardCode: ''
    }));
    if (errorMsg) setErrorMsg('');
  };

  const handleDistrictChange = (e) => {
    const selectedCode = e.target.value;
    const selectedObj = districts.find((d) => d.code === selectedCode);
    const updated = {
      ...formData,
      districtCode: selectedCode,
      districtName: selectedObj ? selectedObj.name : '',
      wardCode: '',
      wardName: ''
    };
    setFormData(updated);
    setTouched((prev) => ({ ...prev, districtCode: true }));
    setFieldErrors((prev) => ({
      ...prev,
      districtCode: validateSingleField('districtCode', selectedCode, updated),
      wardCode: ''
    }));
    if (errorMsg) setErrorMsg('');
  };

  const handleWardChange = (e) => {
    const selectedCode = e.target.value;
    const selectedObj = wards.find((w) => w.code === selectedCode);
    const updated = {
      ...formData,
      wardCode: selectedCode,
      wardName: selectedObj ? selectedObj.name : ''
    };
    setFormData(updated);
    setTouched((prev) => ({ ...prev, wardCode: true }));
    setFieldErrors((prev) => ({
      ...prev,
      wardCode: validateSingleField('wardCode', selectedCode, updated)
    }));
    if (errorMsg) setErrorMsg('');
  };

  const fullAddressPreview = useMemo(() => {
    const parts = [];
    if (formData.streetAddress?.trim()) parts.push(formData.streetAddress.trim());
    if (formData.wardName) parts.push(formData.wardName);
    if (formData.districtName) parts.push(formData.districtName);
    if (formData.provinceName) parts.push(formData.provinceName);
    return parts.join(', ');
  }, [formData.streetAddress, formData.wardName, formData.districtName, formData.provinceName]);

  // Real-time password rules evaluation
  const passwordRules = useMemo(() => {
    const pwd = formData.password || '';
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      match: pwd.length > 0 && pwd === formData.confirmPassword
    };
  }, [formData.password, formData.confirmPassword]);

  // Step 1 Validation (All fields checked at once, individual feedback populated)
  const validateStep1 = () => {
    const fields = ['fullName', 'identityCard', 'phoneNumber', 'email', 'dateOfBirth', 'gender'];
    const newErrors = {};
    const newTouched = {};

    fields.forEach((f) => {
      newTouched[f] = true;
      const err = validateSingleField(f, formData[f], formData);
      if (err) newErrors[f] = err;
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));

    if (Object.keys(newErrors).length > 0) {
      setErrorMsg('Vui lòng kiểm tra và hoàn thiện các trường thông tin không hợp lệ bên dưới.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  // Step 2 Validation (All fields checked at once, individual feedback populated)
  const validateStep2 = () => {
    const fields = ['provinceCode', 'districtCode', 'wardCode', 'streetAddress'];
    const newErrors = {};
    const newTouched = {};

    fields.forEach((f) => {
      newTouched[f] = true;
      const err = validateSingleField(f, formData[f], formData);
      if (err) newErrors[f] = err;
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));

    if (Object.keys(newErrors).length > 0) {
      setErrorMsg('Vui lòng chọn đầy đủ cấp hành chính và nhập cụ thể số nhà, tên đường.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  // Step 3 Validation (All fields checked at once, individual feedback populated)
  const validateStep3 = () => {
    const fields = ['password', 'confirmPassword'];
    const newErrors = {};
    const newTouched = {};

    fields.forEach((f) => {
      newTouched[f] = true;
      const err = validateSingleField(f, formData[f], formData);
      if (err) newErrors[f] = err;
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));

    if (Object.keys(newErrors).length > 0) {
      setErrorMsg('Vui lòng thiết lập mật khẩu bảo mật theo đúng quy chuẩn BR-IAM-01.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  // Step navigation handlers
  const handleNextToStep2 = (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextToStep3 = (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submits registration and advances to Step 4 (OTP)
  const handleRegisterAndSendOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;

    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        username: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phoneNumber: formData.phoneNumber.trim(),
        identityCard: formData.identityCard.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        province: formData.provinceName,
        district: formData.districtName,
        ward: formData.wardName,
        streetAddress: formData.streetAddress.trim(),
        address: fullAddressPreview
      };

      const res = await api.post('/auth/register', payload);
      setSuccessMsg(res.data?.message || `Đăng ký bước đầu thành công! Mã OTP gồm 6 chữ số đã được gửi đến: ${formData.email}`);
      setCurrentStep(4);
      setCountdown(60);
      setOtpAttempts(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[Register] Registration error:', err);
      const msg = err.response?.data?.message || err.response?.data?.Message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpValue || otpValue.trim().length !== 6) {
      setOtpError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
      return;
    }

    if (otpAttempts >= 3) {
      setOtpError('Bạn đã nhập sai quá 3 lần (BR-IAM-03). Vui lòng yêu cầu gửi lại mã OTP mới.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    try {
      await api.post('/auth/verify-otp', {
        email: formData.email.trim(),
        otp: otpValue.trim()
      });
      setSuccessMsg('Xác thực tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login?registered=true');
      }, 1500);
    } catch (err) {
      setOtpAttempts((prev) => prev + 1);
      const msg = err.response?.data?.message || err.response?.data?.Message || 'Mã OTP không chính xác hoặc đã hết hạn.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        username: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phoneNumber: formData.phoneNumber.trim(),
        identityCard: formData.identityCard.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        province: formData.provinceName,
        district: formData.districtName,
        ward: formData.wardName,
        streetAddress: formData.streetAddress.trim(),
        address: fullAddressPreview
      };
      await api.post('/auth/register', payload);
      setCountdown(60);
      setOtpAttempts(0);
      setSuccessMsg(`Mã OTP mới đã được gửi lại vào email ${formData.email}.`);
    } catch (err) {
      try {
        await api.post('/auth/otp/send', {
          destination: formData.email.trim(),
          purpose: 'Registration'
        });
        setCountdown(60);
        setOtpAttempts(0);
        setSuccessMsg(`Mã OTP mới đã được gửi lại vào email ${formData.email}.`);
      } catch (subErr) {
        const msg = err.response?.data?.message || subErr.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
        setOtpError(msg);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="container py-4 py-md-5">
      <Row className="justify-content-center">
        <Col md={10} lg={9}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
            {/* Header */}
            <Card.Header
              className="text-white py-4 px-4 border-0 text-center"
              style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0f172a 100%)' }}
            >
              <div
                className="d-inline-flex align-items-center justify-content-center bg-white rounded-3 p-1 mb-2 shadow-sm"
                style={{ width: 56, height: 56, border: '1px solid #e2e8f0', overflow: 'hidden' }}
              >
                <img
                  src="/assets/bms-logo.png"
                  alt="BMS Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3 className="fw-bold mb-1" style={{ fontSize: '24px' }}>
                Mở Hồ Sơ Sức Khỏe Điện Tử BMS
              </h3>
              <p className="mb-2 text-white-50 small">
                Đăng ký một lần để lưu trữ lịch sử xét nghiệm trọn đời, nhận kết quả online có chữ ký số và tư vấn 1-1 cùng Bác sĩ Chuyên khoa
              </p>
              <div
                className="d-flex flex-wrap justify-content-center align-items-center gap-3 pt-2 text-white small"
                style={{ fontSize: '11px', opacity: 0.9 }}
              >
                <span>
                  <FaShieldAlt className="text-warning me-1" /> Bảo mật thông tin bệnh án (HIPAA)
                </span>
                <span>
                  <FaCheckCircle className="text-success me-1" /> Định danh chính xác theo CCCD 12 số
                </span>
                <span>
                  <FaMapMarkerAlt className="text-info me-1" /> Đồng bộ địa chỉ hành chính Việt Nam
                </span>
              </div>
            </Card.Header>

            <Card.Body className="p-4 p-md-5">
              {/* Stepper Wizard Progress Bar */}
              <div className="bms-stepper-container">
                <div className="bms-stepper-track">
                  <div
                    className="bms-stepper-progress"
                    style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                  />
                </div>
                <div className="bms-stepper-steps">
                  {WIZARD_STEPS.map((s) => {
                    const isCompleted = currentStep > s.step;
                    const isActive = currentStep === s.step;
                    return (
                      <div
                        key={s.step}
                        className={`bms-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        style={{ cursor: isCompleted && currentStep !== 4 ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (isCompleted && currentStep !== 4) {
                            setErrorMsg('');
                            setCurrentStep(s.step);
                          }
                        }}
                      >
                        <div className="bms-step-circle">
                          {isCompleted ? <FaCheck /> : s.step}
                        </div>
                        <div className="bms-step-title">{s.title}</div>
                        <div className="bms-step-desc d-none d-md-block">{s.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alert Notifications */}
              {errorMsg && (
                <Alert
                  variant="danger"
                  dismissible
                  onClose={() => setErrorMsg('')}
                  className="d-flex align-items-center gap-2 mb-4"
                >
                  <FaTimesCircle className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </Alert>
              )}

              {successMsg && (
                <Alert variant="success" className="d-flex align-items-center gap-2 mb-4">
                  <FaCheckCircle className="flex-shrink-0" />
                  <span>{successMsg}</span>
                </Alert>
              )}

              {/* ============================================================ */}
              {/* STEP 1: THÔNG TIN ĐỊNH DANH BỆNH NHÂN                        */}
              {/* ============================================================ */}
              {currentStep === 1 && (
                <div className="bms-wizard-content">
                  <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
                    <div>
                      <h5 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
                        <FaUser className="fs-6" /> Bước 1: Thông Tin Định Danh Bệnh Nhân
                      </h5>
                      <span className="text-muted small">
                        Vui lòng nhập chính xác họ tên và số CCCD để khớp dữ liệu bảo hiểm và hồ sơ lâm sàng.
                      </span>
                    </div>
                    <Badge bg="primary" className="px-3 py-2 rounded-pill">
                      Bước 1 / 4
                    </Badge>
                  </div>

                  <Row className="g-3 mb-4">
                    {/* Full Name */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Họ và tên bệnh nhân <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="fullName"
                          placeholder="Ví dụ: Nguyễn Tấn Phát"
                          value={formData.fullName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.fullName && !!fieldErrors.fullName}
                          isValid={touched.fullName && !fieldErrors.fullName && !!formData.fullName}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.fullName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* CCCD (12 số) */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Số CCCD / Định danh (12 số) <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup hasValidation>
                          <InputGroup.Text className="bg-light">
                            <FaIdCard className="text-muted" />
                          </InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="identityCard"
                            placeholder="Nhập 12 chữ số CCCD (Ví dụ: 079201009988)"
                            maxLength={12}
                            value={formData.identityCard}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.identityCard && !!fieldErrors.identityCard}
                            isValid={touched.identityCard && !fieldErrors.identityCard && !!formData.identityCard}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.identityCard}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Phone */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Số điện thoại liên hệ <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup hasValidation>
                          <InputGroup.Text className="bg-light">
                            <FaPhoneAlt className="text-muted" />
                          </InputGroup.Text>
                          <Form.Control
                            type="tel"
                            name="phoneNumber"
                            placeholder="0939446265"
                            maxLength={10}
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.phoneNumber && !!fieldErrors.phoneNumber}
                            isValid={touched.phoneNumber && !fieldErrors.phoneNumber && !!formData.phoneNumber}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.phoneNumber}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Email */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Địa chỉ Email nhận kết quả &amp; OTP <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup hasValidation>
                          <InputGroup.Text className="bg-light">
                            <FaEnvelope className="text-muted" />
                          </InputGroup.Text>
                          <Form.Control
                            type="email"
                            name="email"
                            placeholder="tanphat218@gmail.com"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.email && !!fieldErrors.email}
                            isValid={touched.email && !fieldErrors.email && !!formData.email}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.email}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Date of Birth & Gender */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Ngày sinh <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.dateOfBirth && !!fieldErrors.dateOfBirth}
                          isValid={touched.dateOfBirth && !fieldErrors.dateOfBirth && !!formData.dateOfBirth}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.dateOfBirth}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Giới tính <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.gender && !!fieldErrors.gender}
                          isValid={touched.gender && !fieldErrors.gender && !!formData.gender}
                          required
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.gender}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                    <Link to="/login" className="text-decoration-none small text-muted">
                      &larr; Đã có tài khoản? <strong>Đăng nhập</strong>
                    </Link>
                    <Button
                      variant="primary"
                      className="px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm"
                      onClick={handleNextToStep2}
                    >
                      <span>Tiếp Tục: Nhập Địa Chỉ</span>
                      <FaArrowRight />
                    </Button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 2: ĐỊA CHỈ THƯỜNG TRÚ (PHÂN CẤP HÀNH CHÍNH VIỆT NAM)    */}
              {/* ============================================================ */}
              {currentStep === 2 && (
                <div className="bms-wizard-content">
                  <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
                    <div>
                      <h5 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
                        <FaMapMarkerAlt className="fs-6" /> Bước 2: Địa Chỉ Thường Trú (Phân Cấp Hành Chính Việt Nam)
                      </h5>
                      <span className="text-muted small">
                        Chuẩn hóa địa chỉ theo Tiêu chí 3.1 QĐ 2429/QĐ-BYT với danh mục 63 Tỉnh/Thành phố toàn quốc.
                      </span>
                    </div>
                    <Badge bg="primary" className="px-3 py-2 rounded-pill">
                      Bước 2 / 4
                    </Badge>
                  </div>

                  <Row className="g-3 mb-4">
                    {/* Tỉnh / Thành phố Dropdown */}
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Tỉnh / Thành phố <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          id="provinceSelect"
                          name="provinceCode"
                          value={formData.provinceCode}
                          onChange={handleProvinceChange}
                          onBlur={handleBlur}
                          disabled={loadingProvinces}
                          isInvalid={touched.provinceCode && !!fieldErrors.provinceCode}
                          isValid={touched.provinceCode && !fieldErrors.provinceCode && !!formData.provinceCode}
                          required
                        >
                          <option value="">-- Chọn Tỉnh / Thành phố --</option>
                          {provinces.map((prov) => (
                            <option key={prov.code} value={prov.code}>
                              {prov.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.provinceCode}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Quận / Huyện Dropdown */}
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Quận / Huyện <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          id="districtSelect"
                          name="districtCode"
                          value={formData.districtCode}
                          onChange={handleDistrictChange}
                          onBlur={handleBlur}
                          disabled={!formData.provinceCode || loadingDistricts}
                          isInvalid={touched.districtCode && !!fieldErrors.districtCode}
                          isValid={touched.districtCode && !fieldErrors.districtCode && !!formData.districtCode}
                          required
                        >
                          <option value="">
                            {loadingDistricts ? 'Đang tải...' : '-- Chọn Quận / Huyện --'}
                          </option>
                          {districts.map((dist) => (
                            <option key={dist.code} value={dist.code}>
                              {dist.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.districtCode}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Phường / Xã Dropdown */}
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Phường / Xã <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          id="wardSelect"
                          name="wardCode"
                          value={formData.wardCode}
                          onChange={handleWardChange}
                          onBlur={handleBlur}
                          disabled={!formData.districtCode || loadingWards}
                          isInvalid={touched.wardCode && !!fieldErrors.wardCode}
                          isValid={touched.wardCode && !fieldErrors.wardCode && !!formData.wardCode}
                          required
                        >
                          <option value="">
                            {loadingWards ? 'Đang tải...' : '-- Chọn Phường / Xã --'}
                          </option>
                          {wards.map((ward) => (
                            <option key={ward.code} value={ward.code}>
                              {ward.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.wardCode}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Số nhà, tên đường (BẮT BUỘC NHẬP) */}
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small d-flex align-items-center justify-content-between">
                          <span>
                            Số nhà, tên đường, thôn/xóm, tòa nhà <span className="text-danger">* (Bắt buộc nhập)</span>
                          </span>
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            QĐ 2429/QĐ-BYT Tiêu chí 3.1
                          </span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="streetAddress"
                          placeholder="Ví dụ: Số 218 đường Nguyễn Văn Cừ, Tòa nhà Landmark"
                          value={formData.streetAddress}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.streetAddress && !!fieldErrors.streetAddress}
                          isValid={touched.streetAddress && !fieldErrors.streetAddress && !!formData.streetAddress}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.streetAddress}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Live Address Preview Card */}
                    {fullAddressPreview && (
                      <Col md={12}>
                        <div className="p-3 bg-light rounded-3 border d-flex align-items-center gap-2">
                          <FaMapMarkerAlt className="text-primary flex-shrink-0 fs-5" />
                          <div className="small">
                            <span className="text-muted">Địa chỉ đăng ký đầy đủ: </span>
                            <strong className="text-dark">{fullAddressPreview}</strong>
                          </div>
                        </div>
                      </Col>
                    )}
                  </Row>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                    <Button
                      variant="outline-secondary"
                      className="px-3 py-2 small d-flex align-items-center gap-2"
                      onClick={() => {
                        setErrorMsg('');
                        setCurrentStep(1);
                      }}
                    >
                      <FaArrowLeft />
                      <span>Quay Lại: Thông Tin Cá Nhân</span>
                    </Button>
                    <Button
                      variant="primary"
                      className="px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm"
                      onClick={handleNextToStep3}
                    >
                      <span>Tiếp Tục: Thiết Lập Mật Khẩu</span>
                      <FaArrowRight />
                    </Button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 3: THIẾT LẬP MẬT KHẨU & ĐỐI SOÁT HỒ SƠ LÂM SÀNG        */}
              {/* ============================================================ */}
              {currentStep === 3 && (
                <div className="bms-wizard-content">
                  <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
                    <div>
                      <h5 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
                        <FaLock className="fs-6" /> Bước 3: Thiết Lập Mật Khẩu Bảo Mật
                      </h5>
                      <span className="text-muted small">
                        Tuân thủ tiêu chuẩn an toàn định danh y tế quốc tế NIST SP 800-63B &amp; BR-IAM-01.
                      </span>
                    </div>
                    <Badge bg="primary" className="px-3 py-2 rounded-pill">
                      Bước 3 / 4
                    </Badge>
                  </div>

                  <Row className="g-3 mb-4">
                    {/* Password */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Mật khẩu bảo mật <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup hasValidation>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Tối thiểu 8 ký tự"
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.password && !!fieldErrors.password}
                            isValid={touched.password && !fieldErrors.password && !!formData.password}
                            required
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                            aria-label="Ẩn hiện mật khẩu"
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.password}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Confirm Password */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Xác nhận mật khẩu mới <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup hasValidation>
                          <Form.Control
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            placeholder="Nhập lại mật khẩu"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.confirmPassword && !!fieldErrors.confirmPassword}
                            isValid={touched.confirmPassword && !fieldErrors.confirmPassword && !!formData.confirmPassword}
                            required
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            type="button"
                            aria-label="Ẩn hiện xác nhận mật khẩu"
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.confirmPassword}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Password Checklist indicator */}
                    <Col md={12}>
                      <div className="p-3 bg-light rounded-3 border small">
                        <div className="fw-semibold text-muted mb-2">Quy chuẩn mật khẩu an toàn (BR-IAM-01):</div>
                        <Row className="g-2">
                          <Col sm={6} md={4}>
                            <span className={passwordRules.length ? 'text-success' : 'text-muted'}>
                              {passwordRules.length ? '✓' : '•'} Tối thiểu 8 ký tự
                            </span>
                          </Col>
                          <Col sm={6} md={4}>
                            <span className={passwordRules.upper && passwordRules.lower ? 'text-success' : 'text-muted'}>
                              {passwordRules.upper && passwordRules.lower ? '✓' : '•'} Chữ hoa &amp; chữ thường
                            </span>
                          </Col>
                          <Col sm={6} md={4}>
                            <span className={passwordRules.number ? 'text-success' : 'text-muted'}>
                              {passwordRules.number ? '✓' : '•'} Ít nhất 1 chữ số (0-9)
                            </span>
                          </Col>
                          <Col sm={6} md={4}>
                            <span className={passwordRules.special ? 'text-success' : 'text-muted'}>
                              {passwordRules.special ? '✓' : '•'} Ít nhất 1 ký tự đặc biệt
                            </span>
                          </Col>
                          <Col sm={6} md={8}>
                            <span className={passwordRules.match ? 'text-success' : 'text-muted'}>
                              {passwordRules.match ? '✓' : '•'} Mật khẩu xác nhận trùng khớp
                            </span>
                          </Col>
                        </Row>
                      </div>
                    </Col>

                    {/* Summary Review Card */}
                    <Col md={12}>
                      <div className="bms-review-card mt-2">
                        <div className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                          <FaIdCard />
                          <span>Đối soát thông tin hồ sơ y tế trước khi nhận mã OTP</span>
                        </div>
                        <div className="bms-review-row">
                          <span className="text-muted">Họ và tên:</span>
                          <strong className="text-dark">{formData.fullName || '(Chưa nhập)'}</strong>
                        </div>
                        <div className="bms-review-row">
                          <span className="text-muted">Số CCCD (12 số):</span>
                          <strong className="text-dark">{formData.identityCard || '(Chưa nhập)'}</strong>
                        </div>
                        <div className="bms-review-row">
                          <span className="text-muted">Email nhận kết quả:</span>
                          <strong className="text-primary">{formData.email || '(Chưa nhập)'}</strong>
                        </div>
                        <div className="bms-review-row">
                          <span className="text-muted">Số điện thoại:</span>
                          <span className="text-dark">{formData.phoneNumber || '(Chưa nhập)'}</span>
                        </div>
                        <div className="bms-review-row">
                          <span className="text-muted">Địa chỉ thường trú:</span>
                          <span className="text-dark text-end ms-3">{fullAddressPreview || '(Chưa nhập)'}</span>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                    <Button
                      variant="outline-secondary"
                      className="px-3 py-2 small d-flex align-items-center gap-2"
                      onClick={() => {
                        setErrorMsg('');
                        setCurrentStep(2);
                      }}
                      disabled={loading}
                    >
                      <FaArrowLeft />
                      <span>Quay Lại: Nhập Địa Chỉ</span>
                    </Button>
                    <Button
                      variant="primary"
                      className="px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm"
                      onClick={handleRegisterAndSendOtp}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" />
                          <span>Đang gửi mã OTP đến email...</span>
                        </>
                      ) : (
                        <>
                          <span>Đăng Ký &amp; Nhận Mã OTP</span>
                          <FaArrowRight />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 4: XÁC THỰC MÃ OTP (KÍCH HOẠT HỒ SƠ)                     */}
              {/* ============================================================ */}
              {currentStep === 4 && (
                <div className="bms-wizard-content">
                  <div className="bms-otp-container py-3">
                    <div className="text-center mb-4">
                      <div
                        className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3"
                        style={{ width: 68, height: 68 }}
                      >
                        <FaShieldAlt className="fs-2" />
                      </div>
                      <h4 className="fw-bold mb-1 text-dark">Bước 4: Xác Thực Tài Khoản (Mã OTP)</h4>
                      <p className="text-muted small mb-0">
                        Mã xác thực gồm 6 chữ số đã được gửi trực tiếp đến hộp thư email:
                      </p>
                      <div className="fw-bold fs-6 text-primary mt-1">{formData.email}</div>

                      <div className="p-2 bg-light rounded-3 border text-start mt-2" style={{ fontSize: '12px' }}>
                        <div className="fw-semibold text-dark mb-1">
                          <FaEnvelope className="text-primary me-1" /> Hướng dẫn kiểm tra hộp thư y tế:
                        </div>
                        <ul className="ps-3 mb-0 text-muted" style={{ lineHeight: '1.5' }}>
                          <li>Email gửi từ: <strong>bms.mec.lab@gmail.com</strong> (Hệ Thống Xét Nghiệm Y Khoa BMS).</li>
                          <li>Nếu chưa thấy trong <strong>Hộp thư đến (Inbox)</strong>, vui lòng mở mục <strong>Thư rác (Spam / Junk)</strong> hoặc <strong>Quảng cáo (Promotions)</strong>.</li>
                          <li>Bấm <em>"Báo cáo không phải là thư rác" (Not Spam)</em> để các thông báo kết quả xét nghiệm sau này luôn vào Hộp thư chính.</li>
                        </ul>
                      </div>
                    </div>

                    {otpError && (
                      <Alert variant="danger" className="py-2 small d-flex align-items-center gap-2 mb-3">
                        <FaTimesCircle className="flex-shrink-0" />
                        <span>{otpError}</span>
                      </Alert>
                    )}

                    <Form onSubmit={handleVerifyOtp}>
                      <Form.Group className="mb-4 text-center">
                        <Form.Label className="fw-bold text-dark small mb-3">
                          Nhập 6 Chữ Số Mã OTP Xác Thực:
                        </Form.Label>
                        <div className="d-flex justify-content-center">
                          <OtpInputGroup
                            length={6}
                            value={otpValue}
                            onChange={(val) => {
                              setOtpValue(val);
                              if (otpError) setOtpError('');
                            }}
                            autoFocus
                          />
                        </div>
                      </Form.Group>

                      <div className="text-center mb-4">
                        {countdown > 0 ? (
                          <span className="text-muted small">
                            Gửi lại mã OTP sau: <strong className="text-primary">{countdown}s</strong>
                          </span>
                        ) : (
                          <Button
                            variant="link"
                            className="p-0 text-decoration-none small fw-bold"
                            onClick={handleResendOtp}
                            disabled={otpLoading}
                          >
                            Chưa nhận được mã? Gửi lại OTP
                          </Button>
                        )}
                      </div>

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-3 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm mb-3"
                        disabled={otpLoading || otpValue.trim().length !== 6}
                      >
                        {otpLoading ? (
                          <>
                            <Spinner animation="border" size="sm" />
                            <span>Đang xác thực hồ sơ...</span>
                          </>
                        ) : (
                          <>
                            <FaCheckCircle />
                            <span>Xác Nhận OTP &amp; Hoàn Tất Đăng Ký</span>
                          </>
                        )}
                      </Button>

                      <div className="text-center">
                        <Button
                          variant="link"
                          className="text-muted small text-decoration-none"
                          onClick={() => {
                            setErrorMsg('');
                            setCurrentStep(1);
                          }}
                          disabled={otpLoading}
                        >
                          &larr; Chỉnh sửa lại thông tin cá nhân
                        </Button>
                      </div>
                    </Form>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
