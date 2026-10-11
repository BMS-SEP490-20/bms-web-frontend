/**
 * Patient Information Validator
 * 
 * Utility functions to validate if patient information is complete.
 * Required fields: fullName, phone, dateOfBirth
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

/**
 * Check if patient information is complete
 * 
 * @param {Object} patient - Patient object to validate
 * @returns {Object} Validation result with isComplete flag and missing fields array
 */
export const isPatientInfoComplete = (patient) => {
  if (!patient) {
    return {
      isComplete: false,
      missingFields: ['fullName', 'phone', 'dateOfBirth'],
      message: 'Thông tin bệnh nhân không tồn tại'
    };
  }

  const missingFields = [];
  
  // Check fullName (required)
  // Backend có thể trả về: fullname, Fullname, fullName, FullName, full_name, Full_name
  const fullName = patient.fullname || patient.Fullname || 
                   patient.fullName || patient.FullName || 
                   patient.full_name || patient.Full_name ||
                   patient.name || patient.Name;
  if (!fullName || (typeof fullName === 'string' && fullName.trim() === '')) {
    missingFields.push('fullName');
  }
  
  // Check phone (required)
  // Backend có thể trả về: phone, Phone, phone_number, Phone_number
  const phone = patient.phone || patient.Phone || 
                patient.phone_number || patient.Phone_number ||
                patient.phoneNumber || patient.PhoneNumber;
  if (!phone || (typeof phone === 'string' && phone.trim() === '')) {
    missingFields.push('phone');
  }
  
  // Check dateOfBirth (required)
  // Backend có thể trả về: dob, Dob, dateOfBirth, DateOfBirth, date_of_birth, Date_of_birth
  const dateOfBirth = patient.dob || patient.Dob ||
                      patient.dateOfBirth || patient.DateOfBirth || 
                      patient.date_of_birth || patient.Date_of_birth ||
                      patient.birthDate || patient.BirthDate;
  
  // Validate dateOfBirth - check if it's a valid date string (not empty, not null, not 'N/A')
  const hasValidDateOfBirth = dateOfBirth && 
                               typeof dateOfBirth === 'string' && 
                               dateOfBirth.trim() !== '' && 
                               dateOfBirth.toLowerCase() !== 'null' &&
                               dateOfBirth.toLowerCase() !== 'n/a' &&
                               dateOfBirth !== '0001-01-01' && // SQL Server default date
                               dateOfBirth !== '0001-01-01T00:00:00';
  
  if (!hasValidDateOfBirth) {
    missingFields.push('dateOfBirth');
  }
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    message: missingFields.length > 0 
      ? `Vui lòng cập nhật các thông tin sau: ${missingFields.map(f => getFieldDisplayName(f)).join(', ')}`
      : 'Thông tin đã đầy đủ'
  };
};

/**
 * Get display name for field
 * 
 * @param {string} field - Field name
 * @returns {string} Display name in Vietnamese
 */
const getFieldDisplayName = (field) => {
  const fieldNames = {
    fullName: 'Họ và tên',
    phone: 'Số điện thoại',
    dateOfBirth: 'Ngày tháng năm sinh'
  };
  return fieldNames[field] || field;
};

/**
 * Check if patient info is complete from user object
 * 
 * @param {Object} user - User object from AuthContext
 * @returns {Object} Validation result
 */
export const isUserPatientInfoComplete = (user) => {
  if (!user) {
    return {
      isComplete: false,
      missingFields: ['fullName', 'phone', 'dateOfBirth'],
      message: 'Thông tin người dùng không tồn tại'
    };
  }
  
  // For patient users, check if they have patient record
  // This will be checked by fetching patient data separately
  return isPatientInfoComplete(user);
};

/**
 * Get minimum date (60 years ago) for date of birth input
 * Users must be at most 60 years old
 * 
 * @returns {string} Minimum date in YYYY-MM-DD format
 */
export const getMinDateOfBirth = () => {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 60, today.getMonth(), today.getDate());
  return minDate.toISOString().split('T')[0];
};

/**
 * Get maximum date (18 years ago) for date of birth input
 * Users must be at least 18 years old
 * 
 * @returns {string} Maximum date in YYYY-MM-DD format
 */
export const getMaxDateOfBirth = () => {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return maxDate.toISOString().split('T')[0];
};

/**
 * Validate date of birth to ensure age is between 18 and 60 years old
 * 
 * @param {string|Date} dateOfBirth - Date of birth string (YYYY-MM-DD) or Date object
 * @returns {Object} Validation result with isValid flag and error message
 * 
 * @example
 * validateDateOfBirthAge('2000-01-01') // Returns: { isValid: true, message: '' }
 * validateDateOfBirthAge('2010-01-01') // Returns: { isValid: false, message: 'Ngày sinh không hợp lệ. Bạn phải từ đủ 18 tuổi đến 60 tuổi.' }
 */
export const validateDateOfBirthAge = (dateOfBirth) => {
  if (!dateOfBirth) {
    return {
      isValid: false,
      message: 'Vui lòng chọn ngày tháng năm sinh'
    };
  }

  // Convert to Date object if it's a string
  const birthDate = typeof dateOfBirth === 'string' 
    ? new Date(dateOfBirth.split('T')[0]) 
    : new Date(dateOfBirth);
  
  // Check if date is valid
  if (isNaN(birthDate.getTime())) {
    return {
      isValid: false,
      message: 'Ngày sinh không hợp lệ'
    };
  }

  const today = new Date();
  
  // Check if birth date is in the future
  if (birthDate >= today) {
    return {
      isValid: false,
      message: 'Ngày sinh không thể là ngày trong tương lai'
    };
  }

  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  // Validate age range: 18 to 60 years old
  if (age < 18) {
    return {
      isValid: false,
      message: 'Ngày sinh không hợp lệ. Bạn phải từ đủ 18 tuổi đến 60 tuổi.'
    };
  }

  if (age > 60) {
    return {
      isValid: false,
      message: 'Ngày sinh không hợp lệ. Bạn phải từ đủ 18 tuổi đến 60 tuổi.'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

