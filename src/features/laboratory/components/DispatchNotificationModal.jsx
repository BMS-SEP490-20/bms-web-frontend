/**
 * @file DispatchNotificationModal.jsx
 * @description Modal dialog for laboratory staff and clinicians to dispatch test result notifications and panic value alerts (UC60 / BR-183).
 * Supports selecting patients with completed test results directly from the MongoDB database.
 * Conforms to: Production Medical Standards, Clinical Emergency Escalation & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import { Send, AlertTriangle, TestTube2, User, Phone, Mail, Bell, Check, X as LucideX, CheckCircle2, UserCheck, FileHeart } from 'lucide-react';
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
    const [priority, setPriority] = useState(1); // Normal
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const buildItemKey = (item, idx) =>
        `${item?.testOrderId || ""}__${item?.specimenBarcode || ""}__${idx}`;

    // Load Doctor-approved test orders from MongoDB when modal is opened
    useEffect(() => {
        if (!show) return;

        let active = true;
        setLoadingPatients(true);
        setErrorMessage(null);
        fetchCompletedTestPatients()
            .then((list) => {
                if (!active) return;
                const items = Array.isArray(list) ? list : [];
                setCompletedPatients(items);

                if (items.length > 0) {
                    const first = items[0];
                    applyPatientSelection(first);
                    setSelectedCompletedKey(buildItemKey(first, 0));
                } else {
                    setSelectedCompletedKey("");
                    setTestOrderId("");
                    setSpecimenBarcode("");
                    setPatientId("");
                    setPatientName("");
                    setPatientPhone("");
                    setPatientEmail("");
                    setTestPackageName("");
                    setTitle("");
                    setMessage("");
                }
            })
            .catch((err) => {
                if (active) {
                    setErrorMessage(err?.response?.data?.message || err?.message || "Không thể tải danh sách đơn xét nghiệm đã được Bác sĩ duyệt.");
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
        setPriority(1);
        setTitle(`Kết quả xét nghiệm đơn ${found.testOrderId} (${found.testPackageName || 'Xét nghiệm lâm sàng'}) đã được Bác sĩ duyệt`);
        setMessage(`Kính gửi quý khách ${found.patientName}, kết quả xét nghiệm đơn ${found.testOrderId} (${found.testPackageName || 'Xét nghiệm lâm sàng'}) đã được Bác sĩ phê duyệt y khoa và sẵn sàng để xem chi tiết.${found.conclusionNotes ? ' Kết luận: ' + found.conclusionNotes : ''}`);
    };

    const handleSelectCompletedPatient = (e) => {
        const val = e.target.value;
        setSelectedCompletedKey(val);
        const found = completedPatients.find((p, idx) => buildItemKey(p, idx) === val);
        if (found) {
            applyPatientSelection(found);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        const payload = {
            testOrderId: testOrderId.trim(),
            specimenBarcode: specimenBarcode.trim() || undefined,
            patientId: patientId.trim(),
            patientName: patientName.trim(),
            patientPhone: patientPhone.trim() || undefined,
            patientEmail: patientEmail.trim() || undefined,
            testPackageName: testPackageName.trim() || undefined,
            channel: parseInt(channel, 10),
            priority: parseInt(priority, 10),
            isCriticalPanicValue: false,
            criticalParameters: [],
            requiresImmediateAction: false,
            title: title.trim() || undefined,
            message: message.trim() || undefined,
            clinicalRecommendation: undefined
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
                    <div
                        className="modal-header border-bottom"
                        style={{
                            backgroundColor: "#F8FAFC",
                            borderColor: "#E2E8F0",
                            color: "#0F172A"
                        }}
                    >
                        <h5 className="modal-title fw-bold d-flex align-items-center gap-2 fs-6">
                            <Send className="text-primary" size="1em" />
                            <span>Phát thông báo kết quả xét nghiệm</span>
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onHide}
                            disabled={submitting}
                        ></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body p-2" style={{ maxHeight: "80vh", overflowY: "auto" }}>
                            {errorMessage && (
                                <div className="alert alert-danger py-2 small mb-3">
                                    {errorMessage}
                                </div>
                            )}

                            {/* CHỌN ĐƠN XÉT NGHIỆM BÁC SĨ ĐÃ DUYỆT KẾT QUẢ */}
                            <div className="p-3 rounded border mb-4 bg-light shadow-xs border-primary-subtle">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="form-label text-primary fw-bold small mb-0 d-flex align-items-center gap-2">
                                        <UserCheck className="fs-5" size="1em" />
                                        <span>Chọn Đơn Xét Nghiệm Bác Sĩ Đã Duyệt Kết Quả</span>
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
                                        <option value="">{loadingPatients ? "Đang tải dữ liệu..." : "Chưa có đơn xét nghiệm nào được Bác sĩ duyệt kết quả"}</option>
                                    ) : (
                                        completedPatients.map((item, idx) => (
                                            <option key={buildItemKey(item, idx)} value={buildItemKey(item, idx)}>
                                                [{item.patientId}] {item.patientName} • Đơn: {item.testOrderId} • Mẫu: {item.specimenBarcode || '—'} • {item.testPackageName || 'Xét nghiệm'} (Bác sĩ đã duyệt)
                                            </option>
                                        ))
                                    )}
                                </select>
                                <small className="text-muted d-block mt-2">
                                    <CheckCircle2 className="text-success me-1" size="1em" />
                                    Chỉ hiển thị các đơn xét nghiệm đã được Bác sĩ phê duyệt kết quả trong cơ sở dữ liệu để gửi thông báo qua Email cho bệnh nhân.
                                </small>
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
                                    >
                                        <option value={1}>Bình Thường (Normal)</option>
                                        <option value={2}>Ưu Tiên Cao (High)</option>
                                        <option value={3}>Khẩn Cấp (Urgent)</option>
                                    </select>
                                </div>
                            </div>

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

                        <div className="modal-footer bg-light py-2 px-3">
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
                                className="btn btn-primary d-flex align-items-center gap-2 shadow-xs"
                                disabled={submitting || completedPatients.length === 0}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                        <span>Đang phát thông báo...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size="1em" />
                                        <span>Gửi Thông Báo Ngay</span>
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
