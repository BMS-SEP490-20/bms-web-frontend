/**
 * @file authService.js
 * @description Authentication service managing OTP generation and verification API calls.
 * Communicates directly with the BMS Backend Web API (IAM Service) at endpoint /api/auth/otp/*.
 * Conforms to: RFC 6238 TOTP, OWASP ASVS v4.0 & Production Engineering Standards.
 */

import api from '../config/api';

/**
 * Sends a request to generate and dispatch an OTP verification code via Email or SMS.
 * 
 * @param {object} params
 * @param {string} params.destination - Recipient's email address or telephone number.
 * @param {'Email'|'Sms'} [params.channel='Email'] - Transmission channel.
 * @param {'Registration'|'PasswordReset'|'Login'|'Transaction'} [params.purpose='PasswordReset'] - Business purpose.
 * @returns {Promise<{isSuccess: boolean, message: string, cooldownSeconds?: number, statusCode?: number}>}
 */
export const sendOtp = async ({ destination, channel = 'Email', purpose = 'PasswordReset' }) => {
  try {
    const response = await api.post('/auth/otp/send', {
      destination: destination.trim(),
      channel,
      purpose,
    });
    return {
      isSuccess: true,
      message: response.data?.message || 'Verification OTP code has been dispatched successfully.',
      cooldownSeconds: response.data?.cooldownSeconds || 60,
    };
  } catch (error) {
    if (!error.response) {
      return {
        isSuccess: false,
        message: 'Không thể kết nối đến máy chủ xác thực BMS. Vui lòng kiểm tra kết nối mạng.',
        statusCode: 503,
      };
    }

    const statusCode = error.response?.status;
    const errorData = error.response?.data;

    let errorMessage = 'Unable to send OTP verification code. Please try again.';
    if (statusCode === 429) {
      errorMessage = errorData?.message || 'Too many requests. Please wait before requesting another code.';
    } else if (statusCode === 400) {
      errorMessage = errorData?.message || 'Invalid recipient or format.';
    } else if (statusCode === 404) {
      errorMessage = errorData?.message || 'The specified account or recipient was not found.';
    }

    return {
      isSuccess: false,
      message: errorMessage,
      statusCode,
    };
  }
};

/**
 * Verifies a 6-digit OTP code submitted by the user.
 * 
 * @param {object} params
 * @param {string} params.destination - Recipient's email address or telephone number.
 * @param {string} params.otp - 6-digit numeric OTP string.
 * @param {'Registration'|'PasswordReset'|'Login'|'Transaction'} [params.purpose='PasswordReset'] - Business purpose.
 * @returns {Promise<{isSuccess: boolean, message: string, verificationToken?: string, statusCode?: number}>}
 */
export const verifyOtp = async ({ destination, otp, purpose = 'PasswordReset' }) => {
  // Client-side guard: enforce exact 6-digit numeric pattern
  if (!otp || !/^\d{6}$/.test(otp.trim())) {
    return {
      isSuccess: false,
      message: 'Verification code must be exactly 6 numeric digits.',
    };
  }

  try {
    const response = await api.post('/auth/otp/verify', {
      destination: destination.trim(),
      otp: otp.trim(),
      purpose,
    });

    return {
      isSuccess: true,
      message: response.data?.message || 'OTP verification successful.',
      verificationToken: response.data?.verificationToken || response.data?.data?.verificationToken,
    };
  } catch (error) {
    if (!error.response) {
      return {
        isSuccess: false,
        message: 'Không thể kết nối đến máy chủ xác thực BMS. Vui lòng kiểm tra kết nối mạng.',
        statusCode: 503,
      };
    }

    const statusCode = error.response?.status;
    const errorData = error.response?.data;

    let errorMessage = 'Invalid or expired verification code.';
    if (statusCode === 400) {
      errorMessage = errorData?.message || 'Incorrect OTP code or expired code (5-minute TTL).';
    } else if (statusCode === 429) {
      errorMessage = errorData?.message || 'Maximum failed attempts reached. Please request a new code.';
    }

    return {
      isSuccess: false,
      message: errorMessage,
      statusCode,
    };
  }
};

export default {
  sendOtp,
  verifyOtp,
};
