/**
 * @file userService.js
 * @description API service for clinical user profile retrieval (UC08).
 * Communicates with BMS Backend /api/v1/users/me directly backed by MongoDB accounts collection.
 * Conforms to: OWASP Top 10 (A01: IDOR Prevention) & RFC 7807 Problem Details.
 */

import api from '../config/api';

/**
 * Retrieves authenticated user profile.
 * @returns {Promise<{ isSuccess: boolean, data?: object, message?: string }>}
 */
export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/v1/users/me', {
      headers: {
        'X-Demo-User': '1', // Permits offline development and UI preview
      },
    });

    if (response.data && response.data.success) {
      return {
        isSuccess: true,
        data: response.data.data,
        message: response.data.message || 'Profile loaded successfully.',
      };
    }

    return {
      isSuccess: false,
      message: response.data?.message || 'Failed to retrieve profile data.',
    };
  } catch (error) {
    console.error('[BMS User Service] Failed to retrieve profile from database:', error);
    return {
      isSuccess: false,
      message: error.response?.data?.message || error.message || 'Unable to connect to BMS database services.',
    };
  }
};

export default {
  getUserProfile,
};
