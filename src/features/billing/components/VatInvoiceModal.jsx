import React from 'react';
import PropTypes from 'prop-types';
import { PosThermalModal } from '../../../shared/components/PosThermalSlip';

/**
 * Utility: Convert numeric amount into formal Vietnamese words (Đọc số tiền bằng chữ).
 */
function readGroup3(group, isFirst) {
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const hundred = Math.floor(group / 100);
  const remainder = group % 100;
  const ten = Math.floor(remainder / 10);
  const unit = remainder % 10;
  let str = '';

  if (hundred > 0 || !isFirst) {
    str += digits[hundred] + ' trăm ';
  }

  if (ten > 1) {
    str += digits[ten] + ' mươi ';
    if (unit === 1) str += 'mốt ';
    else if (unit === 5) str += 'lăm ';
    else if (unit > 0) str += digits[unit] + ' ';
  } else if (ten === 1) {
    str += 'mười ';
    if (unit === 5) str += 'lăm ';
    else if (unit > 0) str += digits[unit] + ' ';
  } else if (ten === 0 && unit > 0) {
    if (hundred > 0 || !isFirst) str += 'lẻ ' + digits[unit] + ' ';
    else str += digits[unit] + ' ';
  }

  return str.trim();
}

export function numberToVietnameseWords(num) {
  if (!num || num === 0) return 'Không đồng chẵn.';
  num = Math.round(Number(num));
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  const groups = [];
  let temp = num;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const isFirst = i === groups.length - 1;
      let gStr = readGroup3(groupVal, isFirst);
      if (scales[i]) gStr += ' ' + scales[i];
      words.push(gStr);
    }
  }

  let result = words.join(' ').replace(/\s+/g, ' ').trim();
  result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.';
  return result;
}

export function formatPaymentMethodVi(method) {
  const m = String(method || '').trim().toLowerCase();
  if (!m || m === '—') return 'Thanh toán trực tiếp';
  if (m.includes('qr') || m.includes('sepay') || m.includes('bank') || m.includes('transfer')) {
    return 'Chuyển khoản (VietQR)';
  }
  if (m.includes('vnpay')) return 'Cổng thanh toán VNPAY';
  if (m.includes('momo')) return 'Ví điện tử MoMo';
  if (m.includes('card') || m.includes('pos')) return 'Thẻ ngân hàng (POS)';
  if (m.includes('cash') || m.includes('tiền mặt')) return 'Tiền mặt tại quầy';
  return method;
}

export default function VatInvoiceModal({ show, onClose, invoiceData, patientData }) {
  if (!show || !invoiceData) return null;

  const invoiceNumberRaw = invoiceData.invoiceNumber || invoiceData.invoiceCode || 'INV-BMS-0001';
  const numericPartMatch = String(invoiceNumberRaw).match(/\d+$/);
  const serialNoFormatted = numericPartMatch ? numericPartMatch[0].padStart(7, '0') : '0000001';

  const paidDate = invoiceData.paidAt || invoiceData.createdAt
    ? new Date(invoiceData.paidAt || invoiceData.createdAt)
    : new Date();
  const formattedTime = paidDate.toLocaleString('vi-VN');

  const patientName = patientData?.fullName || invoiceData.patientName || 'Khách hàng';
  const patientCode = patientData?.patientCode || invoiceData.patientId || '';
  const citizenId = patientData?.citizenId || patientData?.identityNumber || patientData?.cccd || '';
  const patientPhone = patientData?.phone || invoiceData.patientPhone || '';
  const appointmentCode = invoiceData.appointmentCode || '';
  const paymentMethodLabel = formatPaymentMethodVi(invoiceData.paymentMethod);
  const transactionCode = invoiceData.transactionCode || '';

  const totalAmount = Number(invoiceData.amount || invoiceData.totalAmount || invoiceData.finalAmount || 0);
  const discountAmount = Number(invoiceData.discountAmount || 0);
  const rawItems = invoiceData.items && invoiceData.items.length > 0
    ? invoiceData.items
    : [
        {
          itemName: invoiceData.packageName || 'Dịch vụ xét nghiệm y khoa',
          unit: 'gói',
          quantity: 1,
          unitPrice: totalAmount + discountAmount,
          totalPrice: totalAmount + discountAmount,
        },
      ];

  const items = rawItems.map((item) => ({
    name: item.itemName || item.name || 'Dịch vụ xét nghiệm y khoa',
    unit: item.unit || 'lần',
    quantity: Number(item.quantity || 1),
    unitPrice: Number(item.unitPrice || item.totalPrice || 0),
    totalPrice: Number(item.totalPrice ?? (Number(item.quantity || 1) * Number(item.unitPrice || 0))),
  }));

  const subTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const finalTotal = Math.max(0, totalAmount > 0 ? totalAmount : subTotal - discountAmount);
  const amountInWords = numberToVietnameseWords(finalTotal);

  const receiptQrValue = `BMS-HOADON|${invoiceNumberRaw}|${appointmentCode || 'WALKIN'}|${patientCode || 'GUEST'}|${finalTotal}VND`;

  return (
    <PosThermalModal
      show={show}
      onClose={onClose}
      modalTitle="Hóa Đơn Thu Phí Dịch Vụ Y Tế"
      modalBadge="Khổ máy POS K80"
      modalSubtitle={`Mã HĐ: ${invoiceNumberRaw} • Ngày lập: ${formattedTime}`}
      printTitle={`Hoa_Don_Thu_Phi_POS_${invoiceNumberRaw}`}
      printButtonLabel="In Hóa Đơn POS (K80)"
      copyText={invoiceNumberRaw}
      copyButtonLabel="Sao chép mã HĐ"
      slipProps={{
        title: 'HÓA ĐƠN THU PHÍ DỊCH VỤ',
        subtitle: `Số phiếu: ${serialNoFormatted} • ${formattedTime}`,
        statusBadge: 'ĐÃ THANH TOÁN ĐỦ',
        metaRows: [
          { label: 'Mã hóa đơn', value: invoiceNumberRaw, mono: true },
          { label: 'Mã lịch hẹn', value: appointmentCode, mono: true },
          { label: 'Thu ngân', value: invoiceData.cashierName || 'Bộ phận Thu ngân BMS' },
        ],
        sections: [
          {
            title: 'Thông tin bệnh nhân',
            rows: [
              { label: 'Họ và tên', value: patientName },
              { label: 'Mã BN', value: patientCode, mono: true },
              { label: 'CCCD / SĐT', value: citizenId || patientPhone, mono: true },
            ],
          },
        ],
        items,
        totals: {
          subTotal,
          discountAmount,
          totalAmount: finalTotal,
          amountInWords,
          paymentMethod: paymentMethodLabel,
          transactionCode,
        },
        qr: {
          value: receiptQrValue,
          codeText: invoiceNumberRaw,
          caption: 'Quét mã QR để đối chiếu phiếu thu phí',
          size: 108,
        },
        footerNote: 'Dịch vụ y tế không chịu thuế GTGT. Vui lòng giữ phiếu để đối chiếu khi nhận kết quả.',
        printedAt: paidDate,
      }}
    />
  );
}

VatInvoiceModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  invoiceData: PropTypes.object,
  patientData: PropTypes.object,
};
