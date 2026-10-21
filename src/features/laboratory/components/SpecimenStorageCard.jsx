/**
 * @file SpecimenStorageCard.jsx
 * @description Physical storage unit, coordinates (Rack/Shelf/Slot), monitored cold chain temperature, and retention countdown card (UC70 / BR-212 / BR-213).
 * Conforms to: ISO 15189 Cold-chain preservation standards & AGENTS-DESIGN.md.
 */

import React from "react";
import {
    FaSnowflake,
    FaThermometerHalf,
    FaCalendarAlt,
    FaCheckCircle,
    FaExclamationTriangle,
    FaEdit,
    FaWarehouse
} from "react-icons/fa";

export default function SpecimenStorageCard({ storageInfo, onUpdateStorageClick, canEdit = true }) {
    if (!storageInfo) {
        return (
            <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-bottom py-3">
                    <h6 className="mb-0 fw-bold text-dark">
                        <FaSnowflake className="text-info me-2" />
                        Thông Tin Lưu Trữ Lạnh & Tồn Trữ
                    </h6>
                </div>
                <div className="card-body text-center py-5 text-muted">
                    <FaWarehouse className="display-6 mb-3 text-secondary opacity-50" />
                    <p className="mb-3">Mẫu bệnh phẩm chưa được gán vị trí lưu trữ trong tủ lạnh/kho bảo quản.</p>
                    {canEdit && onUpdateStorageClick && (
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={onUpdateStorageClick}
                        >
                            + Gán Vị Trí Lưu Trữ
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const storageUnit = storageInfo.storageUnit || "Tủ Lưu Mẫu Lab";
    const rackId = storageInfo.rackId || "--";
    const slotPosition = storageInfo.slotPosition || storageInfo.boxSlot || storageInfo.shelfRow || "--";
    const currentTemp = storageInfo.currentTemperature !== undefined && storageInfo.currentTemperature !== null
        ? storageInfo.currentTemperature
        : (storageInfo.monitoredTemperatureCelsius ?? 4.0);
    const humidity = storageInfo.currentHumidity ?? storageInfo.humidityPercent ?? 45.0;
    const isCompliant = storageInfo.isTemperatureCompliant !== false;
    const remainingDays = storageInfo.remainingDays !== undefined && storageInfo.remainingDays !== null
        ? storageInfo.remainingDays
        : (storageInfo.daysRemaining ?? 7);
    const retentionDays = storageInfo.retentionPeriodDays || storageInfo.targetRetentionDays || 7;
    const preservationMethod = storageInfo.preservationMethod || "Bảo quản lạnh 2°C - 8°C";
    const storageStatus = storageInfo.storageStatus || "Stored";

    // Calculate retention progress percentage
    const daysElapsed = Math.max(0, retentionDays - remainingDays);
    const retentionPercentage = Math.min(100, Math.round((daysElapsed / (retentionDays || 1)) * 100));

    // Determine retention urgency badge
    let retentionBadgeClass = "bg-success";
    let retentionText = `${remainingDays} ngày còn lại`;
    if (remainingDays <= 0) {
        retentionBadgeClass = "bg-danger";
        retentionText = "Đã hết hạn lưu trữ (Cần hủy mẫu)";
    } else if (remainingDays <= 2) {
        retentionBadgeClass = "bg-warning text-dark";
        retentionText = `Sắp hết hạn: ${remainingDays} ngày`;
    }

    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold text-dark">
                    <FaSnowflake className="text-info me-2" />
                    Vị Trí Lưu Trữ & Giám Sát Chuỗi Lạnh
                </h6>
                {canEdit && onUpdateStorageClick && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 shadow-xs"
                        onClick={onUpdateStorageClick}
                    >
                        <FaEdit />
                        <span>Cập nhật vị trí</span>
                    </button>
                )}
            </div>

            <div className="card-body p-4">
                {/* Physical Location Coordinates */}
                <div className="row g-3 mb-4">
                    <div className="col-12">
                        <div className="p-3 bg-light rounded border">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                                <span className="text-secondary small fw-bold text-uppercase d-flex align-items-center gap-1">
                                    <FaWarehouse className="text-primary" /> Tủ bảo quản
                                </span>
                                <span className="badge bg-primary-subtle text-primary border border-primary">
                                    {storageStatus}
                                </span>
                            </div>
                            <h5 className="mb-0 fw-bold text-primary">{storageUnit}</h5>
                        </div>
                    </div>

                    <div className="col-6">
                        <div className="p-2 border rounded bg-white text-center">
                            <small className="text-muted d-block">Kệ / Giá (Rack)</small>
                            <span className="fw-bold font-monospace text-dark">{rackId}</span>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="p-2 border rounded bg-white text-center">
                            <small className="text-muted d-block">Vị trí / Ô (Slot)</small>
                            <span className="fw-bold font-monospace text-dark">{slotPosition}</span>
                        </div>
                    </div>
                </div>

                {/* IoT Temperature & Environmental Sensor */}
                <div className="card border mb-4">
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold small text-dark d-flex align-items-center gap-1">
                                <FaThermometerHalf className="text-danger" />
                                Giám Sát Nhiệt Độ Tủ Lạnh
                            </span>
                            {isCompliant ? (
                                <span className="badge bg-success-subtle text-success border border-success">
                                    <FaCheckCircle className="me-1" /> Đạt chuẩn
                                </span>
                            ) : (
                                <span className="badge bg-danger-subtle text-danger border border-danger">
                                    <FaExclamationTriangle className="me-1" /> Vượt ngưỡng cảnh báo
                                </span>
                            )}
                        </div>

                        <div className="d-flex justify-content-between align-items-baseline mb-2">
                            <div>
                                <span className="fs-3 fw-bold text-dark">
                                    {Number(currentTemp).toFixed(1)}°C
                                </span>
                                <span className="text-muted small ms-2">
                                    ({preservationMethod})
                                </span>
                            </div>
                            <span className="text-secondary small">Độ ẩm: {Number(humidity).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                {/* Retention countdown */}
                <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small text-secondary fw-semibold d-flex align-items-center gap-1">
                            <FaCalendarAlt className="text-primary" />
                            Thời Hạn Lưu Trữ Mẫu
                        </span>
                        <span className={`badge ${retentionBadgeClass}`}>{retentionText}</span>
                    </div>

                    <div className="progress" style={{ height: "8px" }}>
                        <div
                            className={`progress-bar ${remainingDays <= 2 ? "bg-warning" : "bg-primary"}`}
                            role="progressbar"
                            style={{ width: `${retentionPercentage}%` }}
                            aria-valuenow={retentionPercentage}
                            aria-valuemin="0"
                            aria-valuemax="100"
                        ></div>
                    </div>
                    <div className="d-flex justify-content-between text-muted small mt-1">
                        <span>Đã lưu: {daysElapsed} ngày</span>
                        <span>Quy định: {retentionDays} ngày</span>
                    </div>
                </div>

                {/* Remarks & Expiration Info */}
                {storageInfo.expirationDate && (
                    <div className="p-2 rounded bg-light border text-muted small mt-3">
                        <strong>Hạn hủy mẫu:</strong> {storageInfo.expirationDate}
                        {storageInfo.disposalStatus && <span> • Trạng thái: {storageInfo.disposalStatus}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}
