import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Alert, InputGroup, Form } from 'react-bootstrap';
import { 
  BrowserMultiFormatReader, 
  NotFoundException,
  BarcodeFormat,
  DecodeHintType 
} from '@zxing/library';
import * as pdfjsLib from 'pdfjs-dist';
import { useNotificationContext } from '../../contexts/NotificationContext';

// Configure PDF.js worker: prefer a locally served worker (public/pdf.worker.min.js)
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    const origin = window.location && window.location.origin ? window.location.origin : '';
    // Use an explicitly served local worker to avoid CDN fetches in dev
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.js`;
  }
} catch (e) {
  try { if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.disableWorker = true; } catch (_) {}
}

/**
 * Barcode Scanner Component using ZXing.js
 * 
 * High-quality barcode scanner using Google's ZXing library.
 * Better performance and reliability than html5-qrcode for barcode scanning.
 * 
 * @param {Function} onScanSuccess - Callback when barcode is scanned successfully (receives barcode string)
 * @param {Function} onClose - Optional callback when scanner is closed
 */
const BarcodeScanner = ({ onScanSuccess, onClose, barcodePattern: barcodePatternProp }) => {
  const { showSuccess, showError } = useNotificationContext();
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);
  const isScanningRef = useRef(false); // Track if currently scanning to prevent duplicate scans
  const [scanning, setScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [scanMode, setScanMode] = useState('camera'); // 'camera', 'manual', or 'file'
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Early return if conditions not met
    if (scanMode !== 'camera' || !videoRef.current) return;
    
    // If already initialized, don't re-initialize
    if (initialized) return;

    const startScanning = async () => {
      try {
        setError(null);
        setScanning(false);
        
        // Đảm bảo video element sẵn sàng
        if (!videoRef.current) {
          return;
        }

        // Đảm bảo không có stream cũ
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject;
          oldStream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }

        // Reset code reader to ensure fresh instance
        if (codeReaderRef.current) {
          try {
            codeReaderRef.current.reset();
          } catch (e) {
            // Ignore reset errors
          }
        }

        // Configure hints to improve barcode detection
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,  // Primary format used in the system
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.QR_CODE
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        
        codeReaderRef.current = new BrowserMultiFormatReader(hints);
        
        // Lấy danh sách camera
        const devices = await codeReaderRef.current.listVideoInputDevices();
        
        if (devices.length === 0) {
          setError('Không tìm thấy camera');
          showError('Không tìm thấy camera. Vui lòng kiểm tra kết nối camera hoặc dùng chức năng nhập thủ công.');
          return;
        }

        // Ưu tiên camera sau (environment) trên mobile
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('rear')
        );
        const selectedDeviceId = backCamera?.deviceId || devices[0].deviceId;

        if (!videoRef.current) {
          return;
        }

        // Yêu cầu quyền camera và lấy stream
        // Không dùng exact để tránh lỗi khi deviceId không khớp
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDeviceId ? { ideal: selectedDeviceId } : undefined,
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        // Gán stream vào video element để hiển thị
        if (!videoRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Đợi video sẵn sàng trước khi bắt đầu decode
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 2) {
            resolve();
          } else {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });

        if (!videoRef.current || !codeReaderRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Bắt đầu quét
        isScanningRef.current = true;
        setScanning(true);
        
        codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            // Nếu đã quét thành công, không xử lý thêm
            if (!isScanningRef.current) {
              return;
            }

            if (result) {
              try {
                // Đánh dấu đã xử lý để tránh duplicate
                isScanningRef.current = false;
                
                const barcode = result.getText();
                
                // Validate barcode format if a pattern was provided via prop
                let effectivePattern = null;
                try {
                  if (typeof barcodePatternProp !== 'undefined' && barcodePatternProp !== null) {
                    effectivePattern = barcodePatternProp instanceof RegExp ? barcodePatternProp : new RegExp(barcodePatternProp);
                  }
                } catch (e) {
                  effectivePattern = null;
                }

                if (effectivePattern && !effectivePattern.test(barcode)) {
                  showError('Mã vạch không hợp lệ theo định dạng mong đợi.');
                  isScanningRef.current = true; // Reset để có thể quét lại
                  return;
                }
                
                // Quét thành công
                setScannedBarcode(barcode);
                showSuccess('Đã quét mã vạch thành công!');
                
                // Stop scanner sau một chút để đảm bảo callback được gọi
                setTimeout(() => {
                  stopScanning();
                  
                  // Call success callback
                  if (onScanSuccess) {
                    onScanSuccess(barcode);
                  }
                }, 100);
              } catch (err) {
                showError('Lỗi khi xử lý kết quả quét');
                isScanningRef.current = true; // Reset để có thể quét lại
              }
            }
            
            // NotFoundException là bình thường - không cần xử lý
            // Chỉ log các lỗi khác nếu cần
            if (error && !(error instanceof NotFoundException)) {
              // Không hiển thị lỗi NotFoundException - đây là lỗi bình thường khi đang tìm barcode
              const errorMsg = error.message || error.toString() || '';
              // NotFoundException is normal - no need to handle
            }
          }
        );
        
        setInitialized(true);
      } catch (err) {
        const errorMsg = err.message || err.toString() || '';
        
        if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
          setError('Không có quyền truy cập camera. Vui lòng cho phép quyền camera và thử lại.');
          showError('Không có quyền truy cập camera. Vui lòng cho phép quyền camera và thử lại.');
        } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('No camera found')) {
          setError('Không tìm thấy camera. Vui lòng kiểm tra kết nối camera hoặc dùng chức năng nhập thủ công.');
          showError('Không tìm thấy camera. Vui lòng kiểm tra kết nối camera hoặc dùng chức năng nhập thủ công.');
        } else {
          setError('Không thể khởi tạo camera. Vui lòng thử lại.');
          showError('Không thể khởi tạo camera. Vui lòng thử lại.');
        }
      }
    };

    // Kiểm tra quyền camera trước
    const ensurePermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Trình duyệt không hỗ trợ camera. Vui lòng dùng chức năng nhập thủ công.');
          showError('Trình duyệt không hỗ trợ camera. Vui lòng dùng chức năng nhập thủ công.');
          return;
        }
        
        // Bắt đầu scanner
        startScanning();
      } catch (err) {
        setError('Không có quyền truy cập camera. Vui lòng cho phép quyền camera và thử lại.');
        showError('Không có quyền truy cập camera. Vui lòng cho phép quyền camera và thử lại.');
      }
    };

    if (!initialized && scanMode === 'camera') {
      ensurePermission();
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, scanMode]);

  const stopScanning = () => {
    // Mark scanning as stopped
    isScanningRef.current = false;
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      // Force video element to stop playing
      videoRef.current.pause();
      videoRef.current.load();
    }

    // Reset code reader
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        // Ignore reset errors
      }
      // Reset reader reference to force recreation
      codeReaderRef.current = null;
      setScanning(false);
    }
  };

  const handleRetry = async () => {
    // First, stop everything completely
    stopScanning();
    
    // Reset states
    setScannedBarcode(null);
    setError(null);
    setScanning(false);
    isScanningRef.current = false;
    
    // Wait a bit to ensure streams are fully stopped before restart
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reset initialization to trigger restart
        setInitialized(false);
    setScanMode('camera');
    // Component sẽ tự động restart scanner khi initialized = false và scanMode = 'camera'
  };


  const handleSwitchToManual = () => {
    stopScanning();
    setScanMode('manual');
    setError(null);
    setScannedBarcode(null);
    setManualBarcodeInput('');
  };

  const handleManualInput = () => {
    const barcode = manualBarcodeInput.trim();
    
    if (!barcode) {
      showError('Vui lòng nhập mã vạch');
      return;
    }

    // Validate barcode format if prop provided; otherwise accept any format
    let effectivePatternManual = null;
    try {
      if (typeof barcodePatternProp !== 'undefined' && barcodePatternProp !== null) {
        effectivePatternManual = barcodePatternProp instanceof RegExp ? barcodePatternProp : new RegExp(barcodePatternProp);
      }
    } catch (e) {
      effectivePatternManual = null;
    }
    if (effectivePatternManual && !effectivePatternManual.test(barcode)) {
      showError('Mã vạch không hợp lệ theo định dạng mong đợi.');
      return;
    }

    // Quét thành công
    setScannedBarcode(barcode);
    showSuccess('Đã nhập mã vạch thành công!');
    setError(null);
    
    // Call success callback
    if (onScanSuccess) {
      onScanSuccess(barcode);
    }
  };

  const handleManualInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleManualInput();
    }
  };

  const handleSwitchToCamera = () => {
    stopScanning();
    setScanMode('camera');
    setInitialized(false);
    setError(null);
    setScannedBarcode(null);
  };

  const handleSwitchToFile = () => {
    stopScanning();
    setScanMode('file');
    setError(null);
    setScannedBarcode(null);
  };

  // Helper function to convert PDF to image
  const handlePDFUpload = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Get first page
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 3.0 }); // High resolution
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to image
      const img = new Image();
      img.src = canvas.toDataURL('image/png');
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Now scan the image (reuse the same scanning logic)
      await scanImageElement(img);
      
    } catch (err) {
      showError('Lỗi khi đọc file PDF. Vui lòng thử file khác hoặc sử dụng ảnh PNG/JPG.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper function to scan an image element (extracted for reuse)
  const scanImageElement = async (img) => {
    let decodingSuccess = false;
    let barcode = null;
    
    // Configure hints - try CODE_128 only first
    const hintsCode128 = new Map();
    hintsCode128.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
    hintsCode128.set(DecodeHintType.TRY_HARDER, true);
    
    const hintsAll = new Map();
    hintsAll.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.QR_CODE
    ]);
    hintsAll.set(DecodeHintType.TRY_HARDER, true);
    
    const readerConfigs = [
      { name: 'CODE128', hints: hintsCode128 },
      { name: 'AllFormats', hints: hintsAll }
    ];
    
    const strategies = [
      { name: 'original', process: null },
      { name: 'contrast', process: () => preprocessImage(img, 'contrast') },
      { name: 'threshold', process: () => preprocessImage(img, 'threshold') },
      { name: 'adaptive', process: () => preprocessImage(img, 'adaptive') }
    ];
    
    // Try each reader config with each strategy
    for (const readerConfig of readerConfigs) {
      if (decodingSuccess) break;
      
      const codeReader = new BrowserMultiFormatReader(readerConfig.hints);
      
      for (const strategy of strategies) {
        try {
          const imageElement = strategy.process ? strategy.process() : img;
          
          const result = await codeReader.decodeFromImageElement(imageElement);
          barcode = result.getText();
          decodingSuccess = true;
          break;
        } catch (err) {
          // Try next strategy
        }
      }
    }
    
    if (!decodingSuccess || !barcode) {
      throw new Error('No barcode detected after trying all strategies');
    }
    
    // Validate barcode format if prop provided; otherwise accept any
    let effectivePatternFile = null;
    try {
      if (typeof barcodePatternProp !== 'undefined' && barcodePatternProp !== null) {
        effectivePatternFile = barcodePatternProp instanceof RegExp ? barcodePatternProp : new RegExp(barcodePatternProp);
      }
    } catch (e) {
      effectivePatternFile = null;
    }
    if (effectivePatternFile && !effectivePatternFile.test(barcode)) {
      showError('Mã vạch không hợp lệ theo định dạng mong đợi');
      return;
    }

    setScannedBarcode(barcode);
    showSuccess('Đã quét mã vạch từ file thành công!');
    
    if (onScanSuccess) {
      onScanSuccess(barcode);
    }
  };

  // Helper function to preprocess image for better barcode detection
  const preprocessImage = (img, mode = 'contrast') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Get dimensions - handle both Image and Canvas
    let sourceWidth, sourceHeight;
    if (img instanceof HTMLCanvasElement) {
      sourceWidth = img.width;
      sourceHeight = img.height;
    } else if (img instanceof HTMLImageElement) {
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
    } else {
      sourceWidth = img.width || 0;
      sourceHeight = img.height || 0;
    }
    
    // Validate dimensions
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return img; // Return original if dimensions invalid
    }
    
    // Scale up small images for better detection (minimum 600px width)
    const minWidth = 600;
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    
    if (sourceWidth < minWidth) {
      const scale = minWidth / sourceWidth;
      targetWidth = minWidth;
      targetHeight = sourceHeight * scale;
    }
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Draw image (scaled if needed)
    ctx.imageSmoothingEnabled = false; // Crisp scaling for barcodes
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    if (mode === 'contrast') {
      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const newGray = factor * (gray - 128) + 128;
        data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newGray));
      }
    } else if (mode === 'threshold') {
      // Binary threshold for high contrast
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const threshold = gray > 128 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = threshold;
      }
    } else if (mode === 'adaptive') {
      // Adaptive contrast - stronger adjustment
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const contrast = 2.0; // Higher contrast
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const newGray = factor * (gray - 128) + 128;
        data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newGray));
      }
    }
    
    // Put processed data back
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if PDF
    if (file.type === 'application/pdf') {
      await handlePDFUpload(file);
      return;
    }
    
    // Check file type - accept images
    if (!file.type.startsWith('image/')) {
      showError(`File không đúng định dạng! Vui lòng chọn ảnh (PNG, JPG, JPEG) hoặc PDF.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
      return;
    }
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imageData = event.target.result;
          const img = new Image();
          img.src = imageData;
          
          await new Promise((resolve) => {
            img.onload = resolve;
          });

          // Use the extracted scanning function
          await scanImageElement(img);
        } catch (err) {
          // More specific error message
          let errorMsg = 'Không tìm thấy mã vạch trong ảnh. ';
          
          if (err.message && err.message.includes('No MultiFormat Readers')) {
            errorMsg += 'Ảnh này có thể không chứa mã vạch hợp lệ, hoặc định dạng mã vạch không được hỗ trợ. ';
          }
          
          errorMsg += 'Hãy thử: (1) Chụp ảnh rõ nét hơn với ánh sáng tốt, (2) Đảm bảo toàn bộ mã vạch nằm trong khung, (3) Sử dụng chế độ "Nhập thủ công" để nhập số ID trực tiếp.';
          
          showError(errorMsg);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showError('Lỗi đọc file ảnh');
    }
  };

  const handleClose = () => {
    // Stop scanning trước khi đóng
    stopScanning();
    
    // Call onClose callback nếu có
    if (onClose) {
      onClose();
    }
  };

  return (
    <Card className="mt-3 mb-2">
      <Card.Header style={{ background: '#198754', color: 'white' }}>
        <i className="fas fa-barcode me-2"></i>
        Quét Mã Vạch Mẫu Xét Nghiệm
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
            {/* Toggle between camera, file, and manual mode */}
            <div className="text-center mb-3">
              <Button
                variant={scanMode === 'camera' ? 'primary' : 'outline-primary'}
                size="sm"
                className="me-2"
                onClick={handleSwitchToCamera}
                disabled={scanning}
              >
                <i className="fas fa-camera me-2"></i>Camera
              </Button>
              <Button
                variant={scanMode === 'file' ? 'primary' : 'outline-primary'}
                size="sm"
                className="me-2"
                onClick={handleSwitchToFile}
                disabled={scanning}
              >
                <i className="fas fa-image me-2"></i>Tải ảnh
              </Button>
              <Button
                variant={scanMode === 'manual' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={handleSwitchToManual}
                disabled={scanning}
              >
                <i className="fas fa-keyboard me-2"></i>Nhập thủ công
              </Button>
            </div>

            {scanMode === 'camera' ? (
              <>
                <div className="d-flex justify-content-center mb-3">
                  <video 
                    ref={videoRef} 
                    style={{ 
                      width: '100%', 
                      maxWidth: '500px',
                      borderRadius: '8px',
                      border: '2px solid #198754',
                      backgroundColor: '#000',
                      minHeight: '300px',
                      objectFit: 'cover'
                    }}
                    playsInline
                    muted
                    autoPlay
                  />
                </div>
                {scanning && (
                  <Alert variant="info" className="text-center mb-3">
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Đang quét barcode... Hãy đưa camera vào mã vạch
                  </Alert>
                )}
              </>
            ) : scanMode === 'file' ? (
              <>
                <div className="mb-3">
                  <Form.Label className="fw-bold">
                    <i className="fas fa-image me-2"></i>
                    Tải ảnh/PDF chứa mã vạch:
                  </Form.Label>
                  <Form.Control
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                  />
                  <Form.Text className="text-muted">
                    <small>
                      <i className="fas fa-info-circle me-1"></i>
                      Hỗ trợ ảnh (JPG, PNG) hoặc PDF chứa mã vạch.
                    </small>
                  </Form.Text>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <Form.Label className="fw-bold">
                    <i className="fas fa-barcode me-2"></i>
                    Nhập mã vạch mẫu xét nghiệm:
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Ví dụ: S403459"
                      value={manualBarcodeInput}
                      onChange={(e) => setManualBarcodeInput(e.target.value)}
                      onKeyPress={handleManualInputKeyPress}
                      disabled={scanning}
                      style={{ textTransform: 'uppercase' }}
                      autoFocus
                    />
                    <Button
                      variant="success"
                      onClick={handleManualInput}
                      disabled={scanning || !manualBarcodeInput.trim()}
                    >
                      <i className="fas fa-check me-2"></i>
                      Xác nhận
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    <small>
                      <i className="fas fa-info-circle me-1"></i>
                      Mã vạch phải bắt đầu bằng "S" theo sau là số. Ví dụ: S403459
                    </small>
                  </Form.Text>
                </div>
              </>
            )}
            
            <div className="text-center mt-3">
              <Button variant="outline-secondary" size="sm" onClick={handleRetry} disabled={scanning}>
                <i className="fas fa-redo me-2"></i>Thử lại
              </Button>
              {onClose && (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  className="ms-2"
                  onClick={handleClose}
                >
                  <i className="fas fa-times me-2"></i>Đóng
                </Button>
              )}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default BarcodeScanner;
