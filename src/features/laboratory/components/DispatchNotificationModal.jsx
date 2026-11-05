/**
 * @file DispatchNotificationModal.jsx
 * @description Modal dialog for laboratory staff and clinicians to dispatch test result notifications and panic value alerts (UC60 / BR-183).
 * Supports selecting patients with completed test results directly from the MongoDB database.
 * Conforms to: Production Medical Standards, Clinical Emergency Escalation & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import {
    FaPaperPlane,
    FaExclamationTriangle,
    FaVial,
    FaUser,
    FaPhoneAlt,
    FaEnvelope,
    FaBell,
    FaCheck,
    FaTimes,
    FaCheckCircle,
    FaUserCheck,
    FaFileMedical
} from "react-icons/fa";
import { fetchCompletedTestPatients } from "../api/testResultNotificationApi";

const CHANNELS = [
    { value: 3, label: "Thư Điện Tử (Email) - Trực Tiếp Qua SMTP" },
    { value: 5, label: "Tất Cả Kênh (Email + In-App + SMS + Push)" },
    { value: 1, label: "Thông Báo Ứng Dụng (In-App)" },
    { value: 2, label: "Tin Nhắn Điện Thoại (SMS)" },
    { value: 4, label: "Thông Báo Đẩy (Mobile Push Notification)" }
];

export default function DispatchNotificationModal({ show, onHide, onDispatchSuccess }) {
    // Completed patients state from MongoDB
    const [completedPatients, setCompletedPatients] = useState([]);
    const [selectedCompletedKey, setSelectedCompletedKey] = useState("");
    const [loadingPatients, setLoadingPatients] = useState(false);

    // Form fields
    const [testOrderId, setTestOrderId] = useState("");
    const [specimenBarcode, setSpecimenBarcode] = useState("");
    const [patientId, setPatientId] = useState("");
    const [patientName, setPatientName] = useState("");
    const [patientPhone, setPatientPhone] = useState("");
    const [patientEmail, setPatientEmail] = useState("");
    const [testPackageName, setTestPackageName] = useState("");

    const [channel, setChannel] = useState(3); // Email (Primary)
    const [isCritical, setIsCritical] = useState(false);
    const [priority, setPriority] = useState(1); // Normal
    const [criticalParamsText, setCriticalParamsText] = useState("");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [clinicalRecommendation, setClinicalRecommendation] = useState("Yêu cầu nhập viện cấp cứu để truyền dịch và theo dõi monitor liên tục.");

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // Load completed patients from MongoDB when modal is opened
    useEffect(() => {
        if (!show) return;

        let active = true;
        setLoadingPatients(true);
        fetchCompletedTestPatients()
            .then((list) => {
                if (!active) return;
                const items = Array.isArray(list) ? list : [];
                setCompletedPatients(items);

                if (items.length > 0) {
                    const first = items[0];
                    applyPatientSelection(first);
                    setSelectedCompletedKey(first.specimenBarcode || first.testOrderId || first.patientId);
                }
            })
            .catch((err) => {
                if (active) {
                    setErrorMessage(err?.response?.data?.message || err?.message || "Không thể tải danh sách bệnh nhân hoàn thành xét nghiệm.");
                }
            })
            .finally(() => {
                if (active) setLoadingPatients(false);
            });

        return () => {
            active = false;
        };
    }, [show]);

    const applyPatientSelection = (found) => {
        if (!found) return;
        setTestOrderId(found.testOrderId || "");
        setSpecimenBarcode(found.specimenBarcode || "");
        setPatientId(found.patientId || "");
        setPatientName(found.patientName || "");
        setPatientPhone(found.patientPhone || "");
        setPatientEmail(found.patientEmail || "");
        setTestPackageName(found.testPackageName || "");

        if (found.isCritical) {
            setIsCritical(true);
            setPriority(4);
            setCriticalParamsText(found.conclusionNotes || "Chỉ số xét nghiệm vượt ngưỡng báo động nguy kịch");
            setTitle(`[CẢNH BÁO NGUY HIỂM] Chỉ số xét nghiệm hoảng loạn - Đơn ${found.testOrderId}`);
            setMessage(`CẢNH BÁO Y KHOA: Kết quả xét nghiệm của bệnh nhân ${found.patientName} (${found.testPackageName || 'Xét nghiệm'}) có chỉ số vượt ngưỡng nguy kịch. Vui lòng liên hệ bác sĩ hoặc cơ sở y tế ngay lập tức.`);
        } else {
            setIsCritical(false);
            setPriority(1);
            setTitle(`Kết quả xét nghiệm đơn ${found.testOrderId} (${found.testPackageName || 'Xét nghiệm lâm sàng'}) đã hoàn tất`);
            setMessage(`Kính gửi quý khách ${found.patientName}, kết quả xét nghiệm đơn ${found.testOrderId} (${found.testPackageName || 'Xét nghiệm lâm sàng'}) đã được duyệt y khoa và sẵn sàng để xem chi tiết.${found.conclusionNotes ? ' Kết luận: ' + found.conclusionNotes : ''}`);
        }
    };

    const handleSelectCompletedPatient = (e) => {
        const val = e.target.value;
        setSelectedCompletedKey(val);
        const found = completedPatients.find(p => (p.specimenBarcode === val || p.testOrderId === val || p.patientId === val));
        if (found) {
            applyPatientSelection(found);
        }
    };

    const handleToggleCritical = (e) => {
        const checked = e.target.checked;
        setIsCritical(checked);
        if (checked) {
            setPriority(4); // Critical
            setTitle(`[CẢNH BÁO NGUY HIỂM] Chỉ số xét nghiệm hoảng loạn - Đơn ${testOrderId}`);
            setMessage(`CẢNH BÁO Y KHOA: Kết quả xét nghiệm của bệnh nhân ${patientName} có chỉ số vượt ngưỡng nguy kịch. Vui lòng liên hệ bác sĩ hoặc phòng cấp cứu ngay lập tức.`);
        } else {
            setPriority(1); // Normal
            setTitle(`Kết quả xét nghiệm đơn ${testOrderId} đã hoàn tất`);
            setMessage(`Kính gửi quý khách ${patientName}, hồ sơ xét nghiệm (${testOrderId}) đã được duyệt y khoa và sẵn sàng để xem chi tiết.`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        const criticalList = isCritical
            ? criticalParamsText.split("\n").map((s) => s.trim()).filter(Boolean)
            : [];

        const payload = {
            testOrderId: testOrderId.trim(),
            specimenBarcode: specimenBarcode.trim() || undefined,
            patientId: patientId.trim(),
            patientName: patientName.trim(),
            patientPhone: patientPhone.trim() || undefined,
            patientEmail: patientEmail.trim() || undefined,
            testPackageName: testPackageName.trim() || undefined,
            channel: parseInt(channel, 10),
            priority: isCritical ? 4 : parseInt(priority, 10),
            isCriticalPanicValue: isCritical,
            criticalParameters: criticalList,
            requiresImmediateAction: isCritical,
            title: title.trim() || undefined,
            message: message.trim() || undefined,
            clinicalRecommendation: isCritical ? clinicalRecommendation.trim() : undefined
        };

        try {
            await onDispatchSuccess(payload);
            onHide();
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "Không thể phát thông báo.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 1050 }}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content shadow border-0">
                    <div className={`modal-header ${isCritical ? "bg-danger text-white" : "bg-primary text-white"}`}>
                        <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                            {isCritical ? <FaExclamationTriangle /> : <FaPaperPlane />}
                            <span>{isCritical ? "Phát Thông Báo Cảnh Báo Hoảng Loạn (Panic Value)" : "Phát Thông Báo Kết Quả Xét Nghiệm Mới (UC60)"}</span>
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onHide}
                            disabled={submitting}
                        ></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body p-4" style={{ maxHeight: "80vh", overflowY: "auto" }}>
                            {errorMessage && (
                                <div className="alert alert-danger py-2 small mb-3">
                                    {errorMessage}
                                </div>
                            )}

                            {/* CHỌN BỆNH NHÂN ĐÃ HOÀN THÀNH XÉT NGHIỆM */}
                            <div className="p-3 rounded border mb-4 bg-light shadow-xs border-primary-subtle">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="form-label text-primary fw-bold small mb-0 d-flex align-items-center gap-2">
                                        <FaUserCheck className="fs-5" />
                                        <span>Chọn Bệnh Nhân Đã Hoàn Thành Xét Nghiệm</span>
                                    </label>
                                    {loadingPatients && (
                                        <div className="d-flex align-items-center gap-1 text-muted small">
                                            <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                                            <span>Đang tải từ database...</span>
                                        </div>
                                    )}
                                </div>
                                <select
                                    className="form-select border-primary fw-semibold"
                                    value={selectedCompletedKey}
                                    onChange={handleSelectCompletedPatient}
                                    disabled={loadingPatients}
                                >
                                    {completedPatients.length === 0 ? (
                                        <option value="">{loadingPatients ? "Đang tải dữ liệu..." : "Chưa có bệnh nhân nào hoàn thành xét nghiệm"}</option>
                                    ) : (
                                        completedPatients.map((item, idx) => (
                                            <option key={idx} value={item.specimenBarcode || item.testOrderId || item.patientId}>
                                                [{item.patientId}] {item.patientName} • Đơn: {item.testOrderId} • Mẫu: {item.specimenBarcode || '—'} • {item.testPackageName || 'Xét nghiệm'} {item.isCritical ? '⚠️ (Nguy kịch)' : '✅ (Hoàn tất)'}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <small className="text-muted d-block mt-2">
                                    <FaCheckCircle className="text-success me-1" />
                                    Dữ liệu được nạp tự động từ các xét nghiệm đã hoàn tất (Completed / Approved) trong cơ sở dữ liệu. Khi chọn bệnh nhân, tất cả thông tin định danh, mẫu bệnh phẩm, đơn chỉ định và nội dung thông báo sẽ tự động điền.
                                </small>
                            </div>

                            {/* Critical Panic Toggle Switch */}
                            <div className="p-3 rounded border mb-4" style={{ backgroundColor: isCritical ? "#fee2e2" : "#f8fafc", borderColor: isCritical ? "#ef4444" : "#cbd5e1" }}>
                                <div className="form-check form-switch d-flex align-items-center gap-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="panicSwitch"
                                        style={{ width: "2.8em", height: "1.4em", cursor: "pointer" }}
                                        checked={isCritical}
                                        onChange={handleToggleCritical}
                                    />
                                    <label className="form-check-label fw-bold mb-0 cursor-pointer" htmlFor="panicSwitch">
                                        <span className={isCritical ? "text-danger fs-6" : "text-dark"}>
                                            Kích hoạt Cảnh Báo Giá Trị Hoảng Loạn (Panic / Critical Value Alert)
                                        </span>
                                        <small className="d-block text-muted fw-normal">
                                            Tự động ưu tiên khẩn cấp (Critical Priority), kích hoạt đa kênh tức thời và gắn cờ can thiệp y tế ngay lập tức.
                                        </small>
                                    </label>
                                </div>
                            </div>

                            {/* Order & Specimen Info */}
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Mã Đơn Xét Nghiệm <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={testOrderId}
                                        onChange={(e) => setTestOrderId(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Mã Vạch Mẫu (Specimen Barcode)
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={specimenBarcode}
                                        onChange={(e) => setSpecimenBarcode(e.target.value)}
                                        placeholder="BC-xxx hoặc SMP-xxx"
                                    />
                                </div>
                            </div>

                            {/* Patient Info */}
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-4">
                                    <label className="form-label text-dark fw-semibold small">
                                        Mã Bệnh Nhân <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-12 col-md-8">
                                    <label className="form-label text-dark fw-semibold small">
                                        Họ Tên Bệnh Nhân <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Số Điện Thoại (SMS)
                                    </label>
                                    <input
                                        type="tel"
                                        className="form-control font-monospace"
                                        value={patientPhone}
                                        onChange={(e) => setPatientPhone(e.target.value)}
                                        placeholder="0912345678"
                                    />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Email Nhận Thông Báo
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={patientEmail}
                                        onChange={(e) => setPatientEmail(e.target.value)}
                                        placeholder="patient@example.com"
                                    />
                                </div>
                            </div>

                            {/* Gói Xét Nghiệm */}
                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Tên Gói Xét Nghiệm
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={testPackageName}
                                    onChange={(e) => setTestPackageName(e.target.value)}
                                    placeholder="Tên gói xét nghiệm lâm sàng"
                                />
                            </div>

                            {/* Channel & Priority */}
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-7">
                                    <label className="form-label text-dark fw-semibold small">
                                        Kênh Truyền Thông Báo <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select"
                                        value={channel}
                                        onChange={(e) => setChannel(Number(e.target.value))}
                                    >
                                        {CHANNELS.map((ch) => (
                                            <option key={ch.value} value={ch.value}>
                                                {ch.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-12 col-md-5">
                                    <label className="form-label text-dark fw-semibold small">
                                        Mức Độ Ưu Tiên
                                    </label>
                                    <select
                                        className="form-select"
                                        value={priority}
                                        onChange={(e) => setPriority(Number(e.target.value))}
                                        disabled={isCritical}
                                    >
                                        <option value={1}>Bình Thường (Normal)</option>
                                        <option value={2}>Ưu Tiên Cao (High)</option>
                                        <option value={3}>Khẩn Cấp (Urgent)</option>
                                        <option value={4}>Nguy Kịch / Hoảng Loạn (Critical)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Panic Parameters Section (Conditional) */}
                            {isCritical && (
                                <div className="mb-3 p-3 bg-danger-subtle rounded border border-danger">
                                    <label className="form-label text-danger fw-bold small d-flex align-items-center gap-1">
                                        <FaExclamationTriangle />
                                        Danh Sách Chỉ Số Vượt Ngưỡng Nguy Kịch (Mỗi chỉ số 1 dòng)
                                    </label>
                                    <textarea
                                        className="form-control font-monospace small"
                                        rows="3"
                                        value={criticalParamsText}
                                        onChange={(e) => setCriticalParamsText(e.target.value)}
                                        placeholder="Glucose: 29.4 mmol/L (Ngưỡng nguy hiểm > 25.0)..."
                                    ></textarea>

                                    <div className="mt-2">
                                        <label className="form-label text-danger fw-bold small">
                                            Khuyến Nghị Lâm Sàng & Hướng Xử Trí Khẩn
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={clinicalRecommendation}
                                            onChange={(e) => setClinicalRecommendation(e.target.value)}
                                            placeholder="Yêu cầu nhập viện cấp cứu để truyền dịch..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Custom Message & Title */}
                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Tiêu Đề Thông Báo
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Để trống hệ thống sẽ tự sinh tiêu đề chuẩn"
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Nội Dung Thông Báo
                                </label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Để trống hệ thống sẽ tự sinh nội dung tóm tắt y khoa"
                                ></textarea>
                            </div>
                        </div>

                        <div className="modal-footer bg-light py-2 px-4">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={onHide}
                                disabled={submitting}
                            >
                                Hủy Bỏ
                            </button>
                            <button
                                type="submit"
                                className={`btn ${isCritical ? "btn-danger" : "btn-primary"} d-flex align-items-center gap-2 shadow-xs`}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                        <span>Đang phát thông báo...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaPaperPlane />
                                        <span>{isCritical ? "Phát Báo Động Nguy Kịch" : "Gửi Thông Báo Ngay"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
