/**
 * Shared 80mm POS Thermal Slip Printing Utility (Khổ K80)
 * Uses a transient hidden iframe so it is NEVER blocked by popup blockers
 * and always prints ONLY the crisp 80mm POS thermal receipt roll.
 */

export const POS_THERMAL_PRINT_CSS = `
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
    width: 80mm;
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 11.5px;
    line-height: 1.4;
  }
  .bms-pos-paper {
    width: 80mm;
    max-width: 80mm;
    margin: 0;
    padding: 4mm 4mm 6mm 4mm;
    background: #ffffff;
    color: #000000;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
  }
  .bms-pos-paper::before,
  .bms-pos-paper::after {
    display: none !important;
    content: none !important;
  }
  .bms-pos-reprint-banner {
    border: 1.5px dashed #000000;
    padding: 4px 6px;
    text-align: center;
    font-weight: 800;
    font-size: 10.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
    letter-spacing: 0.3px;
  }
  .bms-pos-clinic-header {
    text-align: center;
    margin-bottom: 8px;
  }
  .bms-pos-clinic-name {
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    line-height: 1.25;
    color: #000000;
  }
  .bms-pos-clinic-sub {
    font-size: 9.8px;
    color: #111111;
    margin-top: 2px;
    line-height: 1.35;
  }
  .bms-pos-divider {
    border: 0;
    border-top: 1px dashed #222222;
    margin: 8px 0;
  }
  .bms-pos-divider-double {
    border: 0;
    border-top: 1.5px solid #000000;
    margin: 8px 0;
  }
  .bms-pos-title-block {
    text-align: center;
    margin: 6px 0;
  }
  .bms-pos-title {
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin: 0;
    color: #000000;
  }
  .bms-pos-subtitle {
    font-size: 10.2px;
    color: #222222;
    margin-top: 2px;
  }
  .bms-pos-highlight {
    border: 2px solid #000000;
    border-radius: 6px;
    padding: 8px 6px;
    margin: 8px 0;
    text-align: center;
  }
  .bms-pos-highlight-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #111111;
  }
  .bms-pos-highlight-value {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 32px;
    font-weight: 900;
    line-height: 1.1;
    margin: 3px 0;
    letter-spacing: 0.5px;
    color: #000000;
  }
  .bms-pos-highlight-value.is-code {
    font-size: 18px;
    letter-spacing: 0.6px;
  }
  .bms-pos-highlight-sub {
    font-size: 10.5px;
    font-weight: 700;
    color: #111111;
    margin-top: 2px;
  }
  .bms-pos-status-pill {
    display: inline-block;
    border: 1.2px solid #000000;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-top: 4px;
  }
  .bms-pos-section-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin: 6px 0 4px 0;
    color: #000000;
  }
  .bms-pos-kv-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .bms-pos-kv {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    font-size: 11px;
    line-height: 1.38;
  }
  .bms-pos-kv-label {
    color: #222222;
    flex-shrink: 0;
  }
  .bms-pos-kv-value {
    text-align: right;
    font-weight: 600;
    color: #000000;
    word-break: break-word;
  }
  .bms-pos-kv-value.is-mono {
    font-family: 'Consolas', 'Courier New', monospace;
  }
  .bms-pos-items-header {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    padding-bottom: 4px;
    border-bottom: 1px dashed #222222;
    margin-bottom: 5px;
  }
  .bms-pos-item-row {
    padding: 4px 0;
    border-bottom: 1px dotted #888888;
  }
  .bms-pos-item-row:last-child {
    border-bottom: none;
  }
  .bms-pos-item-name {
    font-size: 11px;
    font-weight: 700;
    color: #000000;
    line-height: 1.3;
  }
  .bms-pos-item-meta {
    display: flex;
    justify-content: space-between;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10.5px;
    margin-top: 2px;
    color: #111111;
  }
  .bms-pos-item-total {
    font-weight: 800;
    color: #000000;
  }
  .bms-pos-totals {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .bms-pos-total-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }
  .bms-pos-grand-total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13.5px;
    font-weight: 900;
    padding-top: 5px;
    margin-top: 3px;
    border-top: 1px dashed #000000;
  }
  .bms-pos-grand-total-val {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 15px;
    font-weight: 900;
  }
  .bms-pos-words {
    font-size: 10px;
    font-style: italic;
    margin-top: 4px;
    line-height: 1.35;
    color: #111111;
  }
  .bms-pos-notice {
    border: 1px dashed #333333;
    border-radius: 4px;
    padding: 6px 8px;
    margin: 8px 0;
    font-size: 10px;
    line-height: 1.4;
    color: #111111;
    text-align: left;
  }
  .bms-pos-notice-title {
    font-weight: 800;
    text-transform: uppercase;
    font-size: 9.8px;
    margin-bottom: 2px;
  }
  .bms-pos-qr-block {
    text-align: center;
    margin: 8px 0 4px 0;
  }
  .bms-pos-qr-frame {
    display: inline-flex;
    padding: 4px;
    background: #ffffff;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }
  .bms-pos-qr-caption {
    font-size: 9.8px;
    margin-top: 4px;
    color: #222222;
  }
  .bms-pos-qr-code-text {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10.5px;
    font-weight: 800;
    margin-top: 2px;
    letter-spacing: 0.4px;
  }
  .bms-pos-footer {
    text-align: center;
    font-size: 9.8px;
    line-height: 1.4;
    color: #222222;
    margin-top: 6px;
  }
  .bms-pos-footer-thanks {
    font-weight: 700;
    color: #000000;
    margin-bottom: 2px;
  }
  .bms-pos-footer-time {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9.2px;
    color: #333333;
    margin-top: 4px;
  }
`;

/**
 * Prints a mounted PosThermalSlip DOM element using a hidden iframe.
 * Preserves inline SVGs (such as QRCodeSVG) cleanly without popup blockers.
 */
export function printPosElement(element, documentTitle = 'Phieu_POS_K80_BMS') {
  if (!element) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const safeTitle = String(documentTitle || 'Phieu_POS_K80_BMS').replace(/[<>]/g, '');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <style>${POS_THERMAL_PRINT_CSS}</style>
</head>
<body>
  ${element.outerHTML}
</body>
</html>`);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  };

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      cleanup();
    }
  }, 120);
}
