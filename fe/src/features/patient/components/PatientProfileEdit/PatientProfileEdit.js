/**
 * Patient Profile Component
 * 
 * Patient profile management component for the Blood Laboratory Management System.
 * Allows patients to view and edit their profile information with a beautiful,
 * user-friendly interface designed from patient's perspective.
 * 
 * @author Blood Laboratory Management Team
 * @version 3.0.0
 * @since 2024
 */

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Modal, Spinner, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { patientService } from '../../../../services/patientService';
import { validateDateOfBirthAge, getMinDateOfBirth, getMaxDateOfBirth } from '../../../../shared/utils/patientInfoValidator';
import PatientHeader from '../../../../components/Layout/PatientHeader';
import GuestFooter from '../../../../components/Layout/GuestFooter';
import vietnamLocations from '../../../../data/vietnamLocations';

const MEDICAL_HISTORY_KEYS = [
  'medicalHistory',
  'MedicalHistory',
  'medical_history',
  'Medical_history',
  'medical_History',
  'Medical_History'
];

/**
 * Extracts medical history value from source object
 * 
 * This utility function searches for medical history data in a source object
 * by checking multiple possible field name variations (camelCase, PascalCase,
 * snake_case). It handles various API response formats and filters out invalid
 * values like 'null' or 'n/a' strings.
 * 
 * @param {Object} source - Source object that may contain medical history data
 * @param {string} [fallback=''] - Default value to return if no valid medical history found
 * @returns {string} Medical history value if found, fallback value otherwise
 * 
 * @example
 * extractMedicalHistoryValue({ medicalHistory: 'Diabetes' }) // Returns: 'Diabetes'
 * extractMedicalHistoryValue({ Medical_History: 'null' }) // Returns: ''
 * extractMedicalHistoryValue({}) // Returns: ''
 */
const extractMedicalHistoryValue = (source, fallback = '') => {
  if (!source) return fallback;
  for (const key of MEDICAL_HISTORY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key];
      if (value === undefined || value === null) continue;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && trimmed.toLowerCase() !== 'null' && trimmed.toLowerCase() !== 'n/a') {
          return value;
        }
      } else {
        return value;
      }
    }
  }
  return fallback;
};

/**
 * Patient Profile Component
 * 
 * Beautiful, user-friendly profile management with individual field editing.
 * Designed with patient comfort and ease of use in mind.
 * 
 * @returns {React.ReactNode} Patient profile component
 */
const PatientProfile = () => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [patientId, setPatientId] = useState(null); // Store actual patient ID
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [patientDataLoaded, setPatientDataLoaded] = useState(false); // Flag to prevent infinite loop
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const previousEmailRef = useRef(null); // Track previous email to detect changes
  
  const [editingField, setEditingField] = useState(null);
  const [savingField, setSavingField] = useState(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    province: '',
    district: '',
    ward: '',
    addressDetail: '',
    medicalHistory: '',
    cccd: '',
    bloodGroup: ''
  });

  // States for address dropdowns
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableWards, setAvailableWards] = useState([]);

  /**
   * Effect: Load patient data when user email is available
   * 
   * This effect loads patient profile data from the backend when the component
   * mounts or when the user email changes. It performs the following operations:
   * 1. Resets state when user logs out or changes
   * 2. Fetches patient data by email
   * 3. Parses address string into components (province, district, ward, detail)
   * 4. Populates form data with patient information
   * 5. Initializes address dropdowns based on parsed address
   * 6. Updates user context with patient data
   * 
   * The effect uses flags (patientDataLoaded, previousEmailRef) to prevent
   * infinite loops and ensure data is only loaded once per user session.
   * 
   * @effect
   * @dependencies {Object} user - User object from auth context
   * @dependencies {boolean} patientDataLoaded - Flag to prevent re-loading
   */
  useEffect(() => {
    // Reset flag when user changes (logout/login)
    if (!user || !user.email) {
      setLoadingPatient(false);
      setPatientDataLoaded(false); // Reset flag when user logs out
      setPatientId(null); // Reset patient ID
      previousEmailRef.current = null; // Reset previous email
      return;
    }

    // Reset flag if email changed (user logged in with different account)
    if (previousEmailRef.current !== null && previousEmailRef.current !== user.email) {
      setPatientDataLoaded(false);
      setPatientId(null);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        province: '',
        district: '',
        ward: '',
        addressDetail: '',
        medicalHistory: '',
        cccd: '',
        bloodGroup: ''
      });
    }

    // Prevent infinite loop: only load once or when user.email changes
    if (patientDataLoaded && previousEmailRef.current === user.email) {
      return;
    }

    const loadPatientData = async () => {
      try {
        setLoadingPatient(true);
        previousEmailRef.current = user.email; // Track current email
        setPatientDataLoaded(true); // Set flag immediately to prevent re-triggering
        
        
        // Get patient ID from email
        const patientResult = await patientService.getPatientByEmail(user.email);
        
        if (patientResult.success && patientResult.data) {
          const patient = patientResult.data;
          setPatientId(patient.id || patient.Id); // Store patient ID
          
          
          // Parse address from patient.address string
          // Format: "addressDetail, ward, district, province"
          let parsedProvince = user.province || '';
          let parsedDistrict = user.district || '';
          let parsedWard = user.ward || '';
          let parsedAddressDetail = user.addressDetail || '';
          
          const patientAddress = patient.address || patient.Address;
          if (patientAddress && patientAddress.trim() !== '' && patientAddress !== 'N/A') {
            // Split by comma and trim each part
            const addressParts = patientAddress.split(',').map(part => part.trim()).filter(part => part !== '');
            
            // Format: addressDetail, ward, district, province (4 parts)
            // Or: ward, district, province (3 parts)
            // Or: district, province (2 parts)
            // Or: province (1 part)
            if (addressParts.length >= 4) {
              // Full address: addressDetail, ward, district, province
              parsedAddressDetail = addressParts[0];
              parsedWard = addressParts[1];
              parsedDistrict = addressParts[2];
              parsedProvince = addressParts[3];
            } else if (addressParts.length === 3) {
              // No addressDetail: ward, district, province
              parsedWard = addressParts[0];
              parsedDistrict = addressParts[1];
              parsedProvince = addressParts[2];
            } else if (addressParts.length === 2) {
              // Only district, province
              parsedDistrict = addressParts[0];
              parsedProvince = addressParts[1];
            } else if (addressParts.length === 1) {
              // Only province
              parsedProvince = addressParts[0];
            }
          }
          
          const patientMedicalHistory = extractMedicalHistoryValue(patient, user.medicalHistory || '');

          // Populate form with patient data
          // Database uses lowercase fields: fullname, dob, gender, phone, email, address, blood_type, identity_number
          const newFormData = {
            fullName: patient.fullname || patient.Fullname || patient.fullName || user.fullName || user.username || '',
            email: patient.email || patient.Email || user.email || '',
            phone: patient.phone || patient.Phone || user.phone || '',
            dateOfBirth: (() => {
              const dob = patient.dob || patient.Dob || patient.dateOfBirth || patient.DateOfBirth;
              if (!dob) return '';
              if (typeof dob === 'string') {
                return dob.split('T')[0];
              }
              return new Date(dob).toISOString().split('T')[0];
            })(),
            gender: (() => {
              const gender = patient.gender || patient.Gender || user.gender || '';
              // Normalize gender: "Unknown" -> empty, "nam" -> "male", "nữ" -> "female"
              if (!gender || gender.toLowerCase() === 'unknown') return '';
              const genderLower = gender.toLowerCase();
              if (genderLower === 'nam' || genderLower === 'm') return 'male';
              if (genderLower === 'nữ' || genderLower === 'f') return 'female';
              return gender;
            })(),
            province: parsedProvince,
            district: parsedDistrict,
            ward: parsedWard,
            addressDetail: parsedAddressDetail,
            medicalHistory: patientMedicalHistory,
            cccd: patient.identity_number || patient.identityNumber || patient.IdentityNumber || user.cccd || '',
            bloodGroup: patient.blood_type || patient.bloodType || patient.BloodType || user.bloodGroup || ''
          };          
          setFormData(newFormData);

          // Initialize address dropdowns from parsed address
          if (parsedProvince) {
            const province = vietnamLocations.find(p => p.name === parsedProvince);
            if (province) {
              setSelectedProvince(province);
              setAvailableDistricts(province.districts || []);
              
              if (parsedDistrict) {
                const district = province.districts?.find(d => d.name === parsedDistrict);
                if (district) {
                  setSelectedDistrict(district);
                  setAvailableWards(district.wards || []);
                }
              }
            }
          }
          
          // Update user context with patient data including parsed address
          updateUser({
            ...user,
            fullName: patient.fullname || patient.Fullname || user.fullName,
            phone: patient.phone || patient.Phone || user.phone,
            dateOfBirth: patient.dob || patient.Dob || user.dateOfBirth,
            gender: patient.gender || patient.Gender || user.gender,
            identityNumber: patient.identityNumber || patient.IdentityNumber || user.identityNumber,
            bloodType: patient.bloodType || patient.BloodType || user.bloodType,
            address: patientAddress || user.address,
            province: parsedProvince || user.province,
            district: parsedDistrict || user.district,
            ward: parsedWard || user.ward,
            addressDetail: parsedAddressDetail || user.addressDetail
          });
        } else {
          // Check if it's a 404 (patient not found) or other error
          // Patient record will be created when user saves profile
          
          // Fallback to user data if patient not found
          // Patient ID will be set when user saves for the first time
          setFormData({
            fullName: user.fullName || user.username || '',
            email: user.email || '',
            phone: user.phone || '',
            dateOfBirth: user.dateOfBirth || '',
            gender: user.gender || '',
            province: user.province || '',
            district: user.district || '',
            ward: user.ward || '',
            addressDetail: user.addressDetail || '',
            medicalHistory: user.medicalHistory || '',
            cccd: user.cccd || '',
            bloodGroup: user.bloodGroup || ''
          });
          
          // Note: patientId will remain null until first save
          // We'll create patient record on first save
        }
      } catch (error) {
        showError('Lỗi tải thông tin bệnh nhân');
      } finally {
        setLoadingPatient(false);
      }
    };

    loadPatientData();
    // Only depend on user.email, not the entire user object or functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  /**
   * Handles input field changes in the form
   * 
   * This function updates the formData state when any input field changes.
   * It extracts the field name and value from the event target and updates
   * the corresponding field in the form data state.
   * 
   * @param {Event} e - Input change event from form field
   * @returns {void} Does not return a value. Updates formData state.
   * 
   * @example
   * // Called when user types in any input field
   * <input name="fullName" onChange={handleInputChange} />
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles province selection change
   * 
   * This function updates the province selection and resets dependent
   * address fields (district and ward). It also updates the available
   * districts list based on the selected province.
   * 
   * When a province is selected, it:
   * 1. Updates formData with the new province
   * 2. Resets district and ward fields
   * 3. Finds the province object from vietnamLocations
   * 4. Updates availableDistricts list
   * 5. Clears selectedDistrict and availableWards
   * 
   * @param {Event} e - Select change event from province dropdown
   * @returns {void} Does not return a value. Updates formData and address-related state.
   * 
   * @example
   * // Called when user selects a province
   * <select onChange={handleProvinceChange}>
   *   <option value="Hà Nội">Hà Nội</option>
   * </select>
   */
  const handleProvinceChange = (e) => {
    const provinceName = e.target.value;
    setFormData(prev => ({
      ...prev,
      province: provinceName,
      district: '',
      ward: ''
    }));

    const province = vietnamLocations.find(p => p.name === provinceName);
    setSelectedProvince(province);
    setAvailableDistricts(province?.districts || []);
    setSelectedDistrict(null);
    setAvailableWards([]);
  };

  /**
   * Handles district selection change
   * 
   * This function updates the district selection and resets the dependent
   * ward field. It also updates the available wards list based on the
   * selected district.
   * 
   * When a district is selected, it:
   * 1. Updates formData with the new district
   * 2. Resets ward field
   * 3. Finds the district object from availableDistricts
   * 4. Updates availableWards list
   * 
   * @param {Event} e - Select change event from district dropdown
   * @returns {void} Does not return a value. Updates formData and address-related state.
   * 
   * @example
   * // Called when user selects a district
   * <select onChange={handleDistrictChange}>
   *   <option value="Quận Ba Đình">Quận Ba Đình</option>
   * </select>
   */
  const handleDistrictChange = (e) => {
    const districtName = e.target.value;
    setFormData(prev => ({
      ...prev,
      district: districtName,
      ward: ''
    }));

    const district = availableDistricts.find(d => d.name === districtName);
    setSelectedDistrict(district);
    setAvailableWards(district?.wards || []);
  };

  /**
   * Handles ward selection change
   * 
   * This function updates the ward selection in formData. It's the final
   * step in the address selection hierarchy (Province → District → Ward).
   * 
   * @param {Event} e - Select change event from ward dropdown
   * @returns {void} Does not return a value. Updates formData.ward state.
   * 
   * @example
   * // Called when user selects a ward
   * <select onChange={handleWardChange}>
   *   <option value="Phường Cống Vị">Phường Cống Vị</option>
   * </select>
   */
  const handleWardChange = (e) => {
    const wardName = e.target.value;
    setFormData(prev => ({
      ...prev,
      ward: wardName
    }));
  };

  /**
   * Triggers file input click for avatar upload
   * 
   * This function programmatically clicks the hidden file input element
   * when the user clicks on the avatar area. This provides a better UX
   * by allowing users to click anywhere on the avatar to upload a new image.
   * 
   * @returns {void} Does not return a value. Triggers file input click.
   * 
   * @example
   * // Called when user clicks on avatar
   * <div onClick={handleAvatarClick}>
   *   <input ref={fileInputRef} type="file" style={{ display: 'none' }} />
   * </div>
   */
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handles avatar image file selection and upload
   * 
   * This function processes the selected image file for avatar upload:
   * 1. Validates file type (must be an image)
   * 2. Validates file size (max 5MB)
   * 3. Converts file to base64 string
   * 4. Updates avatar preview in local state
   * 
   * Note: Currently only updates local state. Server upload may need
   * separate endpoint implementation.
   * 
   * @param {Event} e - File input change event
   * @returns {Promise<void>} Does not return a value. Updates avatarPreview state.
   * 
   * @example
   * // Called when user selects an image file
   * <input type="file" onChange={handleAvatarChange} accept="image/*" />
   */
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setAvatarPreview(base64String);

        // Save to database using patient service
        // Note: Avatar update may need separate endpoint or be part of patient update
        // For now, skip avatar update via API (only update local state)
        // TODO: Implement avatar upload endpoint if needed
        setAvatarPreview(base64String);
        showSuccess('Cập nhật ảnh đại diện thành công (chưa lưu vào server)');
        
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showError('Lỗi tải ảnh đại diện');
      setUploadingAvatar(false);
    }
  };

  /**
   * Validates full name input
   * 
   * This function validates a full name string according to Vietnamese
   * naming conventions. It checks:
   * 1. Name is not empty
   * 2. Name does not contain numbers
   * 3. Name only contains letters, spaces, and Vietnamese characters
   * 
   * Shows error notifications if validation fails.
   * 
   * @param {string} fullName - Full name string to validate
   * @returns {boolean} True if valid, false otherwise
   * 
   * @example
   * if (validateFullName('Nguyễn Văn A')) {
   *   // Name is valid, proceed with save
   * }
   */
  const validateFullName = (fullName) => {
    if (!fullName || fullName.trim() === '') {
      showError('Tên không được để trống. Vui lòng nhập tên của bạn.');
      return false;
    }
    
    // Check for numbers
    if (/\d/.test(fullName)) {
      showError('Tên không được chứa số. Vui lòng chỉ nhập chữ cái và khoảng trắng.');
      return false;
    }
    
    // Check for special characters (allow only letters, spaces, and Vietnamese characters)
    if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/.test(fullName)) {
      showError('Tên không được chứa ký tự đặc biệt. Vui lòng chỉ nhập chữ cái và khoảng trắng.');
      return false;
    }
    
    return true;
  };

  /**
   * Validates phone number input
   * 
   * This function validates a phone number string. It checks:
   * 1. Phone is not empty
   * 2. Phone does not contain letters
   * 3. Phone does not contain spaces
   * 4. Phone only contains digits
   * 
   * Shows error notifications if validation fails.
   * 
   * @param {string} phone - Phone number string to validate
   * @returns {boolean} True if valid, false otherwise
   * 
   * @example
   * if (validatePhone('0912345678')) {
   *   // Phone is valid, proceed with save
   * }
   */
  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      showError('Số điện thoại không được để trống. Vui lòng nhập số điện thoại của bạn.');
      return false;
    }
    
    // Check for letters (uppercase or lowercase)
    if (/[a-zA-Z]/.test(phone)) {
      showError('Số điện thoại không được chứa chữ cái. Vui lòng chỉ nhập số.');
      return false;
    }
    
    // Check for spaces
    if (/\s/.test(phone)) {
      showError('Số điện thoại không được chứa khoảng trắng. Vui lòng nhập liền không có khoảng trắng.');
      return false;
    }
    
    // Check for special characters (allow only numbers)
    if (!/^\d+$/.test(phone)) {
      showError('Số điện thoại chỉ được chứa số. Vui lòng kiểm tra lại.');
      return false;
    }
    
    return true;
  };

  /**
   * Validates CCCD (Citizen ID) number input
   * 
   * This function validates a CCCD number according to Vietnamese
   * citizen ID format. It checks:
   * 1. CCCD is not empty
   * 2. CCCD does not contain letters
   * 3. CCCD does not contain special characters
   * 4. CCCD has exactly 12 digits
   * 
   * Shows error notifications if validation fails.
   * 
   * @param {string} cccd - CCCD number string to validate
   * @returns {boolean} True if valid, false otherwise
   * 
   * @example
   * if (validateCCCD('001234567890')) {
   *   // CCCD is valid, proceed with save
   * }
   */
  const validateCCCD = (cccd) => {
    if (!cccd || cccd.trim() === '') {
      showError('Số CCCD không được để trống. Vui lòng nhập số CCCD của bạn.');
      return false;
    }
    
    // Check for letters (uppercase or lowercase)
    if (/[a-zA-Z]/.test(cccd)) {
      showError('Số CCCD không được chứa chữ cái. Vui lòng chỉ nhập số.');
      return false;
    }
    
    // Check for special characters (allow only numbers)
    if (!/^\d+$/.test(cccd)) {
      showError('Số CCCD không được chứa ký tự đặc biệt. Vui lòng chỉ nhập số.');
      return false;
    }
    
    // Check length (must be exactly 12 digits)
    if (cccd.length !== 12) {
      showError('Số CCCD phải có đúng 12 chữ số. Vui lòng kiểm tra lại.');
      return false;
    }
    
    return true;
  };

  const handleSaveField = async (fieldName) => {
    setSavingField(fieldName);

    // Validate fields before saving
    if (fieldName === 'fullName') {
      const fullNameValue = formData.fullName || '';
      if (!validateFullName(fullNameValue)) {
        setSavingField(null);
        return;
      }
    } else if (fieldName === 'phone') {
      const phoneValue = formData.phone || '';
      if (!validatePhone(phoneValue)) {
        setSavingField(null);
        return;
      }
    } else if (fieldName === 'cccd' || fieldName === 'identityNumber') {
      const cccdValue = formData[fieldName === 'cccd' ? 'cccd' : 'identityNumber'] || '';
      if (!validateCCCD(cccdValue)) {
        setSavingField(null);
        return;
      }
    } else if (fieldName === 'dateOfBirth') {
      // Validate date of birth with age restriction (18-60 years old)
      const dateOfBirthValidation = validateDateOfBirthAge(formData.dateOfBirth);
      if (!dateOfBirthValidation.isValid) {
        showError(dateOfBirthValidation.message);
        setSavingField(null);
        return;
      }
    }

    try {
      let currentPatientId = patientId;
      
      // If patient ID doesn't exist, create patient record first
      if (!currentPatientId) {
        // Validate required fields before creating patient
        const fullNameValue = formData.fullName || user.fullName || user.username || '';
        const phoneValue = formData.phone || user.phone || '';
        const cccdValue = formData.cccd || user.identityNumber || '';
        
        // Validate fullName if being set
        if (fieldName === 'fullName' && !validateFullName(fullNameValue)) {
          setSavingField(null);
          return;
        }
        
        // Validate phone if being set
        if (fieldName === 'phone' && !validatePhone(phoneValue)) {
          setSavingField(null);
          return;
        }
        
        // Validate CCCD if being set
        if ((fieldName === 'cccd' || fieldName === 'identityNumber') && cccdValue && !validateCCCD(cccdValue)) {
          setSavingField(null);
          return;
        }
        
        // Validate date of birth if being set
        const dateOfBirthValue = formData.dateOfBirth || user.dateOfBirth || '';
        if (dateOfBirthValue) {
          const dateOfBirthValidation = validateDateOfBirthAge(dateOfBirthValue);
          if (!dateOfBirthValidation.isValid) {
            showError(dateOfBirthValidation.message);
            setSavingField(null);
            return;
          }
        }
        
        // Prepare patient data according to BE PatientDto format (no Id field for create)
        const newPatientData = {
          Fullname: fullNameValue,
          Email: user.email || '',
          Phone: phoneValue,
          Dob: formData.dateOfBirth 
            ? formData.dateOfBirth.split('T')[0]
            : (user.dateOfBirth ? (typeof user.dateOfBirth === 'string' ? user.dateOfBirth.split('T')[0] : new Date(user.dateOfBirth).toISOString().split('T')[0]) : null),
          Gender: formData.gender || user.gender || 'Unknown',
          Address: user.address || 'N/A',
          BloodType: formData.bloodGroup || user.bloodType || 'N/A',
          IdentityNumber: cccdValue,
          Medical_History: formData.medicalHistory || user.medicalHistory || ''
        };

        const createResult = await patientService.createPatient(newPatientData);
        
        if (createResult.success && createResult.data) {
          const newPatient = createResult.data;
          // BE returns Patient object with Id field (PAT-xxx format)
          currentPatientId = newPatient.id || newPatient.Id;
          if (!currentPatientId) {
            showError('Tạo hồ sơ bệnh nhân thành công nhưng không lấy được ID. Vui lòng thử lại.');
            setSavingField(null);
            return;
          }
          setPatientId(currentPatientId);
        } else {
          showError(createResult.message || 'Không thể tạo hồ sơ bệnh nhân. Vui lòng thử lại.');
          setSavingField(null);
          return;
        }
      }

      // Map field names to BE PatientUpdate DTO format
      const fieldMapping = {
        'phone': 'Phone',
        'dateOfBirth': 'Dob',
        'gender': 'Gender',
        'identityNumber': 'IdentityNumber',
        'cccd': 'IdentityNumber', // Map cccd to IdentityNumber
        'fullName': 'Fullname',
        'email': 'Email',
        'address': 'Address',
        'bloodType': 'BloodType',
        'bloodGroup': 'BloodType', // Map bloodGroup to BloodType
        'medicalHistory': 'Medical_History'
      };

      // Prepare patient update data according to BE DTO
      // BE requires: URL /gateway/patients/{id} and body { Id: id } must match
      // Load existing patient data first to preserve other fields
      let existingPatientData = null;
      try {
        // Try getPatientByEmail first (more reliable), fallback to getPatientById
        if (user?.email) {
          const patientResult = await patientService.getPatientByEmail(user.email);
          if (patientResult.success && patientResult.data) {
            existingPatientData = patientResult.data;
          }
        }
        
        // Fallback to getPatientById if getPatientByEmail failed
        if (!existingPatientData) {
          const patientResult = await patientService.getPatientById(currentPatientId);
          if (patientResult.success && patientResult.data) {
            existingPatientData = patientResult.data;
          }
        }
      } catch (err) {
      }

      const existingMedicalHistory = extractMedicalHistoryValue(existingPatientData, user.medicalHistory || '');

      // Build update data - only include fields that have values (don't send null)
      const patientUpdateData = {
        Id: currentPatientId, // Use actual patient ID (PAT-xxx), not account ID (ACC-xxx)
        Fullname: existingPatientData?.fullname || existingPatientData?.Fullname || formData.fullName || user.fullName || user.username || '',
        UpdatedAt: new Date().toISOString()
      };

      // Add fields only if they have values or are being updated
      // Phone
      if (fieldName === 'phone') {
        patientUpdateData.Phone = formData[fieldName] || null;
      } else {
        const phone = existingPatientData?.phone || existingPatientData?.Phone || user.phone;
        if (phone) {
          patientUpdateData.Phone = phone;
        }
      }

      // Date of Birth
      if (fieldName === 'dateOfBirth' && formData[fieldName]) {
        patientUpdateData.Dob = formData[fieldName].split('T')[0];
      } else {
        const dob = existingPatientData?.dob || existingPatientData?.Dob || user.dateOfBirth;
        if (dob) {
          patientUpdateData.Dob = typeof dob === 'string' ? dob.split('T')[0] : new Date(dob).toISOString().split('T')[0];
        }
      }

      // Gender - normalize "Unknown" to null, preserve other values
      if (fieldName === 'gender') {
        const genderValue = formData[fieldName];
        // Don't send "Unknown" or empty string, send null instead
        if (!genderValue || genderValue.toLowerCase() === 'unknown') {
          patientUpdateData.Gender = null;
        } else {
          // Normalize: "male"/"nam" -> "male", "female"/"nữ" -> "female"
          const genderLower = genderValue.toLowerCase();
          if (genderLower === 'nam' || genderLower === 'm') {
            patientUpdateData.Gender = 'male';
          } else if (genderLower === 'nữ' || genderLower === 'f') {
            patientUpdateData.Gender = 'female';
          } else {
            patientUpdateData.Gender = genderValue;
          }
        }
      } else {
        const existingGender = existingPatientData?.gender || existingPatientData?.Gender || user.gender;
        if (existingGender && existingGender.toLowerCase() !== 'unknown') {
          // Normalize existing gender
          const genderLower = existingGender.toLowerCase();
          if (genderLower === 'nam' || genderLower === 'm') {
            patientUpdateData.Gender = 'male';
          } else if (genderLower === 'nữ' || genderLower === 'f') {
            patientUpdateData.Gender = 'female';
          } else {
            patientUpdateData.Gender = existingGender;
          }
        }
      }

      // Email
      if (existingPatientData?.email || existingPatientData?.Email || user.email) {
        patientUpdateData.Email = existingPatientData?.email || existingPatientData?.Email || user.email;
      }

      // Address
      if (existingPatientData?.address || existingPatientData?.Address || user.address) {
        patientUpdateData.Address = existingPatientData?.address || existingPatientData?.Address || user.address;
      }

      // BloodType - only update if being changed or has existing value
      // Database uses blood_type (with underscore)
      if (fieldName === 'bloodGroup') {
        patientUpdateData.BloodType = formData[fieldName] || null;
      } else {
        const bloodType = existingPatientData?.blood_type || existingPatientData?.bloodType || existingPatientData?.BloodType || user.bloodType || null;
        if (bloodType) {
          patientUpdateData.BloodType = bloodType;
        }
      }

      // IdentityNumber - only update if being changed or has existing value
      // Database uses identity_number (with underscore)
      if (fieldName === 'cccd' || fieldName === 'identityNumber') {
        const cccdValue = formData[fieldName === 'cccd' ? 'cccd' : 'identityNumber'];
        patientUpdateData.IdentityNumber = cccdValue || null;
      } else {
        const identityNumber = existingPatientData?.identity_number || existingPatientData?.identityNumber || existingPatientData?.IdentityNumber || user.identityNumber || null;
        if (identityNumber) {
          patientUpdateData.IdentityNumber = identityNumber;
        }
      }

      // Medical_History
      if (fieldName === 'medicalHistory') {
        const historyValue = formData[fieldName];
        patientUpdateData.Medical_History = historyValue && historyValue.trim() !== '' ? historyValue : null;
      } else if (existingMedicalHistory) {
        patientUpdateData.Medical_History = existingMedicalHistory;
      }

      // Update the specific field with proper formatting
      if (fieldMapping[fieldName]) {
        // Get field value - handle special cases for cccd and bloodGroup
        let fieldValue;
        if (fieldName === 'cccd') {
          fieldValue = formData['cccd'];
        } else if (fieldName === 'bloodGroup') {
          fieldValue = formData['bloodGroup'];
        } else {
          fieldValue = formData[fieldName];
        }
        
        
        // Special handling for dateOfBirth - format as YYYY-MM-DD
        if (fieldName === 'dateOfBirth' && fieldValue) {
          patientUpdateData[fieldMapping[fieldName]] = fieldValue.split('T')[0];
        } else {
          patientUpdateData[fieldMapping[fieldName]] = fieldValue;
        }
        
      } else {
      }
      

      const result = await patientService.updatePatient(currentPatientId, patientUpdateData);
      
      if (result.success) {
        // Reload patient data from database to ensure consistency
        try {
          // Use getPatientByEmail (more reliable) instead of getPatientById
          let reloadResult = null;
          if (user?.email) {
            reloadResult = await patientService.getPatientByEmail(user.email);
          }
          
          // Fallback to getPatientById if getPatientByEmail failed
          if (!reloadResult || !reloadResult.success) {
            reloadResult = await patientService.getPatientById(currentPatientId);
          }
          
          if (reloadResult && reloadResult.success && reloadResult.data) {
            const updatedPatient = reloadResult.data;
            
            // Update formData with fresh data from database
            // Database uses lowercase fields: fullname, dob, gender, phone, email, address, blood_type, identity_number
            setFormData(prev => {
              const updatedMedicalHistory = extractMedicalHistoryValue(updatedPatient, prev.medicalHistory);
              
              // Parse address from updated patient
              let parsedProvince = prev.province || '';
              let parsedDistrict = prev.district || '';
              let parsedWard = prev.ward || '';
              let parsedAddressDetail = prev.addressDetail || '';
              
              const patientAddress = updatedPatient.address || updatedPatient.Address;
              if (patientAddress && patientAddress.trim() !== '' && patientAddress !== 'N/A') {
                const addressParts = patientAddress.split(',').map(part => part.trim()).filter(part => part !== '');
                if (addressParts.length >= 4) {
                  parsedAddressDetail = addressParts[0];
                  parsedWard = addressParts[1];
                  parsedDistrict = addressParts[2];
                  parsedProvince = addressParts[3];
                } else if (addressParts.length === 3) {
                  parsedWard = addressParts[0];
                  parsedDistrict = addressParts[1];
                  parsedProvince = addressParts[2];
                } else if (addressParts.length === 2) {
                  parsedDistrict = addressParts[0];
                  parsedProvince = addressParts[1];
                } else if (addressParts.length === 1) {
                  parsedProvince = addressParts[0];
                }
              }
              
              return {
                ...prev,
                fullName: updatedPatient.fullname || updatedPatient.Fullname || updatedPatient.fullName || prev.fullName,
                phone: updatedPatient.phone || updatedPatient.Phone || prev.phone,
                dateOfBirth: (() => {
                  const dob = updatedPatient.dob || updatedPatient.Dob || updatedPatient.dateOfBirth || updatedPatient.DateOfBirth;
                  if (!dob) return prev.dateOfBirth;
                  if (typeof dob === 'string') return dob.split('T')[0];
                  return new Date(dob).toISOString().split('T')[0];
                })(),
                gender: (() => {
                  const gender = updatedPatient.gender || updatedPatient.Gender || prev.gender;
                  if (!gender || gender.toLowerCase() === 'unknown') return '';
                  const genderLower = gender.toLowerCase();
                  if (genderLower === 'nam' || genderLower === 'm') return 'male';
                  if (genderLower === 'nữ' || genderLower === 'f') return 'female';
                  return gender;
                })(),
                medicalHistory: updatedMedicalHistory || prev.medicalHistory,
                cccd: updatedPatient.identity_number || updatedPatient.identityNumber || updatedPatient.IdentityNumber || prev.cccd,
                bloodGroup: updatedPatient.blood_type || updatedPatient.bloodType || updatedPatient.BloodType || prev.bloodGroup,
                province: parsedProvince || prev.province,
                district: parsedDistrict || prev.district,
                ward: parsedWard || prev.ward,
                addressDetail: parsedAddressDetail || prev.addressDetail
              };
            });
            
            const normalizedMedicalHistory = extractMedicalHistoryValue(updatedPatient, user.medicalHistory);

            // Update user context with fresh data from database
            updateUser({
              ...user,
              fullName: updatedPatient.fullname || updatedPatient.Fullname || updatedPatient.fullName || user.fullName,
              phone: updatedPatient.phone || updatedPatient.Phone || user.phone,
              dateOfBirth: updatedPatient.dob || updatedPatient.Dob || user.dateOfBirth,
              gender: (() => {
                const gender = updatedPatient.gender || updatedPatient.Gender || user.gender;
                if (!gender || gender.toLowerCase() === 'unknown') return '';
                const genderLower = gender.toLowerCase();
                if (genderLower === 'nam' || genderLower === 'm') return 'male';
                if (genderLower === 'nữ' || genderLower === 'f') return 'female';
                return gender;
              })(),
              identityNumber: updatedPatient.identity_number || updatedPatient.identityNumber || updatedPatient.IdentityNumber || user.identityNumber,
              bloodType: updatedPatient.blood_type || updatedPatient.bloodType || updatedPatient.BloodType || user.bloodType,
              medicalHistory: normalizedMedicalHistory || user.medicalHistory,
              cccd: updatedPatient.identity_number || updatedPatient.identityNumber || updatedPatient.IdentityNumber || user.cccd,
              bloodGroup: updatedPatient.blood_type || updatedPatient.bloodType || updatedPatient.BloodType || user.bloodGroup
            });
          }
        } catch (reloadError) {
          // Still show success even if reload fails
        }
        
        showSuccess(`Cập nhật ${getFieldLabel(fieldName)} thành công`);
        setEditingField(null);
      } else {
        showError(result.message || `Lỗi cập nhật ${getFieldLabel(fieldName)}`);
      }
    } catch (error) {
      showError(`Lỗi cập nhật ${getFieldLabel(fieldName)}: ${error.message || 'Không thể kết nối đến server'}`);
    } finally {
      setSavingField(null);
    }
  };

  // Save address fields (province, district, ward, addressDetail together)
  /**
   * Saves address information to patient profile
   * 
   * This function handles saving the complete address (province, district, ward,
   * and detail address) to the patient profile. It performs the following operations:
   * 1. Combines address components into a single address string
   * 2. Creates patient record if it doesn't exist
   * 3. Loads existing patient data to preserve other fields
   * 4. Updates patient record via API with combined address
   * 5. Reloads patient data to ensure consistency
   * 6. Updates local state and user context
   * 
   * The address is formatted as: "addressDetail, ward, district, province"
   * 
   * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
   * 
   * @example
   * // Save address when user clicks "Lưu" button
   * await handleSaveAddress();
   */
  const handleSaveAddress = async () => {
    setSavingField('address');

    try {
      let currentPatientId = patientId;
      
      // If patient ID doesn't exist, create patient record first
      if (!currentPatientId) {
        
        const addressParts = [
          formData.addressDetail,
          formData.ward,
          formData.district,
          formData.province
        ].filter(part => part && part.trim() !== '');
        const fullAddress = addressParts.join(', ') || 'N/A';

        // Prepare patient data according to BE PatientDto format (no Id field for create)
        const newPatientData = {
          Fullname: formData.fullName || user.fullName || user.username || '',
          Email: user.email || '',
          Phone: user.phone || '',
          Dob: formData.dateOfBirth 
            ? formData.dateOfBirth.split('T')[0]
            : (user.dateOfBirth ? (typeof user.dateOfBirth === 'string' ? user.dateOfBirth.split('T')[0] : new Date(user.dateOfBirth).toISOString().split('T')[0]) : null),
          Gender: user.gender || 'Unknown',
          Address: fullAddress,
          BloodType: user.bloodType || 'N/A',
          IdentityNumber: user.identityNumber || '',
          Medical_History: user.medicalHistory || ''
        };

        const createResult = await patientService.createPatient(newPatientData);
        
        if (createResult.success && createResult.data) {
          const newPatient = createResult.data;
          // BE returns Patient object with Id field (PAT-xxx format)
          currentPatientId = newPatient.id || newPatient.Id;
          if (!currentPatientId) {
            showError('Tạo hồ sơ bệnh nhân thành công nhưng không lấy được ID. Vui lòng thử lại.');
            setSavingField(null);
            return;
          }
          setPatientId(currentPatientId);
        } else {
          showError(createResult.message || 'Không thể tạo hồ sơ bệnh nhân. Vui lòng thử lại.');
          setSavingField(null);
          return;
        }
      }

      // Build full address string from components
      const addressParts = [
        formData.addressDetail,
        formData.ward,
        formData.district,
        formData.province
      ].filter(part => part && part.trim() !== '');
      const fullAddress = addressParts.join(', ');

      // Load existing patient data first to preserve other fields
      let existingPatientData = null;
      try {
        // Try getPatientByEmail first (more reliable), fallback to getPatientById
        if (user?.email) {
          const patientResult = await patientService.getPatientByEmail(user.email);
          if (patientResult.success && patientResult.data) {
            existingPatientData = patientResult.data;
          }
        }
        
        // Fallback to getPatientById if getPatientByEmail failed
        if (!existingPatientData) {
          const patientResult = await patientService.getPatientById(currentPatientId);
          if (patientResult.success && patientResult.data) {
            existingPatientData = patientResult.data;
          }
        }
      } catch (err) {
      }

      // Build update data - only include fields that have values (don't send null)
      const patientUpdateData = {
        Id: currentPatientId, // Use actual patient ID, not account ID
        Fullname: existingPatientData?.fullname || existingPatientData?.Fullname || formData.fullName || user.fullName || user.username || '',
        Address: fullAddress, // Combined address
        UpdatedAt: new Date().toISOString()
      };

      // Add fields only if they have values
      if (existingPatientData?.phone || existingPatientData?.Phone || user.phone) {
        patientUpdateData.Phone = existingPatientData?.phone || existingPatientData?.Phone || user.phone;
      }

      if (existingPatientData?.dob || existingPatientData?.Dob || formData.dateOfBirth || user.dateOfBirth) {
        const dob = existingPatientData?.dob || existingPatientData?.Dob || formData.dateOfBirth || user.dateOfBirth;
        patientUpdateData.Dob = typeof dob === 'string' ? dob.split('T')[0] : new Date(dob).toISOString().split('T')[0];
      }

      if (existingPatientData?.gender || existingPatientData?.Gender || user.gender) {
        patientUpdateData.Gender = existingPatientData?.gender || existingPatientData?.Gender || user.gender;
      }

      if (existingPatientData?.email || existingPatientData?.Email || user.email) {
        patientUpdateData.Email = existingPatientData?.email || existingPatientData?.Email || user.email;
      }

      // BloodType - only include if has value
      // Database uses blood_type (with underscore)
      const bloodType = existingPatientData?.blood_type || existingPatientData?.bloodType || existingPatientData?.BloodType || user.bloodType;
      if (bloodType) {
        patientUpdateData.BloodType = bloodType;
      }

      // IdentityNumber - only include if has value
      // Database uses identity_number (with underscore)
      const identityNumber = existingPatientData?.identity_number || existingPatientData?.identityNumber || existingPatientData?.IdentityNumber || user.identityNumber;
      if (identityNumber) {
        patientUpdateData.IdentityNumber = identityNumber;
      }

      // Medical_History
      const existingMedicalHistory = extractMedicalHistoryValue(
        existingPatientData,
        formData.medicalHistory || user.medicalHistory || ''
      );
      if (existingMedicalHistory) {
        patientUpdateData.Medical_History = existingMedicalHistory;
      }

      const result = await patientService.updatePatient(currentPatientId, patientUpdateData);
      
      if (result.success) {
        // Reload patient data from database to ensure consistency
        try {
          // Use getPatientByEmail (more reliable) instead of getPatientById
          let reloadResult = null;
          if (user?.email) {
            reloadResult = await patientService.getPatientByEmail(user.email);
          }
          
          // Fallback to getPatientById if getPatientByEmail failed
          if (!reloadResult || !reloadResult.success) {
            reloadResult = await patientService.getPatientById(currentPatientId);
          }
          
          if (reloadResult && reloadResult.success && reloadResult.data) {
            const updatedPatient = reloadResult.data;
            
            // Update formData with fresh data from database
            // Database uses lowercase fields: fullname, dob, gender, phone, email, address, blood_type, identity_number
            setFormData(prev => {
              const updatedMedicalHistory = extractMedicalHistoryValue(updatedPatient, prev.medicalHistory);
              
              // Parse address from updated patient
              let parsedProvince = prev.province || '';
              let parsedDistrict = prev.district || '';
              let parsedWard = prev.ward || '';
              let parsedAddressDetail = prev.addressDetail || '';
              
              const patientAddress = updatedPatient.address || updatedPatient.Address;
              if (patientAddress && patientAddress.trim() !== '' && patientAddress !== 'N/A') {
                const addressParts = patientAddress.split(',').map(part => part.trim()).filter(part => part !== '');
                if (addressParts.length >= 4) {
                  parsedAddressDetail = addressParts[0];
                  parsedWard = addressParts[1];
                  parsedDistrict = addressParts[2];
                  parsedProvince = addressParts[3];
                } else if (addressParts.length === 3) {
                  parsedWard = addressParts[0];
                  parsedDistrict = addressParts[1];
                  parsedProvince = addressParts[2];
                } else if (addressParts.length === 2) {
                  parsedDistrict = addressParts[0];
                  parsedProvince = addressParts[1];
                } else if (addressParts.length === 1) {
                  parsedProvince = addressParts[0];
                }
              }
              
              return {
                ...prev,
                fullName: updatedPatient.fullname || updatedPatient.Fullname || updatedPatient.fullName || prev.fullName,
                phone: updatedPatient.phone || updatedPatient.Phone || prev.phone,
                dateOfBirth: (() => {
                  const dob = updatedPatient.dob || updatedPatient.Dob || updatedPatient.dateOfBirth || updatedPatient.DateOfBirth;
                  if (!dob) return prev.dateOfBirth;
                  if (typeof dob === 'string') return dob.split('T')[0];
                  return new Date(dob).toISOString().split('T')[0];
                })(),
                gender: (() => {
                  const gender = updatedPatient.gender || updatedPatient.Gender || prev.gender;
                  if (!gender || gender.toLowerCase() === 'unknown') return '';
                  const genderLower = gender.toLowerCase();
                  if (genderLower === 'nam' || genderLower === 'm') return 'male';
                  if (genderLower === 'nữ' || genderLower === 'f') return 'female';
                  return gender;
                })(),
                medicalHistory: updatedMedicalHistory || prev.medicalHistory,
                cccd: updatedPatient.identity_number || updatedPatient.identityNumber || updatedPatient.IdentityNumber || prev.cccd,
                bloodGroup: updatedPatient.blood_type || updatedPatient.bloodType || updatedPatient.BloodType || prev.bloodGroup,
                province: parsedProvince || prev.province,
                district: parsedDistrict || prev.district,
                ward: parsedWard || prev.ward,
                addressDetail: parsedAddressDetail || prev.addressDetail
              };
            });
            
            const normalizedMedicalHistory = extractMedicalHistoryValue(updatedPatient, user.medicalHistory);

            // Update user context with fresh data from database
            updateUser({
              ...user,
              fullName: updatedPatient.fullname || updatedPatient.Fullname || updatedPatient.fullName || user.fullName,
              phone: updatedPatient.phone || updatedPatient.Phone || user.phone,
              dateOfBirth: updatedPatient.dob || updatedPatient.Dob || user.dateOfBirth,
              gender: (() => {
                const gender = updatedPatient.gender || updatedPatient.Gender || user.gender;
                if (!gender || gender.toLowerCase() === 'unknown') return '';
                const genderLower = gender.toLowerCase();
                if (genderLower === 'nam' || genderLower === 'm') return 'male';
                if (genderLower === 'nữ' || genderLower === 'f') return 'female';
                return gender;
              })(),
              identityNumber: updatedPatient.identity_number || updatedPatient.identityNumber || updatedPatient.IdentityNumber || user.identityNumber,
              bloodType: updatedPatient.blood_type || updatedPatient.bloodType || updatedPatient.BloodType || user.bloodType,
              medicalHistory: normalizedMedicalHistory || user.medicalHistory,
              cccd: updatedPatient.identity_number || updatedPatient.identityNumber || updatedPatient.IdentityNumber || user.cccd,
              bloodGroup: updatedPatient.blood_type || updatedPatient.bloodType || updatedPatient.BloodType || user.bloodGroup,
              address: updatedPatient.address || updatedPatient.Address || fullAddress
            });
          }
        } catch (reloadError) {
          // Still update local state even if reload fails
          updateUser({
            ...user,
            address: fullAddress,
            province: formData.province,
            district: formData.district,
            ward: formData.ward,
            addressDetail: formData.addressDetail
          });
        }
        
        showSuccess('Cập nhật địa chỉ thành công');
        setEditingField(null);
      } else {
        showError(result.message || 'Lỗi cập nhật địa chỉ');
      }
    } catch (error) {
      showError('Lỗi cập nhật địa chỉ');
    } finally {
      setSavingField(null);
    }
  };

  /**
   * Gets Vietnamese label for a field name
   * 
   * This utility function maps field names (in English/camelCase) to their
   * Vietnamese display labels. Used for consistent labeling throughout the UI.
   * 
   * @param {string} fieldName - Field name in camelCase (e.g., 'fullName', 'phone')
   * @returns {string} Vietnamese label for the field (e.g., 'Họ và tên', 'Số điện thoại')
   * 
   * @example
   * getFieldLabel('fullName') // Returns: 'Họ và tên'
   * getFieldLabel('phone') // Returns: 'Số điện thoại'
   */
  const getFieldLabel = (fieldName) => {
    const labels = {
      fullName: 'Họ và tên',
      email: 'Email',
      phone: 'Số điện thoại',
      dateOfBirth: 'Ngày sinh',
      gender: 'Giới tính',
      cccd: 'Số CCCD',
      bloodGroup: 'Nhóm máu',
      medicalHistory: 'Tiền sử bệnh',
    };
    return labels[fieldName] || fieldName;
  };

  // Show loading state while fetching patient data
  if (loadingPatient) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p>Đang tải thông tin bệnh nhân...</p>
        </div>
      </div>
    );
  }

  /**
   * Formats date string to Vietnamese locale format
   * 
   * Converts a date string (ISO format or any valid date string) to
   * Vietnamese locale format (dd/mm/yyyy). Handles null/undefined values
   * gracefully by returning empty string.
   * 
   * @param {string|null|undefined} dateString - Date string to format
   * @returns {string} Formatted date string in Vietnamese locale (e.g., '04/12/2024')
   *                  or empty string if input is invalid
   * 
   * @example
   * formatDate('2024-12-04') // Returns: '04/12/2024'
   * formatDate(null) // Returns: ''
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  /**
   * Gets Vietnamese text for gender value
   * 
   * This utility function converts gender values (English or Vietnamese)
   * to standardized Vietnamese display text.
   * 
   * **Gender mappings:**
   * - 'male', 'm', 'nam' → "Nam"
   * - 'female', 'f', 'nữ' → "Nữ"
   * - Default → "Khác"
   * 
   * @param {string} gender - Gender value (can be English or Vietnamese)
   * @returns {string} Vietnamese gender text ("Nam", "Nữ", or "Khác")
   * 
   * @example
   * getGenderText('male') // Returns: 'Nam'
   * getGenderText('nữ') // Returns: 'Nữ'
   */
  const getGenderText = (gender) => {
    const genderMap = {
      'male': 'Nam',
      'female': 'Nữ',
      'other': 'Khác'
    };
    return genderMap[gender] || gender;
  };

  /**
   * Gets Font Awesome icon class for a field name
   * 
   * This utility function maps field names to their corresponding
   * Font Awesome icon classes for consistent iconography throughout the UI.
   * 
   * @param {string} fieldName - Field name in camelCase (e.g., 'fullName', 'phone')
   * @returns {string} Font Awesome icon class (e.g., 'fa-user', 'fa-phone')
   * 
   * @example
   * getFieldIcon('fullName') // Returns: 'fa-user'
   * getFieldIcon('phone') // Returns: 'fa-phone'
   */
  const getFieldIcon = (fieldName) => {
    const icons = {
      fullName: 'fas fa-user',
      email: 'fas fa-envelope',
      phone: 'fas fa-phone',
      dateOfBirth: 'fas fa-calendar-alt',
      gender: 'fas fa-venus-mars',
      cccd: 'fas fa-id-card',
      bloodGroup: 'fas fa-tint',
      medicalHistory: 'fas fa-notes-medical'
    };
    return icons[fieldName] || 'fas fa-edit';
  };

  /**
   * Renders a field in timeline format with edit capability
   * 
   * This function renders a form field in a timeline-style layout with:
   * - Icon badge showing completion status (filled if has value, gray if empty)
   * - Field label and completion indicator
   * - Edit button (disabled for email field)
   * - Edit mode with input field and save/cancel buttons
   * - Display mode showing current value
   * 
   * The function handles different input types:
   * - 'text': Standard text input
   * - 'date': Date picker input
   * - 'select': Dropdown select with options
   * - 'textarea': Multi-line text input
   * 
   * @param {string} fieldName - Field name in camelCase (e.g., 'fullName', 'phone')
   * @param {string} label - Display label for the field (e.g., 'Họ và tên')
   * @param {string} icon - Font Awesome icon class for the field
   * @param {string} [type='text'] - Input type ('text', 'date', 'select', 'textarea')
   * @param {Array<Object>} [options=null] - Options array for select type [{value, label}]
   * @returns {React.ReactNode} JSX element containing the field UI
   * 
   * @example
   * // Render a text field
   * {renderTimelineField('fullName', 'Họ và tên', 'fas fa-user', 'text')}
   * 
   * // Render a select field
   * {renderTimelineField('gender', 'Giới tính', 'fas fa-venus-mars', 'select', [
   *   { value: 'male', label: 'Nam' },
   *   { value: 'female', label: 'Nữ' }
   * ])}
   */
  const renderTimelineField = (fieldName, label, icon, type = 'text', options = null) => {
    const isEditing = editingField === fieldName;
    const isSaving = savingField === fieldName;
    // Check if field has value - handle null, undefined, empty string, and numbers
    const fieldValue = formData[fieldName];
    const hasValue = fieldValue !== null && 
                     fieldValue !== undefined && 
                     fieldValue !== '' && 
                     (typeof fieldValue === 'string' ? fieldValue.trim() !== '' : true);
    const isEmailField = fieldName === 'email';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-3"
      >
        <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="d-flex align-items-center">
                  <div 
                    style={{
                width: '35px',
                height: '35px',
                      borderRadius: '50%',
                background: hasValue ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                flexShrink: 0
                    }}
                  >
              <i className={`${icon} text-white`} style={{ fontSize: '0.9rem' }}></i>
                  </div>
                  <div>
              <strong className="text-white d-block" style={{ fontSize: '1rem', lineHeight: '1.3' }}>{label}</strong>
                    <div className="d-flex align-items-center mt-1">
                      {hasValue ? (
                        <i className="fas fa-check-circle text-success" style={{ fontSize: '0.9rem' }}></i>
                      ) : (
                        <Badge bg="danger" style={{ fontSize: '0.6rem', padding: '0.25rem 0.5rem' }}>
                          <i className="fas fa-times me-1"></i>
                          Chưa có
                      </Badge>
                    )}
                  </div>
                </div>
                </div>
          {!isEmailField && (
            <Button
              size="sm"
              onClick={() => setEditingField(fieldName)}
              style={{
                borderRadius: '8px',
                padding: '6px 12px',
                fontWeight: '600',
                border: '2px solid white',
                background: 'white',
                color: '#1e3c72',
                fontSize: '0.8rem',
                minWidth: '60px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.color = '#1e3c72';
                e.currentTarget.style.borderColor = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#1e3c72';
                e.currentTarget.style.borderColor = 'white';
              }}
            >
              <i className="fas fa-edit me-1"></i>
              {hasValue ? 'Sửa' : 'Thêm'}
            </Button>
          )}
          {isEmailField && (
            <Badge bg="secondary" style={{ fontSize: '0.6rem', padding: '0.4rem' }}>
              <i className="fas fa-lock me-1"></i>
              
            </Badge>
          )}
        </div>

        {isEditing && !isEmailField && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-3"
          >
                  <div className="position-relative">
                    {type === 'select' ? (
                      <Form.Select
                        name={fieldName}
                        value={formData[fieldName]}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #dee2e6',
                          fontSize: '1rem',
                          padding: '12px 16px',
                          background: 'white'
                        }}
                      >
                        <option value="">-- Chọn {label} --</option>
                        {options?.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    ) : type === 'textarea' ? (
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name={fieldName}
                        value={formData[fieldName]}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        placeholder={`Nhập ${label.toLowerCase()}...`}
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #dee2e6',
                          fontSize: '1rem',
                          padding: '12px 16px',
                          resize: 'vertical',
                          background: 'white'
                        }}
                      />
                    ) : (
                      <Form.Control
                        type={type}
                        name={fieldName}
                        value={formData[fieldName]}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        placeholder={`Nhập ${label.toLowerCase()}...`}
                        min={type === 'date' && fieldName === 'dateOfBirth' ? getMinDateOfBirth() : undefined}
                        max={type === 'date' && fieldName === 'dateOfBirth' ? getMaxDateOfBirth() : undefined}
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #dee2e6',
                          fontSize: '1rem',
                          padding: '12px 16px',
                          background: 'white'
                        }}
                      />
                    )}
                    {isSaving && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '50%',
                    right: '10px',
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <Spinner animation="border" size="sm" variant="primary" />
                      </div>
                    )}
                  </div>
            <div className="d-flex gap-2 mt-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleSaveField(fieldName)}
                      disabled={isSaving}
                      style={{
                        borderRadius: '8px',
                  padding: '6px 12px',
                        fontWeight: '600',
                        border: '2px solid white',
                        background: 'white',
                        color: '#1e3c72',
                  fontSize: '0.8rem'
                      }}
                    >
                      {isSaving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-1" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check me-1"></i>
                          Lưu
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      style={{
                        borderRadius: '8px',
                  padding: '6px 12px',
                  fontWeight: '600',
                        border: '2px solid white',
                        background: 'white',
                        color: '#1e3c72',
                  fontSize: '0.8rem'
                      }}
                    >
                      <i className="fas fa-times me-1"></i>
                      Hủy
                    </Button>
                  </div>
      </motion.div>
        )}

        {!isEditing && (
              <div 
                style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'white',
              border: '1px solid #dee2e6',
              fontSize: '1rem',
              marginTop: '8px',
              minHeight: '48px',
                  display: 'flex',
              alignItems: 'center'
            }}
          >
            <span className={hasValue ? 'text-dark' : 'text-muted'}>
              {type === 'date' 
                ? formatDate(formData[fieldName]) || <em>Chưa cập nhật</em>
                : type === 'select' && fieldName === 'gender'
                ? getGenderText(formData[fieldName]) || <em>Chưa cập nhật</em>
                : type === 'select' && options
                ? (options.find(opt => opt.value === formData[fieldName])?.label || formData[fieldName] || <em>Chưa cập nhật</em>)
                : (formData[fieldName] || <em>Chưa cập nhật</em>)
              }
            </span>
                  </div>
                )}
                </motion.div>
    );
  };

  /**
   * Renders address fields in timeline format with hierarchical selection
   * 
   * This function renders the complete address editing interface with:
   * - Province dropdown (Tỉnh/Thành phố)
   * - District dropdown (Quận/Huyện) - enabled after province selection
   * - Ward dropdown (Phường/Xã) - enabled after district selection
   * - Address detail input (Địa chỉ đầy đủ)
   * - Save and cancel buttons
   * - Display mode showing formatted address
   * 
   * The address components are hierarchical: selecting a province enables
   * districts, selecting a district enables wards. The full address is
   * combined as: "addressDetail, ward, district, province"
   * 
   * @returns {React.ReactNode} JSX element containing the address editing UI
   * 
   * @example
   * // Render address section in profile
   * {renderAddressTimeline()}
   */
  const renderAddressTimeline = () => {
    return (
                      <div>
                        {editingField === 'address' ? (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
            <Row className="g-3">
              <Col xs={12} sm={6}>
                <Form.Group>
                  <Form.Label className="fw-bold text-white mb-2" style={{ fontSize: '1rem' }}>
                                <i className="fas fa-map-marker-alt me-2"></i>
                                Tỉnh/Thành phố
                              </Form.Label>
                              <Form.Select
                                value={formData.province}
                                onChange={handleProvinceChange}
                                disabled={savingField === 'address'}
                                style={{
                      borderRadius: '10px',
                                  
                                  fontSize: '1rem',
                                  padding: '12px 16px',
                                  background: 'white'
                                }}
                              >
                                <option value="">-- Chọn Tỉnh/Thành phố --</option>
                                {vietnamLocations.map(province => (
                                  <option key={province.name} value={province.name}>
                                    {province.name}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Group>
                  <Form.Label className="fw-bold text-white mb-2" style={{ fontSize: '1rem' }}>
                                <i className="fas fa-building me-2"></i>
                                Quận/Huyện
                              </Form.Label>
                              <Form.Select
                                value={formData.district}
                                onChange={handleDistrictChange}
                                disabled={!selectedProvince || savingField === 'address'}
                                style={{
                      borderRadius: '10px',
                                  
                                  fontSize: '1rem',
                                  padding: '12px 16px',
                                  background: 'white'
                                }}
                              >
                                <option value="">-- Chọn Quận/Huyện --</option>
                                {availableDistricts.map(district => (
                                  <option key={district.name} value={district.name}>
                                    {district.name}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Group>
                  <Form.Label className="fw-bold text-white mb-2" style={{ fontSize: '1rem' }}>
                                <i className="fas fa-home me-2"></i>
                                Phường/Xã
                              </Form.Label>
                              <Form.Select
                                value={formData.ward}
                                onChange={handleWardChange}
                                disabled={!selectedDistrict || savingField === 'address'}
                                style={{
                      borderRadius: '10px',
                                  
                                  fontSize: '1rem',
                                  padding: '12px 16px',
                                  background: 'white'
                                }}
                              >
                                <option value="">-- Chọn Phường/Xã --</option>
                                {availableWards.map(ward => (
                                  <option key={ward} value={ward}>
                                    {ward}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Group>
                  <Form.Label className="fw-bold text-white mb-2" style={{ fontSize: '1rem' }}>
                                <i className="fas fa-road me-2"></i>
                                Số nhà, tên đường
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="addressDetail"
                                value={formData.addressDetail}
                                onChange={handleInputChange}
                                placeholder="Ví dụ: 123 Lê Lợi"
                                disabled={savingField === 'address'}
                                style={{
                      borderRadius: '10px',
                                  
                                  fontSize: '1rem',
                                  padding: '12px 16px',
                                  background: 'white'
                                }}
                              />
                            </Form.Group>
              </Col>
            </Row>
            <div className="d-flex gap-2 mt-3">
                              <Button
                                variant="success"
                                onClick={handleSaveAddress}
                                disabled={savingField === 'address'}
                size="sm"
                                style={{
                  borderRadius: '8px',
                  padding: '8px 16px',
                                  fontWeight: '600',
                                  border: '2px solid white',
                                  background: 'white',
                                  color: '#1e3c72',
                  fontSize: '0.9rem'
                                }}
                              >
                                {savingField === 'address' ? (
                                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                                    Đang lưu...
                                  </>
                                ) : (
                                  <>
                    <i className="fas fa-check me-1"></i>
                    Lưu
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline-secondary"
                                onClick={() => setEditingField(null)}
                                disabled={savingField === 'address'}
                size="sm"
                                style={{
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: '600',
                                  border: '2px solid white',
                                  background: 'white',
                                  color: '#1e3c72',
                  fontSize: '0.9rem'
                }}
              >
                <i className="fas fa-times me-1"></i>
                                Hủy
                              </Button>
                            </div>
                          </motion.div>
                        ) : (
          <div>
                                {(() => {
                                  // Check if any address component exists
                                  const hasAnyAddress = formData.addressDetail || formData.ward || formData.district || formData.province;
                                  
                                  if (!hasAnyAddress) {
                                    return (
                                      <div 
                                        style={{
                                          padding: '12px 16px',
                                          borderRadius: '10px',
                                          background: 'white',
                                          border: '1px solid #dee2e6',
                                          fontSize: '1rem',
                                          textAlign: 'center'
                                        }}
                                      >
                                        <i className="fas fa-map-marker-alt text-muted me-2"></i>
                                        <em className="text-muted">Chưa cập nhật địa chỉ</em>
                                      </div>
                                    );
                                  }
                                  
                                  // Build address string from available components
                                  const addressParts = [
                                    formData.addressDetail,
                                    formData.ward,
                                    formData.district,
                                    formData.province
                                  ].filter(part => part && part.trim() !== '');
                                  
                                  return (
                                    <>
                                      <div className="d-flex align-items-center mb-3">
                                        <i className="fas fa-map-marker-alt text-white me-2"></i>
                                        <strong className="text-white" style={{ fontSize: '1rem' }}>Địa chỉ đầy đủ:</strong>
                                      </div>
                                      <div 
                                        style={{
                                          padding: '12px 16px',
                                          borderRadius: '10px',
                                          background: 'white',
                                          border: '1px solid rgb(255, 255, 255)',
                                          fontSize: '1rem',
                                          wordBreak: 'break-word',
                                          color: '#212529'
                                        }}
                                      >
                                        {addressParts.join(', ')}
                                      </div>
                                    </>
                                  );
                                })()}
                              <Button
                                size="sm"
                                onClick={() => setEditingField('address')}
              className="w-100 mt-3"
                                style={{
                                  borderRadius: '8px',
                                  padding: '8px 16px',
                                  fontWeight: '600',
                                  border: '2px solid white',
                                  background: 'white',
                                  color: '#1e3c72',
                fontSize: '0.9rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                                  e.currentTarget.style.color = '#1e3c72';
                                  e.currentTarget.style.borderColor = 'white';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.color = '#1e3c72';
                                  e.currentTarget.style.borderColor = 'white';
                                }}
                              >
                                <i className="fas fa-edit me-1"></i>
                                Sửa địa chỉ
                              </Button>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders a field within a card layout with edit capability
   * 
   * This function renders a form field in a card-based layout, similar to
   * renderTimelineField but with card styling. It provides:
   * - Icon badge showing completion status
   * - Field label and completion indicator
   * - Edit button (disabled for email field)
   * - Edit mode with input field and save/cancel buttons
   * - Display mode showing current value
   * 
   * Used for the card-based layout in the profile edit page.
   * 
   * @param {string} fieldName - Field name in camelCase (e.g., 'fullName', 'phone')
   * @param {string} label - Display label for the field (e.g., 'Họ và tên')
   * @param {string} [type='text'] - Input type ('text', 'date', 'select', 'textarea')
   * @param {Array<Object>} [options=null] - Options array for select type [{value, label}]
   * @returns {React.ReactNode} JSX element containing the field UI in card format
   * 
   * @example
   * // Render a field in card
   * {renderFieldInCard('fullName', 'Họ và tên', 'text')}
   */
  const renderFieldInCard = (fieldName, label, type = 'text', options = null) => {
    const isEditing = editingField === fieldName;
    const isSaving = savingField === fieldName;
    // Check if field has value - handle null, undefined, empty string, and numbers
    const fieldValue = formData[fieldName];
    const hasValue = fieldValue !== null && 
                     fieldValue !== undefined && 
                     fieldValue !== '' && 
                     (typeof fieldValue === 'string' ? fieldValue.trim() !== '' : true);
    const isEmailField = fieldName === 'email';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-3"
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center flex-grow-1">
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: hasValue ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                flexShrink: 0
              }}
            >
              <i className={`${getFieldIcon(fieldName)} text-white`} style={{ fontSize: '1rem' }}></i>
            </div>
            <div className="flex-grow-1">
              <strong className="text-white d-block" style={{ fontSize: '1rem', lineHeight: '1.3' }}>{label}</strong>
              <div className="d-flex align-items-center mt-1">
                {hasValue ? (
                  <i className="fas fa-check-circle text-success" style={{ fontSize: '1rem' }}></i>
                ) : (
                  <Badge bg="danger" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>
                    <i className="fas fa-times me-1"></i>
                    Chưa có
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {!isEmailField && (
            <Button
              size="sm"
              onClick={() => setEditingField(fieldName)}
              style={{
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: '600',
                border: '2px solid white',
                background: 'white',
                color: '#1e3c72',
                fontSize: '0.9rem',
                minWidth: '70px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.color = '#1e3c72';
                e.currentTarget.style.borderColor = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#1e3c72';
                e.currentTarget.style.borderColor = 'white';
              }}
            >
              <i className="fas fa-edit me-1"></i>
              {hasValue ? 'Sửa' : 'Thêm'}
            </Button>
          )}
          {isEmailField && (
            <Badge bg="secondary" style={{ fontSize: '0.7rem', padding: '0.5rem' }}>
              <i className="fas fa-lock me-1"></i>
              Không thể thay đổi
            </Badge>
          )}
        </div>

        {isEditing && !isEmailField && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-3"
          >
            <div className="position-relative">
              {type === 'select' ? (
                <Form.Select
                  name={fieldName}
                  value={formData[fieldName]}
                  onChange={handleInputChange}
                  disabled={isSaving}
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #dee2e6',
                          fontSize: '1rem',
                          padding: '12px 16px'
                        }}
                >
                  <option value="">-- Chọn {label} --</option>
                  {options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              ) : type === 'textarea' ? (
                <Form.Control
                  as="textarea"
                  rows={2}
                  name={fieldName}
                  value={formData[fieldName]}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  placeholder={`Nhập ${label.toLowerCase()}...`}
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #dee2e6',
                          fontSize: '1rem',
                          padding: '12px 16px',
                          resize: 'vertical'
                        }}
                />
              ) : (
                <Form.Control
                  type={type}
                  name={fieldName}
                  value={formData[fieldName]}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  placeholder={`Nhập ${label.toLowerCase()}...`}
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #dee2e6',
                          fontSize: '1rem',
                          padding: '12px 16px'
                        }}
                />
              )}
              {isSaving && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '10px',
                    transform: 'translateY(-50%)'
                  }}
                >
                  <Spinner animation="border" size="sm" variant="primary" />
                </div>
              )}
            </div>
            <div className="d-flex gap-2 mt-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleSaveField(fieldName)}
                disabled={isSaving}
                style={{
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: '600',
                  border: '2px solid white',
                  background: 'white',
                  color: '#1e3c72',
                  fontSize: '0.9rem'
                }}
              >
                {isSaving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check me-1"></i>
                    Lưu
                  </>
                )}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setEditingField(null)}
                disabled={isSaving}
                style={{
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: '600',
                  border: '2px solid white',
                  background: 'white',
                  color: '#1e3c72',
                  fontSize: '0.9rem'
                }}
              >
                <i className="fas fa-times me-1"></i>
                Hủy
              </Button>
            </div>
          </motion.div>
        )}

        {!isEditing && (
          <div 
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'white',
              border: '1px solid #dee2e6',
              fontSize: '1rem',
              marginTop: '10px',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span className={hasValue ? 'text-dark' : 'text-muted'}>
              {type === 'date' 
                ? formatDate(formData[fieldName]) || <em>Chưa cập nhật</em>
                : type === 'select' && fieldName === 'gender'
                ? getGenderText(formData[fieldName]) || <em>Chưa cập nhật</em>
                : type === 'select' && options
                ? (options.find(opt => opt.value === formData[fieldName])?.label || formData[fieldName] || <em>Chưa cập nhật</em>)
                : (formData[fieldName] || <em>Chưa cập nhật</em>)
              }
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <PatientHeader />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: `linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%), url(${require('../../../../assets/background2.jpg')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          minHeight: '100vh'
        }}
      >
        <Container className="py-4 py-md-5 px-4 px-md-5" fluid>
          {/* Header Section */}
          {/* Header Section */}
          <Row className="justify-content-center mb-5">
            <Col xs={12} lg={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-4"
                style={{
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  padding: '2rem 1.5rem',
                  borderRadius: '25px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  margin: '0 1rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mb-4"
                >
                  <h2 
                    className="mb-3" 
                    style={{ 
                      fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', 
                      fontWeight: '700',
                      color: 'white'
                    }}
                  >
                     Hồ sơ cá nhân
                  </h2>
                  <p 
                    className="mb-0" 
                    style={{ 
                      fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                      fontWeight: '500',
                      color: 'rgba(255,255,255,0.9)'
                    }}
                  >
                    Quản lý thông tin cá nhân của bạn một cách dễ dàng
                  </p>
                </motion.div>
              </motion.div>
                            </Col>
                          </Row>

          {/* Quick Information Section - Card */}
          <Row className="justify-content-center mb-4">
            <Col xs={12} lg={10}>
              <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '15px', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                <Card.Body className="p-4" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                  <div className="d-flex align-items-center mb-4">
                    <i className="fas fa-edit me-2" style={{ color: 'white', fontSize: '1.2rem' }}></i>
                    <h5 className="mb-0" style={{ fontWeight: '600', color: 'white' }}>Thông tin cá nhân</h5>
                  </div>
                  
                  <Row className="g-3">
                    <Col xs={12} md={4}>
                      {renderTimelineField('fullName', 'Họ và tên', 'fas fa-id-card')}
                    </Col>
                    <Col xs={12} md={4}>
                      {renderTimelineField('email', 'Email', 'fas fa-envelope', 'email')}
                    </Col>
                    <Col xs={12} md={4}>
                      {renderTimelineField('phone', 'Số điện thoại', 'fas fa-phone', 'tel')}
                    </Col>
                    <Col xs={12} md={4}>
                      {renderTimelineField('dateOfBirth', 'Ngày sinh', 'fas fa-calendar', 'date')}
                    </Col>
                    <Col xs={12} md={4}>
                      {renderTimelineField('gender', 'Giới tính', 'fas fa-venus-mars', 'select', [
                        { value: 'male', label: 'Nam' },
                        { value: 'female', label: 'Nữ' },
                        { value: 'other', label: 'Khác' }
                      ])}
                    </Col>
                    <Col xs={12} md={4}>
                      {renderTimelineField('cccd', 'Số CCCD', 'fas fa-id-badge')}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Health & Medical Section - Card */}
          <Row className="justify-content-center mb-4">
            <Col xs={12} lg={10}>
              <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '15px', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                <Card.Body className="p-4" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                  <div className="d-flex align-items-center mb-4">
                    <i className="fas fa-user-heart me-2" style={{ color: 'white', fontSize: '1.2rem' }}></i>
                    <h5 className="mb-0" style={{ fontWeight: '600', color: 'white' }}>Sức khỏe & Y tế</h5>
                  </div>
                  
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      {renderTimelineField('bloodGroup', 'Nhóm máu', 'fas fa-tint', 'select', [
                        { value: 'A', label: 'A' },
                        { value: 'B', label: 'B' },
                        { value: 'AB', label: 'AB' },
                        { value: 'O', label: 'O' }
                      ])}
                    </Col>
                    <Col xs={12} md={6}>
                      {renderTimelineField('medicalHistory', 'Tiền sử bệnh', 'fas fa-notes-medical', 'textarea')}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Address Information Section - Card */}
          <Row className="justify-content-center mb-4">
            <Col xs={12} lg={10}>
              <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '15px', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                <Card.Body className="p-4" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                  <div className="d-flex align-items-center mb-4">
                    <i className="fas fa-home me-2" style={{ color: 'white', fontSize: '1.2rem' }}></i>
                    <h5 className="mb-0" style={{ fontWeight: '600', color: 'white' }}>Thông tin địa chỉ</h5>
                  </div>
                  
                  <div>
                    {renderAddressTimeline()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
        <GuestFooter />
      </motion.div>
    </>
  );
};

export default PatientProfile;
