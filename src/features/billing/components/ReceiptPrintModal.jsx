import React from 'react';
import { PosThermalModal } from '../../../shared/components/PosThermalSlip';
import { formatPaymentMethodVi, numberToVietnameseWords } from './VatInvoiceModal';

export default function ReceiptPrintModal({ printData, onClose }) {
  if (!printData) return null;

  const receiptNo = printData.receiptNumber || printData.invoiceCode || 'BL-BMS-0001';
  const invoiceCode = printData.invoiceCode || receiptNo;
  const printedAtDate = printData.printedAt ? new Date(printData.printedAt) : new Date();
  const printedAtText = printedAtDate.toLocaleString('vi-VN');

  const items = (printData.items || []).map((item) => ({
    name: item.itemName || item.name || 'Dịch vụ xét nghiệm y khoa',
    unit: item.unit || 'lần',
    quantity: Number(item.quantity || 1),
    unitPrice: Number(item.unitPrice || 0),
    totalPrice: Number(item.totalPrice ?? (Number(item.quantity || 1) * Number(item.unitPrice || 0))),
  }));

  const totalAmount = Number(printData.totalAmount || 0);
  const subTotal = Number(printData.subTotal ?? totalAmount);
  const discountAmount = Number(printData.discountAmount || 0);
  const amountInWords = printData.totalAmountInWords || numberToVietnameseWords(totalAmount);

  const qrValue = `BMS-HOADON|${invoiceCode}|${receiptNo}|${totalAmount}VND`;

  return (
    <PosThermalModal
      show={Boolean(printData)}
      onClose={onClose}
      modalTitle="Biên Lai Thu Phí Dịch Vụ Y Tế"
      modalBadge={`POS K80 • Lần in #${printData.printCount || 1}`}
      modalSubtitle={`Số BL: ${receiptNo} • Thu ngân: ${printData.cashierName || 'Thu ngân BMS'}`}
      printTitle={`Bien_Lai_POS_K80_${receiptNo}`}
      printButtonLabel="In Biên Lai POS (K80)"
      copyText={invoiceCode}
      copyButtonLabel="Sao chép mã HĐ"
      slipProps={{
        clinicName: printData.clinicName || 'PHÒNG XÉT NGHIỆM Y KHOA BMS',
        clinicAddress: printData.clinicAddress || '120 Hai Bà Trưng, P. Đa Kao, Q.1, TP.HCM',
        clinicHotline: printData.clinicHotline || '1900 6868',
        reprintWarning: printData.isReprint
          ? (printData.reprintWarning || `BẢN IN LẠI LẦN THỨ ${printData.printCount}`)
          : '',
        title: 'HÓA ĐƠN THU PHÍ DỊCH VỤ',
        subtitle: `(Bản lưu bệnh nhân) • ${printedAtText}`,
        statusBadge: 'ĐÃ THANH TOÁN ĐỦ',
        metaRows: [
          { label: 'Số biên lai', value: receiptNo, mono: true },
          { label: 'Mã hóa đơn', value: invoiceCode, mono: true },
          { label: 'Thu ngân', value: printData.cashierName || 'Thu ngân BMS' },
        ],
        sections: [
          {
            title: 'Thông tin bệnh nhân',
            rows: [
              { label: 'Họ và tên', value: printData.patientName || 'Khách hàng' },
              { label: 'Số điện thoại', value: printData.patientPhone || '', mono: true },
            ],
          },
        ],
        items,
        totals: {
          subTotal,
          discountAmount,
          totalAmount,
          amountInWords,
          paymentMethod: formatPaymentMethodVi(printData.paymentMethod),
        },
        qr: {
          value: qrValue,
          codeText: receiptNo,
          caption: 'Quét mã QR để đối chiếu phiếu thu phí',
          size: 108,
        },
        footerNote: 'Vui lòng giữ lại biên lai để đối chiếu khi nhận kết quả xét nghiệm.',
        printedAt: printedAtDate,
      }}
    />
  );
}
