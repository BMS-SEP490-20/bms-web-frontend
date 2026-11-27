/**
 * @file SpecimenStorageCard.jsx
 * @description Strictly DB-driven physical storage location & retention card (UC70).
 * Never displays hardcoded default temperatures, humidity, racks, or countdowns when not recorded in DB.
 */

import React from "react";
import { Snowflake, Thermometer, Calendar, CheckCircle2, AlertTriangle, SquarePen, Warehouse } from 'lucide-react';

export default function SpecimenStorageCard({ storageInfo, onUpdateStorageClick, canEdit = true }) {
    const hasStorage = Boolean(storageInfo && String(storageInfo.storageUnit || "").trim());

    if (!hasStorage) {
        return (
            <div className="card shadow-xs border rounded-4 h-100" style={{ borderColor: "#E2E8F0" }}>
                <div className="card-header bg-white border-bottom py-2.5 px-3 d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark small d-flex align-items-center gap-1.5">
                        <Snowflake className="text-primary" size={15} />
                        <span>Vị Trí Lưu Trữ Kho Lạnh</span>
                    </h6>
                </div>
                <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-4 px-3 text-muted">
                    <Warehouse className="mb-2 opacity-25" size={32} />
                    <div className="fw-semibold text-dark small mb-1">Chưa lưu vào tủ bảo quản</div>
                    <p className="small mb-3" style={{ maxWidth: 280 }}>
                        Mẫu này chưa được gán vị trí tủ lạnh hoặc thời hạn bảo quản trong cơ sở dữ liệu.
                    </p>
                    {canEdit && onUpdateStorageClick && (
                        <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold text-white"
                            style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                            onClick={onUpdateStorageClick}
                        >
                            + Gán Vị Trí Lưu Trữ
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const storageUnit = storageInfo.storageUnit;
    const rackId = storageInfo.rackId || null;
    const slotPosition = storageInfo.slotPosition || storageInfo.boxSlot || storageInfo.shelfRow || null;
    const hasTemp = storageInfo.currentTemperature !== undefined && storageInfo.currentTemperature !== null;
    const hasHumidity = storageInfo.currentHumidity !== undefined && storageInfo.currentHumidity !== null;
    const isCompliant = storageInfo.isTemperatureCompliant;
    const hasRetention = storageInfo.retentionPeriodDays !== undefined && storageInfo.retentionPeriodDays !== null && storageInfo.retentionPeriodDays > 0;
    const remainingDays = storageInfo.remainingDays;
    const retentionDays = storageInfo.retentionPeriodDays;
    const preservationMethod = storageInfo.preservationMethod || null;
    const storageStatus = storageInfo.storageStatus || null;

    const daysElapsed = hasRetention && remainingDays !== undefined && remainingDays !== null
        ? Math.max(0, retentionDays - remainingDays)
        : null;
    const retentionPercentage = hasRetention && daysElapsed !== null
        ? Math.min(100, Math.round((daysElapsed / retentionDays) * 100))
        : 0;

    let retentionBadgeClass = "bg-success";
    let retentionText = remainingDays !== undefined && remainingDays !== null ? `${remainingDays} ngày còn lại` : null;
    if (remainingDays !== undefined && remainingDays !== null) {
        if (remainingDays <= 0) {
            retentionBadgeClass = "bg-danger";
            retentionText = "Đã hết hạn lưu mẫu";
        } else if (remainingDays <= 2) {
            retentionBadgeClass = "bg-warning text-dark";
            retentionText = `Sắp hết hạn (${remainingDays} ngày)`;
        }
    }

    return (
        <div className="card shadow-xs border rounded-4 h-100" style={{ borderColor: "#E2E8F0" }}>
            <div className="card-header bg-white border-bottom py-2.5 px-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold text-dark small d-flex align-items-center gap-1.5">
                    <Snowflake className="text-primary" size={15} />
                    <span>Vị Trí Lưu Trữ Kho Lạnh</span>
                </h6>
                {canEdit && onUpdateStorageClick && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-0.5 d-inline-flex align-items-center gap-1"
                        style={{ fontSize: "0.75rem" }}
                        onClick={onUpdateStorageClick}
                    >
                        <SquarePen size={12} />
                        <span>Cập nhật</span>
                    </button>
                )}
            </div>

            <div className="card-body p-3">
                <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="text-secondary small fw-semibold d-flex align-items-center gap-1">
                            <Warehouse className="text-primary" size={14} /> Tủ bảo quản
                        </span>
                        {storageStatus && (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                {storageStatus}
                            </span>
                        )}
                    </div>
                    <div className="fw-bold text-dark">{storageUnit}</div>
                    {(storageInfo.storedBy || storageInfo.storedAt) && (
                        <div className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                            {storageInfo.storedBy ? `Lưu bởi: ${storageInfo.storedBy}` : ""}
                            {storageInfo.storedBy && storageInfo.storedAt ? " · " : ""}
                            {storageInfo.storedAt || ""}
                        </div>
                    )}
                </div>

                {(rackId || slotPosition) && (
                    <div className="row g-2 mb-3">
                        <div className="col-6">
                            <div className="p-2 border rounded-3 bg-white text-center">
                                <small className="text-muted d-block" style={{ fontSize: "0.72rem" }}>Kệ / Giá (Rack)</small>
                                <span className="fw-bold font-monospace small text-dark">{rackId || "—"}</span>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="p-2 border rounded-3 bg-white text-center">
                                <small className="text-muted d-block" style={{ fontSize: "0.72rem" }}>Vị trí / Ô (Slot)</small>
                                <span className="fw-bold font-monospace small text-dark">{slotPosition || "—"}</span>
                            </div>
                        </div>
                    </div>
                )}

                {hasTemp && (
                    <div className="p-3 border rounded-3 bg-white mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-semibold small text-dark d-flex align-items-center gap-1">
                                <Thermometer className="text-danger" size={14} />
                                Nhiệt Độ Ghi Nhận
                            </span>
                            {isCompliant === true && (
                                <span className="badge bg-success-subtle text-success border border-success-subtle">
                                    <CheckCircle2 className="me-1" size={12} /> Đạt chuẩn
                                </span>
                            )}
                            {isCompliant === false && (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                    <AlertTriangle className="me-1" size={12} /> Ngoài ngưỡng
                                </span>
                            )}
                        </div>
                        <div className="d-flex justify-content-between align-items-baseline">
                            <span className="fs-4 fw-bold text-dark font-monospace">
                                {Number(storageInfo.currentTemperature).toFixed(1)}°C
                            </span>
                            {hasHumidity && (
                                <span className="text-secondary small">
                                    Độ ẩm: {Number(storageInfo.currentHumidity).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        {preservationMethod && (
                            <div className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                                {preservationMethod}
                            </div>
                        )}
                    </div>
                )}

                {hasRetention && retentionText && (
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-secondary fw-semibold d-flex align-items-center gap-1">
                                <Calendar className="text-primary" size={14} />
                                Thời Hạn Lưu Mẫu
                            </span>
                            <span className={`badge ${retentionBadgeClass}`}>{retentionText}</span>
                        </div>
                        <div className="progress" style={{ height: "6px" }}>
                            <div
                                className={`progress-bar ${remainingDays <= 2 ? "bg-warning" : "bg-primary"}`}
                                role="progressbar"
                                style={{ width: `${retentionPercentage}%` }}
                            />
                        </div>
                        <div className="d-flex justify-content-between text-muted mt-1" style={{ fontSize: "0.74rem" }}>
                            <span>Đã lưu: {daysElapsed} ngày</span>
                            <span>Quy định: {retentionDays} ngày</span>
                        </div>
                    </div>
                )}

                {storageInfo.expirationDate && (
                    <div className="p-2 rounded-3 bg-light border text-muted mt-3" style={{ fontSize: "0.75rem" }}>
                        <strong>Hạn hủy mẫu:</strong> {storageInfo.expirationDate}
                        {storageInfo.disposalStatus ? ` · ${storageInfo.disposalStatus}` : ""}
                    </div>
                )}
            </div>
        </div>
    );
}
