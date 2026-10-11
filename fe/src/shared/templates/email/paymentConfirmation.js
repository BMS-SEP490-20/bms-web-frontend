/**
 * Payment Confirmation Email Template
 * 
 * Template for payment confirmation emails sent to patients.
 */

export const getPaymentConfirmationTemplate = (appointment, invoice) => {
  return `Thanh toán thành công cho lịch hẹn ngày ${appointment?.appointmentDate} ca ${appointment?.appointmentTime}. Tổng tiền: ${invoice?.totalAmount || 0} VND. Cảm ơn bạn!`;
};

export const getPaymentConfirmationSubject = (appointment) => {
  return `Xác nhận thanh toán lịch hẹn ${appointment?.appointmentCode || ''}`;
};

