/**
 * VNPay Service
 * 
 * This service handles VNPay payment gateway integration
 * for processing payments through VNPay.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';

/**
 * VNPay Service Object
 * 
 * Contains methods for VNPay payment processing.
 * All methods return a standardized response object with success status and data/message.
 */
export const vnpayService = {
  /**
   * Create Payment URL
   * 
   * Creates a VNPay payment URL for the given amount and description.
   * 
   * @param {number} money - Amount to pay (in VND)
   * @param {string} description - Payment description
   * @returns {Promise<Object>} Response object with success status and payment URL
   */
  createPaymentUrl: async (money, description) => {
    try {
      // Remove special characters and accents from description for VNPay
      const cleanDescription = description
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .trim()
        .substring(0, 100); // Limit to 100 characters

      const response = await api.get('/gateway/Vnpay/CreatePaymentUrl', {
        params: {
          money: money,
          description: cleanDescription
        }
      });


      // VNPay API returns Created(paymentUrl, paymentUrl)
      // Response can be: string URL, or { data: URL }, or { value: URL }
      let paymentUrl = null;
      
      if (typeof response.data === 'string') {
        // Direct URL string
        paymentUrl = response.data;
      } else if (response.data?.value) {
        // Created response with value property
        paymentUrl = response.data.value;
      } else if (response.data?.data) {
        // Nested data
        paymentUrl = response.data.data;
      } else if (response.data) {
        // Try direct access
        paymentUrl = response.data;
      }
      
      if (!paymentUrl || typeof paymentUrl !== 'string') {
        return { success: false, message: 'Không nhận được URL thanh toán từ VNPay' };
      }

      return { success: true, data: paymentUrl, url: paymentUrl };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Lỗi tạo URL thanh toán VNPay' 
      };
    }
  },

  /**
   * Handle Payment Callback
   * 
   * Processes the callback from VNPay after payment.
   * 
   * @param {Object} queryParams - Query parameters from VNPay callback
   * @returns {Promise<Object>} Response object with payment result
   */
  handleCallback: async (queryParams) => {
    try {
      const response = await api.get('/gateway/Vnpay/Callback', {
        params: queryParams
      });

      return { success: true, data: response.data };
    } catch (error) {
      // Backend returns 400 BadRequest when IsSuccess = false, but still includes paymentResult in body
      // We need to check if error.response.data contains payment result data
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data;
        
        // Check if this is a PaymentResult object (has isSuccess, paymentResponse, etc.)
        if (errorData.isSuccess !== undefined || errorData.paymentResponse || errorData.transactionStatus) {
          // Treat this as success - we got the payment result, just with isSuccess = false
          return { success: true, data: errorData };
        }
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Lỗi xử lý callback từ VNPay',
        data: error.response?.data // Include data in case it's useful
      };
    }
  },

  /**
   * Handle IPN (Instant Payment Notification)
   * 
   * Processes IPN from VNPay (server-to-server notification).
   * 
   * @param {Object} queryParams - Query parameters from VNPay IPN
   * @returns {Promise<Object>} Response object with IPN result
   */
  handleIpn: async (queryParams) => {
    try {
      const response = await api.get('/gateway/Vnpay/IpnAction', {
        params: queryParams
      });

      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Lỗi xử lý IPN từ VNPay' 
      };
    }
  },

  // ============ PAYMENT OPERATIONS ============
  /**
   * Get All Payments
   * 
   * Retrieves all payment records.
   * GET /gateway/payments
   * 
   * @returns {Promise<Object>} Response with payments list
   */
  getAllPayments: async (options = {}) => {
    try {
      const response = await api.get('/gateway/payments', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/payments', { params: { page, pageSize: respPageSize } });
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
      return { success: false, message: 'Lỗi lấy danh sách thanh toán', data: [] };
    }
  },

  /**
   * Get Payment By ID
   * 
   * Retrieves a specific payment by ID.
   * GET /gateway/payments/{id}
   * 
   * @param {string|number} id - Payment ID
   * @returns {Promise<Object>} Response with payment data
   */
  getPaymentById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing payment id' };
      const response = await api.get(`/gateway/payments/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin thanh toán' };
    }
  },

  /**
   * Create Payment
   * 
   * Creates a new payment record.
   * POST /gateway/payments
   * 
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Response with created payment
   */
  createPayment: async (paymentData) => {
    try {
      const response = await api.post('/gateway/payments', paymentData);
      const data = response.data?.data || response.data;
      return { success: true, data, message: 'Tạo thanh toán thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo thanh toán' };
    }
  },

  /**
   * Update Payment
   * 
   * Updates an existing payment record.
   * PUT /gateway/payments/{id}
   * 
   * @param {string|number} id - Payment ID
   * @param {Object} paymentData - Updated payment data
   * @returns {Promise<Object>} Response with updated payment
   */
  updatePayment: async (id, paymentData) => {
    try {
      if (!id) return { success: false, message: 'Missing payment id' };
      const response = await api.put(`/gateway/payments/${id}`, paymentData);
      const data = response.data?.data || response.data;
      return { success: true, data, message: 'Cập nhật thanh toán thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật thanh toán' };
    }
  },

  /**
   * Delete Payment
   * 
   * Deletes a payment record.
   * DELETE /gateway/payments/{id}
   * 
   * @param {string|number} id - Payment ID
   * @returns {Promise<Object>} Response with success message
   */
  deletePayment: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing payment id' };
      await api.delete(`/gateway/payments/${id}`);
      return { success: true, message: 'Xóa thanh toán thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa thanh toán' };
    }
  },

  /**
   * Update Payment Status
   * 
   * Updates the status of a payment.
   * PUT /gateway/payments/{id}/status
   * 
   * @param {string|number} id - Payment ID
   * @param {Object} statusData - Status data (e.g., { status: 'PAID' })
   * @returns {Promise<Object>} Response with updated payment
   */
  updatePaymentStatus: async (id, statusData) => {
    try {
      if (!id) return { success: false, message: 'Missing payment id' };
      const response = await api.put(`/gateway/payments/${id}/status`, statusData);
      const data = response.data?.data || response.data;
      return { success: true, data, message: 'Cập nhật trạng thái thanh toán thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật trạng thái thanh toán' };
    }
  }
};

