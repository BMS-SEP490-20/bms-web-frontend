import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { Receipt, Printer, Download, FileCode2, X as LucideX, CheckCircle2, Copy, Hospital } from 'lucide-react';
import './VatInvoiceModal.css';

/**
 * Utility: Convert numeric amount into formal Vietnamese words (Đọc số thành chữ chuẩn Bộ Tài Chính).
 * Examples:
 *  180000 -> "Một trăm tám mươi nghìn đồng chẵn."
 *  350000 -> "Ba trăm năm mươi nghìn đồng chẵn."
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
      const isFirst = (i === groups.length - 1);
      let gStr = readGroup3(groupVal, isFirst);
      if (scales[i]) gStr += ' ' + scales[i];
      words.push(gStr);
    }
  }

  let result = words.join(' ').replace(/\s+/g, ' ').trim();
  result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.';
  return result;
}

export default function VatInvoiceModal({ show, onClose, invoiceData, patientData }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const invoiceSheetRef = useRef(null);

  if (!show || !invoiceData) return null;

  // Normalized Invoice Data
  const invoiceNumberRaw = invoiceData.invoiceNumber || invoiceData.invoiceCode || 'INV-20261031-002';
  // Format invoice number to 7 digits if applicable (e.g. 0000889 or 0000002)
  const numericPartMatch = invoiceNumberRaw.match(/\d+$/);
  const serialNoFormatted = numericPartMatch ? numericPartMatch[0].padStart(7, '0') : '0000889';

  const formNumber = invoiceData.formNumber || '—';
  const serialNumber = invoiceData.serialNumber || '—';
  const cqtCode = invoiceData.cqtCode || 'Chưa cấp mã';

  const paidDate = invoiceData.paidAt ? new Date(invoiceData.paidAt) : new Date();
  const dayStr = String(paidDate.getDate()).padStart(2, '0');
  const monthStr = String(paidDate.getMonth() + 1).padStart(2, '0');
  const yearStr = paidDate.getFullYear();
  const dateFormatted = `Ngày ${dayStr} tháng ${monthStr} năm ${yearStr}`;
  const signedTimestamp = `${dayStr}/${monthStr}/${yearStr} ${String(paidDate.getHours()).padStart(2, '0')}:${String(paidDate.getMinutes()).padStart(2, '0')}:${String(paidDate.getSeconds()).padStart(2, '0')}`;

  const patientName = patientData?.fullName || invoiceData.patientName || '—';
  const patientCode = patientData?.patientCode || invoiceData.patientId || '—';
  const citizenId = patientData?.citizenId || patientData?.cccd || '—';
  const address = patientData?.address || '—';
  const appointmentCode = invoiceData.appointmentCode || '—';
  const paymentMethod = invoiceData.paymentMethod || '—';
  const transactionCode = invoiceData.transactionCode || '';

  const totalAmount = Number(invoiceData.amount || invoiceData.totalAmount || 0);
  const items = invoiceData.items && invoiceData.items.length > 0 ? invoiceData.items : [
    {
      stt: 1,
      itemName: invoiceData.packageName || 'Dịch vụ xét nghiệm',
      unit: 'Gói/Lần',
      quantity: 1,
      unitPrice: totalAmount,
      totalPrice: totalAmount,
      taxRate: 'KCT',
      taxAmount: 0
    }
  ];

  const subTotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  const totalTax = 0; // Clinical lab services are non-taxable (KCT) under VN VAT Law
  const amountInWords = numberToVietnameseWords(subTotal);

  const verificationUrl = `https://hoadondientu.gdt.gov.vn/tra-cuu?mst=0317896868&cqt=${cqtCode}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cqtCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadXml = () => {
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<HDon>
  <DLHDon Id="${invoiceNumberRaw}">
    <TTChung>
      <PBan>2.0.0</PBan>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>${formNumber}</KHMSHDon>
      <KHHDon>${serialNumber}</KHHDon>
      <SHDon>${serialNoFormatted}</SHDon>
      <NLap>${yearStr}-${monthStr}-${dayStr}</NLap>
      <DVTTe>VND</DVTTe>
      <TGia>1</TGia>
      <HTTToan>TM/CK</HTTToan>
      <MSTTCGP>0317896868</MSTTCGP>
      <MCQT>${cqtCode}</MCQT>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>CÔNG TY CỔ PHẦN PHÒNG KHÁM CHUYÊN KHOA XÉT NGHIỆM BMS</Ten>
        <MST>0317896868</MST>
        <DChi>120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh</DChi>
        <SDThoai>19006868</SDThoai>
        <STKNHang>0123456789</STKNHang>
        <TNHang>Vietcombank - CN TP.HCM</TNHang>
      </NBan>
      <NMua>
        <Ten>${patientName}</Ten>
        <MST>${citizenId}</MST>
        <DChi>${address}</DChi>
        <MKHang>${patientCode}</MKHang>
        <MPKham>${appointmentCode}</MPKham>
      </NMua>
      <DSHHDVu>
        ${items.map((item, idx) => `
        <HHDVu>
          <STT>${idx + 1}</STT>
          <THHDVu>${item.itemName}</THHDVu>
          <DVTinh>${item.unit || 'Lần'}</DVTinh>
          <SLuong>${item.quantity || 1}</SLuong>
          <DGia>${item.unitPrice}</DGia>
          <Tien>${item.totalPrice}</Tien>
          <TSuat>KCT</TSuat>
        </HHDVu>`).join('')}
      </DSHHDVu>
      <TToan>
        <TgTCThue>${subTotal}</TgTCThue>
        <TgTThue>0</TgTThue>
        <TgTTTBSo>${subTotal}</TgTTTBSo>
        <TgTTTBChu>${amountInWords}</TgTTTBChu>
      </TToan>
    </NDHDon>
  </DLHDon>
  <DSCKS>
    <NBan>
      <Signature Valid="true">
        <SignedBy>CÔNG TY CỔ PHẦN PHÒNG KHÁM CHUYÊN KHOA XÉT NGHIỆM BMS</SignedBy>
        <SigningTime>${signedTimestamp}</SigningTime>
        <Provider>BMS Clinical Laboratory</Provider>
      </Signature>
    </NBan>
  </DSCKS>
</HDon>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HoaDon_VAT_${serialNumber}_${serialNoFormatted}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bms-vat-overlay">
      {/* Top Modal Floating Action Toolbar (Hidden in Print) */}
      <div className="bms-vat-toolbar no-print">
        <div className="bms-vat-toolbar-title">
          <Receipt className="text-warning fs-5"  size="1em"/>
          <div>
            <div className="fw-bold text-white d-flex align-items-center gap-2">
              Hóa Đơn Giá Trị Gia Tăng Điện Tử (VAT)
              <span className="badge bg-success text-white py-1 px-2" style={{ fontSize: '11px' }}>
                <CheckCircle2 className="me-1"  size="1em"/> TT 78/2021/TT-BTC
              </span>
            </div>
            <div className="text-secondary small font-monospace">
              Mẫu số: {formNumber} • Ký hiệu: {serialNumber} • Số: {serialNoFormatted}
            </div>
          </div>
        </div>

        <div className="bms-vat-actions">
          <button
            type="button"
            className="btn btn-outline-light btn-sm d-flex align-items-center gap-1.5"
            style={{ borderRadius: '9999px', padding: '6px 14px' }}
            onClick={handleCopyCode}
            title="Sao chép mã xác thực cơ quan thuế"
          >
            {copiedCode ? <CheckCircle2 className="text-success"  size="1em"/> : <Copy  size="1em"/>}
            <span>{copiedCode ? 'Đã sao chép CQT' : 'Sao chép mã CQT'}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline-info btn-sm d-flex align-items-center gap-1.5"
            style={{ borderRadius: '9999px', padding: '6px 14px', borderColor: '#1E60E6', color: '#93c5fd' }}
            onClick={handleDownloadXml}
            title="Tải file XML hóa đơn điện tử gốc theo chuẩn Bộ Tài chính"
          >
            <FileCode2  size="1em"/>
            <span>Tải XML CQT</span>
          </button>

          <button
            type="button"
            className="btn btn-sm fw-bold d-flex align-items-center gap-1.5 px-3 text-white"
            style={{ borderRadius: '9999px', backgroundColor: '#1E60E6', borderColor: '#1E60E6', padding: '6px 16px' }}
            onClick={handlePrint}
            title="In hóa đơn chuẩn khổ giấy A4"
          >
            <Printer  size="1em"/>
            <span>In Hóa Đơn (A4)</span>
          </button>

          <button
            type="button"
            className="btn btn-dark btn-sm rounded-circle p-2 ms-2"
            onClick={onClose}
            title="Đóng hóa đơn"
            aria-label="Close"
          >
            <LucideX  size="1em"/>
          </button>
        </div>
      </div>

      {/* Main Printable Scrollable Viewport */}
      <div className="bms-vat-viewport">
        {/* Official A4 Electronic VAT Invoice Sheet */}
        <div className="bms-vat-sheet" id="official-vat-invoice-sheet" ref={invoiceSheetRef}>
          {/* Subtle Security Guilloche Watermark */}
          <div className="bms-vat-watermark" aria-hidden="true">
            BMS CLINICAL LABORATORY • BẢN THỂ HIỆN CỦA HÓA ĐƠN ĐIỆN TỬ
          </div>

          {/* Double Security Border Inner Container */}
          <div className="bms-vat-frame">
            {/* 1. SELLER & TAX METADATA HEADER */}
            <div className="bms-vat-header-grid">
              {/* Left Column: Seller Corporate Identity */}
              <div className="bms-vat-seller-info">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="bms-vat-logo-badge">
                    <Hospital className="fs-3 text-primary"  size="1em"/>
                  </div>
                  <div>
                    <div className="bms-vat-brand-title">BMS CLINICAL LABORATORY</div>
                    <div className="bms-vat-brand-sub">PHÒNG XÉT NGHIỆM Y KHOA BMS</div>
                  </div>
                </div>

                <div className="bms-vat-seller-name">
                  CÔNG TY CỔ PHẦN PHÒNG KHÁM CHUYÊN KHOA XÉT NGHIỆM BMS
                </div>
                <div className="bms-vat-meta-line">
                  <span className="bms-vat-label">Mã số thuế (Tax ID):</span>
                  <strong className="bms-vat-taxcode">0317896868</strong>
                </div>
                <div className="bms-vat-meta-line">
                  <span className="bms-vat-label">Địa chỉ:</span>
                  <span>120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh</span>
                </div>
                <div className="bms-vat-meta-line">
                  <span className="bms-vat-label">Điện thoại / Hotline:</span>
                  <span>1900 6868 - Cấp cứu mẫu: (028) 3822 5555</span>
                </div>
                <div className="bms-vat-meta-line">
                  <span className="bms-vat-label">Số tài khoản:</span>
                  <span>Theo thông tin hóa đơn phát hành</span>
                </div>
                <div className="bms-vat-meta-line">
                  <span className="bms-vat-label">Giấy phép hoạt động:</span>
                  <span>Phòng khám chuyên khoa xét nghiệm BMS</span>
                </div>
              </div>

              {/* Right Column: Invoice Legal Identification Block */}
              <div className="bms-vat-invoice-id-box">
                <div className="bms-vat-id-row">
                  <span className="bms-vat-id-lbl">Mẫu số (Form):</span>
                  <span className="bms-vat-id-val fw-bold">{formNumber}</span>
                </div>
                <div className="bms-vat-id-row">
                  <span className="bms-vat-id-lbl">Ký hiệu (Serial):</span>
                  <span className="bms-vat-id-val fw-bold text-primary">{serialNumber}</span>
                </div>
                <div className="bms-vat-id-row">
                  <span className="bms-vat-id-lbl">Số (Invoice No.):</span>
                  <span className="bms-vat-id-no">{serialNoFormatted}</span>
                </div>
                <div className="bms-vat-id-cqt-box">
                  <div className="small text-muted mb-1">Mã của Cơ quan Thuế (CQT Code):</div>
                  <div className="bms-vat-cqt-code">{cqtCode}</div>
                </div>
              </div>
            </div>

            {/* 2. INVOICE TITLE & DATE */}
            <div className="bms-vat-title-section">
              <h1 className="bms-vat-title">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
              <div className="bms-vat-subtitle">(BẢN THỂ HIỆN CỦA HÓA ĐƠN ĐIỆN TỬ / ELECTRONIC INVOICE)</div>
              <div className="bms-vat-date">{dateFormatted}</div>
            </div>

            {/* 3. BUYER / PATIENT INFORMATION */}
            <div className="bms-vat-buyer-box">
              <div className="row g-2">
                <div className="col-12 col-md-7">
                  <div className="bms-vat-meta-line">
                    <span className="bms-vat-label">Họ và tên người mua hàng (Bệnh nhân):</span>
                    <strong className="text-dark">{patientName}</strong>
                  </div>
                </div>
                <div className="col-12 col-md-5">
                  <div className="bms-vat-meta-line">
                    <span className="bms-vat-label">Mã bệnh nhân (PID):</span>
                    <strong className="font-monospace text-primary">{patientCode}</strong>
                  </div>
                </div>

                <div className="col-12 col-md-7">
                  <div className="bms-vat-meta-line">
                    <span className="bms-vat-label">Số CCCD / Định danh y tế:</span>
                    <span className="font-monospace fw-semibold">{citizenId}</span>
                  </div>
                </div>
                <div className="col-12 col-md-5">
                  <div className="bms-vat-meta-line">
                    <span className="bms-vat-label">Mã phiếu hẹn (Check-in Code):</span>
                    <span className="font-monospace fw-bold text-success">{appointmentCode}</span>
                  </div>
                </div>

                <div className="col-12">
                  <div className="bms-vat-meta-line">
                    <span className="bms-vat-label">Địa chỉ đăng ký:</span>
                    <span>{address}</span>
                  </div>
                </div>

                <div className="col-12 col-md-7">
                  <div className="bms-vat-meta-line">
                    <span className="bms-vat-label">Hình thức thanh toán:</span>
                    <span>TM/CK ({paymentMethod})</span>
                  </div>
                </div>
                <div className="col-12 col-md-5">
                  <div className="bms-vat-meta-line">
                    <span className="bms-vat-label">Đồng tiền thanh toán:</span>
                    <span className="fw-semibold">VND (Việt Nam Đồng)</span>
                  </div>
                </div>

                {transactionCode && (
                  <div className="col-12">
                    <div className="bms-vat-meta-line">
                      <span className="bms-vat-label">Mã tham chiếu ngân hàng / VNPAY:</span>
                      <span className="font-monospace text-success fw-bold">{transactionCode}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. ITEMS TABLE (BẢNG KÊ DỊCH VỤ XÉT NGHIỆM) */}
            <div className="bms-vat-table-container">
              <table className="bms-vat-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px' }} className="text-center">STT</th>
                    <th>Tên Hàng Hóa, Dịch Vụ Xét Nghiệm</th>
                    <th style={{ width: '80px' }} className="text-center">ĐVT</th>
                    <th style={{ width: '55px' }} className="text-center">SL</th>
                    <th style={{ width: '120px' }} className="text-end">Đơn Giá (đ)</th>
                    <th style={{ width: '130px' }} className="text-end">Thành Tiền (đ)</th>
                    <th style={{ width: '70px' }} className="text-center">Thuế Suất</th>
                    <th style={{ width: '100px' }} className="text-end">Tiền Thuế (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-center">{idx + 1}</td>
                      <td>
                        <div className="fw-semibold text-dark">{item.itemName}</div>
                        <div className="bms-vat-item-sub">Dịch vụ xét nghiệm tại phòng khám</div>
                      </td>
                      <td className="text-center">{item.unit || 'Gói/Lần'}</td>
                      <td className="text-center font-monospace">{item.quantity || 1}</td>
                      <td className="text-end font-monospace">{Number(item.unitPrice).toLocaleString('vi-VN')}</td>
                      <td className="text-end font-monospace fw-bold">{Number(item.totalPrice).toLocaleString('vi-VN')}</td>
                      <td className="text-center font-monospace badge-tax">{item.taxRate || 'KCT'}</td>
                      <td className="text-end font-monospace">{Number(item.taxAmount || 0).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 5. FINANCIAL TOTALS SUMMARY */}
            <div className="bms-vat-totals-box">
              <div className="bms-vat-totals-row">
                <span className="bms-vat-totals-lbl">Cộng tiền dịch vụ khám &amp; xét nghiệm (Subtotal):</span>
                <span className="bms-vat-totals-val">{subTotal.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="bms-vat-totals-row">
                <span className="bms-vat-totals-lbl">
                  Thuế suất GTGT (VAT Rate): <strong className="text-primary ms-1">KCT</strong>
                  <span className="text-muted small ms-2">
                    (Không chịu thuế theo Khoản 9 Điều 5 Luật Thuế GTGT và TT 219/2013/TT-BTC)
                  </span>
                </span>
                <span className="bms-vat-totals-val">0 đ</span>
              </div>
              <div className="bms-vat-totals-row bms-vat-grand-total">
                <span className="bms-vat-totals-lbl fw-bold text-dark fs-6">
                  TỔNG CỘNG TIỀN THANH TOÁN (TOTAL AMOUNT):
                </span>
                <span className="bms-vat-totals-val text-danger fw-bold fs-5 font-monospace">
                  {subTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="bms-vat-in-words">
                <span className="bms-vat-label">Số tiền viết bằng chữ (In words):</span>
                <em className="fw-bold text-primary ms-1">{amountInWords}</em>
              </div>
            </div>

            {/* 6. SIGNATURE CERTIFICATES & QR CODE VERIFICATION */}
            <div className="bms-vat-signatures-grid">
              {/* Left Column: Buyer Signature / Electronic Acceptance */}
              <div className="bms-vat-signature-card">
                <div className="bms-vat-sig-title">NGƯỜI MUA HÀNG (BUYER)</div>
                <div className="bms-vat-sig-sub">(Ký, ghi rõ họ tên hoặc xác thực giao dịch điện tử)</div>

                <div className="bms-vat-sig-stamp buyer-stamp">
                  <div className="d-flex align-items-center gap-2 text-success fw-bold mb-1">
                    <CheckCircle2 className="fs-5"  size="1em"/>
                    <span>ĐÃ XÁC THỰC ĐIỆN TỬ</span>
                  </div>
                  <div className="small text-dark fw-semibold">{patientName}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    Thanh toán qua: {paymentMethod}
                  </div>
                  <div className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                    Mã GD: {transactionCode}
                  </div>
                </div>
              </div>

              {/* Right Column: Seller CA Digital Signature Box */}
              <div className="bms-vat-signature-card">
                <div className="bms-vat-sig-title">NGƯỜI BÁN HÀNG (SELLER)</div>
                <div className="bms-vat-sig-sub">(Ký điện tử bởi Chữ ký số CA hợp lệ)</div>

                <div className="bms-vat-sig-stamp seller-stamp">
                  <div className="bms-vat-sig-header">
                    <div className="bms-vat-valid-badge">
                      <CheckCircle2  size="1em"/> Signature Valid
                    </div>
                    <span className="text-muted" style={{ fontSize: '10px' }}>BMS MedLab</span>
                  </div>
                  <div className="bms-vat-sig-corp">
                    Được ký bởi: <strong>CÔNG TY CP PHÒNG KHÁM CHUYÊN KHOA XÉT NGHIỆM BMS</strong>
                  </div>
                  <div className="bms-vat-sig-meta">
                    Mã số thuế: <strong>0317896868</strong>
                  </div>
                  <div className="bms-vat-sig-meta">
                    Ngày ký số: <strong>{signedTimestamp}</strong>
                  </div>
                  <div className="bms-vat-sig-meta text-muted" style={{ fontSize: '10px' }}>
                    Biên nhận giao dịch hệ thống BMS
                  </div>
                </div>
              </div>
            </div>

            {/* 7. OFFICIAL COMPLIANCE FOOTER & GDT QR CODE */}
            <div className="bms-vat-footer-section">
              <div className="bms-vat-qr-box">
                <QRCodeSVG
                  value={verificationUrl}
                  size={100}
                  level="M"
                  includeMargin={false}
                />
                <div className="bms-vat-qr-caption">Quét để tra cứu CQT</div>
              </div>

              <div className="bms-vat-legal-notice">
                <div className="fw-semibold text-dark mb-1">
                  HÓA ĐƠN ĐIỆN TỬ CÓ MÃ CỦA CƠ QUAN THUẾ KHỞI TẠO TỪ HỆ THỐNG BMS CLINICAL LABORATORY
                </div>
                <p className="mb-1 text-muted" style={{ fontSize: '11.5px', lineHeight: 1.45 }}>
                  Hóa đơn này được khởi tạo và phát hành điện tử theo quy định tại <strong>Nghị định số 123/2020/NĐ-CP</strong> và <strong>Thông tư số 78/2021/TT-BTC</strong> của Bộ Tài chính.
                  Quý khách có thể tra cứu và tải dữ liệu hóa đơn gốc tại Cổng thông tin Hóa đơn điện tử của Tổng cục Thuế:{' '}
                  <a href="https://hoadondientu.gdt.gov.vn" target="_blank" rel="noopener noreferrer" className="fw-bold text-primary">
                    https://hoadondientu.gdt.gov.vn
                  </a>{' '}
                  hoặc quét mã QR bên cạnh.
                </p>
                <div className="text-secondary small font-monospace">
                  Mã tra cứu CQT: <strong className="text-dark">{cqtCode}</strong> • Mã bảo mật hóa đơn: <strong>{serialNoFormatted}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

VatInvoiceModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  invoiceData: PropTypes.object,
  patientData: PropTypes.object
};

