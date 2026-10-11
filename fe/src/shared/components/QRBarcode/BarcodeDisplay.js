import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { Button, Row, Col } from 'react-bootstrap';
import { FaDownload, FaCopy, FaPrint } from 'react-icons/fa';
import jsPDF from 'jspdf';

const BarcodeDisplay = ({ 
  value, 
  format = 'CODE128',
  width = 2,
  height = 60,
  displayValue = true,
  fontSize = 14,
  margin = 10,
  title = 'Barcode',
  showActions = false,
  className = ''
}) => {
  const barcodeRef = useRef(null);
  
  const handleDownload = () => {
    // Lấy SVG từ ref
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
    
    const padding = 20;
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
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a6' // Small format for barcode
      });
      
      // Calculate dimensions to fit barcode in PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions maintaining aspect ratio
      const imgWidthMM = pdfWidth - 20; // 10mm margin on each side
      const imgHeightMM = (canvas.height / canvas.width) * imgWidthMM;
      
      // Center the image
      const x = 10;
      const y = (pdfHeight - imgHeightMM) / 2;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', x, y, imgWidthMM, imgHeightMM);
      
      // Add text below barcode
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      const textY = y + imgHeightMM + 5;
      pdf.text(`Mã: ${value}`, pdfWidth / 2, textY, { align: 'center' });
      
      // Save PDF
      pdf.save(`barcode-${value}.pdf`);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    };
    
    img.onerror = () => {
      alert('Lỗi khi tạo PDF mã vạch!');
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      alert('Đã copy barcode data!');
    });
  };

  const handlePrint = () => {
    // Sử dụng ref để lấy SVG chính xác hơn
    let barcodeSvg = null;
    
    // Ưu tiên: Lấy từ ref
    if (barcodeRef.current) {
      barcodeSvg = barcodeRef.current.querySelector('svg');
    }
    
    // Fallback: Tìm trong barcode-wrapper
    if (!barcodeSvg) {
      const barcodeWrapper = document.querySelector('.barcode-wrapper');
      if (barcodeWrapper) {
        barcodeSvg = barcodeWrapper.querySelector('svg');
      }
    }
    
    // Fallback 2: Tìm trong toàn bộ component
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
    // Clone SVG để không ảnh hưởng đến SVG gốc
    const clonedSvg = barcodeSvg.cloneNode(true);
    
    // Loại bỏ tất cả text elements từ SVG để tránh duplicate
    const textElements = clonedSvg.querySelectorAll('text');
    textElements.forEach(text => text.remove());
    
    // Convert SVG sang base64 image
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Đợi SVG load xong rồi convert sang canvas để in
    const img = new Image();
    img.onload = () => {
      // Tạo canvas để render barcode
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size với padding
      const padding = 40;
      const textHeight = displayValue ? 40 : 0; // Space for barcode value text
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + textHeight;
      
      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw barcode image (centered)
      const barcodeX = padding;
      const barcodeY = padding;
      ctx.drawImage(img, barcodeX, barcodeY);
      
      // Draw barcode value below barcode - chỉ một lần
      if (displayValue) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Tính toán font size để text có chiều rộng bằng với barcode width
        const barcodeWidth = img.width;
        const textValue = String(value);
        let fontSize = 12; // Starting font size
        let textWidth;
        
        // Tăng dần font size cho đến khi text width gần bằng barcode width
        do {
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(textValue);
          textWidth = metrics.width;
          
          if (textWidth < barcodeWidth && fontSize < 60) {
            fontSize += 0.5; // Tăng nhỏ hơn để chính xác hơn
          } else {
            break;
          }
        } while (textWidth < barcodeWidth && fontSize < 60);
        
        // Nếu text quá lớn, giảm lại một chút để vừa với barcode width
        if (textWidth > barcodeWidth) {
          fontSize -= 0.5;
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          // Đo lại để đảm bảo chính xác
          const metrics = ctx.measureText(textValue);
          textWidth = metrics.width;
        }
        
        // Đặt font cuối cùng và vẽ text value dưới barcode, căn giữa
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillText(textValue, canvas.width / 2, padding + img.height + 10);
      }
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      // Open print window với barcode image
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Barcode</title>
            <style>
              @media print {
                body { 
                  margin: 0; 
                  padding: 0; 
                }
                .barcode-container { 
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  page-break-inside: avoid;
                }
              }
              body { 
                text-align: center; 
                font-family: Arial, sans-serif; 
                padding: 0;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: white;
              }
              .barcode-container { 
                margin: 0 auto;
              }
              .barcode-image {
                max-width: 100%;
                height: auto;
                display: block;
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <img src="${dataUrl}" alt="Barcode" class="barcode-image" />
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Đợi image load xong rồi print
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
    // Lấy SVG từ ref
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
    
    // Create canvas with high resolution
    const scale = 3;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const padding = 40;
    canvas.width = svgWidth * scale + (padding * 2);
    canvas.height = svgHeight * scale + (padding * 2);
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(barcodeSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    
    img.onload = () => {
      // Draw barcode with padding
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, padding, padding, svgWidth * scale, svgHeight * scale);
      
      // Download as PNG
      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `barcode-${value}.png`;
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
      
      <div ref={barcodeRef} className="mb-3 d-flex justify-content-center barcode-wrapper">
        <Barcode
          value={value}
          format={format}
          width={width}
          height={height}
          displayValue={displayValue}
          fontSize={fontSize}
          margin={margin}
          className="barcode-svg"
        />
      </div>
      
      {showActions && (
        <Row className="g-2">
          <Col xs={6} md={3}>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={handleDownload}
              className="w-100"
              title="Tải PDF để in hoặc lưu trữ"
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
              title="Tải PNG để quét lại"
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
              title="Copy mã số"
            >
              <FaCopy className="me-1" />
              Copy
            </Button>
          </Col>
          <Col xs={6} md={3}>
            <Button 
              variant="outline-warning" 
              size="sm" 
              onClick={handlePrint}
              className="w-100"
              title="In mã vạch"
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
