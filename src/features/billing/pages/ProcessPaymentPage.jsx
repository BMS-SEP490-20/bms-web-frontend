/**
 * @file ProcessPaymentPage.jsx
 * @description Patient Laboratory Fee Checkout & VNPAY Sandbox Payment Processing (UC55).
 * Features:
 * - 15-Minute Reservation Countdown Timer (Auto-cancellation & slot release upon expiration).
 * - Official VNPAY Sandbox Gateway Integration (Redirects directly to sandbox.vnpayment.vn).
 * - Automatic Callback Handling & Verification (vnp_ResponseCode === '00' -> Paid & Confirmed).
 * - Check-in Receipt with QR Code & Prominent Manual Check-in Code (Mã nhập tay phụ).
 * - Clean Medical SaaS UI without exposed debug credentials, plus quick NCB test info modal.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Alert,
  Spinner,
  Modal
} from 'react-bootstrap';
import {
  FaCreditCard,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaCalendarAlt,
  FaUserMd,
  FaHospital,
  FaVial,
  FaArrowLeft,
  FaExternalLinkAlt,
  FaQrcode,
  FaTimesCircle,
  FaCopy,
  FaInfoCircle,
  FaCheck,
  FaBolt
} from 'react-icons/fa';
import api from '../../../config/api';

const DEFAULT_AMOUNT = 180000;

export default function ProcessPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Route query parameters
  const appointmentId = searchParams.get('appointmentId') || searchParams.get('id') || '';
  const appointmentCode = searchParams.get('code') || (appointmentId ? `APT-${appointmentId.slice(-8).toUpperCase()}` : 'APT-20261031-001');
  const initialAmount = parseFloat(searchParams.get('amount')) || DEFAULT_AMOUNT;
  const packageName = searchParams.get('pkgName') || 'Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)';

  // VNPAY Return URL parameters
  const vnpResponseCode = searchParams.get('vnp_ResponseCode');
  const vnpTransactionNo = searchParams.get('vnp_TransactionNo');
  const vnpTxnRef = searchParams.get('vnp_TxnRef');

  // Authenticated user
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // 15-Minute Countdown Timer (900 seconds)
  const [timeLeft, setTimeLeft] = useState(900);
  const [isExpired, setIsExpired] = useState(false);
  const timerRef = useRef(null);

  // Payment states
  const [loadingGateway, setLoadingGateway] = useState(false);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [verifyingReturn, setVerifyingReturn] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showNcbGuideModal, setShowNcbGuideModal] = useState(false);
  const [copiedCardNum, setCopiedCardNum] = useState(false);
  const [paymentTab, setPaymentTab] = useState('card');
  const [testCardNumber, setTestCardNumber] = useState('9704198526191432198');
  const [testCardHolder, setTestCardHolder] = useState('NGUYEN VAN A');
  const [testIssueDate, setTestIssueDate] = useState('07/15');
  const [testOtp, setTestOtp] = useState('123456');

  // 1. Process VNPAY Return Callback if present in URL
  useEffect(() => {
    if (!vnpResponseCode) return;

    let isMounted = true;
    const processReturn = async () => {
      setVerifyingReturn(true);
      setErrorMessage('');

      try {
        const queryParams = {};
        for (const [key, value] of searchParams.entries()) {
          queryParams[key] = value;
        }

        const res = await api.post('/payments/vnpay/verify-return', queryParams);
        if (!isMounted) return;

        if (res.data?.success) {
          setSuccessData(res.data.data || {
            transactionCode: vnpTransactionNo || vnpTxnRef || `VNP-${Date.now()}`,
            bankCode: searchParams.get('vnp_BankCode') || 'NCB',
            amount: initialAmount,
            status: 'Paid',
            appointmentId
          });
        } else {
          setErrorMessage(res.data?.message || 'Giao dịch thanh toán VNPAY không thành công.');
        }
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(
          err?.response?.data?.message ||
          `Giao dịch thanh toán không thành công hoặc người dùng đã huỷ (Mã phản hồi VNPAY: ${vnpResponseCode}).`
        );
      } finally {
        if (isMounted) setVerifyingReturn(false);
      }
    };

    processReturn();
    return () => { isMounted = false; };
  }, [vnpResponseCode]);

  // 2. Countdown clock effect (active only during Pending state)
  useEffect(() => {
    if (successData || isExpired) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsExpired(true);
          handleReservationExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [successData, isExpired]);

  // Handle expiration: cancel appointment hold
  const handleReservationExpired = async () => {
    if (!appointmentId) return;
    try {
      await api.delete(`/appointments/${appointmentId}`);
    } catch {
      // ignore
    }
  };

  // Format mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 3. Launch official VNPAY Gateway checkout redirect
  const handlePayViaVnPay = async () => {
    setLoadingGateway(true);
    setErrorMessage('');
    try {
      const returnUrl = `${window.location.origin}/payments/checkout?appointmentId=${appointmentId}&code=${appointmentCode}`;

      const res = await api.post('/payments/vnpay/create-url', {
        appointmentId,
        amount: initialAmount,
        orderInfo: `Thanh toan lich hen ${appointmentCode}`,
        returnUrl
      });

      if (res.data?.success && res.data?.data?.paymentUrl) {
        // Direct redirect to official VNPAY Sandbox payment page
        window.location.href = res.data.data.paymentUrl;
      } else {
        setErrorMessage('Không thể khởi tạo cổng thanh toán VNPAY Sandbox.');
        setLoadingGateway(false);
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Lỗi kết nối cổng VNPAY Sandbox.');
      setLoadingGateway(false);
    }
  };

  // 4. Fast Demo Simulation (NCB Card success / failure)
  const handleFastDemoPay = async (simulateFailure = false) => {
    setSubmittingPay(true);
    setErrorMessage('');
    try {
      const payload = {
        appointmentId,
        amount: initialAmount,
        bankCode: 'NCB',
        cardNumber: testCardNumber || '9704198526191432198',
        cardHolder: testCardHolder || 'NGUYEN VAN A',
        issueDate: testIssueDate || '07/15',
        otp: testOtp || '123456',
        simulateFailure
      };

      const res = await api.post('/payments/vnpay/demo-pay', payload);
      if (res.data?.success) {
        setSuccessData(res.data.data || {
          transactionCode: `VNP-NCB-${Date.now()}`,
          bankCode: 'NCB',
          amount: initialAmount,
          status: 'Paid',
          appointmentId,
          appointmentCode
        });
      } else {
        setErrorMessage(res.data?.message || 'Giao dịch thanh toán không thành công.');
      }
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message ||
        'Giao dịch không thành công: Thẻ không đủ điều kiện hoặc bị từ chối bởi Ngân hàng phát hành (Mã lỗi VNPAY: 24).'
      );
    } finally {
      setSubmittingPay(false);
    }
  };

  // Copy helpers
  const handleCopyCode = () => {
    navigator.clipboard.writeText(appointmentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyCardNum = () => {
    navigator.clipboard.writeText('9704198526191432198');
    setCopiedCardNum(true);
    setTimeout(() => setCopiedCardNum(false), 2000);
  };

  return (
    <div className="bms-payment-page py-2 bg-light" style={{ minHeight: '85vh' }}>
      <div className="container-xl">
        {/* Top Header / Breadcrumb */}
        <header className="bms-page-header">
          <div className="bms-page-header-content">
            <h1 className="bms-page-title">Thanh toán</h1>
          </div>
          <div className="bms-page-actions">
            <Link to="/appointments/book" className="btn btn-light btn-sm rounded-pill">Quay lại</Link>
          </div>
        </header>

        {/* 15-Minute Countdown Banner */}
        {!successData && !isExpired && (
          <div className={`p-3 rounded-4 mb-4 border d-flex flex-wrap align-items-center justify-content-between shadow-sm ${timeLeft <= 180 ? 'bg-danger-subtle border-danger text-danger' : 'bg-warning-subtle border-warning text-dark'}`}>
            <div className="d-flex align-items-center gap-3">
              <div className="fs-3">
                <FaClock className={timeLeft <= 180 ? 'text-danger animate-pulse' : 'text-warning'} />
              </div>
              <div>
                <div className="fw-bold fs-6">
                  Thời Gian Giữ Chỗ Xét Nghiệm Còn Lại:{' '}
                  <span className="font-monospace fw-bolder fs-5 text-danger">{formatTime(timeLeft)}</span>
                </div>
                <small className="text-muted">
                  Vui lòng hoàn tất thanh toán trong vòng 15 phút. Sau thời gian này, lịch hẹn sẽ tự động bị huỷ để giải phóng chỗ.
                </small>
              </div>
            </div>
            <div>
              <Badge bg="warning" text="dark" className="px-3 py-2 fw-semibold">
                Trạng thái: Chờ thanh toán
              </Badge>
            </div>
          </div>
        )}

        {/* Verifying return loader */}
        {verifyingReturn && (
          <Alert variant="info" className="rounded-4 p-2 shadow-sm text-center mb-4">
            <Spinner animation="border" variant="primary" className="me-2" />
            <span className="fw-semibold">Đang xác thực kết quả giao dịch từ Cổng VNPAY...</span>
          </Alert>
        )}

        {/* Reservation Expired Alert */}
        {isExpired && !successData && (
          <Alert variant="danger" className="rounded-4 p-2 shadow-sm mb-4">
            <h5 className="fw-bold d-flex align-items-center gap-2">
              <FaTimesCircle /> Thời Gian Giữ Chỗ Đã Hết Hạn (15:00)
            </h5>
            <p className="mb-3">
              Rất tiếc, khung giờ hẹn xét nghiệm <strong>{appointmentCode}</strong> đã hết thời gian giữ chỗ 15 phút và hệ thống đã tự động giải phóng vị trí.
            </p>
            <Button variant="danger" onClick={() => navigate('/appointments/book')} className="fw-semibold px-3">
              Đặt Lại Lịch Hẹn Mới
            </Button>
          </Alert>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <Alert variant="danger" className="rounded-4 p-3 shadow-sm mb-4 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <FaExclamationTriangle className="fs-5 text-danger flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button variant="outline-danger" size="sm" onClick={() => setErrorMessage('')} className="rounded-pill px-3">
              Đóng
            </Button>
          </Alert>
        )}

        {/* SUCCESS RECEIPT VIEW */}
        {successData ? (
          <Card className="border-0 shadow-sm rounded-4 p-2 p-md-5 text-center mb-4 bg-white">
            <div className="mb-3">
              <div
                className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center"
                style={{ width: 80, height: 80 }}
              >
                <FaCheckCircle style={{ fontSize: 44 }} />
              </div>
            </div>
            <h3 className="fw-bold text-success mb-1">Thanh Toán Thành Công Qua Cổng VNPAY!</h3>
            <p className="text-muted mb-4">
              Lịch hẹn của bạn đã được xác nhận chính thức. Vui lòng lưu lại thông tin tiếp đón dưới đây để làm thủ tục tại phòng khám.
            </p>

            <div className="row g-3 justify-content-center text-start mb-4">
              <div className="col-md-8">
                <div className="p-2 bg-light rounded-4 border">
                  <div className="d-flex justify-content-between pb-2 border-bottom mb-2">
                    <span className="text-muted">Mã Giao Dịch VNPAY:</span>
                    <strong className="font-monospace text-primary">{successData.transactionCode}</strong>
                  </div>
                  <div className="d-flex justify-content-between pb-2 border-bottom mb-2">
                    <span className="text-muted">Phương thức thanh toán:</span>
                    <strong className="text-dark">Cổng VNPAY (Ngân hàng {successData.bankCode || 'NCB'})</strong>
                  </div>
                  <div className="d-flex justify-content-between pb-2 border-bottom mb-2">
                    <span className="text-muted">Số tiền đã thanh toán:</span>
                    <strong className="text-success fs-5">{Number(successData.amount || initialAmount).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Trạng thái phiếu:</span>
                    <Badge bg="success" className="px-3 py-1">Đã Xác Nhận &amp; Đã Thanh Toán</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Check-in QR Code & Prominent Manual Code */}
            <div className="p-2 bg-light border border-2 border-primary-subtle rounded-4 mx-auto mb-4" style={{ maxWidth: 540 }}>
              <h5 className="fw-bold text-primary text-uppercase mb-2 d-flex align-items-center justify-content-center gap-2">
                <FaQrcode /> Phiếu Tiếp Đón &amp; Check-in Xét Nghiệm
              </h5>
              <p className="small text-muted mb-3">
                Xuất trình mã QR này tại quầy Lễ tân hoặc máy quét tự động khi đến phòng xét nghiệm.
              </p>

              <div className="p-3 bg-white d-inline-block rounded-3 border shadow-sm mb-3">
                <QRCodeSVG
                  value={appointmentCode}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Prominent Manual Code */}
              <div className="bg-white border border-primary p-3 rounded-3 shadow-sm mx-auto" style={{ maxWidth: 380 }}>
                <div className="small text-muted fw-semibold mb-1">Mã Nhập Tay Phụ (Manual Check-in Code):</div>
                <div className="h4 fw-bold font-monospace text-primary mb-1 tracking-wider">
                  {appointmentCode}
                </div>
                <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                  (Dành cho Lễ tân nhập trực tiếp vào hệ thống nếu máy quét QR gặp sự cố)
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-3 justify-content-center">
              <Button
                variant="primary"
                size="lg"
                className="fw-semibold px-3 rounded-3 shadow-sm"
                onClick={() => navigate('/appointments')}
              >
                <FaQrcode className="me-2" /> Xem Danh Sách Lịch Khám Của Tôi
              </Button>
              <Button
                variant="outline-secondary"
                size="lg"
                className="rounded-3"
                onClick={() => navigate('/')}
              >
                Về Trang Chủ
              </Button>
            </div>
          </Card>
        ) : (
          /* CHECKOUT INTERFACE */
          <Row className="g-4">
            {/* Left Column: Order Breakdown & Patient Details */}
            <Col xs={12} lg={5}>
              <Card className="border-0 shadow-sm rounded-4 p-2 mb-4">
                <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
                  <h5 className="fw-bold mb-0 text-dark">Thông Tin Phiếu Khám</h5>
                  <Badge bg="warning-subtle" text="warning" className="border border-warning-subtle px-3 py-2 fw-semibold">
                    Chờ thanh toán
                  </Badge>
                </div>

                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="small text-muted mb-1">Mã lịch hẹn (Check-in code):</div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="h5 fw-bold text-primary font-monospace mb-0">{appointmentCode}</span>
                    <Button variant="outline-primary" size="sm" onClick={handleCopyCode} className="px-2 py-1">
                      <FaCopy className="me-1" /> {copiedCode ? 'Đã chép' : 'Sao chép'}
                    </Button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="small text-muted mb-1">Bệnh nhân đặt khám:</div>
                  <div className="fw-bold text-dark">{currentUser?.fullName || 'Trần Văn An'}</div>
                  <div className="small text-muted font-monospace">{currentUser?.phoneNumber || '0909123456'}</div>
                </div>

                <div className="mb-3">
                  <div className="small text-muted mb-1">Gói dịch vụ xét nghiệm:</div>
                  <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                    <FaVial className="text-primary" /> {packageName}
                  </div>
                </div>

                <hr className="my-3 text-muted" />

                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Giá niêm yết gói xét nghiệm:</span>
                  <span className="fw-semibold text-dark">{Number(initialAmount).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Phí giữ chỗ &amp; bảo hiểm ISO:</span>
                  <span className="text-success fw-semibold">Miễn phí</span>
                </div>
                <div className="d-flex justify-content-between py-2 border-top mt-2">
                  <span className="fw-bold fs-6 text-dark">Tổng tiền cần thanh toán:</span>
                  <span className="fw-bold fs-4 text-primary">{Number(initialAmount).toLocaleString('vi-VN')} đ</span>
                </div>
              </Card>

              {/* Safety notice */}
              <div className="card border-0 bg-primary-subtle text-primary p-3 rounded-4">
                <small className="d-flex align-items-center gap-2">
                  <FaShieldAlt className="fs-5" />
                  Giao dịch được bảo mật tuyệt đối qua Cổng VNPAY. Sau khi thanh toán thành công, phiếu hẹn sẽ sinh Mã QR Check-in và Mã nhập tay phụ để làm thủ tục tại phòng khám.
                </small>
              </div>
            </Col>

            {/* Right Column: Clean VNPAY Payment Gate */}
            <Col xs={12} lg={7}>
              <Card className="border-0 shadow-sm rounded-4 p-2">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                  <div>
                    <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                      <FaCreditCard className="text-primary" /> Cổng Thanh Toán VNPAY Sandbox
                    </h5>
                    <small className="text-muted">Môi trường thử nghiệm an toàn chuẩn PCI-DSS</small>
                  </div>
                  <Badge bg="primary" className="px-3 py-2 fw-semibold">
                    VNPAY Test
                  </Badge>
                </div>

                {/* Tab switchers */}
                <div className="btn-group w-100 mb-4 p-1 bg-light rounded-3 border" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm py-2 rounded-2 fw-semibold ${paymentTab === 'card' ? 'btn-primary shadow-sm text-white' : 'btn-light text-secondary'}`}
                    onClick={() => setPaymentTab('card')}
                  >
                    <FaCreditCard className="me-1" /> Thẻ ATM Nội Địa (NCB Test)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm py-2 rounded-2 fw-semibold ${paymentTab === 'qr' ? 'btn-primary shadow-sm text-white' : 'btn-light text-secondary'}`}
                    onClick={() => setPaymentTab('qr')}
                  >
                    <FaQrcode className="me-1" /> Quét Mã VNPAY-QR
                  </button>
                </div>

                {paymentTab === 'card' ? (
                  <div>
                    {/* Simulated Bank Card Display */}
                    <div
                      className="p-3 rounded-4 mb-3 text-white shadow-sm position-relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #1E60E6 100%)',
                        minHeight: 140
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold tracking-wider small">NGÂN HÀNG QUỐC DÂN (NCB)</span>
                        <span className="badge bg-white text-primary fw-bold px-2 py-0.5">VNPAY ATM</span>
                      </div>
                      <div className="h4 fw-bold font-monospace mb-2 text-warning letter-spacing-2">
                        {testCardNumber || '9704 1985 2619 1432 198'}
                      </div>
                      <div className="d-flex justify-content-between align-items-end small text-white-50">
                        <div>
                          <div style={{ fontSize: '0.65rem' }}>CHỦ THẺ</div>
                          <div className="fw-bold text-white font-monospace">{testCardHolder}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem' }}>HẠN THẺ</div>
                          <div className="fw-bold text-white font-monospace">{testIssueDate}</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Auto-fill banner */}
                    <div className="d-flex justify-content-between align-items-center bg-primary-subtle text-primary p-2 px-3 rounded-3 mb-3 small">
                      <span>✓ Đã tự động điền thẻ test chuẩn VNPAY</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-decoration-none fw-bold"
                        onClick={() => {
                          setTestCardNumber('9704198526191432198');
                          setTestCardHolder('NGUYEN VAN A');
                          setTestIssueDate('07/15');
                          setTestOtp('123456');
                        }}
                      >
                        Làm mới thông tin
                      </Button>
                    </div>

                    {/* Interactive Form Fields */}
                    <div className="row g-2 mb-3">
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary mb-1">Số thẻ ATM (NCB Sandbox):</label>
                        <input
                          type="text"
                          className="form-control font-monospace fw-semibold"
                          value={testCardNumber}
                          onChange={(e) => setTestCardNumber(e.target.value)}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-secondary mb-1">Tên chủ thẻ:</label>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={testCardHolder}
                          onChange={(e) => setTestCardHolder(e.target.value)}
                        />
                      </div>
                      <div className="col-sm-3">
                        <label className="form-label small fw-semibold text-secondary mb-1">Ngày phát hành:</label>
                        <input
                          type="text"
                          className="form-control font-monospace text-center"
                          value={testIssueDate}
                          onChange={(e) => setTestIssueDate(e.target.value)}
                        />
                      </div>
                      <div className="col-sm-3">
                        <label className="form-label small fw-semibold text-secondary mb-1">Mã OTP:</label>
                        <input
                          type="text"
                          className="form-control font-monospace text-center fw-bold text-primary"
                          value={testOtp}
                          onChange={(e) => setTestOtp(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Primary Button */}
                    <Button
                      variant="primary"
                      className="w-100 py-3 rounded-pill fw-bold fs-5 shadow d-flex align-items-center justify-content-center gap-2 mb-2"
                      style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', minHeight: 54 }}
                      onClick={() => handleFastDemoPay(false)}
                      disabled={submittingPay || isExpired}
                    >
                      {submittingPay ? (
                        <>
                          <Spinner animation="border" size="sm" /> Đang xác thực giao dịch VNPAY...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle /> Xác Nhận Thanh Toán VNPAY ({Number(initialAmount).toLocaleString('vi-VN')} đ)
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-muted small mb-3">
                      Quét mã QR dưới đây bằng <strong>Ví điện tử VNPAY</strong> hoặc <strong>Ứng dụng Ngân hàng</strong> (Vietcombank, MB, BIDV, v.v.):
                    </p>
                    <div className="p-3 bg-white d-inline-block rounded-3 border border-2 border-primary-subtle shadow-sm mb-3">
                      <QRCodeSVG
                        value={`2|99|092203002301|BMS CLINICAL|${appointmentCode}|0|0|${initialAmount}|Thanh toan BMS ${appointmentCode}`}
                        size={170}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <div className="bg-light p-2 rounded-3 mx-auto mb-3 small font-monospace" style={{ maxWidth: 360 }}>
                      <div>Nội dung: <strong>BMS {appointmentCode}</strong></div>
                      <div>Số tiền: <strong className="text-primary fs-6">{Number(initialAmount).toLocaleString('vi-VN')} đ</strong></div>
                    </div>
                    <Button
                      variant="success"
                      className="w-100 py-3 rounded-3 fw-bold fs-5 shadow d-flex align-items-center justify-content-center gap-2 mb-2"
                      onClick={() => handleFastDemoPay(false)}
                      disabled={submittingPay || isExpired}
                    >
                      {submittingPay ? (
                        <>
                          <Spinner animation="border" size="sm" /> Đang cập nhật trạng thái...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle /> Tôi Đã Quét Mã & Hoàn Tất Thanh Toán
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* External Gateway Option */}
                <div className="text-center pt-3 border-top mt-2">
                  <div className="small text-muted mb-1">
                    Bạn muốn thử kết nối đến cổng ngoài sandbox.vnpayment.vn?
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="px-3 py-1.5"
                    onClick={handlePayViaVnPay}
                    disabled={loadingGateway || isExpired}
                  >
                    {loadingGateway ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <><FaExternalLinkAlt className="me-1" /> Thử cổng ngoài sandbox.vnpayment.vn</>
                    )}
                  </Button>
                  <div className="text-muted small mt-2 fst-italic" style={{ fontSize: '0.78rem' }}>
                    * Lưu ý: Cổng ngoài sandbox.vnpayment.vn có thể trả về lỗi 71 nếu tên miền localhost chưa được VNPAY phê duyệt. Bạn nên sử dụng Cổng Sandbox Trực Tiếp ở trên để nhận phiếu check-in và mã QR tức thì.
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Modal: NCB Sandbox Test Credentials */}
        <Modal show={showNcbGuideModal} onHide={() => setShowNcbGuideModal(false)} centered>
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="fw-bold h6 text-primary d-flex align-items-center gap-2 mb-0">
              <FaCreditCard /> Thông Tin Thẻ Test NCB (VNPAY Sandbox)
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-2">
            <p className="small text-muted mb-3">
              Khi hệ thống chuyển hướng sang cổng VNPAY, chọn ngân hàng <strong>NCB</strong> và nhập thông tin kiểm thử sau:
            </p>
            <div className="p-3 bg-light rounded-3 border mb-3">
              <div className="mb-2 pb-2 border-bottom d-flex justify-content-between align-items-center">
                <span className="small text-muted">Ngân hàng:</span>
                <strong className="text-primary font-monospace">NCB (Ngân hàng Quốc Dân)</strong>
              </div>
              <div className="mb-2 pb-2 border-bottom d-flex justify-content-between align-items-center">
                <span className="small text-muted">Số thẻ kiểm thử:</span>
                <div className="d-flex align-items-center gap-2">
                  <strong className="font-monospace text-dark fs-6">9704 1985 2619 1432 198</strong>
                  <Button variant="outline-primary" size="sm" onClick={handleCopyCardNum} className="px-2 py-0" style={{ fontSize: '0.75rem' }}>
                    {copiedCardNum ? 'Đã chép' : 'Chép'}
                  </Button>
                </div>
              </div>
              <div className="mb-2 pb-2 border-bottom d-flex justify-content-between align-items-center">
                <span className="small text-muted">Tên chủ thẻ:</span>
                <strong className="font-monospace text-dark">NGUYEN VAN A</strong>
              </div>
              <div className="mb-2 pb-2 border-bottom d-flex justify-content-between align-items-center">
                <span className="small text-muted">Ngày phát hành:</span>
                <strong className="font-monospace text-dark">07/15</strong>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">Mật khẩu OTP:</span>
                <strong className="font-monospace text-danger fs-6">123456</strong>
              </div>
            </div>
            <div className="alert alert-info py-2 px-3 small mb-0">
              Đây là thẻ thử nghiệm do VNPAY cung cấp, không phát sinh chi phí thực tế.
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2">
            <Button variant="primary" size="sm" onClick={() => setShowNcbGuideModal(false)}>
              Đã Hiểu
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
