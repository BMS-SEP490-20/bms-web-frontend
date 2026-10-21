/**
 * @file UpdateStorageModal.jsx
 * @description Modal dialog for updating specimen cold storage coordinates and retention parameters (UC70 / BR-212 / BR-213).
 * Conforms to: ISO 15189 Specimen Preservation Guidelines & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import { FaWarehouse, FaCheck } from "react-icons/fa";

const STORAGE_UNITS = [
    { name: "Tủ Mát Bảo Quản REF-01 (Kho Lab Chính)", temp: 4.0, min: 2.0, max: 8.0, days: 7, method: "Bảo quản lạnh 2°C - 8°C" },
    { name: "Tủ Mát Bảo Quản REF-02 (Khu Huyết Học)", temp: 4.0, min: 2.0, max: 8.0, days: 7, method: "Bảo quản lạnh 2°C - 8°C" },
    { name: "Tủ Âm Sâu ULT-01 (-20°C - Sinh Hóa/Miễn Dịch)", temp: -20.0, min: -25.0, max: -15.0, days: 14, method: "Đông lạnh sâu -20°C" },
    { name: "Tủ Âm Cực Sâu ULT-02 (-80°C - Lưu Trữ Dài Hạn)", temp: -80.0, min: -85.0, max: -75.0, days: 90, method: "Đông lạnh cực sâu -80°C" },
    { name: "Tủ Mát Trung Chuyển TC-01 (Khu Nhận Mẫu)", temp: 6.0, min: 2.0, max: 8.0, days: 3, method: "Lưu tạm chờ xử lý" }
];

export default function UpdateStorageModal({ show, onHide, barcode, currentStorage, onSave }) {
    const [storageUnit, setStorageUnit] = useState("Tủ Mát Bảo Quản REF-01 (Kho Lab Chính)");
    const [rackId, setRackId] = useState("RACK-01");
    const [slotPosition, setSlotPosition] = useState("Khay A - Ô 01");
    const [targetTemperatureMin, setTargetTemperatureMin] = useState(2.0);
    const [targetTemperatureMax, setTargetTemperatureMax] = useState(8.0);
    const [currentTemperature, setCurrentTemperature] = useState(4.0);
    const [retentionPeriodDays, setRetentionPeriodDays] = useState(7);
    const [preservationMethod, setPreservationMethod] = useState("Bảo quản lạnh 2°C - 8°C");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    useEffect(() => {
        if (currentStorage) {
            setStorageUnit(currentStorage.storageUnit || "Tủ Mát Bảo Quản REF-01 (Kho Lab Chính)");
            setRackId(currentStorage.rackId || "RACK-01");
            setSlotPosition(currentStorage.slotPosition || currentStorage.boxSlot || "Khay A - Ô 01");
            setCurrentTemperature(
                currentStorage.currentTemperature !== undefined ? currentStorage.currentTemperature : 4.0
            );
            setRetentionPeriodDays(currentStorage.retentionPeriodDays || currentStorage.targetRetentionDays || 7);
            setPreservationMethod(currentStorage.preservationMethod || "Bảo quản lạnh 2°C - 8°C");
        }
    }, [currentStorage, show]);

    if (!show) return null;

    const handleSelectPreset = (e) => {
        const unitName = e.target.value;
        setStorageUnit(unitName);
        const preset = STORAGE_UNITS.find((u) => u.name === unitName);
        if (preset) {
            setCurrentTemperature(preset.temp);
            setTargetTemperatureMin(preset.min);
            setTargetTemperatureMax(preset.max);
            setRetentionPeriodDays(preset.days);
            setPreservationMethod(preset.method);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        try {
            await onSave({
                storageUnit: storageUnit.trim(),
                rackId: rackId.trim(),
                slotPosition: slotPosition.trim(),
                targetTemperatureMin: parseFloat(targetTemperatureMin),
                targetTemperatureMax: parseFloat(targetTemperatureMax),
                currentTemperature: parseFloat(currentTemperature),
                currentHumidity: 45.0,
                preservationMethod: preservationMethod.trim(),
                retentionPeriodDays: parseInt(retentionPeriodDays, 10),
                storageStatus: "Stored"
            });
            onHide();
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "Không thể cập nhật vị trí lưu trữ.");
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
                            <FaWarehouse />
                            Cập Nhật Vị Trí Lưu Trữ Lạnh
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
                                    Tủ Bảo Quản / Kho Mẫu <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select mb-2"
                                    value={storageUnit}
                                    onChange={handleSelectPreset}
                                >
                                    {STORAGE_UNITS.map((u) => (
                                        <option key={u.name} value={u.name}>
                                            {u.name} ({u.temp}°C)
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Hoặc nhập tên tủ bảo quản tùy chỉnh..."
                                    value={storageUnit}
                                    onChange={(e) => setStorageUnit(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Kệ / Giá (Rack) <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={rackId}
                                        onChange={(e) => setRackId(e.target.value)}
                                        placeholder="RACK-BIO-01"
                                        required
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Vị Trí Ô / Khay (Slot) <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={slotPosition}
                                        onChange={(e) => setSlotPosition(e.target.value)}
                                        placeholder="Khay A - Ô 01"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Nhiệt Độ Hiện Tại (°C) <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-control font-monospace"
                                        value={currentTemperature}
                                        onChange={(e) => setCurrentTemperature(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label text-dark fw-semibold small">
                                        Thời Gian Lưu Trữ (Ngày) <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        className="form-control"
                                        value={retentionPeriodDays}
                                        onChange={(e) => setRetentionPeriodDays(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-dark fw-semibold small">
                                    Phương Pháp Bảo Quản
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={preservationMethod}
                                    onChange={(e) => setPreservationMethod(e.target.value)}
                                    placeholder="Bảo quản lạnh 2°C - 8°C"
                                />
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
                                        <span>Đang cập nhật...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheck />
                                        <span>Cập Nhật Vị Trí</span>
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
