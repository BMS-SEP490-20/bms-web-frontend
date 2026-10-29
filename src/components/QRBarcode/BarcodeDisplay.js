import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { Button, Row, Col } from 'react-bootstrap';
import { FaDownload, FaCopy, FaPrint } from 'react-icons/fa';
import jsPDF from 'jspdf';

/**
 * Helper to get patient initials from full name
 * Example: 'John Doe' -> 'JD', 'Alice Smith' -> 'AS'
 * Returns null if name is empty/invalid (caller should handle missing case)
 */
export const getPatientInitials = (name) => {
  if (!name || typeof name !== 'string') return null;
  const clean = name.trim();
  if (!clean) return null;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, Math.min(3, words[0].length)).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
};

/**
 * Helper to format collection timestamp to YYYY-MM-DD HH:mm
 * Returns null if timestamp is empty/invalid (caller should display missing data indicator)
 */
export const formatCollectionTimestamp = (timestamp) => {
  if (!timestamp) return null;
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (e) {
    return null;
  }
};

/**
 * Standard Medical Barcode Display & Printing Component.
 * Feature Task: Print Barcodes (Web).
 * 
 * @description Renders a standardized medical specimen barcode label conforming to clinical laboratory guidelines.
 * The label displays four mandatory attributes:
 * 1. Patient Initials (e.g., 'NVA', 'JD')
 * 2. Sample ID (e.g., 'SA000123')
 * 3. Test Codes / Package (e.g., 'CBC, GLU')
 * 4. Collection Timestamp (YYYY-MM-DD HH:mm)
 * 
 * Supports browser print dialog, high-resolution vector PDF export (jsPDF), PNG image download, and barcode text copy.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {string} [props.value] - Fallback barcode value.
 * @param {string} props.sampleId - The unique specimen ID.
 * @param {string} [props.patientName=''] - Full patient name used to calculate initials.
 * @param {string} [props.patientId=''] - Fallback ID if patient name is absent.
 * @param {string} [props.patientInitials=''] - Pre-computed initials if provided.
 * @param {string} [props.testCodes=''] - Test or package codes assigned to the tube.
 * @param {string} [props.collectionTimestamp=''] - ISO or formatted date-time string of collection.
 * @param {boolean} [props.showLabelInfo=true] - Whether to render medical metadata fields above the barcode.
 * @param {string} [props.format='CODE128'] - Barcode symbology (e.g., 'CODE128').
 * @param {boolean} [props.showActions=false] - Whether action buttons (Print, Download PDF, PNG) are shown.
 * @returns {JSX.Element} The rendered barcode label widget.
 * 
 * @example
 * <BarcodeDisplay
 *   sampleId="SA100234"
 *   patientName="John Doe"
 *   testCodes="CBC, LFT"
 *   collectionTimestamp="2026-10-20T08:30:00Z"
 *   showActions={true}
 * />
 */
const BarcodeDisplay = ({ 
  value, 
  sampleId,
  patientName = '',
  patientId = '',        // Fallback when patientName is absent
  patientInitials = '',
  testCodes = '',
  collectionTimestamp = '',
  showLabelInfo = true,
  format = 'CODE128',
  width = 2,
  height = 60,
  displayValue = true,
  fontSize = 14,
  margin = 10,
  title = 'Mã Vạch Mẫu Xét Nghiệm',
  showActions = false,
  className = ''
}) => {
  const barcodeRef = useRef(null);

  // ── Sample ID: Mandatory field ──────────────────────────────────────────
  const finalSampleId = String(sampleId || value || '').trim() || 'THIẾU-SAMPLE-ID';

  // ── Patient Name / Initials: Name -> patientId -> 'Missing data' ──
  const rawPatientName = (patientName && String(patientName).trim()) ||
                         (patientId  && String(patientId).trim())  ||
                         '';
  const MISSING_PATIENT = !rawPatientName ||
    rawPatientName === 'Chưa có thông tin' ||
    rawPatientName === 'Chưa có';
  const safePatientName  = MISSING_PATIENT ? 'Thiếu dữ liệu' : rawPatientName;
  const computedInitials = patientInitials ||
                           (!MISSING_PATIENT ? getPatientInitials(rawPatientName) : null);
  const initials         = computedInitials || '??';

  // ── Test Codes: Fallback to 'Missing data' if absent ─────────────────────────────
  const rawTestCodes      = testCodes ? String(testCodes).trim() : '';
  const MISSING_TESTCODES = !rawTestCodes;
  const formattedTestCodes = MISSING_TESTCODES ? 'Thiếu dữ liệu' : rawTestCodes;

  // ── Collection Timestamp: Fallback to 'Missing data' if absent ───────────────────
  const formattedTime    = formatCollectionTimestamp(collectionTimestamp);
  const MISSING_TIME     = !formattedTime;
  
  const handleDownload = () => {
    // Retrieve SVG element from ref
    let barcodeSvg = null;
    if (barcodeRef.current) {
      barcodeSvg = barcodeRef.current.querySelector('svg');
    }
    
    if (!barcodeSvg) {
      barcodeSvg = document.querySelector('.barcode-svg');
    }
    
    if (!barcodeSvg) {
      alert('Không tìm thấy mã vạch để tải!');
      return;
    }
    
    // Get SVG dimensions
    const svgWidth = barcodeSvg.width?.baseVal?.value || barcodeSvg.clientWidth || 400;
    const svgHeight = barcodeSvg.height?.baseVal?.value || barcodeSvg.clientHeight || 100;
    
    // Create canvas to convert SVG to image
    const scale = 3; // High quality
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(barcodeSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    
    img.onload = () => {
      // Draw barcode to canvas
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Create PDF in landscape
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a6' // Small format for barcode sticker
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // 1. Header: Patient Initials, Patient Name, Sample ID
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 51, 153);
      pdf.text(`[${initials}] ${safePatientName}`, 10, 15);
      
      pdf.setFontSize(10);
      pdf.setFont('courier', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`ID: ${finalSampleId}`, pdfWidth - 10, 15, { align: 'right' });

      // Draw horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(10, 18, pdfWidth - 10, 18);
      
      // 2. Center the barcode image
      const imgWidthMM = pdfWidth - 30; // 15mm margin on each side
      const imgHeightMM = (canvas.height / canvas.width) * imgWidthMM;
      const x = 15;
      const y = 24;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidthMM, imgHeightMM);
      
      // 3. Footer: Test Codes and Collection Timestamp
      const footerY = y + imgHeightMM + 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(10, footerY - 4, pdfWidth - 10, footerY - 4);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`XN: ${formattedTestCodes}`, 10, footerY);
      pdf.text(`TG: ${formattedTime}`, pdfWidth - 10, footerY, { align: 'right' });
      
      // Save PDF
      pdf.save(`barcode-${finalSampleId}.pdf`);
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      alert('Lỗi khi tạo PDF mã vạch!');
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(finalSampleId).then(() => {
      alert(`Đã sao chép mã: ${finalSampleId}`);
    });
  };

  const handlePrint = () => {
    let barcodeSvg = null;
    
    if (barcodeRef.current) {
      barcodeSvg = barcodeRef.current.querySelector('svg');
    }
    
    if (!barcodeSvg) {
      const barcodeWrapper = document.querySelector('.barcode-wrapper');
      if (barcodeWrapper) {
        barcodeSvg = barcodeWrapper.querySelector('svg');
      }
    }
    
    if (!barcodeSvg) {
      const barcodeDisplay = document.querySelector('.barcode-display');
      if (barcodeDisplay) {
        barcodeSvg = barcodeDisplay.querySelector('svg');
      }
    }
    
    if (!barcodeSvg) {
      alert('Không tìm thấy mã vạch để in! Vui lòng đảm bảo mã vạch đã được hiển thị trên màn hình.');
      return;
    }
    
    printBarcodeFromSVG(barcodeSvg);
  };
  
  const printBarcodeFromSVG = (barcodeSvg) => {
    const clonedSvg = barcodeSvg.cloneNode(true);
    
    // Remove text elements from SVG for crisp high-resolution label rendering
    const textElements = clonedSvg.querySelectorAll('text');
    textElements.forEach(text => text.remove());
    
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const padding = 20;
      const textHeight = displayValue ? 30 : 0;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + textHeight;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, padding, padding);
      
      if (displayValue) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.fillText(finalSampleId, canvas.width / 2, padding + img.height + 6);
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>In Nhãn Mẫu Xét Nghiệm - ${finalSampleId}</title>
            <style>
              @page {
                size: auto;
                margin: 4mm;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0; 
                  background: white;
                }
                .barcode-sticker-container {
                  padding: 0;
                  height: auto;
                }
                .barcode-sticker-card {
                  border: 1px dashed #000 !important;
                  box-shadow: none !important;
                  page-break-inside: avoid;
                }
              }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
                padding: 10px;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: #f4f6f9;
                box-sizing: border-box;
              }
              .barcode-sticker-container {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
              }
              .barcode-sticker-card {
                width: 75mm;
                max-width: 330px;
                background: #ffffff;
                border: 1.5px solid #111;
                border-radius: 6px;
                padding: 8px 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                box-sizing: border-box;
              }
              .sticker-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .sticker-header {
                border-bottom: 1.5px solid #000;
                padding-bottom: 4px;
                margin-bottom: 6px;
              }
              .patient-section {
                display: flex;
                align-items: center;
                overflow: hidden;
              }
              .patient-initials-badge {
                background: #0d6efd;
                color: #ffffff;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                letter-spacing: 0.5px;
                margin-right: 6px;
                flex-shrink: 0;
              }
              .patient-full-name {
                font-weight: 700;
                font-size: 12px;
                color: #000;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 150px;
              }
              .sample-id-section {
                font-family: "Courier New", monospace;
                font-weight: 800;
                font-size: 13px;
                color: #000;
                flex-shrink: 0;
              }
              .sticker-barcode-body {
                text-align: center;
                margin: 4px 0;
              }
              .barcode-img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
              }
              .sticker-footer {
                border-top: 1px solid #333;
                padding-top: 4px;
                margin-top: 4px;
                font-size: 10px;
                color: #333;
              }
              .test-codes-section {
                font-weight: 600;
                max-width: 160px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .timestamp-section {
                font-family: monospace;
                font-weight: 600;
                color: #555;
              }
            </style>
          </head>
          <body>
            <div class="barcode-sticker-container">
              <div class="barcode-sticker-card">
                <div class="sticker-row sticker-header">
                  <div class="patient-section">
                    <span class="patient-initials-badge" style="${initials === '??' ? 'background:#dc3545;' : ''}">${initials}</span>
                    <span class="patient-full-name" style="${MISSING_PATIENT ? 'color:#dc3545;font-style:italic;' : ''}">${safePatientName}</span>
                  </div>
                  <div class="sample-id-section">
                    ${finalSampleId}
                  </div>
                </div>

                <div class="sticker-barcode-body">
                  <img src="${dataUrl}" alt="Barcode" class="barcode-img" />
                </div>

                <div class="sticker-row sticker-footer">
                  <div class="test-codes-section" style="${MISSING_TESTCODES ? 'color:#e67e00;font-style:italic;' : ''}">
                    <strong>XN:</strong> ${formattedTestCodes}
                  </div>
                  <div class="timestamp-section" style="${MISSING_TIME ? 'color:#e67e00;font-style:italic;' : ''}">
                    <strong>TG:</strong> ${MISSING_TIME ? 'Thiếu dữ liệu' : formattedTime}
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Lỗi khi tải ảnh mã vạch để in!');
    };
    
    img.src = url;
  };

  const handleDownloadPNG = () => {
    let barcodeSvg = null;
    if (barcodeRef.current) {
      barcodeSvg = barcodeRef.current.querySelector('svg');
    }
    
    if (!barcodeSvg) {
      barcodeSvg = document.querySelector('.barcode-svg');
    }
    
    if (!barcodeSvg) {
      alert('Không tìm thấy mã vạch để tải!');
      return;
    }
    
    const svgWidth = barcodeSvg.width?.baseVal?.value || barcodeSvg.clientWidth || 400;
    const svgHeight = barcodeSvg.height?.baseVal?.value || barcodeSvg.clientHeight || 100;
    
    const scale = 3;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const padding = 30;
    const headerHeight = 40;
    const footerHeight = 30;
    canvas.width = svgWidth * scale + (padding * 2);
    canvas.height = svgHeight * scale + (padding * 2) + headerHeight + footerHeight;
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw header
    ctx.fillStyle = '#0d6efd';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[${initials}] ${safePatientName}`, padding, padding + 15);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${finalSampleId}`, canvas.width - padding, padding + 15);

    // Separator line
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding + 28);
    ctx.lineTo(canvas.width - padding, padding + 28);
    ctx.stroke();

    // 2. Draw barcode
    const svgData = new XMLSerializer().serializeToString(barcodeSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, padding, padding + headerHeight, svgWidth * scale, svgHeight * scale);
      
      // 3. Draw footer
      const footerY = padding + headerHeight + svgHeight * scale + 20;
      ctx.beginPath();
      ctx.moveTo(padding, footerY - 10);
      ctx.lineTo(canvas.width - padding, footerY - 10);
      ctx.stroke();

      ctx.fillStyle = '#333333';
      ctx.font = 'normal 18px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`XN: ${formattedTestCodes}`, padding, footerY + 8);

      ctx.textAlign = 'right';
      ctx.fillText(`TG: ${formattedTime}`, canvas.width - padding, footerY + 8);

      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `barcode-${finalSampleId}.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    };
    
    img.onerror = () => {
      alert('Lỗi khi tạo PNG!');
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  return (
    <div className={`barcode-display ${className}`}>
      {title && (
        <h6 className="mb-3 text-primary fw-bold text-center">
          <i className="fas fa-barcode me-2"></i>
          {title}
        </h6>
      )}
      
      {/* Medical Label Layout Card */}
      {showLabelInfo && (
        <div 
          className="medical-label-card border rounded-3 p-3 mb-3 bg-white shadow-sm"
          style={{ maxWidth: '380px', margin: '0 auto', borderColor: MISSING_PATIENT ? '#f8d7da' : '#cfe2ff' }}
        >
          {/* Warning banner when required label data is missing */}
          {(MISSING_PATIENT || MISSING_TESTCODES || MISSING_TIME) && (
            <div className="alert alert-warning py-1 px-2 mb-2 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-exclamation-triangle"></i>
              <span>
                Thiếu:&nbsp;
                {[
                  MISSING_PATIENT   && 'Tên bệnh nhân',
                  MISSING_TESTCODES && 'Chỉ định XN',
                  MISSING_TIME      && 'Thời gian lấy mẫu',
                ].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}

          {/* Label Header: Patient Initials, Name & Sample ID */}
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
            <div className="text-start d-flex align-items-center overflow-hidden me-2">
              <span 
                className={`badge me-2 px-2 py-1 fw-bold ${initials === '??' ? 'bg-danger' : 'bg-primary'}`}
                style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}
                title={initials === '??' ? 'Thiếu tên bệnh nhân để tính initials' : `Chữ cái đầu tên bệnh nhân: ${initials}`}
              >
                {initials}
              </span>
              <span 
                className={`fw-bold text-truncate ${MISSING_PATIENT ? 'text-danger fst-italic' : 'text-dark'}`}
                style={{ fontSize: '0.9rem', maxWidth: '160px' }}
                title={MISSING_PATIENT ? 'Không tìm thấy thông tin bệnh nhân' : `Bệnh nhân: ${safePatientName}`}
              >
                {safePatientName}
              </span>
            </div>
            <div className="text-end flex-shrink-0">
              <span 
                className="badge bg-dark font-monospace px-2 py-1"
                style={{ fontSize: '0.85rem' }}
                title="Mã Mẫu / Sample ID"
              >
                {finalSampleId}
              </span>
            </div>
          </div>

          {/* Barcode Graphic */}
          <div ref={barcodeRef} className="d-flex justify-content-center my-2 barcode-wrapper">
            <Barcode
              value={finalSampleId}
              format={format}
              width={width}
              height={height}
              displayValue={displayValue}
              fontSize={fontSize}
              margin={margin}
              className="barcode-svg"
            />
          </div>

          {/* Label Footer: Test Codes & Collection Timestamp */}
          <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2" style={{ fontSize: '0.8rem' }}>
            <div className="text-start text-truncate me-2" style={{ maxWidth: '180px' }}>
              <span className="text-muted">Chỉ định: </span>
              <span 
                className={`fw-semibold ${MISSING_TESTCODES ? 'text-warning fst-italic' : 'text-primary'}`}
                title={MISSING_TESTCODES ? 'Chưa có thông tin chỉ định xét nghiệm' : formattedTestCodes}
              >
                {formattedTestCodes}
              </span>
            </div>
            <div className="text-end flex-shrink-0">
              <span className="text-muted">Thời gian: </span>
              <span 
                className={`fw-semibold font-monospace ${MISSING_TIME ? 'text-warning fst-italic' : 'text-secondary'}`}
                style={{ fontSize: '0.75rem' }}
                title={MISSING_TIME ? 'Chưa có thời điểm lấy mẫu' : formattedTime}
              >
                {MISSING_TIME ? 'Thiếu dữ liệu' : formattedTime}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fallback standard barcode if label info is disabled */}
      {!showLabelInfo && (
        <div ref={barcodeRef} className="mb-3 d-flex justify-content-center barcode-wrapper">
          <Barcode
            value={finalSampleId}
            format={format}
            width={width}
            height={height}
            displayValue={displayValue}
            fontSize={fontSize}
            margin={margin}
            className="barcode-svg"
          />
        </div>
      )}
      
      {showActions && (
        <Row className="g-2" style={{ maxWidth: '380px', margin: '0 auto' }}>
          <Col xs={6} md={3}>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={handleDownload}
              className="w-100"
              title="Tải PDF nhãn dán mã vạch"
            >
              <FaDownload className="me-1" />
              PDF
            </Button>
          </Col>
          <Col xs={6} md={3}>
            <Button 
              variant="outline-info" 
              size="sm" 
              onClick={handleDownloadPNG}
              className="w-100"
              title="Tải hình ảnh PNG nhãn mã vạch"
            >
              <FaDownload className="me-1" />
              PNG
            </Button>
          </Col>
          <Col xs={6} md={3}>
            <Button 
              variant="outline-success" 
              size="sm" 
              onClick={handleCopy}
              className="w-100"
              title="Sao chép mã mẫu"
            >
              <FaCopy className="me-1" />
              Copy
            </Button>
          </Col>
          <Col xs={6} md={3}>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handlePrint}
              className="w-100 fw-bold"
              title="In nhãn mã vạch dán ống xét nghiệm"
            >
              <FaPrint className="me-1" />
              In
            </Button>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default BarcodeDisplay;
