/**
 * @file CreateBackupModal.jsx
 * @description Modal for creating a new database backup snapshot (UC80 / BR-243).
 * Specifically supports archiving patient diagnostic lab test records with SHA-256 cryptographic sealing.
 * Conforms to: Production Medical Standards, ISO 15189 Quality Management & AGENTS-DESIGN.md.
 */

import React, { useState } from "react";
import { Database, CheckCircle2, X as LucideX, TestTube2, FileText, User, FileHeart } from 'lucide-react';
import { createBackup } from "../api/backupApi";

export default function CreateBackupModal({ show, onHide, onBackupCreated }) {
    const [backupName, setBackupName] = useState(
        `Lưu trữ dữ liệu xét nghiệm bệnh nhân - ${new Date().toLocaleDateString("vi-VN")}`
    );
    const [scope, setScope] = useState(1);
    const [includeTestResults, setIncludeTestResults] = useState(true);
    const [includeBloodSamples, setIncludeBloodSamples] = useState(true);
    const [includePatientRecords, setIncludePatientRecords] = useState(true);
    const [includeClinicalAssessments, setIncludeClinicalAssessments] = useState(true);
    const [notes, setNotes] = useState("Sao lưu dữ liệu hệ thống định kỳ.");

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
            style={{ backgroundColor: "rgba(15, 39, 67, 0.5)", backdropFilter: 'blur(4px)', zIndex: 1050 }}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content shadow border-0" style={{ borderRadius: 18, overflow: 'hidden' }}>
                    <div className="modal-header py-3" style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }}>
                        <div className="d-flex align-items-center gap-2">
                            <Database className="fs-5" style={{ color: '#1E60E6' }}  size="1em"/>
                            <h5 className="modal-title fw-bold mb-0" style={{ color: '#0f2743' }}>
                                Tạo Bản Sao Lưu & Lưu Trữ Dữ Liệu Xét Nghiệm
                            </h5>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onHide}
                            disabled={submitting}
                        ></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body p-2">
                            {errorMessage && (
                                <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 14 }}>
                                    {errorMessage}
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="form-label fw-bold text-dark small text-uppercase">
                                    Phạm Vi Lưu Trữ (Backup Scope) <span className="text-danger">*</span>
                                </label>
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <div
                                            className="p-3 border transition-all"
                                            onClick={() => handleScopeChange({ target: { value: 1 } })}
                                            style={{
                                                cursor: "pointer",
                                                borderRadius: 14,
                                                borderColor: scope === 1 ? '#1E60E6' : 'rgba(15, 23, 42, 0.05)',
                                                background: scope === 1 ? 'rgba(30, 96, 230, 0.08)' : '#EEF2F6'
                                            }}
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
                                            className="p-3 border transition-all"
                                            onClick={() => handleScopeChange({ target: { value: 2 } })}
                                            style={{
                                                cursor: "pointer",
                                                borderRadius: 14,
                                                borderColor: scope === 2 ? '#1E60E6' : 'rgba(15, 23, 42, 0.05)',
                                                background: scope === 2 ? 'rgba(30, 96, 230, 0.08)' : '#EEF2F6'
                                            }}
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
                                                    <TestTube2 className="text-primary me-1"  size="1em"/> Kết quả xét nghiệm máu (Cobas)
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
                                                    <FileText className="text-info me-1"  size="1em"/> Mẫu bệnh phẩm & mã Barcode
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
                                                    <User className="text-success me-1"  size="1em"/> Đơn chỉ định xét nghiệm
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
                                                    <FileHeart className="text-warning me-1"  size="1em"/> Đánh giá y khoa (ICD-10)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-3 bg-info-subtle border border-info rounded mb-3 d-flex align-items-center gap-3">
                                <CheckCircle2 className="text-primary fs-3 flex-shrink-0"  size="1em"/>
                                <div className="small text-dark">
                                    <strong>Cơ Chế Bảo Vệ & Tính Toàn Vẹn SHA-256:</strong>
                                    <p className="mb-0 text-secondary">
                                        Mỗi bản sao lưu được mã hóa và sinh mã băm SHA-256 niêm phong. Khi khôi phục, hệ thống tự động xác thực chữ ký số để loại trừ 100% rủi ro dữ liệu bị chỉnh sửa ngoài ý muốn.
                                    </p>
                                </div>
                            </div>

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

                        <div className="modal-footer py-2 px-3" style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }}>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={onHide}
                                disabled={submitting}
                                style={{ borderRadius: 9999 }}
                            >
                                Hủy Bỏ
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary d-flex align-items-center gap-2"
                                disabled={submitting || !backupName.trim()}
                                style={{ borderRadius: 9999, background: '#1E60E6', borderColor: '#1E60E6', boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)' }}
                            >
                                {submitting ? (
                                    <>
                                        <div className="spinner-border spinner-border-sm" role="status"></div>
                                        <span>Đang Đóng Gói Dữ Liệu...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2  size="1em"/>
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
