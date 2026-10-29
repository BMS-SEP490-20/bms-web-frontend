import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const HighResQRCode = ({ value, size = 220, className = '' }) => {
  const canvasRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (!canvasRef.current) return;
    
    // Calculate optimal scale based on size
    // For QR codes to be scannable, we need:
    // - Minimum 100-150px physical size for good recognition
    // - Scale should be high enough for sharp rendering
    // - Smaller QR codes need higher scale to maintain detail
    let scale;
    if (size < 80) {
      // For very small QR codes, use higher scale to ensure detail
      scale = 6; // 65px * 6 = 390px actual canvas, but displayed as 65px = crisp
    } else if (size < 120) {
      scale = 7; // Good balance for medium QR codes
    } else {
      scale = 8; // Standard for larger QR codes
    }
    
    // Render QR code without logo for better recognition quality
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      scale: scale,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M', // Medium error correction - balance between capacity and scannability
      margin: 4, // Tăng margin để có khoảng trắng xung quanh tốt hơn (chuẩn QR code)
      rendererOpt: {
        quality: 1.0 // Maximum quality rendering
      }
    }, (err) => {
      if (err) {
        return;
      }
    });
    
    return () => {
      isMountedRef.current = false;
    };
  }, [value, size]); // Removed logo from dependencies
  return <canvas ref={canvasRef} width={size} height={size} className={className} style={{ width: size, height: size, maxWidth: size, maxHeight: size, imageRendering: 'crisp-edges' }}/>;
};

export default HighResQRCode;
