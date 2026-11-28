import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Printer, CalendarPlus, QrCode, Mail, Smartphone, MessageSquare, ChevronRight, ArrowLeft, RefreshCw, Lock, Banknote } from 'lucide-react';
import { appointmentApi } from "../api/appointmentApi";
import { QRCodeSVG } from "qrcode.react";
import { ROLES, resolveRoleId, getStoredUser } from "../../../constants/roles";
import { PosThermalModal } from "../../../shared/components/PosThermalSlip";

const isPaidOrConfirmed = (rawStatus) => {
  if (!rawStatus && rawStatus !== 0) return false;
  const s = String(rawStatus).toUpperCase();
  return (
    s === 'CONFIRMED' || s === '1' ||
    s === 'CHECKEDIN' || s === 'CHECKED_IN' || s === '2' ||
    s === 'INPROGRESS' || s === 'IN_PROGRESS' || s === '3' ||
    s === 'COMPLETED' || s === '4'
  );
};

export default function AppointmentConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isReceptionist = useMemo(() => resolveRoleId(getStoredUser()) === ROLES.RECEPTIONIST, []);
  const rebookPath = isReceptionist ? "/appointments/book" : "/services";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const [showPosSlip, setShowPosSlip] = useState(false);

  const targetId = id;

  useEffect(() => {
    if (!targetId) {
      setError("Vui lòng cung cấp mã cuộc hẹn để xem thông tin xác nhận.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadConfirmation() {
      try {
        setLoading(true);
        setError(null);
        const res = await appointmentApi.getAppointmentConfirmation(targetId);
        if (isMounted) {
          setData(res?.data || res);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Không tìm thấy thông tin cuộc hẹn hoặc cuộc hẹn không tồn tại.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadConfirmation();
    return () => {
      isMounted = false;
    };
  }, [targetId]);

  const handleResendNotification = async () => {
    try {
      setResending(true);
      setResendStatus(null);
      await appointmentApi.sendAppointmentNotification(data?.appointmentId || targetId, {
        channel: 1,
        type: 1,
      });
      setResendStatus("Email xác nhận đã được gửi lại thành công!");
    } catch (err) {
      setResendStatus(err?.response?.data?.message || "Không thể gửi lại email lúc này. Vui lòng liên hệ quầy tiếp đón.");
    } finally {
      setResending(false);
    }
  };

  const handleDownloadPdf = () => {
    setShowPosSlip(true);
  };

  const handleAddToCalendar = () => {
    const title = encodeURIComponent(`Lấy mẫu máu: ${data?.packageName || "Xét nghiệm BMS"}`);
    const details = encodeURIComponent(
      `Lịch hẹn tại BMS${data?.location ? `: ${data.location}` : ""}. Mã: ${data?.appointmentCode || targetId}.`
    );
    const location = encodeURIComponent(data?.location || "");
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
    window.open(googleCalendarUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="container py-3 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải thông tin xác nhận...</span>
        </div>
        <p className="mt-3 text-muted">Đang tải thông tin xác nhận lịch hẹn...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-3 text-center">
        <div className="alert alert-warning d-inline-block px-3 py-3 rounded-3 text-start">
          <AlertTriangle className="me-2 text-warning fs-4 align-middle"  size="1em"/>
          <span className="align-middle">{error || "Không tìm thấy dữ liệu cuộc hẹn."}</span>
        </div>
        <div className="mt-3">
          <Link to={rebookPath} className="btn btn-primary">
            <ArrowLeft className="me-2"  size="1em"/> Quay lại đặt lịch hẹn
          </Link>
        </div>
      </div>
    );
  }

  const maskedEmail = data?.patientEmail
    ? data.patientEmail.replace(/(.{3})(.*)(?=@)/, "$1***")
    : "email của bạn";

  const qrCodeText = data?.qrCodeData || data?.appointmentCode || targetId || "";

  return (
    <div className="container py-3" style={{ maxWidth: "880px" }}>
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Xác Nhận Đặt Lịch Khám</h1>
          <p className="bms-page-subtitle">
            Mã xác nhận lịch hẹn đã được lưu vào hồ sơ y tế điện tử
          </p>
        </div>
        <Link to={rebookPath} className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1.5">
          <ArrowLeft  size="1em"/> Đặt lịch khác
        </Link>
      </div>

      {resendStatus && (
        <div className="alert alert-success alert-dismissible fade show rounded-3 border-0" role="alert">
          <CheckCircle2 className="me-2"  size="1em"/>
          {resendStatus}
          <button
            type="button"
            className="btn-close"
            onClick={() => setResendStatus(null)}
          ></button>
        </div>
      )}

      <div className="card border mb-4 rounded-4 overflow-hidden shadow-none" style={{ borderColor: "#EAEEF4" }}>
        <div className="card-body p-3 p-md-5 text-center">

          <div
            className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: "72px",
              height: "72px",
              backgroundColor: "#ECFDF5",
              borderRadius: "50%",
            }}
          >
            <CheckCircle2 style={{ fontSize: "36px", color: "#059669" }}  size="1em"/>
          </div>

          <h2 className="h4 fw-bold text-dark mb-2">
            Đặt lịch khám thành công
          </h2>
          <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
            Thông tin xác nhận đã được gửi tới{" "}
            <strong className="text-dark">{maskedEmail}</strong> và ứng dụng di động BMS.
          </p>

          <div
            className="p-3 p-md-4 rounded-3 mb-4 text-start"
            style={{ backgroundColor: "#F8FAFC", border: "1px solid #EAEEF4" }}
          >
            <div className="row g-3">
              <div className="col-12 col-md-6 border-end-md">
                <div className="d-flex justify-content-between py-1.5 border-bottom">
                  <span className="text-muted small">Mã lịch hẹn</span>
                  <span className="fw-bold font-monospace text-primary">
                    {data?.appointmentCode || "—"}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1.5 border-bottom">
                  <span className="text-muted small">Bệnh nhân</span>
                  <span className="fw-semibold text-dark">{data?.patientName || "—"}</span>
                </div>
                <div className="d-flex justify-content-between py-1.5 border-bottom">
                  <span className="text-muted small">Gói xét nghiệm</span>
                  <span className="fw-semibold text-dark">{data?.packageName || "—"}</span>
                </div>
                <div className="d-flex justify-content-between py-1.5">
                  <span className="text-muted small">Chi phí</span>
                  <span className="fw-bold text-dark font-monospace">
                    {Number(data?.price || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="d-flex justify-content-between py-1.5 border-bottom">
                  <span className="text-muted small">Ngày khám</span>
                  <span className="fw-bold text-dark">{data?.dateFormatted || "—"}</span>
                </div>
                <div className="d-flex justify-content-between py-1.5 border-bottom">
                  <span className="text-muted small">Khung giờ</span>
                  <span className="fw-bold text-dark">{data?.timeFormatted || "—"}</span>
                </div>
                <div className="d-flex justify-content-between py-1.5 border-bottom">
                  <span className="text-muted small">Địa điểm</span>
                  <span className="fw-semibold text-dark">{data?.location || "—"}</span>
                </div>
                <div className="d-flex justify-content-between py-1.5">
                  <span className="text-muted small">Thanh toán</span>
                  <span className="badge bg-success-subtle text-success rounded-pill px-2.5 py-1">
                    {data?.paymentStatus || "Chờ thanh toán"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {data?.fastingInstructions && (
            <div
              className="alert d-flex align-items-start text-start mb-4 rounded-3 border-0"
              style={{
                backgroundColor: "#FFFBEB",
                color: "#92400E",
              }}
            >
              <AlertTriangle className="me-2 mt-1 flex-shrink-0 fs-5 text-warning"  size="1em"/>
              <div style={{ fontSize: "13.5px" }}>
                <strong>Lưu ý nhịn ăn:</strong> {data?.fastingInstructions}
              </div>
            </div>
          )}

          <hr className="my-4 text-muted opacity-25" />

          <div className="my-4">
            {isPaidOrConfirmed(data?.status) ? (
              <>
                <div className="text-uppercase text-success small fw-bold mb-2">
                  <CheckCircle2 className="me-1"  size="1em"/> Phiếu Tiếp Đón & Mã Check-in QR
                </div>
                <div
                  className="d-inline-flex p-3 bg-white rounded-3 border align-items-center justify-content-center"
                  style={{ width: "160px", height: "160px", borderColor: "#A7F3D0" }}
                >
                  {qrCodeText ? (
                    <QRCodeSVG
                      value={qrCodeText}
                      size={136}
                      level="H"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="text-muted small">Chưa có QR</div>
                  )}
                </div>
                <div className="small font-monospace text-primary fw-bold mt-2">
                  {data?.appointmentCode} · Xuất trình tại quầy Lễ tân
                </div>
              </>
            ) : (
              <div className="p-4 rounded-4 mx-auto text-center" style={{ maxWidth: "480px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <div className="text-warning mb-2" style={{ fontSize: "28px" }}>
                  <Lock  size="1em"/>
                </div>
                <h6 className="fw-bold text-dark mb-1">
                  Mã QR Check-in Đang Tạm Khóa
                </h6>
                <p className="text-muted small mb-3">
                  Mã QR tiếp đón tại phòng Lab hiển thị sau khi đơn xét nghiệm hoàn tất thanh toán.
                </p>
                <button
                  type="button"
                  className="btn btn-primary fw-semibold px-4 py-2 rounded-pill d-inline-flex align-items-center gap-2"
                  onClick={() => navigate(`/payments/checkout?appointmentId=${data?.appointmentId || targetId}&code=${data?.appointmentCode || targetId}`)}
                >
                  <Banknote  size="1em"/> Thanh toán giữ chỗ ngay
                </button>
              </div>
            )}
          </div>

          <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
            <button
              onClick={handleDownloadPdf}
              className="btn btn-primary rounded-pill px-4 py-2 fw-semibold"
            >
              <Printer className="me-2" size="1em"/> In phiếu hẹn POS (K80)
            </button>
            <button
              onClick={handleAddToCalendar}
              className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold"
            >
              <CalendarPlus className="me-2 text-primary"  size="1em"/> Thêm vào Google Calendar
            </button>
            <button
              onClick={handleResendNotification}
              disabled={resending}
              className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold"
            >
              <RefreshCw className={`me-2 ${resending ? "fa-spin" : ""}`}  size="1em"/>
              {resending ? "Đang gửi..." : "Gửi lại thông báo"}
            </button>
          </div>
        </div>

        <div
          className="card-footer py-3 text-center"
          style={{ backgroundColor: "#F8FAFC", borderTop: "1px solid #EAEEF4" }}
        >
          <div className="d-flex flex-wrap justify-content-center gap-4 text-muted small">
            <span>
              <Mail className="text-success me-1"  size="1em"/> Đã gửi Email ·{" "}
              {data?.deliveryStatus?.emailSentAt || "—"}
            </span>
            <span>
              <Smartphone className="text-success me-1"  size="1em"/> Đã gửi thông báo ứng dụng ·{" "}
              {data?.deliveryStatus?.pushSentAt || "—"}
            </span>
          </div>
        </div>
      </div>

      {Array.isArray(data?.reminderSchedule) && data.reminderSchedule.length > 0 && (
        <div className="card border rounded-4 shadow-none" style={{ borderColor: "#EAEEF4" }}>
          <div className="card-header bg-white py-3 px-4 border-bottom">
            <h3 className="h6 fw-bold mb-0 text-dark">Lịch nhắc tự động</h3>
          </div>
          <div className="card-body p-4">
            <div className="position-relative ps-4 border-start border-2 border-primary border-opacity-25 ms-2">
              {data.reminderSchedule.map((item, idx) => (
                <div key={idx} className="position-relative mb-3">
                  <span
                    className="position-absolute translate-middle rounded-circle"
                    style={{
                      left: "-17px",
                      top: "8px",
                      width: "12px",
                      height: "12px",
                      backgroundColor: item.isDone ? "#059669" : "#CBD5E1",
                      border: "2px solid #ffffff",
                    }}
                  ></span>
                  <div className="small text-muted fw-semibold">
                    {item.scheduledTime}
                  </div>
                  <div className="fw-bold text-dark">{item.title}</div>
                  <div className="small text-muted">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <PosThermalModal
        show={showPosSlip}
        onClose={() => setShowPosSlip(false)}
        modalTitle="Phiếu Xác Nhận Lịch Hẹn"
        modalBadge="Khổ máy POS K80"
        modalSubtitle={`Mã lịch hẹn: ${data?.appointmentCode || targetId}`}
        printTitle={`Phieu_Lich_Hen_POS_${data?.appointmentCode || targetId}`}
        printButtonLabel="In Phiếu Hẹn POS (K80)"
        copyText={data?.appointmentCode || ''}
        copyButtonLabel="Sao chép mã hẹn"
        slipProps={{
          title: 'PHIẾU XÁC NHẬN LỊCH HẸN',
          subtitle: 'Xuất trình tại quầy lễ tân khi đến khám',
          statusBadge: isPaidOrConfirmed(data?.status) ? 'ĐÃ XÁC NHẬN' : (data?.paymentStatus || 'CHỜ THANH TOÁN'),
          highlight: {
            label: 'MÃ LỊCH HẸN',
            value: data?.appointmentCode || targetId || '—',
            isCode: true,
            sub: `${data?.dateFormatted || '—'} • ${data?.timeFormatted || '—'}`,
          },
          sections: [
            {
              title: 'Thông tin lịch khám',
              rows: [
                { label: 'Bệnh nhân', value: data?.patientName || '—' },
                { label: 'Gói dịch vụ', value: data?.packageName || '—' },
                { label: 'Địa điểm', value: data?.location || 'Phòng khám BMS' },
                { label: 'Chi phí dự kiến', value: `${Number(data?.price || 0).toLocaleString('vi-VN')} đ`, mono: true },
                { label: 'Thanh toán', value: data?.paymentStatus || 'Chờ thanh toán' },
              ],
            },
          ],
          notice: {
            title: 'Lưu ý trước khi lấy mẫu',
            lines: [
              ...(data?.fastingInstructions ? [data.fastingInstructions] : ['Nhịn ăn 8–12 tiếng trước khi lấy mẫu (nếu có xét nghiệm đường huyết/mỡ máu).']),
              'Vui lòng đến trước giờ hẹn 10 phút và mang theo CCCD/VNeID.',
            ],
          },
          qr: isPaidOrConfirmed(data?.status) && qrCodeText ? {
            value: qrCodeText,
            codeText: data?.appointmentCode || targetId,
            caption: 'Quét mã QR tại quầy Lễ tân để Check-in nhanh',
            size: 112,
          } : null,
          footerNote: 'Phiếu có giá trị tiếp đón theo đúng khung giờ đã đặt.',
        }}
      />
    </div>
  );
}
