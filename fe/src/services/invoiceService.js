/**
 * Invoice Service
 * 
 * This service handles all invoice-related operations including
 * invoice creation, payment processing, and billing management.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';

/**
 * Normalize payment/invoice data from API to consistent format
 */
const normalizeInvoice = (item = {}) => {
  if (!item) return null;
  
  // Try multiple fields for patientId
  const patientId = item.patientId || item.PatientId || item.patient_id || 
                    item.Patient_Id || item.PatientID || item.patientID || '';
  
  return {
    id: item.id || item.paymentId || item.PaymentId || item.invoiceId || '',
    invoiceNumber: item.invoiceNumber || item.transactionCode || item.TransactionCode || item.txnRef || item.TxnRef || `INV-${(item.id || item.paymentId || '').toString().substring(0, 8).toUpperCase()}`,
    patientId: patientId,
    appointmentId: item.appointmentId || item.AppointmentId || '',
    totalAmount: item.totalAmount || item.amount || item.Amount || 0,
    paidAmount: item.paidAmount || item.amount || item.Amount || 0,
    status: item.status || item.Status || 'pending',
    paymentMethod: item.paymentMethod || item.PaymentMethod || item.transactionCode ? 'bank_transfer' : 'other',
    invoiceDate: item.invoiceDate || item.createdAt || item.CreatedAt || item.paidAt || item.PaidAt || new Date().toISOString(),
    createdAt: item.createdAt || item.CreatedAt || new Date().toISOString(),
    notes: item.notes || item.Notes || '',
    items: item.items || [],
    raw: item
  };
};

/**
 * Invoice Service Object
 * 
 * Contains methods for invoice management and billing operations.
 * All methods return a standardized response object with success status and data/message.
 */
export const invoiceService = {
  /**
   * Get All Invoices
   * 
   * Retrieves a list of all invoices from the database.
   * 
   * @returns {Promise<Object>} Response object with success status and invoice list
   */
  getAllInvoices: async (options = {}) => {
    try {
      const response = await api.get('/gateway/payments', { params: options.params || {} });
      
      // Handle different response formats
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      } else if (response.data?.data) {
        data = Array.isArray(response.data.data) ? response.data.data : [];
      }

      if (options.fetchAll) {
        try {
          const collected = [...data];
          const seen = new Set();
          // Add existing items to seen set
          data.forEach(item => {
            const id = item.id || item.paymentId || item.invoiceId || JSON.stringify(item);
            seen.add(id);
          });
          
          let page = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (data.length > 0 ? data.length : 50) || 50;
          
          while (true) {
            const pagedResp = await api.get('/gateway/payments', { params: { page: page + 1, pageSize: respPageSize } });
            const pageData = Array.isArray(pagedResp.data) 
              ? pagedResp.data 
              : (Array.isArray(pagedResp.data?.data) ? pagedResp.data.data : []);
            
            if (!pageData || pageData.length === 0) break;
            
            let newAdded = 0;
            for (const it of pageData) {
              const id = it.id || it.paymentId || it.invoiceId || JSON.stringify(it);
              if (!seen.has(id)) {
                seen.add(id);
                collected.push(it);
                newAdded += 1;
              }
            }
            
            if (newAdded === 0) break;
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          
          const normalized = collected.map(normalizeInvoice).filter(Boolean);
          return { success: true, data: normalized };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      const normalized = data.map(normalizeInvoice).filter(Boolean);
      return { success: true, data: normalized };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Lỗi lấy danh sách hóa đơn',
        data: [] 
      };
    }
  },

  // Lấy hóa đơn theo ID
  getInvoiceById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing invoice id' };
      const response = await api.get(`/gateway/payments/${id}`);
      const data = response.data?.data || response.data;
      // Handle paginated response
      if (Array.isArray(data) && data.length > 0) {
        const normalized = normalizeInvoice(data[0]);
        return { success: true, data: normalized };
      }
      const normalized = normalizeInvoice(data);
      return { success: true, data: normalized };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi lấy thông tin hóa đơn' };
    }
  },

  /**
   * Lấy hóa đơn theo bệnh nhân
   * 
   * Sử dụng endpoint: GET /gateway/payments/by-patient/{patientId}
   * Backend trả về paginated data: { data: [...], page, pageSize, totalCount, totalPages }
   * 
   * @param {string|Guid} patientId - Patient ID (GUID format)
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Items per page (default: 100 to get all)
   * @returns {Promise<Object>} Response object with success status and invoice list
   */
  getInvoicesByPatient: async (patientId, page = 1, pageSize = 100) => {
    try {
      if (!patientId) {
        return { success: false, message: 'Patient ID is required', data: [] };
      }
      
      // Backend endpoint: GET /payments/by-patient/{patientId}?page=1&pageSize=100
      const response = await api.get(`/gateway/payments/by-patient/${patientId}`, {
        params: { page, pageSize }
      });
      
      // Backend returns: { data: [...], page, pageSize, totalCount, totalPages }
      const responseData = response.data?.data || response.data || [];
      const invoices = Array.isArray(responseData) ? responseData : [];
      const normalized = invoices.map(normalizeInvoice).filter(Boolean);
      
      return { success: true, data: normalized };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 
                error.response?.data?.title ||
                'Lỗi lấy hóa đơn theo bệnh nhân',
        data: [] 
      };
    }
  },

  // Tạo hóa đơn mới
  createInvoice: async (invoiceData) => {
    try {
      const newInvoice = {
        ...invoiceData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };
      
      const response = await api.post('/gateway/payments', newInvoice);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo hóa đơn mới' };
    }
  },

  // Cập nhật hóa đơn
  updateInvoice: async (id, invoiceData) => {
    try {
      const response = await api.put(`/gateway/payments/${id}`, invoiceData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật hóa đơn' };
    }
  },

  // Xóa hóa đơn
  deleteInvoice: async (id) => {
    try {
      await api.delete(`/gateway/payments/${id}`);
      return { success: true, message: 'Xóa hóa đơn thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa hóa đơn' };
    }
  },

  // Ghi nhận thanh toán
  recordPayment: async (id, paymentData) => {
    try {
      const response = await api.patch(`/gateway/payments/${id}`, {
        ...paymentData,
        paidAmount: paymentData.amount,
        status: 'paid'
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi ghi nhận thanh toán' };
    }
  },

  // Hoàn tiền theo chính sách
  refundInvoice: async (invoiceId, policy) => {
    try {
      const invoiceResp = await api.get(`/invoices/${invoiceId}`);
      const invoice = invoiceResp.data;
      if (!invoice) {
        return { success: false, message: 'Không tìm thấy hóa đơn' };
      }

      let refundRate = 0;
      if (policy === 'same_day') {
        refundRate = 1.0; // 100%
      } else if (policy === 'one_day_before') {
        refundRate = 0.7; // 70%
      } else {
        refundRate = 0; // 0%
      }

      const refundAmount = Math.round((invoice.paidAmount || 0) * refundRate);

      const response = await api.patch(`/invoices/${invoiceId}`, {
        status: refundRate === 1 ? 'refunded_full' : refundRate > 0 ? 'refunded_partial' : invoice.status,
        refundAmount,
        refundedAt: new Date().toISOString()
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi hoàn tiền hóa đơn' };
    }
  },

  // Lấy doanh thu theo ngày
  getRevenueByDate: async (date) => {
    try {
      const response = await api.get('/gateway/payments');
      const invoices = response.data.filter(invoice => {
        const invoiceDate = new Date(invoice.createdAt).toISOString().split('T')[0];
        return invoiceDate === date && invoice.status === 'paid';
      });
      
      const totalRevenue = invoices.reduce((sum, invoice) => 
        sum + invoice.paidAmount, 0
      );
      
      return { success: true, data: { totalRevenue, invoices } };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy doanh thu theo ngày' };
    }
  },

  // Lấy doanh thu theo tháng
  getRevenueByMonth: async (year, month) => {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      
      const response = await api.get('/gateway/payments');
      const invoices = response.data.filter(invoice => {
        const invoiceDate = new Date(invoice.createdAt).toISOString().split('T')[0];
        return invoice.status === 'paid' && invoiceDate >= startDate && invoiceDate <= endDate;
      });
      
      const totalRevenue = invoices.reduce((sum, invoice) => 
        sum + invoice.paidAmount, 0
      );
      
      return { success: true, data: { totalRevenue, invoices } };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy doanh thu theo tháng' };
    }
  },

  // Tạo PDF hóa đơn (mô phỏng)
  generatePDFInvoice: async (invoiceId) => {
    try {
      const invoiceResponse = await api.get(`/invoices/${invoiceId}`);
      const invoice = invoiceResponse.data;
      
      // Trong thực tế, đây sẽ là API tạo PDF thật
      const pdfData = {
        invoiceId: invoice.id,
        patientName: invoice.patientName || 'N/A',
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        createdAt: invoice.createdAt,
        items: invoice.items || []
      };
      
      return { success: true, data: pdfData };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo PDF hóa đơn' };
    }
  }
};
