/**
 * @file ConfirmDeleteModal.jsx
 * @description Destructive action confirmation dialog for deleting service packages (UC15).
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * Implemented using React-Bootstrap Modal for guaranteed standard modal behavior and animation.
 * @module features/admin/components/ConfirmDeleteModal
 */

import React, { useState } from "react";
import { Modal, Button, Spinner, Alert } from "react-bootstrap";

/**
 * Confirmation dialog for permanently deleting a laboratory service package.
 */
export default function ConfirmDeleteModal({ item, onClose, onConfirm }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleConfirm() {
        try {
            setLoading(true);
            setError("");
            await onConfirm(item);
        } catch (err) {
            setError(err.message || "Xóa thất bại.");
            setLoading(false);
        }
    }

    return (
        <Modal show={Boolean(item)} onHide={loading ? undefined : onClose} centered size="md">
            <Modal.Header closeButton={!loading} style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }}>
                <Modal.Title className="fs-6 fw-bold text-danger d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    Xác Nhận Xóa Gói Dịch Vụ Xét Nghiệm
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {error && (
                    <Alert variant="danger" className="py-2 small mb-3" style={{ borderRadius: 14 }}>
                        {error}
                    </Alert>
                )}
                <p className="mb-1" style={{ color: '#0f2743', fontSize: 15 }}>
                    Bạn có chắc chắn muốn xóa gói dịch vụ <strong>{item?.name}</strong> (<code style={{ color: '#1E60E6' }}>{item?.code}</code>)?
                </p>
                <small className="text-muted">
                    Hành động này sẽ vô hiệu hóa và đánh dấu xóa gói trên toàn hệ thống quản lý.
                </small>
            </Modal.Body>
            <Modal.Footer style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }} className="py-2 px-3">
                <Button variant="outline-secondary" size="sm" onClick={onClose} disabled={loading} style={{ borderRadius: 9999 }}>
                    Hủy bỏ
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: 9999, boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)' }}
                >
                    {loading ? <Spinner size="sm" animation="border" /> : <i className="bi bi-trash"></i>}
                    {loading ? "Đang xóa..." : "Xóa Gói Dịch Vụ"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
