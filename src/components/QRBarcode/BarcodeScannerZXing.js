import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useNotificationContext } from '../../contexts/NotificationContext';

/**
 * Barcode Scanner Component using ZXing.js
 * 
 * High-quality barcode scanner using Google's ZXing library.
 * Better performance and reliability than html5-qrcode.
 * 
 * @param {Function} onScanSuccess - Callback when barcode is scanned successfully (receives barcode string)
 * @param {Function} onClose - Optional callback when scanner is closed
 */
const BarcodeScannerZXing = ({ onScanSuccess, onClose }) => {
  const { showSuccess, showError } = useNotificationContext();
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    const startScanning = async () => {
      try {
        setError(null);
        
        // Lấy danh sách camera
        const devices = await codeReaderRef.current.listVideoInputDevices();
        
        if (devices.length === 0) {
          setError('Không tìm thấy camera');
          return;
        }

        // Ưu tiên camera sau (environment) trên mobile
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        );
        const selectedDeviceId = backCamera?.deviceId || devices[0].deviceId;

        if (!videoRef.current) {
          return;
        }

        // Bắt đầu quét
        await codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const barcode = result.getText();
              
              // Validate barcode format (should start with 'S' followed by numbers)
              const barcodePattern = /^S\d+$/;
              if (!barcodePattern.test(barcode)) {
                showError('Mã vạch không hợp lệ! Mã vạch mẫu phải bắt đầu bằng "S"');
                return;
              }

              // Quét thành công
              setScannedBarcode(barcode);
              showSuccess('Đã quét mã vạch thành công!');
              
              // Stop scanner
              stopScanning();
              
              // Call success callback
              if (onScanSuccess) {
                onScanSuccess(barcode);
              }
            }
            
            // NotFoundException là bình thường - không cần xử lý
            // Chỉ log các lỗi khác nếu cần
            if (error && !(error instanceof NotFoundException)) {
              // Không hiển thị lỗi NotFoundException - đây là lỗi bình thường khi đang tìm barcode
              const errorMsg = error.message || error.toString();
              if (!errorMsg.includes('NotFoundException') && !errorMsg.includes('No MultiFormat')) {
              }
            }
          }
        );
        
        setScanning(true);
      } catch (err) {
        setError('Không thể khởi tạo camera. Vui lòng kiểm tra quyền truy cập camera.');
        showError('Không thể khởi tạo camera. Vui lòng kiểm tra quyền truy cập camera.');
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      setScanning(false);
    }
  };

  const handleRetry = () => {
    setScannedBarcode(null);
    setError(null);
    // Component sẽ tự động restart scanner khi state thay đổi
    window.location.reload(); // Hoặc implement restart logic tốt hơn
  };

  return (
    <Card className="mt-3 mb-2">
      <Card.Header style={{ background: '#198754', color: 'white' }}>
        <i className="fas fa-barcode me-2"></i>
        Quét Mã Vạch Mẫu Xét Nghiệm (ZXing)
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        {scannedBarcode ? (
          <Alert variant="success" className="text-center">
            <i className="fas fa-check-circle me-2"></i>
            <strong>Đã quét:</strong> {scannedBarcode}
          </Alert>
        ) : (
          <>
            <Alert variant="info" className="mb-3">
              <h6 className="fw-bold mb-2">
                <i className="fas fa-lightbulb me-2"></i>
                Hướng dẫn quét mã vạch:
              </h6>
              <ul className="mb-0 ps-3" style={{ fontSize: '0.9rem' }}>
                <li>Đảm bảo ánh sáng đủ và rõ ràng</li>
                <li>Đưa camera cách barcode khoảng 20-30cm</li>
                <li>Giữ điện thoại ổn định, không rung</li>
                <li>Đảm bảo barcode nằm trong khung quét</li>
                <li>Barcode phải đầy đủ, không bị che khuất</li>
              </ul>
            </Alert>
            <div className="d-flex justify-content-center mb-3">
              <video 
                ref={videoRef} 
                style={{ 
                  width: '100%', 
                  maxWidth: '500px',
                  borderRadius: '8px',
                  border: '2px solid #198754'
                }}
                playsInline
              />
            </div>
            {scanning && (
              <Alert variant="info" className="text-center mb-3">
                <i className="fas fa-spinner fa-spin me-2"></i>
                Đang quét barcode...
              </Alert>
            )}
            <div className="text-center">
              <Button variant="outline-secondary" size="sm" onClick={handleRetry}>
                <i className="fas fa-redo me-2"></i>Thử lại
              </Button>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default BarcodeScannerZXing;

