/**
 * @file RestoreConfirmationModal.jsx
 * @description Safe two-step restoration modal dialog with SHA-256 pre-flight validation and confirmation phrase (UC80 / BR-243).
 * Conforms to: Production Medical Standards, Clinical Emergency Rollback & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import {
    FaUndo,
    FaExclamationTriangle,
    FaCheckCircle,
    FaShieldAlt,
    FaTimes,
    FaDatabase
} from "react-icons/fa";
import { validateRestoreDryRun, executeRestore } from "../api/backupApi";

export default function RestoreConfirmationModal({
    show,
    onHide,
    backup,
    onRestoreSuccess
}) {
    const [step, setStep] = useState(1); // 1: Pre-flight dry run, 2: Final confirmation
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [confirmationPhrase, setConfirmationPhrase] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    useEffect(() => {
        if (show && backup) {
            setStep(1);
            setConfirmationPhrase("");
            setAcknowledged(false);
            setErrorMessage(null);
            runPreflightValidation();
        }
    }, [show, backup]);

    if (!show || !backup) return null;

    const runPreflightValidation = async () => {
        setValidating(true);
        setErrorMessage(null);
        try {
            const res = await validateRestoreDryRun(backup.backupId || backup.id);
            setValidationResult(res);
        } catch (err) {
            setErrorMessage("Không thể chạy kiểm tra toàn vẹn Dry-run. Vui lòng kiểm tra lại dịch vụ backend.");
        } finally {
            setValidating(false);
        }
    };

    const handleExecuteRestore = async (e) => {
        e.preventDefault();
        setRestoring(true);
        setErrorMessage(null);

        try {
            const payload = {
                backupId: backup.backupId || backup.id,
                isDryRun: false,
                overwriteExisting: true,
                confirmationPhrase: confirmationPhrase.trim()
            };

            const res = await executeRestore(backup.backupId || backup.id, payload);
            if (res && res.success !== false) {
                if (onRestoreSuccess) onRestoreSuccess(res);
                onHide();
            } else {
                setErrorMessage(res?.message || "Khôi phục dữ liệu thất bại.");
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "Lỗi xử lý khi khôi phục dữ liệu.");
        } finally {
            setRestoring(false);
        }
    };

    const isPhraseValid =
        confirmationPhrase.trim().toUpperCase() === "XAC_NHAN_KHOI_PHUC" ||
        confirmationPhrase.trim().toUpperCase() === "CONFIRM_RESTORE";

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 1050 }}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content shadow border-0">
                    <div className="modal-header bg-danger text-white">
                        <div className="d-flex align-items-center gap-2">
                            <FaUndo className="fs-5" />
                            <h5 className="modal-title fw-bold mb-0">
                                Quy Trình Khôi Phục Dữ Liệu Xét Nghiệm (UC80)
                            </h5>
                        </div>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onHide}
                            disabled={restoring}
                        ></button>
                    </div>

                    <div className="modal-body p-4">
                        {errorMessage && (
                            <div className="alert alert-danger py-2 small mb-3">
                                {errorMessage}
                            </div>
                        )}

                        {/* Backup Summary Banner */}
                        <div className="p-3 bg-light rounded border mb-4">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 className="fw-bold text-dark mb-1">{backup.backupName}</h6>
                                    <div className="small text-secondary font-monospace">
                                        Mã Bản Sao Lưu: <strong className="text-primary">{backup.backupId}</strong>
                                    </div>
                                    <div className="small text-secondary">
                                        Dung lượng: {backup.fileSizeFormatted || "1.8 MB"} • Tạo lúc:{" "}
                                        {new Date(backup.createdAt).toLocaleString("vi-VN")}
                                    </div>
                                </div>
                                <span className="badge bg-primary text-uppercase">{backup.scope}</span>
                            </div>
                        </div>

                        {/* Step 1: Pre-flight Dry Run Results */}
                        {step === 1 && (
                            <div>
                                <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                    <FaShieldAlt className="text-primary" />
                                    Bước 1: Kiểm Tra Toàn Vẹn Trước Khôi Phục (Pre-flight Validation)
                                </h6>

                                {validating ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary mb-2"></div>
                                        <div className="small text-secondary">
                                            Đang kiểm tra tính toàn vẹn SHA-256 và cấu trúc bản ghi...
                                        </div>
                                    </div>
                                ) : validationResult ? (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-success-subtle border border-success rounded mb-3">
                                            <div className="d-flex align-items-center gap-2 text-success fw-bold mb-1">
                                                <FaCheckCircle />
                                                <span>Xác Thực Toàn Vẹn Mã Băm SHA-256 Thành Công</span>
                                            </div>
                                            <div className="small text-secondary font-monospace text-truncate">
                                                Checksum: {validationResult.calculatedChecksum}
                                            </div>
                                        </div>

                                        <div className="row g-3 mb-3">
                                            <div className="col-6">
                                                <div className="p-3 bg-white border rounded">
                                                    <span className="small text-secondary d-block">Tổng Bản Ghi Sẽ Khôi Phục</span>
                                                    <span className="fs-4 fw-bold text-dark">
                                                        {validationResult.totalRecordsToRestore}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-3 bg-white border rounded">
                                                    <span className="small text-secondary d-block">Trạng Thái Sẵn Sàng</span>
                                                    <span className="fs-5 fw-bold text-success">
                                                        Sẵn Sàng Khôi Phục
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {validationResult.warnings && validationResult.warnings.length > 0 && (
                                            <div className="p-3 bg-warning-subtle border border-warning rounded mb-3">
                                                <div className="d-flex align-items-center gap-2 text-warning-emphasis fw-bold small mb-1">
                                                    <FaExclamationTriangle />
                                                    <span>LƯU Ý QUAN TRỌNG:</span>
                                                </div>
                                                <ul className="small text-secondary mb-0 ps-3">
                                                    {validationResult.warnings.map((w, idx) => (
                                                        <li key={idx}>{w}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Step 2: Final Authorization Confirmation */}
                        {step === 2 && (
                            <div>
                                <div className="p-3 bg-danger-subtle border border-danger rounded mb-4">
                                    <div className="d-flex align-items-start gap-2">
                                        <FaExclamationTriangle className="text-danger fs-4 flex-shrink-0 mt-1" />
                                        <div>
                                            <h6 className="fw-bold text-danger mb-1">
                                                CẢNH BÁO: HÀNH ĐỘNG GHI ĐÈ DỮ LIỆU
                                            </h6>
                                            <p className="small text-danger-emphasis mb-0">
                                                Thao tác này sẽ áp dụng các kết quả xét nghiệm và thông tin mẫu bệnh phẩm từ bản sao lưu vào cơ sở dữ liệu hiện tại. Hành động này được ghi vào Audit Log an ninh của hệ thống.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold text-dark small text-uppercase">
                                        Nhập Cụm Từ Xác Nhận: <span className="font-monospace text-danger">XAC_NHAN_KHOI_PHUC</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={confirmationPhrase}
                                        onChange={(e) => setConfirmationPhrase(e.target.value)}
                                        placeholder="Gõ chính xác XAC_NHAN_KHOI_PHUC"
                                        autoFocus
                                    />
                                </div>

                                <div className="form-check mb-2">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="ackCheck"
                                        checked={acknowledged}
                                        onChange={(e) => setAcknowledged(e.target.checked)}
                                    />
                                    <label className="form-check-label small text-secondary" htmlFor="ackCheck">
                                        Tôi xác nhận có thẩm quyền quản trị và chịu trách nhiệm về việc khôi phục dữ liệu xét nghiệm này.
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer bg-light">
                        {step === 1 ? (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={onHide}
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setStep(2)}
                                    disabled={validating || !validationResult?.canRestore}
                                >
                                    Tiếp Tục Xác Nhận Khôi Phục &rarr;
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setStep(1)}
                                    disabled={restoring}
                                >
                                    &larr; Quay Lại
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger d-flex align-items-center gap-2"
                                    onClick={handleExecuteRestore}
                                    disabled={!isPhraseValid || !acknowledged || restoring}
                                >
                                    {restoring ? (
                                        <>
                                            <div className="spinner-border spinner-border-sm" role="status"></div>
                                            <span>Đang Khôi Phục Dữ Liệu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaUndo />
                                            <span>Thực Thi Khôi Phục Ngay</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
