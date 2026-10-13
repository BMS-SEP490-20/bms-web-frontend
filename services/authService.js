/**
 * Authentication Service
 * 
 * This service handles all authentication-related operations including
 * login, registration, password reset, and user session management.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';

/**
 * Authentication Service Object
 * 
 * Contains methods for user authentication, registration, and session management.
 * All methods return a standardized response object with success status and data/message.
 */
export const authService = {
  /**
   * User Login
   * 
   * Authenticates a user with username and password.
   * Creates a session token and stores user data in localStorage.
   * 
   * @param {string} username - User's username or email
   * @param {string} password - User's password
   * @returns {Promise<Object>} Response object with success status and user data
   */
  login: async (username, password) => {
    try {
      
      const response = await api.post('/gateway/iam/auth/login', {
        username: username,
        password: password
      });
      
      // BE response structure: { message: "...", data: { Token: "..." } }
      // Handle both direct response.data.data and nested structures
      let token = null;
      let responseData = response.data;
      
      // Try to get token from different possible structures
      if (responseData?.data?.Token) {
        token = responseData.data.Token;
      } else if (responseData?.data?.token) {
        token = responseData.data.token;
      } else if (responseData?.Token) {
        token = responseData.Token;
      } else if (responseData?.token) {
        token = responseData.token;
      } else if (responseData?.data && typeof responseData.data === 'string') {
        // If data is a string (token directly)
        token = responseData.data;
      }
      
      if (!token) {
        return { success: false, message: responseData?.message || 'Đăng nhập thất bại - không nhận được token' };
      }
      
      // Decode JWT token to get user info (basic decode without verification for client-side)
      let userInfo = { username: username };
      try {
        // JWT structure: header.payload.signature
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          
          // BE uses ClaimTypes which map to different claim names in JWT:
          // Check both namespace and non-namespace claims
          // - ClaimTypes.NameIdentifier -> http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier
          // - ClaimTypes.Name -> http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name
          // - ClaimTypes.Email -> http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
          // - ClaimTypes.Role -> http://schemas.microsoft.com/ws/2008/06/identity/claims/role
          const nameIdentifierClaim = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] 
            || payload.nameidentifier || payload.nameid || payload.sub || payload.userId;
          const nameClaim = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
            || payload.name || payload.unique_name || payload.username || username;
          const emailClaim = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
            || payload.emailaddress || payload.email || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/email'];
          const roleClaim = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
            || payload.role;
          const roleArray = Array.isArray(roleClaim) ? roleClaim : (roleClaim ? [roleClaim] : []);
          const roleValue = roleArray[0] || roleClaim || 'patient';
          
          // Convert roleId to number for consistent comparison
          const roleIdNumber = typeof roleValue === 'string' ? parseInt(roleValue, 10) : roleValue;
          
          userInfo = {
            id: nameIdentifierClaim,
            username: nameClaim,
            email: emailClaim,
            role: roleValue,
            roleId: isNaN(roleIdNumber) ? roleValue : roleIdNumber, // Convert to number if possible
            fullName: nameClaim
          };
        }
      } catch (decodeError) {
        // Fallback to basic info if decode fails
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userInfo));
      
      return { success: true, user: userInfo, token: token };
    } catch (error) {
      // Handle BE error responses
      if (error.response?.status === 404) {
        const errorMessage = error.response?.data?.message || 'Tài khoản hoặc mật khẩu không đúng';
        return { success: false, message: errorMessage };
      }
      
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Dữ liệu đăng nhập không hợp lệ';
        return { success: false, message: errorMessage };
      }
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('exceeded')) {
        return { 
          success: false, 
          message: 'Kết nối timeout. Server không phản hồi. Vui lòng kiểm tra API Gateway và IAM Service có đang chạy không.' 
        };
      }
      
      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        return { success: false, message: 'Không thể kết nối đến server. Vui lòng kiểm tra API Gateway có đang chạy không.' };
      }
      
      return { success: false, message: error.response?.data?.message || 'Lỗi kết nối server: ' + (error.message || 'Không thể kết nối đến server') };
    }
  },

  /**
   * Generate random password
   * 
   * Generates a secure random password for new user accounts.
   * 
   * @param {number} length - Password length (default: 12)
   * @returns {string} Random password
   */
  generatePassword: (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  /**
   * User Registration
   * 
   * Registers a new user account with email.
   * BE will generate username and password and send via email.
   * 
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User's email address
   * @returns {Promise<Object>} Response object with success status and message
   */
  register: async (userData) => {
    try {
      // Backend expects a string (email) in the request body, not an object
      const email = typeof userData === 'string' ? userData : userData.email;
      
      const response = await api.post('/gateway/iam/auth/register', email, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      
      if (response.data && response.data.message) {
        // Extract username and password from response.data.data if available
        const responseData = response.data.data || response.data.message;
        let username = null;
        let password = null;
        
        // Try to extract username and password from the message
        if (typeof responseData === 'string') {
          const usernameMatch = responseData.match(/Tên đăng nhập:\s*(\w+)/);
          const passwordMatch = responseData.match(/Mật khẩu:\s*(\w+)/);
          if (usernameMatch) username = usernameMatch[1];
          if (passwordMatch) password = passwordMatch[1];
        }
        
        return { 
          success: true, 
          message: response.data.message,
          data: response.data.data,
          username: username,
          password: password
        };
      } else {
        return { success: false, message: 'Đăng ký thất bại' };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, message: error.response?.data?.message || 'Tài khoản đã tồn tại hoặc endpoint không tìm thấy' };
      }
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        return { success: false, message: 'Không thể kết nối đến server. Vui lòng kiểm tra API Gateway và IAM service có đang chạy không.' };
      }
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo tài khoản' };
    }
  },

  /**
   * Send OTP
   * 
   * Sends a one-time password to the user's email for verification.
   * 
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Response object with success status and message
   */
  /**
   * Check if email already exists
   * 
   * Checks if an email is already registered in the system.
   * 
   * @param {string} email - Email to check
   * @returns {Promise<Object>} Response object with exists status
   */
  checkEmailExists: async (email) => {
    try {
      // Thử check qua patient service - nếu có patient với email này thì có thể đã có account
      const { patientService } = await import('./patientService');
      const patientResult = await patientService.getPatientByEmail(email);
      
      // Nếu tìm thấy patient, có thể email đã được sử dụng
      if (patientResult.success && patientResult.data) {
        return {
          success: true,
          exists: true,
          message: 'Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.'
        };
      }
      
      // Nếu không tìm thấy patient (404 hoặc không có data), email chưa được sử dụng
      // Cho phép tiếp tục đăng ký - backend sẽ validate khi register
      return {
        success: true,
        exists: false,
        message: 'Email có thể sử dụng'
      };
    } catch (error) {
      // Nếu có lỗi khi check, không block registration
      // Backend sẽ tự validate khi register
      // Chỉ log warning, không block
      console.warn('Không thể kiểm tra email qua patient service:', error.message);
      
      // Cho phép tiếp tục - backend sẽ validate
      return {
        success: true, // Đánh dấu success để không block
        exists: false, // Giả định chưa tồn tại
        message: 'Đang kiểm tra...',
        warning: true // Có warning nhưng không block
      };
    }
  },

  sendOTP: async (email) => {
    try {
      // Use /otp/sendotp endpoint which has [AllowAnonymous] for registration
      // BE expects a string (email) in the request body
      const response = await api.post('/gateway/iam/auth/otp/sendotp', email, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.isSuccess) {
        return { 
          success: true, 
          message: response.data.message || `OTP đã được gửi đến ${email}`
        };
      } else {
        return { success: false, message: response.data?.message || 'Lỗi gửi OTP' };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, message: error.response?.data?.message || 'Email không hợp lệ hoặc không tồn tại' };
      }
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        return { success: false, message: 'Không thể kết nối đến server. Vui lòng kiểm tra API Gateway có đang chạy không.' };
      }
      return { success: false, message: error.response?.data?.message || 'Lỗi gửi OTP' };
    }
  },

  /**
   * Verify OTP
   * 
   * Verifies the one-time password entered by the user.
   * Uses /otp/verifyotp endpoint which allows anonymous access for registration.
   * 
   * @param {string} email - User's email address
   * @param {string} otp - The OTP code entered by the user
   * @param {string} newPassword - New password (for password reset, optional)
   * @returns {Promise<Object>} Response object with success status
   */
  verifyOTP: async (email, otp, newPassword = null) => {
    try {
      // Nếu có newPassword, sử dụng endpoint /otp/verify để reset password
      if (newPassword) {
        return await authService.resetPassword(email, otp, newPassword);
      }
      
      // Backend VerifyOtpDto expects: Email (PascalCase) and OtpCode (PascalCase)
      const requestData = {
        Email: email,
        OtpCode: otp
      };
      
      // Use /otp/verifyotp endpoint which has [AllowAnonymous] for registration
      const response = await api.post('/gateway/iam/auth/otp/verifyotp', requestData);
      
      
      if (response.data && response.data.isSuccess) {
        return { success: true, message: response.data.message || 'Xác thực OTP thành công' };
      } else {
        return { success: false, message: response.data?.message || 'OTP không hợp lệ' };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, message: error.response?.data?.message || 'OTP không hợp lệ hoặc đã hết hạn' };
      }
      if (error.response?.status === 400) {
        return { success: false, message: error.response?.data?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại email và mã OTP.' };
      }
      return { success: false, message: error.response?.data?.message || 'Lỗi xác thực OTP' };
    }
  },

  /**
   * Reset Password
   * 
   * Resets password using OTP verification.
   * Uses /otp/verify endpoint which verifies OTP and resets password in one call.
   * 
   * @param {string} email - User's email address
   * @param {string} otp - The OTP code entered by the user
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} Response object with success status
   */
  resetPassword: async (email, otp, newPassword) => {
    try {
      // Backend ResetPasswordSimple expects: Email, OtpCode, NewPassword (PascalCase)
      const requestData = {
        Email: email,
        OtpCode: otp,
        NewPassword: newPassword
      };
      
      // Use /otp/verify endpoint which verifies OTP and resets password
      const response = await api.post('/gateway/iam/auth/otp/verify', requestData);
      
      
      if (response.data && response.data.isSuccess) {
        return { success: true, message: response.data.message || 'Đặt lại mật khẩu thành công' };
      } else {
        return { success: false, message: response.data?.message || 'OTP không hợp lệ hoặc đổi mật khẩu thất bại' };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, message: error.response?.data?.message || 'OTP không hợp lệ hoặc đã hết hạn' };
      }
      if (error.response?.status === 400) {
        return { success: false, message: error.response?.data?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại email, mã OTP và mật khẩu mới.' };
      }
      return { success: false, message: error.response?.data?.message || 'Lỗi đặt lại mật khẩu' };
    }
  },

  /**
   * User Logout
   * 
   * Clears all stored authentication data from localStorage.
   * This includes token, user data, and OTP information.
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('otp');
    localStorage.removeItem('otpEmail');
    localStorage.removeItem('otpExpiry');
  },

  /**
   * Get Current User
   * 
   * Retrieves the currently logged-in user's data from localStorage.
   * 
   * @returns {Object|null} User object or null if not logged in
   */
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check Authentication Status
   * 
   * Verifies if the user is currently authenticated by checking for a valid token.
   * 
   * @returns {boolean} True if user is authenticated, false otherwise
   */
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // ============ ACCOUNT MANAGEMENT OPERATIONS (Admin) ============
  /**
   * Get All Accounts
   * 
   * Retrieves all user accounts (Admin only).
   * GET /gateway/admin/accounts
   * 
   * @returns {Promise<Object>} Response with accounts list
   */
  getAllAccounts: async (options = {}) => {
    try {
      const response = await api.get('/gateway/admin/accounts', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/admin/accounts', { params: { page, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách tài khoản', data: [] };
    }
  },

  /**
   * Get Account By ID
   * 
   * Retrieves a specific account by ID (Admin only).
   * GET /gateway/admin/accounts/{id}
   * 
   * @param {string|number} id - Account ID
   * @returns {Promise<Object>} Response with account data
   */
  getAccountById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing account id' };
      const response = await api.get(`/gateway/admin/accounts/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin tài khoản' };
    }
  },

  /**
   * Create Account
   * 
   * Creates a new user account (Admin only).
   * POST /gateway/admin/accounts
   * 
   * @param {Object} accountData - Account data (username, email, roleId, etc.)
   * @returns {Promise<Object>} Response with created account
   */
  createAccount: async (accountData) => {
    try {
      const response = await api.post('/gateway/admin/accounts', accountData);
      const data = response.data?.data || response.data;
      return { success: true, data, message: 'Tạo tài khoản thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo tài khoản' };
    }
  },

  /**
   * Update Account
   * 
   * Updates an existing account (Admin only).
   * PUT /gateway/admin/accounts/{id}
   * 
   * @param {string|number} id - Account ID
   * @param {Object} accountData - Updated account data
   * @returns {Promise<Object>} Response with updated account
   */
  updateAccount: async (id, accountData) => {
    try {
      if (!id) return { success: false, message: 'Missing account id' };
      const response = await api.put(`/gateway/admin/accounts/${id}`, accountData);
      const data = response.data?.data || response.data;
      return { success: true, data, message: 'Cập nhật tài khoản thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật tài khoản' };
    }
  },

  /**
   * Delete Account
   * 
   * Deletes an account (Admin only).
   * DELETE /gateway/admin/accounts/{id}
   * 
   * @param {string|number} id - Account ID
   * @returns {Promise<Object>} Response with success message
   */
  deleteAccount: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing account id' };
      await api.delete(`/gateway/admin/accounts/${id}`);
      return { success: true, message: 'Xóa tài khoản thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa tài khoản' };
    }
  },

  /**
   * Send OTP (Alternative endpoint)
   * 
   * POST /gateway/iam/auth/otp/sendotp
   * Alternative OTP sending endpoint
   * 
   * @param {string} email - User's email
   * @returns {Promise<Object>} Response with success status
   */
  sendOTPAlt: async (email) => {
    try {
      const response = await api.post('/gateway/iam/auth/otp/sendotp', email, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.isSuccess) {
        return { 
          success: true, 
          message: response.data.message || `OTP đã được gửi đến ${email}`
        };
      } else {
        return { success: false, message: response.data?.message || 'Lỗi gửi OTP' };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi gửi OTP' };
    }
  },

  /**
   * Verify OTP (Alternative endpoint)
   * 
   * POST /gateway/iam/auth/otp/verifyotp
   * Alternative OTP verification endpoint
   * 
   * @param {string} email - User's email
   * @param {string} otp - OTP code
   * @param {string} newPassword - New password (optional)
   * @returns {Promise<Object>} Response with success status
   */
  verifyOTPAlt: async (email, otp, newPassword = null) => {
    try {
      const requestData = {
        email: email,
        otp: otp
      };
      
      if (newPassword) {
        requestData.newPassword = newPassword;
      }
      
      const response = await api.post('/gateway/iam/auth/otp/verifyotp', requestData);
      
      if (response.data && response.data.isSuccess) {
        return { success: true, message: response.data.message || 'Xác thực OTP thành công' };
      } else {
        return { success: false, message: response.data?.message || 'OTP không hợp lệ' };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xác thực OTP' };
    }
  }
};
