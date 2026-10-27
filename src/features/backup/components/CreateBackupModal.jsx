/**
 * @file CreateBackupModal.jsx
 * @description Modal for creating a new database backup snapshot (UC80 / BR-243).
 * Specifically supports archiving patient diagnostic lab test records with SHA-256 cryptographic sealing.
 * Conforms to: Production Medical Standards, ISO 15189 Quality Management & AGENTS-DESIGN.md.
 */

import React, { useState } from "react";
import {
    FaDatabase,
    FaShieldAlt,
    FaCheckCircle,
    FaTimes,
    FaVial,
    FaNotesMedical,
    FaUserInjured,
    FaFileMedicalAlt
} from "react-icons/fa";
import { createBackup } from "../api/backupApi";

export default function CreateBackupModal({ show, onHide, onBackupCreated }) {
    const [backupName, setBackupName] = useState(
        `Lưu trữ dữ liệu xét nghiệm bệnh nhân - ${new Date().toLocaleDateString("vi-VN")}`
    );
    const [scope, setScope] = useState(1); // 1: PatientTestResults, 2: FullDatabase
    const [includeTestResults, setIncludeTestResults] = useState(true);
    const [includeBloodSamples, setIncludeBloodSamples] = useState(true);
    const [includePatientRecords, setIncludePatientRecords] = useState(true);
    const [includeClinicalAssessments, setIncludeClinicalAssessments] = useState(true);
    const [notes, setNotes] = useState("Lưu trữ hồ sơ xét nghiệm lâm sàng và mẫu bệnh phẩm phục vụ đối soát ISO 15189.");

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    if (!show) return null;

    const handleScopeChange = (e) => {
        const val = parseInt(e.target.value, 10);
        setScope(val);
        if (val === 1) {
            setBackupName(`Lưu trữ dữ liệu xét nghiệm bệnh nhân - ${new Date().toLocaleDateString("vi-VN")}`);
        } else {
            setBackupName(`Sao lưu toàn bộ cơ sở dữ liệu hệ thống BMS - ${new Date().toLocaleDateString("vi-VN")}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        try {
            const payload = {
                backupName: backupName.trim(),
                scope,
                includeTestResults,
                includeBloodSamples,
                includePatientRecords,
                includeClinicalAssessments,
                notes: notes.trim()
            };

            const res = await createBackup(payload);
            if (res && res.success !== false) {
                if (onBackupCreated) onBackupCreated(res.data);
                onHide();
            } else {
                setErrorMessage(res?.message || "Không thể tạo bản sao lưu. Vui lòng thử lại.");
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "Lỗi kết nối khi gửi yêu cầu sao lưu.");
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
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content shadow border-0">
                    <div className="modal-header bg-primary text-white">
                        <div className="d-flex align-items-center gap-2">
                            <FaDatabase className="fs-5" />
                            <h5 className="modal-title fw-bold mb-0">
                                Tạo Bản Sao Lưu & Lưu Trữ Dữ Liệu Xét Nghiệm (UC80)
                            </h5>
                        </div>
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

                            {/* Scope Selector */}
                            <div className="mb-4">
                                <label className="form-label fw-bold text-dark small text-uppercase">
                                    Phạm Vi Lưu Trữ (Backup Scope) <span className="text-danger">*</span>
                                </label>
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <div
                                            className={`p-3 border rounded cursor-pointer transition-all ${
                                                scope === 1 ? "border-primary bg-primary-subtle shadow-xs" : "bg-light"
                                            }`}
                                            onClick={() => handleScopeChange({ target: { value: 1 } })}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="backupScope"
                                                    id="scopePatient"
                                                    checked={scope === 1}
                                                    onChange={handleScopeChange}
                                                    value={1}
                                                />
                                                <label className="form-check-label fw-bold text-dark" htmlFor="scopePatient">
                                                    Lưu Trữ Dữ Liệu Xét Nghiệm
                                                </label>
                                            </div>
                                            <small className="text-secondary d-block mt-1">
                                                Chỉ sao lưu kết quả xét nghiệm, mẫu bệnh phẩm, đơn chỉ định và bệnh án lâm sàng. (Khuyến nghị cho Lab)
                                            </small>
                                        </div>
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <div
                                            className={`p-3 border rounded cursor-pointer transition-all ${
                                                scope === 2 ? "border-primary bg-primary-subtle shadow-xs" : "bg-light"
                                            }`}
                                            onClick={() => handleScopeChange({ target: { value: 2 } })}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="backupScope"
                                                    id="scopeFull"
                                                    checked={scope === 2}
                                                    onChange={handleScopeChange}
                                                    value={2}
                                                />
                                                <label className="form-check-label fw-bold text-dark" htmlFor="scopeFull">
                                                    Toàn Bộ Cơ Sở Dữ Liệu (Full)
                                                </label>
                                            </div>
                                            <small className="text-secondary d-block mt-1">
                                                Bao gồm tài khoản, phân quyền, danh mục xét nghiệm, khoảng tham chiếu và toàn bộ hồ sơ.
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Backup Name */}
                            <div className="mb-3">
                                <label className="form-label fw-bold text-dark small text-uppercase">
                                    Tên Bản Sao Lưu <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={backupName}
                                    onChange={(e) => setBackupName(e.target.value)}
                                    required
                                    placeholder="Ví dụ: Lưu trữ dữ liệu xét nghiệm bệnh nhân Q4"
                                />
                            </div>

                            {/* Target Clinical Collections */}
                            {scope === 1 && (
                                <div className="p-3 bg-light rounded border mb-3">
                                    <span className="small fw-bold text-dark text-uppercase d-block mb-2">
                                        Thành Phần Dữ Liệu Được Đóng Gói
                                    </span>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="chkTestResults"
                                                    checked={includeTestResults}
                                                    onChange={(e) => setIncludeTestResults(e.target.checked)}
                                                />
                                                <label className="form-check-label small" htmlFor="chkTestResults">
                                                    <FaVial className="text-primary me-1" /> Kết quả xét nghiệm máu (Cobas)
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-6">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="chkSamples"
                                                    checked={includeBloodSamples}
                                                    onChange={(e) => setIncludeBloodSamples(e.target.checked)}
                                                />
                                                <label className="form-check-label small" htmlFor="chkSamples">
                                                    <FaNotesMedical className="text-info me-1" /> Mẫu bệnh phẩm & mã Barcode
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-6">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="chkOrders"
                                                    checked={includePatientRecords}
                                                    onChange={(e) => setIncludePatientRecords(e.target.checked)}
                                                />
                                                <label className="form-check-label small" htmlFor="chkOrders">
                                                    <FaUserInjured className="text-success me-1" /> Đơn chỉ định xét nghiệm
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-6">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="chkAssessments"
                                                    checked={includeClinicalAssessments}
                                                    onChange={(e) => setIncludeClinicalAssessments(e.target.checked)}
                                                />
                                                <label className="form-check-label small" htmlFor="chkAssessments">
                                                    <FaFileMedicalAlt className="text-warning me-1" /> Đánh giá y khoa (ICD-10)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cryptographic Protection Notice */}
                            <div className="p-3 bg-info-subtle border border-info rounded mb-3 d-flex align-items-center gap-3">
                                <FaShieldAlt className="text-primary fs-3 flex-shrink-0" />
                                <div className="small text-dark">
                                    <strong>Cơ Chế Bảo Vệ & Tính Toàn Vẹn SHA-256:</strong>
                                    <p className="mb-0 text-secondary">
                                        Mỗi bản sao lưu được mã hóa và sinh mã băm SHA-256 niêm phong. Khi khôi phục, hệ thống tự động xác thực chữ ký số để loại trừ 100% rủi ro dữ liệu bị chỉnh sửa ngoài ý muốn.
                                    </p>
                                </div>
                            </div>

                            {/* Operational Notes */}
                            <div className="mb-0">
                                <label className="form-label fw-bold text-dark small text-uppercase">
                                    Ghi Chú Vận Hành / Mục Đích Lưu Trữ
                                </label>
                                <textarea
                                    className="form-control form-control-sm"
                                    rows="2"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Nhập ghi chú hoặc lý do sao lưu..."
                                />
                            </div>
                        </div>

                        <div className="modal-footer bg-light">
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
                                className="btn btn-primary d-flex align-items-center gap-2"
                                disabled={submitting || !backupName.trim()}
                            >
                                {submitting ? (
                                    <>
                                        <div className="spinner-border spinner-border-sm" role="status"></div>
                                        <span>Đang Đóng Gói Dữ Liệu...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle />
                                        <span>Khởi Tạo Bản Sao Lưu</span>
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
