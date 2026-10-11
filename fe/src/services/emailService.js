import api from './api';
import { getPaymentConfirmationTemplate, getPaymentConfirmationSubject } from '../shared/templates/email/paymentConfirmation';
import { getLoginCredentialsTemplate, getLoginCredentialsSubject } from '../shared/templates/email/loginCredentials';
import { getResultNotificationTemplate, getResultNotificationSubject } from '../shared/templates/email/resultNotification';

export const emailService = {
  // Gửi email xác nhận thanh toán (mô phỏng)
  sendPaymentConfirmation: async (patientEmail, appointment, invoice) => {
    try {
      const subject = getPaymentConfirmationSubject(appointment);
      const body = getPaymentConfirmationTemplate(appointment, invoice);
      
      const payload = {
        id: Date.now(),
        to: patientEmail,
        subject,
        body,
        createdAt: new Date().toISOString()
      };
      try {
        await api.post('/emails', payload);
      } catch (_) {}
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Gửi email thất bại' };
    }
  },

  
  // Gửi email thông tin đăng nhập cho bệnh nhân mới đăng ký
  sendLoginCredentials: async (patientEmail, username, password) => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const subject = getLoginCredentialsSubject();
      const body = getLoginCredentialsTemplate(patientEmail, username, password, baseUrl);

      const payload = {
        id: Date.now(),
        to: patientEmail,
        subject,
        body,
        type: 'registration_credentials',
        createdAt: new Date().toISOString()
      };

      try {
        await api.post('/emails', payload);
      } catch (_) {
        // Email endpoint không khả dụng
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Gửi email thông tin đăng nhập thất bại' };
    }
  }
  ,

  // Gửi thông báo cho bác sĩ khi có kết quả chờ duyệt
  sendDoctorNotification: async (doctorEmail, labTestSummary, appointmentInfo = {}) => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const subject = `Có kết quả xét nghiệm chờ duyệt - ${labTestSummary?.id || ''}`;
      const body = `Kính gửi Bác sĩ,\n\nMột kết quả xét nghiệm đã được gửi cho bạn để duyệt.\n\nMã XN: ${labTestSummary?.id || 'N/A'}\nBệnh nhân: ${appointmentInfo?.patientName || labTestSummary?.patientId || 'N/A'}\nNgày: ${labTestSummary?.resultEnteredAt || labTestSummary?.createdAt || ''}\n\nVui lòng đăng nhập hệ thống để xem chi tiết và duyệt kết quả.\n${baseUrl}\n\nTrân trọng.`;

      const payload = {
        id: Date.now(),
        to: doctorEmail,
        subject,
        body,
        type: 'doctor_result_notification',
        createdAt: new Date().toISOString()
      };

      try {
        await api.post('/emails', payload);
      } catch (_) {
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: 'Gửi thông báo cho bác sĩ thất bại' };
    }
  }
  ,

  // Gửi thông báo kết quả xét nghiệm cho bệnh nhân
  sendResultNotification: async (patientEmail, labTest, doctorNotes) => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const subject = getResultNotificationSubject(labTest);
      const body = getResultNotificationTemplate(labTest, doctorNotes, baseUrl);

      const payload = {
        id: Date.now(),
        to: patientEmail,
        subject,
        body,
        type: 'lab_result_notification',
        createdAt: new Date().toISOString()
      };

      try {
        await api.post('/emails', payload);
      } catch (_) {
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: 'Gửi thông báo kết quả thất bại' };
    }
  }
};


