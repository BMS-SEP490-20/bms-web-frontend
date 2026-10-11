/**
 * Receptionist Patient Create Component
 * 
 * Component for receptionist to create patient profiles on behalf of elderly patients
 * who cannot create their own profiles.
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Spinner, Modal, Tabs, Tab, InputGroup, Table, Badge } from 'react-bootstrap';
import { patientService } from '../../../../services/patientService';
import { userManagementService } from '../../../../services/userManagementService';
import { emailService } from '../../../../services/emailService';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { getRoleIdFromKey } from '../../../users/utils/roleUtils';
import { dispatchRefreshEvent, setRefreshFlag } from '../../../../shared/hooks/useAutoRefresh';
import { vietnamLocations } from '../../../../data/vietnamLocations';

const ReceptionistPatientCreate = () => {
  const { showSuccess, showError, showInfo } = useNotificationContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    cccd: '',
    bloodGroup: '',
    province: '',
    district: '',
    ward: '',
    addressDetail: '',
    medicalHistory: '',
    allergies: ''
  });
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [createdPatient, setCreatedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [duplicateCheck, setDuplicateCheck] = useState({ cccd: null, phone: null, email: null });
  const [createdAccount, setCreatedAccount] = useState(null);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableWards, setAvailableWards] = useState([]);

  /**
   * Effect hook: Loads draft data from localStorage on component mount
   * 
   * This effect automatically loads saved draft data from localStorage when
   * the component mounts, allowing users to continue where they left off.
   * 
   * @effect
   * @dependencies [] - Runs only once on mount
   * 
   * @example
   * // Automatically loads draft on mount
   * useEffect(() => {
   *   const draft = localStorage.getItem('patient_draft_receptionist');
   *   // Load draft data...
   * }, []);
   */
  useEffect(() => {
    const draft = localStorage.getItem('patient_draft_receptionist');
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        setFormData(draftData);
        
        // Restore districts if province exists
        if (draftData.province) {
          const selectedProvince = vietnamLocations.find(p => p.name === draftData.province);
          if (selectedProvince) {
            setAvailableDistricts(selectedProvince.districts || []);
            
            // Restore wards if district exists
            if (draftData.district) {
              const selectedDistrict = selectedProvince.districts.find(d => d.name === draftData.district);
              if (selectedDistrict) {
                setAvailableWards(selectedDistrict.wards || []);
              }
            }
          }
        }
        
        showInfo('Đã tải dữ liệu nháp');
      } catch (error) {
      }
    }
  }, []);

  /**
   * Effect hook: Auto-saves draft data every 30 seconds
   * 
   * This effect automatically saves form data to localStorage every 30 seconds
   * to prevent data loss. It only saves if form has meaningful data (fullName,
   * phone, or cccd).
   * 
   * @effect
   * @dependencies {Object} formData - Form data to save
   * 
   * @example
   * // Auto-saves every 30 seconds
   * useEffect(() => {
   *   const interval = setInterval(() => {
   *     // Save draft...
   *   }, 30000);
   *   return () => clearInterval(interval);
   * }, [formData]);
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.fullName || formData.phone || formData.cccd) {
        localStorage.setItem('patient_draft_receptionist', JSON.stringify(formData));
      }
    }, 30000); // 30 giây

    return () => clearInterval(interval);
  }, [formData]);

  /**
   * Validates form field format in real-time
   * 
   * This function validates individual form fields according to their format requirements.
   * It performs format validation for phone, CCCD, email, and dateOfBirth fields.
   * Updates errors state with validation messages.
   * 
   * **Validation rules:**
   * - Phone: Must be 10 digits starting with 0
   * - CCCD: Must be exactly 12 digits
   * - Email: Must match email format regex
   * - DateOfBirth: Must not be in future and age must be <= 150
   * 
   * @param {string} name - Field name to validate
   * @param {string} value - Field value to validate
   * @returns {void} Does not return a value. Updates errors state.
   * 
   * @example
   * validateFormat('phone', '0912345678') // Validates phone format
   * validateFormat('cccd', '123456789012') // Validates CCCD format
   */
  const validateFormat = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'phone':
        if (value && !/^0[0-9]{9}$/.test(value)) {
          newErrors.phone = 'Số điện thoại phải có 10 số và bắt đầu bằng 0';
        } else {
          delete newErrors.phone;
        }
        break;
      case 'cccd':
        if (value && !/^[0-9]{12}$/.test(value)) {
          newErrors.cccd = 'CCCD phải có đúng 12 số';
        } else {
          delete newErrors.cccd;
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Email không hợp lệ';
        } else {
          delete newErrors.email;
        }
        break;
      case 'dateOfBirth':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          
          if (birthDate > today) {
            newErrors.dateOfBirth = 'Ngày sinh không được lớn hơn ngày hiện tại';
          } else if (age > 150) {
            newErrors.dateOfBirth = 'Ngày sinh không hợp lệ';
          } else {
            delete newErrors.dateOfBirth;
          }
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
  };

  /**
   * Handles form field changes
   * 
   * This function updates form data when user types in form fields. It performs:
   * 1. Updates formData state with new value
   * 2. Validates field format in real-time
   * 3. Clears duplicate check flags when CCCD/phone/email changes
   * 4. Updates district and ward options when province or district changes
   * 
   * @param {Event} e - Change event from form input
   * @returns {void} Does not return a value. Updates formData and errors state.
   * 
   * @example
   * // Called when user types in any form field
   * <Form.Control onChange={handleChange} name="fullName" />
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle province change
    if (name === 'province') {
      const selectedProvince = vietnamLocations.find(p => p.name === value);
      if (selectedProvince) {
        setAvailableDistricts(selectedProvince.districts || []);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          district: '', // Reset district when province changes
          ward: '' // Reset ward when province changes
        }));
        setAvailableWards([]);
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
        setAvailableDistricts([]);
        setAvailableWards([]);
      }
      return;
    }
    
    // Handle district change
    if (name === 'district') {
      const selectedProvince = vietnamLocations.find(p => p.name === formData.province);
      if (selectedProvince) {
        const selectedDistrict = selectedProvince.districts.find(d => d.name === value);
        if (selectedDistrict) {
          setAvailableWards(selectedDistrict.wards || []);
          setFormData(prev => ({
            ...prev,
            [name]: value,
            ward: '' // Reset ward when district changes
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            [name]: value
          }));
          setAvailableWards([]);
        }
      }
      return;
    }
    
    // Handle other fields
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate real-time
    validateFormat(name, value);

    // Clear duplicate check khi thay đổi
    if (name === 'cccd') setDuplicateCheck(prev => ({ ...prev, cccd: null }));
    if (name === 'phone') setDuplicateCheck(prev => ({ ...prev, phone: null }));
    if (name === 'email') setDuplicateCheck(prev => ({ ...prev, email: null }));
  };

  /**
   * Checks for duplicate CCCD, phone, or email in existing patients
   * 
   * This function checks if a CCCD, phone number, or email already exists
   * in the patient database. It fetches all patients and searches for matches.
   * Updates duplicateCheck state with found patient or null.
   * 
   * **Search types:**
   * - 'cccd': Checks cccd, cmnd, identityNumber fields
   * - 'phone': Checks phone, phoneNumber, mobile fields
   * - 'email': Checks email field
   * 
   * @param {string} type - Type of check ('cccd', 'phone', or 'email')
   * @param {string} value - Value to check for duplicates
   * @returns {Promise<void>} Does not return a value. Updates duplicateCheck state.
   * 
   * @example
   * // Check if CCCD already exists
   * await checkDuplicate('cccd', '123456789012');
   */
  const checkDuplicate = async (type, value) => {
    if (!value) return;

    try {
      setSearchLoading(true);
      const patientsResult = await patientService.getAllPatients();
      
      if (patientsResult.success) {
        const patients = patientsResult.data || [];
        let found = null;

        if (type === 'cccd') {
          found = patients.find(p => 
            p.cccd === value || p.cmnd === value || p.identityNumber === value
          );
        } else if (type === 'phone') {
          found = patients.find(p => 
            p.phone === value || p.phoneNumber === value
          );
        } else if (type === 'email') {
          found = patients.find(p => p.email === value);
        }

        if (found) {
          setDuplicateCheck(prev => ({ ...prev, [type]: found }));
          showError(`${type === 'cccd' ? 'CCCD' : type === 'phone' ? 'SĐT' : 'Email'} đã được sử dụng bởi bệnh nhân: ${found.fullName || found.name}`);
        } else {
          setDuplicateCheck(prev => ({ ...prev, [type]: null }));
        }
      }
    } catch (error) {
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Searches for existing patients before creating new profile
   * 
   * This function searches the patient database using the search term to find
   * existing patients. It helps prevent duplicate patient creation by allowing
   * receptionist to find and use existing patient profiles.
   * 
   * @returns {Promise<void>} Does not return a value. Updates searchResults state.
   * 
   * @example
   * // Search for patients before creating new profile
   * await handleSearchPatient();
   */
  const handleSearchPatient = async () => {
    if (!searchTerm.trim()) {
      showError('Vui lòng nhập thông tin để tìm kiếm');
      return;
    }

    try {
      setSearchLoading(true);
      const result = await patientService.searchPatients(searchTerm);
      
      if (result.success) {
        setSearchResults(result.data || []);
        if (result.data.length === 0) {
          showInfo('Không tìm thấy bệnh nhân. Bạn có thể tạo hồ sơ mới.');
        }
      }
    } catch (error) {
      showError('Lỗi tìm kiếm bệnh nhân');
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Navigates to appointment creation with existing patient
   * 
   * This function is called when receptionist finds an existing patient and wants
   * to create an appointment for them instead of creating a new profile.
   * It navigates to the appointment creation page with the patient ID.
   * 
   * @param {Object} patient - Existing patient object to use
   * @returns {void} Does not return a value. Navigates to appointment creation page.
   * 
   * @example
   * // Use existing patient for appointment creation
   * handleUseExistingPatient(patient);
   */
  const handleUseExistingPatient = (patient) => {
    showInfo(`Bệnh nhân ${patient.fullName} đã có hồ sơ. Bạn có thể đặt lịch cho bệnh nhân này.`);
    navigate(`/appointments/create?patientId=${patient.id}`);
  };

  /**
   * Validates entire form data before submission
   * 
   * This function performs comprehensive validation of all form fields before
   * submitting the patient creation form. It checks:
   * 1. Required fields (fullName, phone, cccd)
   * 2. Format validation (phone, cccd, email)
   * 3. Date of birth validation (not in future, age <= 150)
   * 
   * Sets errors state with validation messages and returns validation result.
   * 
   * @returns {boolean} True if form is valid, false otherwise
   * 
   * @example
   * if (validateFormData()) {
   *   // Form is valid, proceed with submission
   * }
   */
  const validateFormData = () => {
    const newErrors = {};

    // Required fields
    if (!formData.fullName) {
      newErrors.fullName = 'Họ tên là bắt buộc';
    }
    if (!formData.phone) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^0[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại phải có 10 số và bắt đầu bằng 0';
    }
    if (!formData.cccd) {
      newErrors.cccd = 'CCCD là bắt buộc';
    } else if (!/^[0-9]{12}$/.test(formData.cccd)) {
      newErrors.cccd = 'CCCD phải có đúng 12 số';
    }

    // Optional but validate format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Ngày sinh không được lớn hơn ngày hiện tại';
      } else if (age > 150) {
        newErrors.dateOfBirth = 'Ngày sinh không hợp lệ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Checks all duplicate fields before form submission
   * 
   * This function checks for duplicates in CCCD, phone, and email fields
   * before allowing form submission. It runs all duplicate checks in parallel
   * and returns true only if no duplicates are found.
   * 
   * @returns {Promise<boolean>} True if no duplicates found, false otherwise
   * 
   * @example
   * const noDuplicates = await checkAllDuplicates();
   * if (noDuplicates) {
   *   // Proceed with patient creation
   * }
   */
  const checkAllDuplicates = async () => {
    const checks = [];
    if (formData.cccd) {
      checks.push(checkDuplicate('cccd', formData.cccd));
    }
    if (formData.phone) {
      checks.push(checkDuplicate('phone', formData.phone));
    }
    if (formData.email) {
      checks.push(checkDuplicate('email', formData.email));
    }

    await Promise.all(checks);

    // Đợi một chút để state update
    await new Promise(resolve => setTimeout(resolve, 500));

    return !duplicateCheck.cccd && !duplicateCheck.phone && !duplicateCheck.email;
  };

  /**
   * Handles form submission
   * 
   * This function is called when the patient creation form is submitted. It performs:
   * 1. Validates form data format
   * 2. Checks for duplicate CCCD, phone, and email
   * 3. Opens preview modal if validation passes
   * 
   * **Validation flow:**
   * - First validates format (required fields, format rules)
   * - Then checks for duplicates
   * - Only opens preview if all checks pass
   * 
   * @param {Event} e - Form submit event
   * @returns {Promise<void>} Does not return a value. Opens preview modal if valid.
   * 
   * @example
   * // Called when user clicks submit button
   * <Form onSubmit={handleSubmit}>
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate format
    if (!validateFormData()) {
      showError('Vui lòng kiểm tra lại thông tin đã nhập');
      return;
    }

    // Kiểm tra trùng lặp
    const noDuplicates = await checkAllDuplicates();
    if (!noDuplicates) {
      showError('Thông tin đã được sử dụng. Vui lòng kiểm tra lại.');
      return;
    }

    // Hiển thị preview modal
    setShowPreview(true);
  };

  /**
   * Automatically creates user account for patient
   * 
   * This function creates a user account for a newly created patient. It performs:
   * 1. Generates username from phone or CCCD
   * 2. Generates default password from last 6 digits of CCCD or phone
   * 3. Creates user account with patient role
   * 4. Links account to patient record
   * 5. Sends email with credentials if email is provided
   * 
   * **Account generation:**
   * - Username: `patient_{phone_without_0}` or `patient_{cccd}`
   * - Password: Last 6 digits of CCCD or phone
   * - Email: Uses provided email or generates placeholder
   * 
   * @param {Object} patient - Patient object that was just created
   * @returns {Promise<Object>} Result object with success status and account data
   * 
   * @example
   * // Create account after patient creation
   * const accountResult = await createUserAccount(patient);
   */
  const createUserAccount = async (patient) => {
    try {
      // Tạo username từ SĐT hoặc CCCD
      const username = formData.phone 
        ? `patient_${formData.phone.replace(/^0/, '')}` 
        : `patient_${formData.cccd}`;
      
      // Tạo password mặc định từ CCCD (6 số cuối) hoặc SĐT (6 số cuối)
      const defaultPassword = formData.cccd 
        ? formData.cccd.slice(-6)
        : formData.phone.slice(-6);

      const userData = {
        username: username,
        email: formData.email || `${username}@example.com`,
        password: defaultPassword,
        fullName: formData.fullName,
        phone: formData.phone,
        role: 'patient', // Backward compatible
        roleId: getRoleIdFromKey('patient') || 5, // Role ID for Patient
        isActive: true,
        createdAt: new Date().toISOString()
      };

      // Kiểm tra xem email đã được sử dụng chưa
      const usersResult = await userManagementService.getAllUsers();
      if (usersResult.success) {
        const existingUser = usersResult.data.find(u => 
          u.email === userData.email || u.username === userData.username
        );
        if (existingUser) {
          return { 
            success: false, 
            message: 'Tài khoản với email/username này đã tồn tại',
            data: null
          };
        }
      }

      // Tạo user account
      try {
        const userResult = await userManagementService.createUser(userData);
        
        return {
          success: true,
          data: {
            username: userData.username,
            password: defaultPassword,
            email: userData.email
          }
        };
      } catch (error) {
        return {
          success: false,
          message: error.message || 'Không thể tạo tài khoản tự động',
          data: null
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Lỗi hệ thống khi tạo tài khoản',
        data: null
      };
    }
  };

  /**
   * Confirms and creates patient profile
   * 
   * This function is called when user confirms patient creation in the preview modal.
   * It performs:
   * 1. Creates patient profile via API
   * 2. Automatically creates user account if email/phone provided
   * 3. Sends email with login credentials if email provided
   * 4. Dispatches refresh events
   * 5. Clears draft data from localStorage
   * 6. Shows success notification with account details
   * 
   * @returns {Promise<void>} Does not return a value. Creates patient and updates backend.
   * 
   * @example
   * // Called when user confirms creation in preview modal
   * await handleConfirmCreate();
   */
  const handleConfirmCreate = async () => {
    setLoading(true);
    setShowPreview(false);

    try {
      // Build address string from province, district, ward, and addressDetail
      const addressParts = [];
      if (formData.addressDetail) addressParts.push(formData.addressDetail);
      if (formData.ward) addressParts.push(formData.ward);
      if (formData.district) addressParts.push(formData.district);
      if (formData.province) addressParts.push(formData.province);
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

      // Build medical history string
      const medicalHistoryParts = [];
      if (formData.medicalHistory) {
        medicalHistoryParts.push(`Tiền sử bệnh: ${formData.medicalHistory}`);
      }
      if (formData.allergies) {
        medicalHistoryParts.push(`Dị ứng: ${formData.allergies}`);
      }
      const medicalHistory = medicalHistoryParts.length > 0 ? medicalHistoryParts.join('\n') : '';

      // Convert to backend format (PascalCase)
      const payload = {
        Fullname: formData.fullName?.trim() || '',
        Email: formData.email?.trim() || null,
        Phone: formData.phone?.trim() || '',
        Dob: formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : null,
        Gender: formData.gender || null,
        Address: fullAddress,
        BloodType: formData.bloodGroup || null,
        IdentityNumber: formData.cccd?.trim() || '',
        Medical_History: medicalHistory,
        Createby: 'receptionist',
        CreatedAt: new Date().toISOString()
      };

      const result = await patientService.createPatient(payload);

      if (result.success) {
        const patientData = result.data;
        setRefreshFlag('patients');
        dispatchRefreshEvent('patients', 'created', { patientId: patientData?.id });
        setCreatedPatient(patientData);
        
        // Tự động tạo tài khoản nếu có email hoặc SĐT
        if (formData.email || formData.phone) {
          const accountResult = await createUserAccount(patientData);
          if (accountResult.success) {
            setCreatedAccount(accountResult.data);
            
            // Gửi email với tài khoản và mật khẩu nếu có email
            if (formData.email) {
              try {
                const username = accountResult.data?.username || 
                  (formData.phone ? `patient_${formData.phone.replace(/^0/, '')}` : `patient_${formData.cccd}`);
                const password = accountResult.data?.password || 
                  (formData.cccd ? formData.cccd.slice(-6) : formData.phone.slice(-6));
                
                const emailResult = await emailService.sendLoginCredentials(
                  formData.email,
                  username,
                  password
                );
                
                if (emailResult.success) {
                  showSuccess('Tạo hồ sơ và tài khoản thành công! Thông tin đăng nhập đã được gửi về email.');
                } else {
                  showSuccess('Tạo hồ sơ và tài khoản thành công! Tuy nhiên, không thể gửi email thông tin đăng nhập.');
                }
              } catch (emailError) {
                showSuccess('Tạo hồ sơ và tài khoản thành công! Tuy nhiên, không thể gửi email thông tin đăng nhập.');
              }
            } else {
              showSuccess('Tạo hồ sơ và tài khoản thành công!');
            }
          } else {
            showInfo(`Tạo hồ sơ thành công nhưng không thể tạo tài khoản: ${accountResult.message}`);
          }
        } else {
          showSuccess('Tạo hồ sơ bệnh nhân thành công!');
        }
        
        // Xóa draft
        localStorage.removeItem('patient_draft_receptionist');
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          gender: '',
          cccd: '',
          bloodGroup: '',
          province: '',
          district: '',
          ward: '',
          addressDetail: '',
          medicalHistory: '',
          allergies: ''
        });
        setErrors({});
        setDuplicateCheck({ cccd: null, phone: null, email: null });
      } else {
        showError(result.message || 'Lỗi khi tạo hồ sơ bệnh nhân');
      }
    } catch (error) {
      showError('Lỗi hệ thống khi tạo hồ sơ bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  // Lưu nháp
  /**
   * Saves form data as draft to localStorage
   * 
   * This function saves the current form data to localStorage so it can be
   * restored later if the user navigates away or refreshes the page.
   * 
   * @returns {void} Does not return a value. Saves to localStorage and shows notification.
   * 
   * @example
   * // Save draft manually
   * handleSaveDraft();
   */
  const handleSaveDraft = () => {
    localStorage.setItem('patient_draft_receptionist', JSON.stringify(formData));
    showSuccess('Đã lưu nháp thành công');
  };

  // Xóa nháp
  const handleClearDraft = () => {
    localStorage.removeItem('patient_draft_receptionist');
    showInfo('Đã xóa dữ liệu nháp');
  };

  return (
    <div className="container-fluid px-4">
      {/* Search Patient Section */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-info text-white py-3">
          <h4 className="mb-0 text-center fw-bold">
            <i className="fas fa-search me-2"></i>
            Tìm kiếm bệnh nhân trước khi tạo hồ sơ
          </h4>
        </Card.Header>
        <Card.Body className="py-4">
          <Alert variant="warning" className="mb-3" style={{ fontSize: '1.1rem' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Lưu ý:</strong> Vui lòng tìm kiếm bệnh nhân trước để tránh tạo hồ sơ trùng lặp.
          </Alert>
          <Row className="justify-content-center">
            <Col md={10}>
              <Row>
                <Col md={10}>
                  <InputGroup size="lg">
                    <InputGroup.Text>
                      <i className="fas fa-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Tìm theo tên, SĐT, CCCD, Email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                      style={{ fontSize: '1.05rem' }}
                    />
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Button
                    variant="primary"
                    onClick={handleSearchPatient}
                    disabled={searchLoading || !searchTerm.trim()}
                    className="w-100"
                    size="lg"
                    style={{ fontSize: '1.05rem', padding: '0.6rem 1rem' }}
                  >
                    {searchLoading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <i className="fas fa-search me-2"></i>
                        Tìm kiếm
                      </>
                    )}
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>

          {searchResults.length > 0 && (
            <div className="mt-4">
              <Alert variant="info" style={{ fontSize: '1.1rem' }}>
                <strong>Tìm thấy {searchResults.length} bệnh nhân:</strong>
              </Alert>
              <div className="table-responsive">
                <Table striped hover className="align-middle" style={{ fontSize: '1.05rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Họ tên</th>
                      <th style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>SĐT</th>
                      <th style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>CCCD</th>
                      <th style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Email</th>
                      <th className="text-center" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(patient => (
                      <tr key={patient.id}>
                        <td style={{ fontSize: '1.05rem', fontWeight: '500' }}>{patient.fullName || patient.name}</td>
                        <td style={{ fontSize: '1.05rem' }}>{patient.phone || patient.phoneNumber}</td>
                        <td style={{ fontSize: '1.05rem' }}>{patient.cccd || patient.cmnd || patient.identityNumber}</td>
                        <td style={{ fontSize: '1.05rem' }}>{patient.email || 'N/A'}</td>
                        <td className="text-center">
                          <Button
                            variant="success"
                            size="lg"
                            onClick={() => handleUseExistingPatient(patient)}
                            style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}
                          >
                            <i className="fas fa-check me-2"></i>
                            Sử dụng
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Create Patient Form */}
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center py-3">
          <h4 className="mb-0 fw-bold">
            <i className="fas fa-user-plus me-2"></i>
            Tạo Hồ Sơ Bệnh Nhân
          </h4>
          <div>
            <Button
              variant="light"
              size="lg"
              className="me-2"
              onClick={handleSaveDraft}
              style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}
            >
              <i className="fas fa-save me-2"></i>
              Lưu nháp
            </Button>
            <Button
              variant="outline-light"
              size="lg"
              onClick={handleClearDraft}
              style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}
            >
              <i className="fas fa-trash me-2"></i>
              Xóa nháp
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <Alert variant="info" style={{ fontSize: '1.1rem' }}>
            <i className="fas fa-info-circle me-2"></i>
            <strong>Lưu ý:</strong> Chức năng này dành cho việc tạo hồ sơ thay cho những bệnh nhân lớn tuổi 
            không thể tự tạo hồ sơ. Vui lòng điền đầy đủ thông tin chính xác.
          </Alert>

          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              {/* Tab 1: Thông tin cơ bản */}
              <Tab eventKey="basic" title={
                <>
                  <i className="fas fa-user me-2"></i>
                  Thông tin cơ bản
                </>
              }>
                <Row className="mt-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        Họ và tên <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        isInvalid={!!errors.fullName}
                        placeholder="Nhập họ và tên"
                        size="lg"
                        style={{ fontSize: '1.05rem' }}
                      />
                      <Form.Control.Feedback type="invalid" style={{ fontSize: '1rem' }}>
                        {errors.fullName}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Số điện thoại <span className="text-danger">*</span>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="ms-2"
                          onClick={() => checkDuplicate('phone', formData.phone)}
                          disabled={!formData.phone || searchLoading}
                        >
                          <i className="fas fa-search me-1"></i>
                          Kiểm tra
                        </Button>
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        isInvalid={!!errors.phone || !!duplicateCheck.phone}
                        placeholder="Nhập số điện thoại (10 số)"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                      {duplicateCheck.phone && (
                        <Alert variant="danger" className="mt-2 mb-0">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          SĐT đã được sử dụng bởi: <strong>{duplicateCheck.phone.fullName || duplicateCheck.phone.name}</strong>
                        </Alert>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Email
                        {formData.email && (
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="ms-2"
                            onClick={() => checkDuplicate('email', formData.email)}
                            disabled={searchLoading}
                          >
                            <i className="fas fa-search me-1"></i>
                            Kiểm tra
                          </Button>
                        )}
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        isInvalid={!!errors.email || !!duplicateCheck.email}
                        placeholder="Nhập email (nếu có)"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                      {duplicateCheck.email && (
                        <Alert variant="danger" className="mt-2 mb-0">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Email đã được sử dụng bởi: <strong>{duplicateCheck.email.fullName || duplicateCheck.email.name}</strong>
                        </Alert>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ngày sinh</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        isInvalid={!!errors.dateOfBirth}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.dateOfBirth}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Giới tính</Form.Label>
                      <Form.Select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Số CCCD/CMND <span className="text-danger">*</span>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="ms-2"
                          onClick={() => checkDuplicate('cccd', formData.cccd)}
                          disabled={!formData.cccd || searchLoading}
                        >
                          <i className="fas fa-search me-1"></i>
                          Kiểm tra
                        </Button>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="cccd"
                        value={formData.cccd}
                        onChange={handleChange}
                        isInvalid={!!errors.cccd || !!duplicateCheck.cccd}
                        placeholder="Nhập số CCCD/CMND (12 số)"
                        maxLength={12}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.cccd}
                      </Form.Control.Feedback>
                      {duplicateCheck.cccd && (
                        <Alert variant="danger" className="mt-2 mb-0">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          CCCD đã được sử dụng bởi: <strong>{duplicateCheck.cccd.fullName || duplicateCheck.cccd.name}</strong>
                        </Alert>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nhóm máu</Form.Label>
                      <Form.Select
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleChange}
                      >
                        <option value="">Chọn nhóm máu</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Tab 2: Địa chỉ */}
              <Tab eventKey="address" title={
                <>
                  <i className="fas fa-map-marker-alt me-2"></i>
                  Địa chỉ
                </>
              }>
                <Row className="mt-3">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tỉnh/Thành phố</Form.Label>
                      <Form.Select
                        name="province"
                        value={formData.province}
                        onChange={handleChange}
                        style={{ fontSize: '1.05rem' }}
                      >
                        <option value="">-- Chọn tỉnh/thành phố --</option>
                        {vietnamLocations.map(province => (
                          <option key={province.id} value={province.name}>
                            {province.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Quận/Huyện</Form.Label>
                      <Form.Select
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        disabled={!formData.province}
                        style={{ fontSize: '1.05rem' }}
                      >
                        <option value="">-- Chọn quận/huyện --</option>
                        {availableDistricts.map(district => (
                          <option key={district.id} value={district.name}>
                            {district.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phường/Xã</Form.Label>
                      <Form.Select
                        name="ward"
                        value={formData.ward}
                        onChange={handleChange}
                        disabled={!formData.district}
                        style={{ fontSize: '1.05rem' }}
                      >
                        <option value="">-- Chọn phường/xã --</option>
                        {availableWards.map((ward, index) => (
                          <option key={index} value={ward}>
                            {ward}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Địa chỉ chi tiết</Form.Label>
                  <Form.Control
                    type="text"
                    name="addressDetail"
                    value={formData.addressDetail}
                    onChange={handleChange}
                    placeholder="Số nhà, tên đường, thôn/xóm..."
                    style={{ fontSize: '1.05rem' }}
                  />
                </Form.Group>
              </Tab>

              {/* Tab 3: Thông tin y tế */}
              <Tab eventKey="medical" title={
                <>
                  <i className="fas fa-heartbeat me-2"></i>
                  Thông tin y tế
                </>
              }>
                <Row className="mt-3">
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tiền sử bệnh</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="medicalHistory"
                        value={formData.medicalHistory}
                        onChange={handleChange}
                        placeholder="Nhập tiền sử bệnh (nếu có)"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Dị ứng</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="allergies"
                        value={formData.allergies}
                        onChange={handleChange}
                        placeholder="Nhập thông tin dị ứng (nếu có)"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>
            </Tabs>
            <div className="d-flex justify-content-center gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    dateOfBirth: '',
                    gender: '',
                    cccd: '',
                    bloodGroup: '',
                    province: '',
                    district: '',
                    ward: '',
                    addressDetail: '',
                    medicalHistory: '',
                    allergies: ''
                  });
                  setErrors({});
                  setDuplicateCheck({ cccd: null, phone: null, email: null });
                }}
                size="lg"
                style={{ fontSize: '1.1rem', padding: '0.6rem 2rem' }}
              >
                <i className="fas fa-redo me-2"></i>
                Làm mới
              </Button>
              <Button 
                variant="success" 
                type="submit" 
                disabled={loading}
                size="lg"
                style={{ fontSize: '1.1rem', padding: '0.6rem 2rem' }}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check me-2"></i>
                    Xem trước và tạo
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="fas fa-eye me-2"></i>
            Xem trước thông tin hồ sơ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Vui lòng kiểm tra lại thông tin trước khi xác nhận tạo hồ sơ.
          </Alert>
          <Row>
            <Col md={6}>
              <strong>Họ tên:</strong> {formData.fullName}
            </Col>
            <Col md={6}>
              <strong>SĐT:</strong> {formData.phone}
            </Col>
            <Col md={6}>
              <strong>Email:</strong> {formData.email || 'N/A'}
            </Col>
            <Col md={6}>
              <strong>Ngày sinh:</strong> {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}
            </Col>
            <Col md={6}>
              <strong>Giới tính:</strong> {formData.gender === 'male' ? 'Nam' : formData.gender === 'female' ? 'Nữ' : formData.gender || 'N/A'}
            </Col>
            <Col md={6}>
              <strong>CCCD:</strong> {formData.cccd}
            </Col>
            <Col md={6}>
              <strong>Nhóm máu:</strong> {formData.bloodGroup || 'N/A'}
            </Col>
            <Col md={12}>
              <strong>Địa chỉ:</strong> {[formData.addressDetail, formData.ward, formData.district, formData.province].filter(Boolean).join(', ') || 'N/A'}
            </Col>
            {formData.medicalHistory && (
              <Col md={12}>
                <strong>Tiền sử bệnh:</strong> {formData.medicalHistory}
              </Col>
            )}
            {formData.allergies && (
              <Col md={12}>
                <strong>Dị ứng:</strong> {formData.allergies}
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            <i className="fas fa-times me-2"></i>
            Hủy
          </Button>
          <Button variant="success" onClick={handleConfirmCreate} disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang tạo...
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                Xác nhận tạo
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success Modal */}
      <Modal show={!!createdPatient} onHide={() => { setCreatedPatient(null); setCreatedAccount(null); }} size="lg" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="fas fa-check-circle me-2"></i>
            Tạo hồ sơ thành công!
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            <strong>Hồ sơ bệnh nhân đã được tạo thành công!</strong>
            <br />
            Tên: {createdPatient?.fullName || createdPatient?.Fullname || createdPatient?.name || createdPatient?.Name || formData.fullName || 'N/A'}
            <br />
            ID: {createdPatient?.id || createdPatient?.Id || 'N/A'}
          </Alert>

          {createdAccount && (
            <Alert variant="info" className="mt-3">
              <strong>
                <i className="fas fa-user-circle me-2"></i>
                Tài khoản đã được tạo tự động:
              </strong>
              <br />
              <br />
              <div className="bg-light p-3 rounded">
                <strong>Username:</strong> <code>{createdAccount.username}</code>
                <br />
                <strong>Password:</strong> <code>{createdAccount.password}</code>
                <br />
                {createdAccount.email && (
                  <>
                    <strong>Email:</strong> <code>{createdAccount.email}</code>
                    <br />
                  </>
                )}
              </div>
              <br />
              <Alert variant="warning" className="mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <strong>Lưu ý:</strong> Vui lòng ghi lại thông tin đăng nhập này và cung cấp cho bệnh nhân. 
                Khuyến nghị bệnh nhân đổi mật khẩu sau lần đăng nhập đầu tiên.
              </Alert>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => { setCreatedPatient(null); setCreatedAccount(null); }}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ReceptionistPatientCreate;

