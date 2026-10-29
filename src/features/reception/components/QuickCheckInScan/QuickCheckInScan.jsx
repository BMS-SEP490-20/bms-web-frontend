import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { appointmentService } from '../../../../services/appointmentService';
import { doctorService } from '../../../../services/doctorService';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';

/**
 * Quick Check-In QR Code Scanner Component.
 * Feature Task: Scan QR Check-in (Web).
 * 
 * @description Provides high-speed QR code scanning and manual appointment lookup at the reception desk.
 * Captures appointment QR codes via camera feed (Html5Qrcode), validates appointment status,
 * verifies the reception time window, updates status to 'checked_in', and automatically adds
 * the patient to the active consultation/sample collection queue.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {string} [props.receptionistId] - Identifier of the receptionist handling the intake.
 * @param {Function} [props.onSuccess] - Callback fired when check-in succeeds.
 * @param {boolean} [props.isModalOpen=true] - Indicates if the scanner dialog is currently visible.
 * @param {('camera'|'manual')} [props.initialMode='camera'] - Initial scan mode.
 * @param {string} [props.initialManualCode=''] - Initial appointment code for manual fallback.
 * @returns {JSX.Element} The rendered QR scanner and intake confirmation interface.
 */
const QuickCheckInScan = ({ receptionistId, onSuccess, isModalOpen = true, initialMode = "camera", initialManualCode = "" }) => {
  const { showSuccess, showError, showInfo, showWarning } = useNotificationContext();
  const scannerRef = useRef(null);
  const clearedRef = useRef(false);
  const startedRef = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const [manualCode, setManualCode] = useState(initialManualCode || '');
  const [scanMode, setScanMode] = useState(initialMode || 'camera');
  const [cameraError, setCameraError] = useState(null);
  const errorShownRef = useRef(false);
  const scanningRef = useRef(false);
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const containerIdRef = useRef(null);
  const [lastCheckedInPatient, setLastCheckedInPatient] = useState(null);
  const [pendingCheckInPatient, setPendingCheckInPatient] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 10; // Maximum initialization retry attempts

  if (!containerIdRef.current) {
    containerIdRef.current = `qr-quick-checkin-zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }


  // Trigger manual mode if specified in initialMode
  useEffect(() => {
    if (isModalOpen && initialMode === 'manual' && initialManualCode && !startedRef.current) {
      handleManualSubmit({ preventDefault: () => { } });
    }
  }, [isModalOpen, initialMode, initialManualCode]);

  const handleManualSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!manualCode.trim() || scanningRef.current) return;

    scanningRef.current = true;
    try {
      const respGet = await appointmentService.getAppointmentByCode(manualCode.trim());
      if (respGet.success && respGet.data) {
        const apt = respGet.data;
        const patientName = apt.patientName || (apt.patient && apt.patient.name) || (apt.patientId && apt.patientId.name) || 'Bệnh nhân';

        if (apt.status === 'Completed' || apt.status === 'Cancelled') {
          showError(`❌ Lịch hẹn không ở trạng thái cho phép check-in.`);
          scanningRef.current = false;
          return;
        }

        setPendingCheckInPatient({
          aptId: apt.id,
          name: patientName,
          appointmentCode: manualCode.trim(),
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime,
          service: apt.service || 'Xét nghiệm máu',
          status: apt.status
        });
        showInfo(`Đã tìm thấy lịch hẹn của "${patientName}". Vui lòng xác nhận check-in.`);
        scanningRef.current = false;
      } else {
        scanningRef.current = false;
        showError(`❌ Không tìm thấy lịch hẹn với mã ${manualCode.trim()}`);
      }
    } catch (error) {
      scanningRef.current = false;
      showError(`❌ Lỗi: ${error.message}`);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!pendingCheckInPatient) return;
    setIsConfirming(true);
    try {
      const respUpdate = await appointmentService.checkInAppointment(pendingCheckInPatient.aptId, receptionistId);
      if (respUpdate.success) {
        setLastCheckedInPatient({
          name: pendingCheckInPatient.name,
          appointmentCode: pendingCheckInPatient.appointmentCode,
          appointmentDate: pendingCheckInPatient.appointmentDate,
          appointmentTime: pendingCheckInPatient.appointmentTime,
          service: pendingCheckInPatient.service,
          queueNumber: (respUpdate.data && respUpdate.data.queueNumber) || (respUpdate.data && respUpdate.data.QueueNumber) || null
        });
        showSuccess(`✅ Check-in thành công cho "${pendingCheckInPatient.name}"!`, 5000);
        setPendingCheckInPatient(null);
        setTimeout(() => {
          scanningRef.current = false;
          setLastCheckedInPatient(null);
          if (onSuccess) onSuccess();
        }, 5000);
      } else {
        showError(`❌ Không thể check-in. ${respUpdate.message || 'Vui lòng thử lại.'}`);
        scanningRef.current = false;
      }
    } catch (e) {
      showError(`❌ Lỗi: ${e.message}`);
      scanningRef.current = false;
    } finally {
      setIsConfirming(false);
    }
  };

  const cancelPendingCheckIn = () => {
    setPendingCheckInPatient(null);
    scanningRef.current = false;
  };


  const clearContainer = () => {
    const el = document.getElementById(containerIdRef.current);
    if (el) el.innerHTML = '';
  };

  // Verify component mounting and DOM readiness
  useEffect(() => {
    if (isModalOpen) {
      // Reset state when modal is reopened
      clearedRef.current = false;
      startedRef.current = false;
      errorShownRef.current = false;
      retryCountRef.current = 0; // Reset retry count

      // Delay execution to ensure modal mounting
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 300); // Wait for modal rendering
      return () => clearTimeout(timer);
    } else {
      // Clean up camera stream and reset state upon modal dismissal
      setIsReady(false);
      retryCountRef.current = 0; // Reset retry count
      if (scannerRef.current && !clearedRef.current) {
        clearedRef.current = true;
        scannerRef.current.clear().catch(() => { });
        clearContainer();
      }
      startedRef.current = false;
      setInitialized(false);
      setCameraError(null);
      errorShownRef.current = false;
    }
  }, [isModalOpen]);

  useEffect(() => {
    const startScanner = () => {
      if (startedRef.current || clearedRef.current) return;

      // Verify DOM target element exists before starting scanner
      const containerElement = document.getElementById(containerIdRef.current);
      if (!containerElement) {
        retryCountRef.current += 1;
        if (retryCountRef.current > MAX_RETRIES) {
          setCameraError('unknown');
          errorShownRef.current = true;
          return;
        }
        // Retry after brief delay for DOM readiness
        setTimeout(() => {
          if (!startedRef.current && !clearedRef.current && retryCountRef.current <= MAX_RETRIES) {
            startScanner();
          }
        }, 200); // Retry delay interval
        return;
      }

      // Reset retry counter when element is located
      retryCountRef.current = 0;

      startedRef.current = true;

      clearContainer();
      setCameraError(null);
      errorShownRef.current = false;

      try {
        // Scanner configuration with default format support
        // Optional fallback to QR_CODE only if needed
        const scanner = new Html5QrcodeScanner(
          containerIdRef.current,
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0,
            // Default scanner config supporting standard formats
            // supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE],
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            rememberLastUsedCamera: true
          },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          async (decodedText) => {
            if (scanningRef.current) return;
            scanningRef.current = true;

            try {
              showInfo('Đã quét được mã QR, đang tìm lịch hẹn...');

              let qrObj;
              let appointmentCodeFromQR;

              try {
                qrObj = JSON.parse(decodedText);
                appointmentCodeFromQR = qrObj.c || qrObj.appointmentCode;
              } catch (err) {
                // If JSON parsing fails, treat string directly as appointment code
                appointmentCodeFromQR = decodedText.trim();
              }

              if (!appointmentCodeFromQR) {
                scanningRef.current = false;
                showError('❌ Không tìm thấy mã lịch hẹn trong QR code. Vui lòng quét lại.');
                return;
              }

              // Locate appointment using scanned code
              showInfo(`Đang tìm lịch hẹn với mã: ${appointmentCodeFromQR}...`);

              const respGet = await appointmentService.getAppointmentByCode(appointmentCodeFromQR);
              if (!respGet.success || !respGet.data) {
                scanningRef.current = false;
                showError(`❌ Không tìm thấy lịch hẹn với mã "${appointmentCodeFromQR}" trong hệ thống. Vui lòng kiểm tra lại mã QR.`);
                return;
              }

              let apt = respGet.data;
              const patientName = apt.patientName || 'Bệnh nhân';

              // Enrich appointment with shift date and time if absent
              const aptShiftId = apt.doctorShiftId || apt.DoctorShiftId || apt.doctor_shift_id || apt.shiftId || apt.ShiftId;
              if (aptShiftId && (!apt.appointmentDate || !apt.appointmentTime)) {
                try {
                  const shiftResp = await doctorService.getDoctorShiftById(aptShiftId);
                  if (shiftResp.success && shiftResp.data) {
                    const shift = shiftResp.data;

                    // Enrich date
                    if (!apt.appointmentDate) {
                      const shiftDate = shift.ShiftDate || shift.shiftDate || shift.date || shift.Date;
                      if (shiftDate) {
                        try {
                          const date = new Date(shiftDate);
                          if (!isNaN(date.getTime())) {
                            apt.appointmentDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          }
                        } catch (err) {
                        }
                      }
                    }

                    // Enrich time
                    if (!apt.appointmentTime) {
                      const shiftStart = shift.ShiftStart || shift.shiftStart || shift.start || shift.Start;
                      if (shiftStart) {
                        if (typeof shiftStart === 'string') {
                          apt.appointmentTime = shiftStart.substring(0, 5); // Take HH:MM
                        } else {
                          apt.appointmentTime = String(shiftStart);
                        }
                      }
                    }
                  }
                } catch (err) {
                }
              }

              // Check if already checked in
              if (apt.status === 'checked_in') {
                scanningRef.current = false;
                const checkedInTime = apt.checkedInAt
                  ? new Date(apt.checkedInAt).toLocaleString('vi-VN')
                  : 'N/A';
                showError(`❌ Bệnh nhân "${patientName}" đã được check-in lúc ${checkedInTime}. Không thể check-in lại.`);
                return;
              }

              // Verify appointment workflow status
              const allowed = ['scheduled', 'confirmed'];
              if (!allowed.includes(apt.status)) {
                scanningRef.current = false;
                showError(`❌ Lịch hẹn của "${patientName}" không ở trạng thái cho phép check-in. Trạng thái hiện tại: ${apt.status}. Chỉ có thể check-in lịch hẹn đã được xác nhận hoặc đã thanh toán.`);
                return;
              }

              // Display appointment preview before confirming check-in
              showInfo(`Đã tìm thấy lịch hẹn của "${patientName}". Đang thực hiện check-in...`);

              // Set pending state for manual confirmation instead of auto check-in
              setPendingCheckInPatient({
                aptId: apt.id,
                name: patientName,
                appointmentCode: appointmentCodeFromQR,
                appointmentDate: apt.appointmentDate,
                appointmentTime: apt.appointmentTime,
                service: apt.service || 'Xét nghiệm máu',
                status: apt.status
              });
              showInfo(`Đã tìm thấy lịch hẹn của "${patientName}". Vui lòng xác nhận check-in.`);
            } catch (e) {
              scanningRef.current = false;
              showError(`❌ Lỗi khi xử lý quét QR: ${e.message || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.'}`);
            }
          },
          (errorMessage) => {
            if (!errorMessage || typeof errorMessage !== 'string') return;

            const cameraErrors = [
              'NotAllowedError',
              'NotFoundError',
              'NotReadableError',
              'OverconstrainedError',
              'SecurityError',
              'DevicesNotFound',
              'Permission denied',
              'No camera',
              'Camera access'
            ];

            const isRealCameraError = cameraErrors.some(err =>
              errorMessage.toLowerCase().includes(err.toLowerCase())
            );

            if (isRealCameraError && !errorShownRef.current) {
              errorShownRef.current = true;
              const errorMsg = errorMessage.toLowerCase();

              if (errorMsg.includes('notallowed') || errorMsg.includes('permission denied')) {
                setCameraError('permission_denied');
                showWarning('⚠️ Chưa cấp quyền camera. Vui lòng cấp quyền camera để sử dụng chức năng quét QR code.');
              } else if (errorMsg.includes('notfound') || errorMsg.includes('no camera')) {
                setCameraError('no_camera');
                showError('❌ Không tìm thấy camera. Vui lòng kiểm tra thiết bị của bạn.');
              } else {
                setCameraError('unknown');
                showError(`❌ Lỗi camera: ${errorMessage}. Vui lòng kiểm tra quyền truy cập camera.`);
              }
            }
          }
        );

        setInitialized(true);
        setCameraError(null);
      } catch (error) {
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          setCameraError('unknown');
          showError('❌ Không thể khởi tạo camera. Vui lòng kiểm tra quyền truy cập camera.');
        }
      }
    };

    const ensurePermission = async () => {
      if (startedRef.current || initialized || clearedRef.current || scanMode !== 'camera') {
        return;
      }

      try {
        // Verify HTTPS or localhost context for camera API access
        const isSecureContext = window.isSecureContext ||
          window.location.protocol === 'https:' ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';

        if (!isSecureContext) {
          setCameraError('not_supported');
          showError('❌ Camera chỉ hoạt động trên HTTPS hoặc localhost. Vui lòng truy cập qua HTTPS hoặc localhost.');
          return;
        }

        // Verify browser mediaDevices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('not_supported');
          showError('❌ Trình duyệt không hỗ trợ camera. Vui lòng sử dụng trình duyệt hiện đại như Chrome, Firefox, Safari hoặc Edge.');
          return;
        }

        // Verify camera permission access
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          // Stop validation stream immediately after check
          stream.getTracks().forEach(track => track.stop());

          // Initialize scanner once camera permission is confirmed
          if (!clearedRef.current) {
            // Delay initialization to ensure modal DOM rendering
            setTimeout(() => {
              if (!clearedRef.current && !startedRef.current) {
                startScanner();
              }
            }, 300); // Allow modal DOM to mount
          }
        } catch (permissionError) {
          // Handle camera permission denial or error
          const errorMsg = permissionError.message || permissionError.name || '';
          errorShownRef.current = true;

          if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
            setCameraError('permission_denied');
            showWarning('⚠️ Chưa cấp quyền camera. Vui lòng cấp quyền camera để sử dụng chức năng quét QR code.');
          } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('No camera')) {
            setCameraError('no_camera');
            showError('❌ Không tìm thấy camera. Vui lòng kiểm tra thiết bị của bạn.');
          } else {
            setCameraError('unknown');
            showError('❌ Không thể truy cập camera. Vui lòng kiểm tra cài đặt trình duyệt.');
          }
        }
      } catch (error) {
        setCameraError('unknown');
        showError('❌ Lỗi khi kiểm tra quyền camera. Vui lòng thử lại.');
      }
    };

    // Initialize camera only when modal is fully visible
    if (scanMode === 'camera' && isModalOpen && isReady && !initialized && !startedRef.current && !clearedRef.current) {
      // Await component mounting and element render
      // Modal container readiness check
      const timer = setTimeout(() => {
        // Verify scanner container element presence
        const containerElement = document.getElementById(containerIdRef.current);
        if (containerElement) {
          ensurePermission();
        } else {
          // Proceed to ensurePermission with retry handling
          ensurePermission();
        }
      }, 500); // Extended delay for modal mount

      return () => clearTimeout(timer);
    }

    return () => {
      if (scannerRef.current && !clearedRef.current) {
        clearedRef.current = true;
        scannerRef.current.clear().catch(() => { });
        clearContainer();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode, initialized, isReady, isModalOpen]);

  const handleFileScan = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("file-reader");
      }

      const decodedText = await html5QrCodeRef.current.scanFile(file, false);

      // Simulate QR scan
      if (decodedText) {
        scanningRef.current = true;
        showInfo('Đã quét được mã QR từ file, đang tìm lịch hẹn...');

        let qrObj;
        let appointmentCodeFromQR;

        try {
          qrObj = JSON.parse(decodedText);
          appointmentCodeFromQR = qrObj.c || qrObj.appointmentCode;
        } catch (err) {
          appointmentCodeFromQR = decodedText.trim();
        }

        if (!appointmentCodeFromQR) {
          scanningRef.current = false;
          showError('❌ Không tìm thấy mã lịch hẹn trong QR code. Vui lòng thử lại.');
          return;
        }

        const respGet = await appointmentService.getAppointmentByCode(appointmentCodeFromQR);
        if (!respGet.success || !respGet.data) {
          scanningRef.current = false;
          showError(`❌ Không tìm thấy lịch hẹn với mã "${appointmentCodeFromQR}" trong hệ thống.`);
          return;
        }

        const apt = respGet.data;
        const patientName = apt.patientName || 'Bệnh nhân';

        if (apt.status === 'checked_in') {
          scanningRef.current = false;
          showError(`❌ Bệnh nhân "${patientName}" đã được check-in.`);
          return;
        }

        const allowed = ['scheduled', 'confirmed'];
        if (!allowed.includes(apt.status)) {
          scanningRef.current = false;
          showError(`❌ Lịch hẹn không ở trạng thái cho phép check-in.`);
          return;
        }

        // Set pending state for manual confirmation instead of auto check-in
        setPendingCheckInPatient({
          aptId: apt.id,
          name: patientName,
          appointmentCode: appointmentCodeFromQR,
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime,
          service: apt.service || 'Xét nghiệm máu',
          status: apt.status
        });
        showInfo(`Đã tìm thấy lịch hẹn của "${patientName}". Vui lòng xác nhận check-in.`);
      }
    } catch (error) {
      showError('❌ Không thể đọc QR code từ file. Vui lòng thử lại.');
      scanningRef.current = false;
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetryCamera = () => {
    // Reset all states and refs
    setCameraError(null);
    errorShownRef.current = false;
    startedRef.current = false;
    clearedRef.current = false;
    clearContainer();

    // Reset initialized to trigger useEffect to run again
    setInitialized(false);
  };

  return (
    <div>
      <Alert variant="info" className="mb-3" style={{ borderRadius: '10px' }}>
        <div className="d-flex align-items-start">
          <i className="fas fa-info-circle me-2 mt-1" style={{ fontSize: '1.2rem' }}></i>
          <div>
            <strong className="d-block mb-2">Hướng dẫn check-in nhanh:</strong>
            <ul className="mb-2" style={{ paddingLeft: '1.2rem' }}>
              <li>Quét QR code từ lịch hẹn của bệnh nhân</li>
              <li>Hệ thống tự động tìm và check-in lịch hẹn tương ứng</li>
              <li>Không cần tìm kiếm hay nhập thông tin thủ công</li>
            </ul>
            <small className="text-muted">
              <i className="fas fa-lightbulb me-1"></i>
              Bạn có thể quét nhiều QR code liên tiếp để check-in nhiều bệnh nhân.
            </small>
          </div>
        </div>
      </Alert>

      {/* Patient check-in success confirmation panel */}

      {pendingCheckInPatient && !lastCheckedInPatient && (
        <Alert variant="warning" className="mb-3" style={{ borderRadius: '10px', animation: 'fadeIn 0.5s' }}>
          <div className="d-flex align-items-start">
            <i className="fas fa-exclamation-circle me-2 mt-1" style={{ fontSize: '1.5rem', color: '#fd7e14' }}></i>
            <div className="flex-grow-1">
              <h6 className="mb-2 fw-bold text-dark">
                Xác nhận thông tin bệnh nhân
              </h6>
              <div className="row g-2 text-dark mb-3">
                <div className="col-md-6">
                  <strong>Bệnh nhân:</strong> {pendingCheckInPatient.name}
                </div>
                <div className="col-md-6">
                  <strong>Mã:</strong> <code>{pendingCheckInPatient.appointmentCode}</code>
                </div>
                <div className="col-md-6">
                  <strong>Ngày:</strong> {pendingCheckInPatient.appointmentDate}
                </div>
                <div className="col-md-6">
                  <strong>Giờ:</strong> {pendingCheckInPatient.appointmentTime}
                </div>
                <div className="col-12">
                  <strong>Dịch vụ:</strong> {pendingCheckInPatient.service}
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-end mt-2">
                <Button variant="secondary" size="sm" onClick={cancelPendingCheckIn} disabled={isConfirming}>Hủy</Button>
                <Button variant="primary" size="sm" onClick={handleConfirmCheckIn} disabled={isConfirming}>
                  {isConfirming ? <Spinner size="sm" /> : <span><i className="fas fa-check me-1"></i> Xác nhận Check-in</span>}
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {lastCheckedInPatient && (
        <Alert variant="success" className="mb-3" style={{ borderRadius: '10px', animation: 'fadeIn 0.5s' }}>
          <div className="d-flex align-items-start">
            <i className="fas fa-check-circle me-2 mt-1" style={{ fontSize: '1.5rem' }}></i>
            <div className="flex-grow-1">
              <h6 className="mb-2 fw-bold">
                <i className="fas fa-user-check me-2"></i>
                Check-in thành công!
              </h6>
              <div className="row g-2">
                <div className="col-md-6">
                  <strong>Bệnh nhân:</strong> {lastCheckedInPatient.name}
                </div>
                <div className="col-md-6">
                  <strong>Mã lịch hẹn:</strong> <code>{lastCheckedInPatient.appointmentCode}</code>
                </div>
                <div className="col-md-6">
                  <strong>Ngày hẹn:</strong> {(() => {
                    const dateStr = lastCheckedInPatient.appointmentDate;
                    if (dateStr) {
                      try {
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                          // Date format: dd/MM/yyyy
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        }
                      } catch (err) {
                      }
                    }
                    return 'N/A';
                  })()}
                </div>
                <div className="col-md-6">
                  <strong>Giờ hẹn:</strong> {lastCheckedInPatient.appointmentTime || 'N/A'}
                </div>
                <div className="col-12">
                  <strong>Dịch vụ:</strong> {lastCheckedInPatient.service}
                </div>
                {lastCheckedInPatient.queueNumber && (
                  <div className="col-12 mt-2 pt-2 border-top">
                    <strong className="text-primary" style={{ fontSize: '1.1rem' }}>Mã hàng chờ: </strong>
                    <span className="badge bg-primary fs-5">{lastCheckedInPatient.queueNumber}</span>
                  </div>
                )}
              </div>
              <small className="text-muted d-block mt-2">
                <i className="fas fa-clock me-1"></i>
                Có thể tiếp tục quét QR code cho bệnh nhân tiếp theo...
              </small>
            </div>
          </div>
        </Alert>
      )}

      <div className="mb-3">
        <div className="btn-group w-100 shadow-sm" role="group" style={{ borderRadius: '10px', overflow: 'hidden' }}>
          <Button
            variant={scanMode === 'camera' ? 'primary' : 'outline-primary'}
            onClick={() => {
              if (scanMode !== 'camera') {
                setScanMode('camera');
                setCameraError(null);
                errorShownRef.current = false;
                startedRef.current = false;
                clearedRef.current = false;
                setInitialized(false);
              }
            }}
            style={{
              fontWeight: '600',
              borderRadius: scanMode === 'camera' ? '10px 0 0 10px' : '0',
              borderRight: scanMode === 'camera' ? 'none' : '1px solid #dee2e6'
            }}
          >
            <i className="fas fa-camera me-2"></i>
            Quét bằng camera
          </Button>
          <Button
            variant={scanMode === 'file' ? 'primary' : 'outline-primary'}
            onClick={() => {
              if (scanMode !== 'file') {
                setScanMode('file');
                setCameraError(null);
                // Clear camera when switching to file mode
                if (scannerRef.current && !clearedRef.current) {
                  clearedRef.current = true;
                  scannerRef.current.clear().catch(() => { });
                  clearContainer();
                }
                startedRef.current = false;
                setInitialized(false);
              }
            }}
            style={{
              fontWeight: '600',
              borderRadius: '0', borderRight: scanMode === 'file' ? 'none' : '1px solid #dee2e6'
            }}
          >
            <i className="fas fa-file-image me-2"></i>
            Quét từ file
          </Button>
          <Button
            variant={scanMode === 'manual' ? 'primary' : 'outline-primary'}
            onClick={() => {
              if (scanMode !== 'manual') {
                setScanMode('manual');
                setCameraError(null);
                if (scannerRef.current && !clearedRef.current) {
                  clearedRef.current = true;
                  scannerRef.current.clear().catch(() => { });
                }
                errorShownRef.current = false;
                setInitialized(false);
              }
            }}
            style={{
              fontWeight: '600',
              borderRadius: scanMode === 'manual' ? '0 10px 10px 0' : '0'
            }}
          >
            <i className="fas fa-keyboard me-2"></i>
            Nhập mã
          </Button>
        </div>
      </div>

      {scanMode === 'camera' && (
        <>
          {cameraError === 'permission_denied' && (
            <Alert variant="warning" className="mb-3">
              <Alert.Heading>
                <i className="fas fa-exclamation-triangle me-2"></i>
                Chưa cấp quyền camera
              </Alert.Heading>
              <p className="mb-2">
                <strong>Vui lòng cấp quyền camera để sử dụng chức năng quét QR code:</strong>
              </p>
              <div className="mb-3">
                <p className="mb-2"><strong>Cách cấp quyền camera:</strong></p>
                <ul className="mb-2">
                  <li><strong>Chrome/Edge:</strong> Nhấp vào biểu tượng <strong>🔒 khóa</strong> hoặc <strong>i</strong> trên thanh địa chỉ → Chọn <strong>"Camera"</strong> → Chọn <strong>"Cho phép"</strong></li>
                  <li><strong>Firefox:</strong> Nhấp vào biểu tượng <strong>🔒 khóa</strong> → Chọn <strong>"Cho phép"</strong> cho Camera</li>
                  <li><strong>Safari:</strong> Vào <strong>Safari → Preferences → Websites → Camera</strong> → Chọn <strong>"Allow"</strong></li>
                </ul>
                <p className="mb-0 text-muted small">
                  <i className="fas fa-info-circle me-1"></i>
                  Sau khi cấp quyền, nhấn nút <strong>"Thử lại"</strong> bên dưới
                </p>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <Button variant="warning" onClick={handleRetryCamera}>
                  <i className="fas fa-redo me-2"></i>
                  Thử lại
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setScanMode('file');
                    setCameraError(null);
                  }}
                >
                  <i className="fas fa-file-image me-2"></i>
                  Chuyển sang quét từ file ảnh
                </Button>
              </div>
            </Alert>
          )}

          {cameraError === 'no_camera' && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>
                <i className="fas fa-video-slash me-2"></i>
                Không tìm thấy camera
              </Alert.Heading>
              <p className="mb-2">
                Hệ thống không thể tìm thấy camera trên thiết bị của bạn. Vui lòng:
              </p>
              <ul className="mb-3">
                <li>Kiểm tra xem camera đã được kết nối chưa</li>
                <li>Đảm bảo camera không đang được sử dụng bởi ứng dụng khác</li>
                <li>Thử sử dụng chức năng quét từ file ảnh thay thế</li>
              </ul>
              <Button
                variant="outline-secondary"
                onClick={() => setScanMode('file')}
              >
                <i className="fas fa-file-image me-2"></i>
                Chuyển sang quét từ file ảnh
              </Button>
            </Alert>
          )}

          {cameraError === 'not_supported' && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>
                <i className="fas fa-exclamation-circle me-2"></i>
                Trình duyệt không hỗ trợ camera
              </Alert.Heading>
              <p className="mb-2">
                Trình duyệt của bạn không hỗ trợ truy cập camera. Vui lòng:
              </p>
              <ul className="mb-3">
                <li>Sử dụng trình duyệt hiện đại như Chrome, Firefox, Safari hoặc Edge</li>
                <li>Đảm bảo bạn đang truy cập qua HTTPS (không phải HTTP)</li>
                <li>Thử sử dụng chức năng quét từ file ảnh thay thế</li>
              </ul>
              <Button
                variant="outline-secondary"
                onClick={() => setScanMode('file')}
              >
                <i className="fas fa-file-image me-2"></i>
                Chuyển sang quét từ file ảnh
              </Button>
            </Alert>
          )}

          {cameraError === 'unknown' && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>
                <i className="fas fa-exclamation-triangle me-2"></i>
                Lỗi camera
              </Alert.Heading>
              <p className="mb-3">
                Đã xảy ra lỗi khi truy cập camera. Vui lòng thử lại hoặc sử dụng chức năng quét từ file ảnh.
              </p>
              <div className="d-flex gap-2">
                <Button variant="warning" onClick={handleRetryCamera}>
                  <i className="fas fa-redo me-2"></i>
                  Thử lại
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => setScanMode('file')}
                >
                  <i className="fas fa-file-image me-2"></i>
                  Chuyển sang quét từ file ảnh
                </Button>
              </div>
            </Alert>
          )}

          {!cameraError && (
            <Card className="mb-3 shadow-sm" style={{ borderRadius: '10px', overflow: 'hidden' }}>
              <Card.Body className="p-0">
                <div className="text-center bg-light py-2 border-bottom">
                  <small className="text-muted">
                    <i className="fas fa-qrcode me-1"></i>
                    Đưa camera vào QR code để quét
                  </small>
                </div>
                <div id={containerIdRef.current} style={{ minHeight: '400px' }}></div>
              </Card.Body>
            </Card>
          )}

          {!cameraError && !initialized && scanMode === 'camera' && (
            <Card className="mb-3">
              <Card.Body className="text-center py-5">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p>Đang khởi tạo camera...</p>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {scanMode === 'manual' && (
        <Card className="mb-3">
          <Card.Body>
            <Form onSubmit={handleManualSubmit}>
              <Form.Group>
                <Form.Label className="fw-bold text-primary">
                  <i className="fas fa-keyboard me-2"></i>
                  Nhập mã lịch hẹn
                </Form.Label>
                <InputGroup size="lg">
                  <Form.Control
                    type="text"
                    placeholder="Ví dụ: APP123456"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    autoFocus
                  />
                  <Button variant="primary" type="submit" disabled={!manualCode.trim() || scanningRef.current}>
                    {scanningRef.current ? <Spinner size="sm" /> : <span><i className="fas fa-search me-1"></i> Tìm & Check-in</span>}
                  </Button>
                </InputGroup>
              </Form.Group>
            </Form>
          </Card.Body>
        </Card>
      )}

      {scanMode === 'file' && (
        <Card className="mb-3">
          <Card.Body>
            <Form.Group>
              <Form.Label>
                <i className="fas fa-upload me-2"></i>
                Chọn file ảnh chứa QR code
              </Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileScan}
              />
            </Form.Group>
            <div id="file-reader" style={{ display: 'none' }}></div>
          </Card.Body>
        </Card>
      )}

      {scanningRef.current && (
        <Alert variant="info" className="mt-3">
          <Spinner animation="border" size="sm" className="me-2" />
          Đang xử lý...
        </Alert>
      )}
    </div>
  );
};

export default QuickCheckInScan;

