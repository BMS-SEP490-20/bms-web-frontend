/**
 * @file maskSensitive.js
 * @description Utility functions for masking Personally Identifiable Information (PII),
 * specifically email addresses and phone numbers, before rendering in user interfaces.
 * Conforms to: NIST SP 800-63B & AGENTS-DESIGN.md Rule 22 (Privacy Protection).
 */

/**
 * Masks an email address to protect user privacy.
 * Example: "tanphat.nguyen@gmail.com" => "t***n@gmail.com"
 *          "phat@gmail.com" => "p***t@gmail.com"
 * 
 * @param {string} email - The email address to mask.
 * @returns {string} The masked email address.
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
 * Masks a telephone number to protect sensitive contact data.
 * Example: "0901234567" => "090****567"
 * 
 * @param {string} phone - The phone number to mask.
 * @returns {string} The masked phone number.
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
 * Automatically detects whether destination is an email or phone number and applies the correct mask.
 * 
 * @param {string} destination - Email address or phone number.
 * @returns {string} Masked destination string.
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
