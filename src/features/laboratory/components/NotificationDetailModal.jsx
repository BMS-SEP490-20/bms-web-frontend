/**
 * @file NotificationDetailModal.jsx
 * @description Modal dialog displaying comprehensive details of a laboratory test result notification (UC60 / BR-183).
 * Conforms to: Production Medical Standards, Clinical Emergency Escalation & AGENTS-DESIGN.md.
 */

import React, { useState } from "react";
import {
    FaBell,
    FaExclamationTriangle,
    FaCheckCircle,
    FaClock,
    FaPhoneAlt,
    FaEnvelope,
    FaUser,
    FaVial,
    FaRedo,
    FaCheck,
    FaTimes
} from "react-icons/fa";

export default function NotificationDetailModal({
    show,
    onHide,
    notification,
    onMarkAsRead,
    onResend,
    canDispatch = false,
    canMarkRead = false
}) {
    const [resending, setResending] = useState(false);
    const [markingRead, setMarkingRead] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    if (!show || !notification) return null;

    const handleRead = async () => {
        setMarkingRead(true);
        setActionMessage(null);
        try {
            await onMarkAsRead(notification.notificationId || notification.id);
            setActionMessage({ type: "success", text: "Đã đánh dấu thông báo là đã đọc." });
        } catch (err) {
            setActionMessage({ type: "danger", text: err?.response?.data?.message || err?.message || "Không thể đánh dấu đã đọc." });
        } finally {
            setMarkingRead(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setActionMessage(null);
        try {
            await onResend(notification.notificationId || notification.id);
            setActionMessage({ type: "success", text: "Đã phát lại thông báo thành công." });
        } catch (err) {
            setActionMessage({ type: "danger", text: err?.response?.data?.message || err?.message || "Lỗi khi gửi lại thông báo." });
        } finally {
            setResending(false);
        }
    };

    const isPanic = notification.isCriticalPanicValue;

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 1050 }}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content shadow border-0">
                    <div className={`modal-header ${isPanic ? "bg-danger text-white" : "bg-primary text-white"}`}>
                        <div className="d-flex align-items-center gap-2">
                            {isPanic ? <FaExclamationTriangle className="fs-5" /> : <FaBell className="fs-5" />}
                            <h5 className="modal-title fw-bold mb-0">
                                Chi Tiết Thông Báo Kết Quả Xét Nghiệm
                            </h5>
                        </div>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onHide}
                        ></button>
                    </div>

                    <div className="modal-body p-4">
                        {actionMessage && (
                            <div className={`alert alert-${actionMessage.type} py-2 small mb-3`}>
                                {actionMessage.text}
                            </div>
                        )}

                        {/* Critical Banner */}
                        {isPanic && (
                            <div className="p-3 bg-danger text-white rounded mb-4 d-flex align-items-start gap-3 shadow-xs">
                                <FaExclamationTriangle className="display-6 flex-shrink-0 mt-1" />
                                <div>
                                    <h6 className="fw-bold mb-1">CẢNH BÁO: CHỈ SỐ XÉT NGHIỆM VƯỢT NGƯỠNG NGUY KỊCH (PANIC VALUE)</h6>
                                    <p className="mb-0 small opacity-90">
                                        Mẫu xét nghiệm chứa các giá trị sinh học đe dọa tính mạng hoặc cần can thiệp y tế khẩn cấp. Hệ thống đã kích hoạt cơ chế thông báo đa kênh đến bệnh nhân và bác sĩ điều trị.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Master Info Header */}
                        <div className="d-flex flex-wrap justify-content-between align-items-center p-3 bg-light rounded border mb-4 gap-2">
                            <div>
                                <span className="text-secondary small fw-bold text-uppercase d-block">Mã Thông Báo</span>
                                <span className="font-monospace fw-bold text-primary fs-5">{notification.notificationId}</span>
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <span className={`badge ${
                                    notification.status === "Delivered" || notification.status === "Read"
                                        ? "bg-success"
                                        : notification.status === "Failed"
                                        ? "bg-danger"
                                        : "bg-warning text-dark"
                                }`}>
                                    {notification.status === "Read" ? "Đã Đọc" : notification.status === "Delivered" ? "Đã Gửi Thành Công" : notification.status}
                                </span>
                                <span className="badge bg-secondary">
                                    Kênh: {notification.channel}
                                </span>
                                <span className={`badge ${isPanic ? "bg-danger" : "bg-info text-dark"}`}>
                                    Ưu tiên: {notification.priority}
                                </span>
                            </div>
                        </div>

                        {/* Patient & Order Details */}
                        <div className="row g-3 mb-4">
                            <div className="col-12 col-md-6">
                                <div className="p-3 border rounded bg-white h-100 shadow-xs">
                                    <span className="small text-muted fw-bold text-uppercase d-block mb-2">
                                        <FaUser className="text-primary me-1" /> Thông Tin Bệnh Nhân
                                    </span>
                                    <h6 className="fw-bold text-dark mb-1">{notification.patientName}</h6>
                                    <div className="text-secondary small">
                                        <div>Mã BN: <strong className="font-monospace text-primary">{notification.patientId}</strong></div>
                                        {notification.patientPhone && (
                                            <div><FaPhoneAlt className="me-1 text-muted" /> {notification.patientPhone}</div>
                                        )}
                                        {notification.patientEmail && (
                                            <div><FaEnvelope className="me-1 text-primary" /> <strong className="text-dark">{notification.patientEmail}</strong> <span className="badge bg-primary-subtle text-primary ms-1">Email nhận kết quả</span></div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="p-3 border rounded bg-white h-100 shadow-xs">
                                    <span className="small text-muted fw-bold text-uppercase d-block mb-2">
                                        <FaVial className="text-info me-1" /> Đơn Xét Nghiệm & Gói Khám
                                    </span>
                                    <h6 className="fw-bold text-dark mb-1 font-monospace">{notification.testOrderId}</h6>
                                    <div className="text-secondary small">
                                        {notification.testPackageName && (
                                            <div>Gói: <strong>{notification.testPackageName}</strong></div>
                                        )}
                                        {notification.specimenBarcode && (
                                            <div>Mã mẫu: <strong className="font-monospace text-primary">{notification.specimenBarcode}</strong></div>
                                        )}
                                        <div>Người phát: {notification.createdBy}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Critical Parameters Alert Box */}
                        {notification.criticalParameters && notification.criticalParameters.length > 0 && (
                            <div className="p-3 bg-danger-subtle rounded border border-danger mb-4">
                                <h6 className="fw-bold text-danger mb-2 d-flex align-items-center gap-1">
                                    <FaExclamationTriangle />
                                    Các Chỉ Số Vượt Ngưỡng Báo Động:
                                </h6>
                                <ul className="mb-0 text-danger ps-3 small fw-semibold font-monospace">
                                    {notification.criticalParameters.map((param, i) => (
                                        <li key={i}>{param}</li>
                                    ))}
                                </ul>

                                {notification.clinicalRecommendation && (
                                    <div className="mt-2 pt-2 border-top border-danger-subtle text-danger small">
                                        <strong>Khuyến cáo bác sĩ:</strong> {notification.clinicalRecommendation}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Title and Message */}
                        <div className="mb-4">
                            <h6 className="fw-bold text-dark mb-2">{notification.title}</h6>
                            <div className="p-3 bg-light rounded border text-secondary small">
                                {notification.message}
                            </div>
                        </div>

                        {/* Timestamps & Audit Trail */}
                        <div className="row g-2 text-muted small p-2 bg-light rounded border">
                            <div className="col-6 col-md-3">
                                <FaClock className="me-1" /> Tạo lúc:
                                <div className="fw-semibold text-dark">{notification.createdAt ? new Date(notification.createdAt).toLocaleString("vi-VN") : "--"}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <FaClock className="me-1 text-primary" /> Đã gửi:
                                <div className="fw-semibold text-dark">{notification.sentAt ? new Date(notification.sentAt).toLocaleString("vi-VN") : "--"}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <FaCheckCircle className="me-1 text-success" /> Tiếp nhận:
                                <div className="fw-semibold text-dark">{notification.deliveredAt ? new Date(notification.deliveredAt).toLocaleString("vi-VN") : "--"}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <FaCheckCircle className="me-1 text-info" /> Đã đọc:
                                <div className="fw-semibold text-dark">{notification.readAt ? new Date(notification.readAt).toLocaleString("vi-VN") : "Chưa đọc"}</div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
                        <div>
                            {canMarkRead && notification.status !== "Read" && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 shadow-xs"
                                    onClick={handleRead}
                                    disabled={markingRead}
                                >
                                    <FaCheck />
                                    <span>Đánh dấu đã đọc</span>
                                </button>
                            )}
                        </div>

                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={onHide}
                            >
                                Đóng
                            </button>
                            {canDispatch && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 shadow-xs"
                                    onClick={handleResend}
                                    disabled={resending}
                                >
                                    {resending ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status"></span>
                                            <span>Đang gửi lại...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaRedo />
                                            <span>Gửi lại thông báo ({notification.retryCount || 0})</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
