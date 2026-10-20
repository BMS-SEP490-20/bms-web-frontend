import React, { useRef } from 'react';

export default function ReceiptPrintModal({ printData, onClose }) {
  const receiptRef = useRef(null);

  if (!printData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* CSS for Thermal K80 80mm Printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-k80, #thermal-receipt-k80 * {
            visibility: visible !important;
          }
          #thermal-receipt-k80 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 8mm 4mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Toolbar (No-Print) */}
        <div
          className="no-print"
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Xem Trước Biên Lai Thu Phí (K80)
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Khổ in nhiệt 80mm POS Tiêu chuẩn
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🖨️ In Ngay (Print)
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#334155',
                color: '#ffffff',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* Thermal Receipt Paper (K80, ~320px width) */}
          <div
            id="thermal-receipt-k80"
            ref={receiptRef}
            style={{
              width: '320px',
              backgroundColor: '#ffffff',
              padding: '24px 18px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              borderRadius: '6px',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '12px',
              color: '#000000',
              lineHeight: 1.35,
            }}
          >
            {/* Anti-fraud Reprint Warning Header */}
            {printData.isReprint && (
              <div
                style={{
                  border: '2px dashed #dc2626',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  padding: '6px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  marginBottom: '12px',
                  borderRadius: '4px',
                }}
              >
                {printData.reprintWarning || `[BẢN IN LẠI LẦN THỨ ${printData.printCount}]`}
              </div>
            )}

            {/* Clinic Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
                {printData.clinicName || 'HỆ THỐNG PHÒNG KHÁM BMS'}
              </div>
              <div style={{ fontSize: '10px', color: '#333333', marginTop: '2px' }}>
                {printData.clinicAddress}
              </div>
              <div style={{ fontSize: '10px', color: '#333333' }}>
                Hotline: {printData.clinicHotline}
              </div>
              <div style={{ fontSize: '10px', color: '#333333' }}>
                MST: {printData.clinicTaxCode}
              </div>
              <div style={{ borderTop: '1px dashed #666666', margin: '8px 0' }} />
              <div style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.5px' }}>
                BIÊN LAI THU VIỆN PHÍ
              </div>
              <div style={{ fontSize: '10px', color: '#555555' }}>
                (BẢN LƯU BỆNH NHÂN)
              </div>
            </div>

            {/* Receipt & Patient Metadata */}
            <div style={{ fontSize: '11px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Số BL:</span>
                <span style={{ fontWeight: 'bold' }}>{printData.receiptNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mã HĐ:</span>
                <span>{printData.invoiceCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ngày in:</span>
                <span>{new Date(printData.printedAt).toLocaleString('vi-VN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Thu ngân:</span>
                <span>{printData.cashierName}</span>
              </div>
              <div style={{ borderTop: '1px dotted #999999', margin: '6px 0' }} />
              <div>
                <span>Bệnh nhân: </span>
                <span style={{ fontWeight: 'bold' }}>{printData.patientName}</span>
              </div>
              {printData.patientPhone && (
                <div>
                  <span>SĐT: </span>
                  <span>{printData.patientPhone}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div style={{ borderTop: '1px dashed #666666', borderBottom: '1px dashed #666666', padding: '6px 0', marginBottom: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 65px 70px', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                <span>Dịch vụ</span>
                <span style={{ textAlign: 'center' }}>SL</span>
                <span style={{ textAlign: 'right' }}>Đơn giá</span>
                <span style={{ textAlign: 'right' }}>T.Tiền</span>
              </div>
              {printData.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 30px 65px 70px', fontSize: '10.5px', marginBottom: '3px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.itemName}
                  </span>
                  <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ textAlign: 'right' }}>{Number(item.unitPrice).toLocaleString('vi-VN')}</span>
                  <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{Number(item.totalPrice).toLocaleString('vi-VN')}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div style={{ fontSize: '11px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Tổng tiền dịch vụ:</span>
                <span>{Number(printData.subTotal).toLocaleString('vi-VN')} đ</span>
              </div>
              {printData.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#16a34a' }}>
                  <span>Miễn giảm / BHYT:</span>
                  <span>-{Number(printData.discountAmount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', margin: '4px 0', borderTop: '1px dotted #999999', paddingTop: '4px' }}>
                <span>TỔNG THANH TOÁN:</span>
                <span>{Number(printData.totalAmount).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ fontStyle: 'italic', fontSize: '10.5px', marginTop: '4px' }}>
                Bằng chữ: <strong>{printData.totalAmountInWords}</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#444444', marginTop: '4px' }}>
                Hình thức: {printData.paymentMethod}
              </div>
            </div>

            {/* QR Code Verification & Footer */}
            <div style={{ textAlign: 'center', borderTop: '1px dashed #666666', paddingTop: '10px', marginTop: '10px' }}>
              <div style={{ fontSize: '10px', color: '#555555', marginBottom: '6px' }}>
                Quét mã QR để đối soát hóa đơn điện tử:
              </div>
              
              {/* SVG QR Code Simulation */}
              <div style={{ display: 'inline-block', padding: '6px', backgroundColor: '#ffffff', border: '1px solid #cccccc', borderRadius: '4px' }}>
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#ffffff" />
                  {/* Outer markers */}
                  <rect x="5" y="5" width="28" height="28" fill="#000000" />
                  <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
                  <rect x="13" y="13" width="12" height="12" fill="#000000" />
                  
                  <rect x="67" y="5" width="28" height="28" fill="#000000" />
                  <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
                  <rect x="75" y="13" width="12" height="12" fill="#000000" />

                  <rect x="5" y="67" width="28" height="28" fill="#000000" />
                  <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
                  <rect x="13" y="75" width="12" height="12" fill="#000000" />

                  {/* Inner data patterns */}
                  <rect x="40" y="10" width="8" height="8" fill="#000000" />
                  <rect x="52" y="10" width="8" height="8" fill="#000000" />
                  <rect x="40" y="24" width="14" height="6" fill="#000000" />
                  <rect x="10" y="42" width="12" height="8" fill="#000000" />
                  <rect x="26" y="42" width="10" height="8" fill="#000000" />
                  <rect x="44" y="42" width="12" height="12" fill="#000000" />
                  <rect x="62" y="42" width="16" height="8" fill="#000000" />
                  <rect x="82" y="42" width="10" height="8" fill="#000000" />
                  <rect x="40" y="64" width="8" height="12" fill="#000000" />
                  <rect x="54" y="64" width="18" height="6" fill="#000000" />
                  <rect x="76" y="64" width="14" height="12" fill="#000000" />
                  <rect x="40" y="80" width="20" height="10" fill="#000000" />
                  <rect x="66" y="80" width="12" height="10" fill="#000000" />
                </svg>
              </div>

              <div style={{ fontSize: '9px', color: '#666666', marginTop: '4px' }}>
                Mã xác thực: {printData.receiptNumber}
              </div>

              <div style={{ marginTop: '10px', fontSize: '10px', fontStyle: 'italic', color: '#333333' }}>
                Cảm ơn Quý khách đã tin tưởng và sử dụng dịch vụ tại BMS Clinic!
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls (No-Print) */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Lần in thứ {printData.printCount} • Thu ngân: {printData.cashierName}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              🖨️ In Biên Lai (K80)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
