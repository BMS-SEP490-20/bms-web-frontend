/**
 * Format Helper Utilities
 * 
 * Provides utility functions for formatting various data types
 * consistently across the application.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2025-01-11
 */

/**
 * Format Lab Test ID to standardized format
 * Format: XN{6 last digits of ID}
 * Example: ID 123456789 -> XN456789
 * 
 * @param {number|string} labTestId - Lab test ID
 * @returns {string} Formatted lab test code (e.g., "XN123456")
 */
export const formatLabTestCode = (labTestId) => {
  if (!labTestId && labTestId !== 0) {
    return 'N/A';
  }
  
  const idString = String(labTestId);
  // Lấy 6 số cuối cùng
  const last6Digits = idString.slice(-6);
  
  return `XN${last6Digits}`;
};

/**
 * Format Patient ID to standardized format
 * Format: BN{6 digits padded with zeros}
 * Example: ID 1 -> BN000001
 * 
 * @param {number|string} patientId - Patient ID
 * @returns {string} Formatted patient code (e.g., "BN000001")
 */
export const formatPatientCode = (patientId) => {
  if (!patientId && patientId !== 0) {
    return 'N/A';
  }
  
  const idString = String(patientId);
  const paddedId = idString.padStart(6, '0');
  
  return `BN${paddedId}`;
};

/**
 * Format Sample ID to standardized format
 * Format: #{8 last digits}
 * Example: ID 1234567890123 -> #56789012
 * 
 * @param {number|string} sampleId - Sample ID
 * @returns {string} Formatted sample code (e.g., "#12345678")
 */
export const formatSampleCode = (sampleId) => {
  if (!sampleId && sampleId !== 0) {
    return 'N/A';
  }
  
  const idString = String(sampleId);
  const last8Digits = idString.slice(-8);
  
  return `#${last8Digits}`;
};

/**
 * Chuẩn hóa loại mẫu từ tiếng Anh sang tiếng Việt
 * @param {string} sampleType - Loại mẫu (có thể là tiếng Anh hoặc tiếng Việt)
 * @returns {string} Loại mẫu đã được chuẩn hóa sang tiếng Việt
 */
export const formatSampleType = (sampleType) => {
  if (!sampleType) return '';
  
  const type = String(sampleType).toLowerCase().trim();
  
  // Mapping từ tiếng Anh sang tiếng Việt
  const typeMap = {
    'blood': 'Máu',
    'serum': 'Huyết thanh',
    'plasma': 'Huyết tương',
    'urine': 'Nước tiểu',
    'stool': 'Phân',
    'swab': 'Dịch tỵ hầu',
    'nasopharyngeal swab': 'Dịch tỵ hầu',
    'throat swab': 'Dịch tỵ hầu',
    'saliva': 'Nước bọt',
    'tissue': 'Mô',
    'máu': 'Máu',
    'huyết thanh': 'Huyết thanh',
    'huyết tương': 'Huyết tương',
    'nước tiểu': 'Nước tiểu',
    'dịch tỵ hầu': 'Dịch tỵ hầu',
    'phân': 'Phân',
    'nước bọt': 'Nước bọt',
    'mô': 'Mô',
    'máu toàn phần': 'Máu'
  };
  
  // Nếu đã là tiếng Việt hoặc không có trong map, trả về giá trị gốc
  // Nếu là tiếng Anh, chuyển sang tiếng Việt
  return typeMap[type] || sampleType;
};

