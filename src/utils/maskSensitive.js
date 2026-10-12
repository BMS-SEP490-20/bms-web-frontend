/**
 * @file maskSensitive.js
 * @description Hàm tiện ích làm mờ (mask) thông tin định danh cá nhân nhạy cảm (PII)
 * như Email và Số điện thoại trước khi hiển thị trên giao diện người dùng.
 * Tuân thủ: NIST SP 800-63B & AGENTS-DESIGN.md Rule 22 (Bảo vệ thông tin cá nhân).
 */

/**
 * Che một phần địa chỉ email để bảo mật thông tin người dùng.
 * Ví dụ: "tanphat.nguyen@gmail.com" => "t***t@gmail.com"
 *        "phat@gmail.com" => "p***t@gmail.com"
 * 
 * @param {string} email - Địa chỉ email cần che.
 * @returns {string} Địa chỉ email đã được che dấu.
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const [username, domain] = parts;
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }

  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  return `${firstChar}***${lastChar}@${domain}`;
};

/**
 * Che một phần số điện thoại để bảo mật thông tin liên lạc.
 * Ví dụ: "0901234567" => "090****567"
 * 
 * @param {string} phone - Số điện thoại cần che.
 * @returns {string} Số điện thoại đã được che dấu.
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 7) return cleaned;

  const prefix = cleaned.slice(0, 3);
  const suffix = cleaned.slice(-3);
  return `${prefix}****${suffix}`;
};

/**
 * Tự động phát hiện email hoặc số điện thoại và áp dụng mask phù hợp.
 * 
 * @param {string} destination - Email hoặc số điện thoại.
 * @returns {string} Chuỗi thông tin đã được mask.
 */
export const maskDestination = (destination) => {
  if (!destination) return '';
  if (destination.includes('@')) {
    return maskEmail(destination);
  }
  return maskPhone(destination);
};

export default {
  maskEmail,
  maskPhone,
  maskDestination,
};
