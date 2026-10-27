/**
 * @file AddTrackingEventModal.jsx
 * @description Modal dialog for technicians to record a lifecycle tracking or processing event (UC70 / BR-212 / BR-213).
 * Conforms to: ISO 15189:2022 Specimen Traceability & AGENTS-DESIGN.md.
 */

import React, { useState } from "react";
import { FaPlusCircle, FaCheck } from "react-icons/fa";

const EVENT_TYPE_OPTIONS = [
    { value: "ReceivedAtLab", label: "Tiếp Nhận Tại Phòng Lab", desc: "Mẫu đã được bàn giao và kiểm tra tiếp nhận tại phòng xét nghiệm" },
    { value: "Centrifuged", label: "Ly Tâm Tách Huyết Thanh/Huyết Tương", desc: "Mẫu đã được ly tâm đạt chuẩn tốc độ và thời gian" },
    { value: "MachineAnalysis", label: "Nạp Mẫu Lên Máy Phân Tích", desc: "Mẫu đã nạp lên máy xét nghiệm tự động" },
    { value: "StoredInColdArchive", label: "Chuyển Vào Tủ Lưu Trữ Lạnh", desc: "Mẫu đã chuyển vào tủ lưu trữ sau khi phân tích xong" },
    { value: "InTransit", label: "Vận Chuyển Mẫu Nội Viện", desc: "Mẫu đang trên đường vận chuyển bằng hộp chuyên dụng" },
    { value: "Discarded", label: "Hủy Mẫu Hết Hạn / Mẫu Hỏng", desc: "Mẫu đã được xử lý tiêu hủy theo quy trình rác thải y tế" }
];

export default function AddTrackingEventModal({ show, onHide, barcode, onSave }) {
    const [eventType, setEventType] = useState("ReceivedAtLab");
    const [location, setLocation] = useState("Khu Tiếp Nhận Xét Nghiệm - Tầng 2");
    const [operatorName, setOperatorName] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        const selectedOption = EVENT_TYPE_OPTIONS.find((o) => o.value === eventType);
        const title = selectedOption ? selectedOption.label : eventType;
        const description = notes.trim() || (selectedOption ? selectedOption.desc : eventType);

        try {
            await onSave({
                eventType,
                title,
                description,
                location: location.trim(),
                operatorName: operatorName.trim() || undefined,
                notes: notes.trim() || undefined
            });
            onHide();
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "Không thể ghi nhận sự kiện.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 1050 }}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow border-0">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                            <FaPlusCircle />
                            Ghi Nhận Sự Kiện Vòng Đời Mẫu
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onHide}
                            disabled={submitting}
                        ></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body p-4">
                            {errorMessage && (
                                <div className="alert alert-danger py-2 small mb-3">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-bold">
                                    Mã Vạch Mẫu Bệnh Phẩm
                                </label>
                                <input
                                    type="text"
                                    className="form-control font-monospace bg-light fw-bold"
                                    value={barcode}
                                    disabled
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Loại Sự Kiện <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={eventType}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEventType(val);
                                        if (val === "Centrifuged") {
                                            setLocation("Khu Xử Lý Tiền Phân Tích (Pre-Analytics)");
                                        } else if (val === "MachineAnalysis") {
                                            setLocation("Phòng Máy Tự Động Hóa Lab 202");
                                        } else if (val === "StoredInColdArchive") {
                                            setLocation("Kho Lưu Mẫu Lạnh - Khu B");
                                        }
                                    }}
                                    required
                                >
                                    {EVENT_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Vị Trí / Trạm Xét Nghiệm <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Vd: Phòng Nhận Mẫu Lab P.201"
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Người Thực Hiện (Tùy chọn)
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={operatorName}
                                    onChange={(e) => setOperatorName(e.target.value)}
                                    placeholder="Để trống dùng user đăng nhập hiện tại"
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Ghi Chú Kỹ Thuật / Diễn Biến Mẫu
                                </label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Vd: Mẫu không bị vỡ hồng cầu, ly tâm 3500 rpm trong 10 phút..."
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
                                className="btn btn-primary d-flex align-items-center gap-2 shadow-xs"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                        <span>Đang ghi nhận...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheck />
                                        <span>Lưu Sự Kiện</span>
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
