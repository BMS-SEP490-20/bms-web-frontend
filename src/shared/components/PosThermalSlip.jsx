import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Copy, CheckCircle2, Receipt } from 'lucide-react';
import { printPosElement } from '../utils/posThermalPrint';
import './PosThermalSlip.css';

export const CLINIC_POS_INFO = {
  name: 'PHÒNG XÉT NGHIỆM Y KHOA BMS',
  address: '120 Hai Bà Trưng, P. Đa Kao, Q.1, TP.HCM',
  hotline: '1900 6868',
  website: 'bms-medlab.vn',
};

/**
 * Unified 80mm POS Thermal Slip Paper Component (Khổ K80)
 * Renders the exact same thermal roll layout for:
 *  - Hóa đơn thu phí dịch vụ y tế
 *  - Phiếu xác nhận lịch hẹn / tiếp đón
 *  - Phiếu số thứ tự lấy mẫu (STT)
 */
export function PosThermalSlip({
  slipRef,
  clinicName = CLINIC_POS_INFO.name,
  clinicAddress = CLINIC_POS_INFO.address,
  clinicHotline = CLINIC_POS_INFO.hotline,
  reprintWarning = '',
  title,
  subtitle = '',
  statusBadge = '',
  highlight = null, // { label, value, isCode?: boolean, sub?: string }
  metaRows = [], // [{ label, value, mono?: boolean }]
  sections = [], // [{ title?: string, rows: [{ label, value, mono?: boolean }] }]
  items = [], // [{ name, quantity, unitPrice, totalPrice, unit? }]
  totals = null, // { subTotal, discountAmount?, totalAmount, amountInWords?, paymentMethod?, transactionCode? }
  notice = null, // { title?: string, lines: string[] }
  qr = null, // { value, caption?, codeText?, size? }
  footerNote = 'Vui lòng giữ lại phiếu để đối chiếu tại phòng khám.',
  printedAt = null,
}) {
  const timestampStr = printedAt
    ? (typeof printedAt === 'string' ? printedAt : new Date(printedAt).toLocaleString('vi-VN'))
    : new Date().toLocaleString('vi-VN');

  const validMetaRows = (metaRows || []).filter((r) => r && r.value !== undefined && r.value !== null && String(r.value).trim() !== '');

  return (
    <div className="bms-pos-paper" ref={slipRef}>
      {reprintWarning && (
        <div className="bms-pos-reprint-banner">{reprintWarning}</div>
      )}

      {/* 1. UNIFIED CLINIC HEADER */}
      <div className="bms-pos-clinic-header">
        <div className="bms-pos-clinic-name">{clinicName}</div>
        <div className="bms-pos-clinic-sub">{clinicAddress}</div>
        <div className="bms-pos-clinic-sub">
          Hotline: {clinicHotline} • {CLINIC_POS_INFO.website}
        </div>
      </div>

      <hr className="bms-pos-divider" />

      {/* 2. SLIP TITLE & STATUS */}
      <div className="bms-pos-title-block">
        <div className="bms-pos-title">{title}</div>
        {subtitle && <div className="bms-pos-subtitle">{subtitle}</div>}
        {statusBadge && <div className="bms-pos-status-pill">{statusBadge}</div>}
      </div>

      {/* 3. BIG HIGHLIGHT BOX (STT NUMBER OR APPOINTMENT CODE) */}
      {highlight && highlight.value && (
        <div className="bms-pos-highlight">
          {highlight.label && (
            <div className="bms-pos-highlight-label">{highlight.label}</div>
          )}
          <div className={`bms-pos-highlight-value ${highlight.isCode ? 'is-code' : ''}`}>
            {highlight.value}
          </div>
          {highlight.sub && (
            <div className="bms-pos-highlight-sub">{highlight.sub}</div>
          )}
        </div>
      )}

      {/* 4. PRIMARY METADATA ROWS */}
      {validMetaRows.length > 0 && (
        <>
          <hr className="bms-pos-divider" />
          <div className="bms-pos-kv-list">
            {validMetaRows.map((row, idx) => (
              <div className="bms-pos-kv" key={idx}>
                <span className="bms-pos-kv-label">{row.label}:</span>
                <span className={`bms-pos-kv-value ${row.mono ? 'is-mono' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 5. EXTRA GROUPED SECTIONS (e.g. Patient Info / Appointment Details) */}
      {(sections || []).map((sec, sIdx) => {
        const rows = (sec?.rows || []).filter(
          (r) => r && r.value !== undefined && r.value !== null && String(r.value).trim() !== ''
        );
        if (rows.length === 0) return null;
        return (
          <React.Fragment key={sIdx}>
            <hr className="bms-pos-divider" />
            {sec.title && <div className="bms-pos-section-title">{sec.title}</div>}
            <div className="bms-pos-kv-list">
              {rows.map((row, rIdx) => (
                <div className="bms-pos-kv" key={rIdx}>
                  <span className="bms-pos-kv-label">{row.label}:</span>
                  <span className={`bms-pos-kv-value ${row.mono ? 'is-mono' : ''}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </React.Fragment>
        );
      })}

      {/* 6. ITEMIZED SERVICES (FOR FEE RECEIPTS) */}
      {items && items.length > 0 && (
        <>
          <hr className="bms-pos-divider" />
          <div className="bms-pos-items-header">
            <span>Dịch vụ / SL × Đơn giá</span>
            <span>Thành tiền</span>
          </div>
          <div>
            {items.map((item, idx) => {
              const qty = Number(item.quantity || 1);
              const unitPrice = Number(item.unitPrice || 0);
              const totalPrice = Number(item.totalPrice ?? qty * unitPrice);
              return (
                <div className="bms-pos-item-row" key={idx}>
                  <div className="bms-pos-item-name">
                    {idx + 1}. {item.name || item.itemName}
                  </div>
                  <div className="bms-pos-item-meta">
                    <span>
                      {qty} {item.unit || 'lần'} × {unitPrice.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="bms-pos-item-total">
                      {totalPrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 7. FINANCIAL TOTALS (FOR FEE RECEIPTS) */}
      {totals && (
        <>
          <hr className="bms-pos-divider" />
          <div className="bms-pos-totals">
            {totals.subTotal !== undefined && (
              <div className="bms-pos-total-row">
                <span>Cộng tiền dịch vụ:</span>
                <span style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>
                  {Number(totals.subTotal).toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
            {Number(totals.discountAmount || 0) > 0 && (
              <div className="bms-pos-total-row">
                <span>Miễn giảm / Ưu đãi:</span>
                <span style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>
                  -{Number(totals.discountAmount).toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
            <div className="bms-pos-grand-total">
              <span>TỔNG THANH TOÁN</span>
              <span className="bms-pos-grand-total-val">
                {Number(totals.totalAmount || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
            {totals.amountInWords && (
              <div className="bms-pos-words">
                Bằng chữ: <strong>{totals.amountInWords}</strong>
              </div>
            )}
            {totals.paymentMethod && (
              <div className="bms-pos-kv" style={{ marginTop: 4 }}>
                <span className="bms-pos-kv-label">Hình thức TT:</span>
                <span className="bms-pos-kv-value">{totals.paymentMethod}</span>
              </div>
            )}
            {totals.transactionCode && (
              <div className="bms-pos-kv">
                <span className="bms-pos-kv-label">Mã giao dịch:</span>
                <span className="bms-pos-kv-value is-mono">{totals.transactionCode}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* 8. NOTICE / INSTRUCTIONS */}
      {notice && Array.isArray(notice.lines) && notice.lines.length > 0 && (
        <div className="bms-pos-notice">
          {notice.title && <div className="bms-pos-notice-title">{notice.title}</div>}
          {notice.lines.map((line, idx) => (
            <div key={idx}>• {line}</div>
          ))}
        </div>
      )}

      {/* 9. SCANNABLE QR CODE */}
      {qr && qr.value && (
        <>
          <hr className="bms-pos-divider" />
          <div className="bms-pos-qr-block">
            <div className="bms-pos-qr-frame">
              <QRCodeSVG
                value={String(qr.value)}
                size={qr.size || 112}
                level="M"
                includeMargin={false}
              />
            </div>
            {qr.codeText && <div className="bms-pos-qr-code-text">{qr.codeText}</div>}
            {qr.caption && <div className="bms-pos-qr-caption">{qr.caption}</div>}
          </div>
        </>
      )}

      {/* 10. UNIFIED FOOTER */}
      <hr className="bms-pos-divider" />
      <div className="bms-pos-footer">
        <div className="bms-pos-footer-thanks">Cảm ơn Quý khách đã tin tưởng BMS!</div>
        {footerNote && <div>{footerNote}</div>}
        <div className="bms-pos-footer-time">In lúc: {timestampStr}</div>
      </div>
    </div>
  );
}

/**
 * Full-screen Dark Preview Modal + 1-Click POS K80 Thermal Printer
 */
export function PosThermalModal({
  show,
  onClose,
  modalTitle = 'Xem Trước Phiếu In POS (K80)',
  modalBadge = 'Khổ giấy POS 80mm',
  modalSubtitle = '',
  printTitle = 'Phieu_POS_K80_BMS',
  printButtonLabel = 'In Phiếu POS (K80)',
  copyText = '',
  copyButtonLabel = 'Sao chép mã',
  extraActions = null,
  slipProps,
}) {
  const slipRef = useRef(null);
  const [copied, setCopied] = useState(false);

  if (!show) return null;

  const handlePrint = () => {
    printPosElement(slipRef.current, printTitle);
  };

  const handleCopy = () => {
    if (!copyText) return;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      className="bms-pos-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {/* Top Toolbar */}
      <div className="bms-pos-modal-toolbar">
        <div className="bms-pos-modal-title-group">
          <div className="bms-pos-modal-icon">
            <Receipt size={18} />
          </div>
          <div>
            <div className="bms-pos-modal-title">
              <span>{modalTitle}</span>
              {modalBadge && <span className="bms-pos-modal-badge">{modalBadge}</span>}
            </div>
            {modalSubtitle && <div className="bms-pos-modal-sub">{modalSubtitle}</div>}
          </div>
        </div>

        <div className="bms-pos-modal-actions">
          {copyText && (
            <button
              type="button"
              className="bms-pos-btn bms-pos-btn-outline"
              onClick={handleCopy}
            >
              {copied ? <CheckCircle2 size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
              <span>{copied ? 'Đã sao chép' : copyButtonLabel}</span>
            </button>
          )}

          {extraActions}

          <button
            type="button"
            className="bms-pos-btn bms-pos-btn-primary"
            onClick={handlePrint}
          >
            <Printer size={14} />
            <span>{printButtonLabel}</span>
          </button>

          <button
            type="button"
            className="bms-pos-btn bms-pos-btn-close"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Centered 80mm POS Paper Roll Stage */}
      <div
        className="bms-pos-modal-stage"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <PosThermalSlip {...slipProps} slipRef={slipRef} />
        <div className="bms-pos-stage-hint">
          Định dạng chuẩn máy in nhiệt POS K80 (khổ giấy 80mm) • Phòng Xét Nghiệm Y Khoa BMS
        </div>
      </div>
    </div>
  );
}

export default PosThermalSlip;
