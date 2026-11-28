/**
 * @file SpecimenLifecycleTimeline.jsx
 * @description Visual audit trail timeline showing chronological collection, transit, processing, analysis, and archiving events (UC70 / BR-212 / BR-213).
 * Conforms to: ISO 15189:2022 Traceability, AGENTS-DESIGN.md.
 */

import React from "react";
import { CheckCircle2, Clock, TestTube2, Truck, FlaskConical, Microscope, Snowflake, Trash2, AlertTriangle, Barcode, Stethoscope, MapPin } from 'lucide-react';

/**
 * Return appropriate icon and color scheme for event types.
 */
function getEventVisuals(eventType) {
    const type = (eventType || "").toLowerCase();
    if (type.includes("order")) {
        return { icon: Clock, color: "text-primary", bg: "bg-primary-subtle", border: "border-primary" };
    }
    if (type.includes("collect")) {
        return { icon: TestTube2, color: "text-info", bg: "bg-info-subtle", border: "border-info" };
    }
    if (type.includes("barcode") || type.includes("label")) {
        return { icon: Barcode, color: "text-secondary", bg: "bg-secondary-subtle", border: "border-secondary" };
    }
    if (type.includes("transit") || type.includes("transport")) {
        return { icon: Truck, color: "text-warning", bg: "bg-warning-subtle", border: "border-warning" };
    }
    if (type.includes("receiv")) {
        return { icon: CheckCircle2, color: "text-success", bg: "bg-success-subtle", border: "border-success" };
    }
    if (type.includes("centrifug")) {
        return { icon: FlaskConical, color: "text-primary", bg: "bg-primary-subtle", border: "border-primary" };
    }
    if (type.includes("analy") || type.includes("test")) {
        return { icon: Microscope, color: "text-info", bg: "bg-info-subtle", border: "border-info" };
    }
    if (type.includes("stor") || type.includes("cold") || type.includes("archive")) {
        return { icon: Snowflake, color: "text-primary", bg: "bg-primary-subtle", border: "border-primary" };
    }
    if (type.includes("discard") || type.includes("dispos") || type.includes("reject")) {
        return { icon: Trash2, color: "text-danger", bg: "bg-danger-subtle", border: "border-danger" };
    }
    return { icon: CheckCircle2, color: "text-secondary", bg: "bg-light", border: "border-secondary" };
}

/**
 * Format ISO datetime string to local clinical presentation.
 */
function formatEventTime(isoString) {
    if (!isoString) return "--:--";
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    } catch {
        return isoString;
    }
}

export default function SpecimenLifecycleTimeline({ events = [], onAddEventClick }) {
    if (!events || events.length === 0) {
        return (
            <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark">
                        <Clock className="text-primary me-2"  size="1em"/>
                        Nhật Ký Hành Trình Mẫu (Audit Trail)
                    </h6>
                    {onAddEventClick && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={onAddEventClick}
                        >
                            + Ghi sự kiện
                        </button>
                    )}
                </div>
                <div className="card-body text-center py-3 text-muted">
                    <Clock className="display-6 mb-3 text-secondary opacity-50"  size="1em"/>
                    <p className="mb-0">Chưa ghi nhận sự kiện vòng đời nào cho mẫu bệnh phẩm này.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <div>
                    <h6 className="mb-0 fw-bold text-dark">
                        <Clock className="text-primary me-2"  size="1em"/>
                        Lịch Sử Trạng Thái Mẫu Bệnh Phẩm
                    </h6>
                    <small className="text-muted">Tổng cộng {events.length} sự kiện được kiểm toán</small>
                </div>
                {onAddEventClick && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-xs"
                        onClick={onAddEventClick}
                    >
                        <span>+ Ghi Sự Kiện Mới</span>
                    </button>
                )}
            </div>
            <div className="card-body p-2" style={{ maxHeight: "550px", overflowY: "auto" }}>
                <div className="timeline-container position-relative">

                    <div
                        className="position-absolute h-100 border-start border-2 border-primary-subtle"
                        style={{ left: "19px", top: "10px", zIndex: 1 }}
                    ></div>

                    <div className="d-flex flex-column gap-4">
                        {events.map((evt, idx) => {
                            const visual = getEventVisuals(evt.eventType);
                            const IconComponent = visual.icon;
                            const isLatest = idx === events.length - 1;
                            const eventTitle = evt.title || evt.eventName || evt.eventType;

                            return (
                                <div key={evt.eventId || idx} className="d-flex position-relative" style={{ zIndex: 2 }}>

                                    <div
                                        className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm ${visual.bg} ${visual.border} border border-2`}
                                        style={{ width: "40px", height: "40px", minWidth: "40px", backgroundColor: "#fff" }}
                                    >
                                        <IconComponent className={visual.color} />
                                    </div>

                                    <div className="ms-3 flex-grow-1">
                                        <div className={`p-3 rounded border shadow-xs ${isLatest ? "bg-white border-primary border-2" : "bg-light border"}`}>
                                            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-1">
                                                <div>
                                                    <span className="fw-bold text-dark me-2">{eventTitle}</span>
                                                    {isLatest && (
                                                        <span className="badge bg-primary text-white font-monospace small">Mới nhất</span>
                                                    )}
                                                    {evt.status === "Warning" && (
                                                        <span className="badge bg-warning text-dark ms-1">
                                                            <AlertTriangle className="me-1"  size="1em"/> Cảnh báo
                                                        </span>
                                                    )}
                                                </div>
                                                <small className="text-muted fw-semibold">
                                                    {formatEventTime(evt.timestamp)}
                                                </small>
                                            </div>

                                            <div className="text-secondary small mb-2 d-flex flex-wrap gap-3">
                                                {evt.location && (
                                                    <span className="d-inline-flex align-items-center">
                                                        <MapPin className="text-danger me-1"  size="1em"/>
                                                        {evt.location}
                                                    </span>
                                                )}
                                                {evt.operatorName && (
                                                    <span className="d-inline-flex align-items-center">
                                                        <Stethoscope className="text-primary me-1"  size="1em"/>
                                                        {evt.operatorName} {evt.operatorRole ? `(${evt.operatorRole})` : ""}
                                                    </span>
                                                )}
                                                {evt.temperatureC !== undefined && evt.temperatureC !== null && (
                                                    <span className="badge bg-info-subtle text-info border">
                                                        Nhiệt độ: {evt.temperatureC}°C
                                                    </span>
                                                )}
                                            </div>

                                            {(evt.description || evt.notes) && (
                                                <div className="p-2 rounded bg-white border text-dark small">
                                                    <em>{evt.description || evt.notes}</em>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
