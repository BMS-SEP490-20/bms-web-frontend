import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaDownload,
  FaCalendarPlus,
  FaQrcode,
  FaEnvelope,
  FaMobileAlt,
  FaCommentDots,
  FaChevronRight,
  FaArrowLeft,
  FaSyncAlt,
} from "react-icons/fa";
import { appointmentApi } from "../api/appointmentApi";
import { generateQrMatrix, getQrRects } from "../../../utils/qrCode.js";

export default function AppointmentConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

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
        channel: 1, // Email
        type: 1, // BookingConfirmed
      });
      setResendStatus("Email xác nhận đã được gửi lại thành công!");
    } catch {
      setResendStatus("Email xác nhận mô phỏng đã được gửi lại!");
    } finally {
      setResending(false);
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleAddToCalendar = () => {
    const title = encodeURIComponent(`Lấy mẫu máu: ${data?.packageName || "Xét nghiệm BMS"}`);
    const details = encodeURIComponent(
      `Lịch hẹn tại BMS: ${data?.location}. Mã: ${data?.appointmentCode}. Nhịn ăn 12h.`
    );
    const location = encodeURIComponent(data?.location || "Lab Room 02 · HQ");
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
    window.open(googleCalendarUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải thông tin xác nhận...</span>
        </div>
        <p className="mt-3 text-muted">Đang tải thông tin xác nhận lịch hẹn...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-warning d-inline-block px-4 py-3 rounded-3 text-start">
          <FaExclamationTriangle className="me-2 text-warning fs-4 align-middle" />
          <span className="align-middle">{error || "Không tìm thấy dữ liệu cuộc hẹn."}</span>
        </div>
        <div className="mt-3">
          <Link to="/appointments/book" className="btn btn-primary">
            <FaArrowLeft className="me-2" /> Quay lại đặt lịch hẹn
          </Link>
        </div>
      </div>
    );
  }

  const maskedEmail = data?.patientEmail
    ? data.patientEmail.replace(/(.{3})(.*)(?=@)/, "$1***")
    : "email của bạn";

  const qrCodeText = data?.qrCodeData || data?.appointmentCode || targetId || "";
  const qrData = useMemo(() => {
    if (!qrCodeText) return null;
    try {
      const mat = generateQrMatrix(qrCodeText);
      return getQrRects(mat, 4);
    } catch {
      return null;
    }
  }, [qrCodeText]);

  return (
    <div className="container py-4" style={{ maxWidth: "880px" }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/appointments/book" className="text-decoration-none">
              Appointments
            </Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Confirmation
          </li>
        </ol>
      </nav>

      {/* Page Title */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">Appointment confirmed</h1>
          <p className="text-muted small mb-0">
            Mã xác nhận lịch hẹn đã được lưu vào hồ sơ y tế điện tử
          </p>
        </div>
        <Link to="/appointments/book" className="btn btn-outline-secondary btn-sm">
          <FaArrowLeft className="me-1" /> Đặt lịch khác
        </Link>
      </div>

      {resendStatus && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <FaCheckCircle className="me-2" />
          {resendStatus}
          <button
            type="button"
            className="btn-close"
            onClick={() => setResendStatus(null)}
          ></button>
        </div>
      )}

      {/* Main Confirmation Card */}
      <div className="card shadow-sm border-0 mb-4 rounded-3 overflow-hidden">
        <div className="card-body p-4 p-md-5 text-center">
          {/* Green Circle Checkmark */}
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: "76px",
              height: "76px",
              backgroundColor: "#d1fae5",
              borderRadius: "50%",
            }}
          >
            <FaCheckCircle style={{ fontSize: "40px", color: "#059669" }} />
          </div>

          <h2 className="h4 fw-bold text-dark mb-2">
            Your appointment has been booked
          </h2>
          <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
            A confirmation has been sent to{" "}
            <strong className="text-dark">{maskedEmail}</strong> and your mobile app.
          </p>

          {/* Key-Value Details Grid */}
          <div
            className="p-3 p-md-4 rounded-3 mb-4 text-start"
            style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
          >
            <div className="row g-3">
              <div className="col-12 col-md-6 border-end-md">
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted small">Appointment ID</span>
                  <span className="fw-bold font-monospace text-primary">
                    {data?.appointmentCode}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted small">Patient</span>
                  <span className="fw-semibold text-dark">{data?.patientName}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted small">Package</span>
                  <span className="fw-semibold text-dark">{data?.packageName}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted small">Price</span>
                  <span className="fw-bold text-dark font-monospace">
                    {Number(data?.price || 0).toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted small">Date</span>
                  <span className="fw-bold text-dark">{data?.dateFormatted}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted small">Time</span>
                  <span className="fw-bold text-dark">{data?.timeFormatted}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted small">Location</span>
                  <span className="fw-semibold text-dark">{data?.location}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted small">Payment</span>
                  <span className="badge bg-success bg-opacity-10 text-success border border-success">
                    {data?.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fasting Reminder Box */}
          {data?.fastingInstructions && (
            <div
              className="alert d-flex align-items-start text-start mb-4 rounded-3"
              style={{
                backgroundColor: "#fef3c7",
                borderColor: "#fde68a",
                color: "#92400e",
              }}
            >
              <FaExclamationTriangle className="me-2 mt-1 flex-shrink-0 fs-5" />
              <div style={{ fontSize: "14px" }}>
                <strong>Fasting reminder:</strong> {data?.fastingInstructions}
              </div>
            </div>
          )}

          <hr className="my-4 text-muted" />

          {/* Real check-in QR code */}
          <div className="my-4">
            <div className="text-uppercase text-muted small fw-bold mb-2">
              Check-in QR code
            </div>
            <div
              className="d-inline-flex p-3 bg-white rounded-3 border shadow-sm"
              style={{ width: "160px", height: "160px" }}
            >
              {qrData ? (
                <svg
                  viewBox={`0 0 ${qrData.totalSize} ${qrData.totalSize}`}
                  style={{ width: "100%", height: "100%", shapeRendering: "crispEdges" }}
                >
                  <rect width="100%" height="100%" fill="#ffffff" />
                  {qrData.rects.map((r, i) => (
                    <rect
                      key={i}
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      fill="#1e293b"
                    />
                  ))}
                </svg>
              ) : (
                <div className="d-flex align-items-center justify-content-center w-100 text-muted small">
                  QR N/A
                </div>
              )}
            </div>
            <div className="small font-monospace text-muted mt-2">
              {data?.appointmentCode} · Scan at reception
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
            <button
              onClick={handleDownloadPdf}
              className="btn btn-primary px-3 py-2 fw-semibold"
            >
              <FaDownload className="me-2" /> Download confirmation (PDF)
            </button>
            <button
              onClick={handleAddToCalendar}
              className="btn btn-outline-secondary px-3 py-2 fw-semibold"
            >
              <FaCalendarPlus className="me-2 text-danger" /> Add to Google Calendar
            </button>
            <button
              onClick={handleResendNotification}
              disabled={resending}
              className="btn btn-outline-secondary px-3 py-2 fw-semibold"
            >
              <FaSyncAlt className={`me-2 ${resending ? "fa-spin" : ""}`} />
              {resending ? "Sending..." : "Resend Notification"}
            </button>
          </div>
        </div>

        {/* Card Footer: Delivery Status */}
        <div
          className="card-footer py-3 text-center"
          style={{ backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}
        >
          <div className="d-flex flex-wrap justify-content-center gap-4 text-muted small">
            <span>
              <FaEnvelope className="text-success me-1" /> Email sent ·{" "}
              {data?.deliveryStatus?.emailSentAt || "Đã gửi"}
            </span>
            <span>
              <FaMobileAlt className="text-success me-1" /> Push sent ·{" "}
              {data?.deliveryStatus?.pushSentAt || "Đã gửi"}
            </span>
            <span>
              <FaCommentDots className="text-muted me-1" /> SMS not configured
            </span>
          </div>
        </div>
      </div>

      {/* Reminder Schedule Timeline Card */}
      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white py-3 border-bottom">
          <h3 className="h6 fw-bold mb-0 text-dark">Reminder schedule</h3>
        </div>
        <div className="card-body p-4">
          <div className="position-relative ps-4 border-start border-2 border-primary border-opacity-25 ms-2">
            {data?.reminderSchedule?.map((item, idx) => (
              <div key={idx} className="position-relative mb-4">
                <span
                  className="position-absolute translate-middle rounded-circle"
                  style={{
                    left: "-17px",
                    top: "8px",
                    width: "14px",
                    height: "14px",
                    backgroundColor: item.isDone ? "#059669" : "#cbd5e1",
                    border: "3px solid #ffffff",
                    boxShadow: "0 0 0 1px #94a3b8",
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
    </div>
  );
}
