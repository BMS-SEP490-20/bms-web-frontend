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
            <Modal.Header closeButton={!loading} className="bg-danger text-white py-2">
                <Modal.Title className="fs-6 fw-bold text-white d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    Xác Nhận Xóa Gói Dịch Vụ Xét Nghiệm
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-3">
                {error && (
                    <Alert variant="danger" className="py-2 small mb-3">
                        {error}
                    </Alert>
                )}
                <p className="mb-1">
                    Bạn có chắc chắn muốn xóa gói dịch vụ <strong>{item?.name}</strong> (<code>{item?.code}</code>)?
                </p>
                <small className="text-muted">
                    Hành động này sẽ vô hiệu hóa và đánh dấu xóa gói trên toàn hệ thống quản lý.
                </small>
            </Modal.Body>
            <Modal.Footer className="bg-light py-2">
                <Button variant="outline-secondary" size="sm" onClick={onClose} disabled={loading}>
                    Hủy bỏ
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="d-flex align-items-center gap-1"
                >
                    {loading ? <Spinner size="sm" animation="border" /> : <i className="bi bi-trash"></i>}
                    {loading ? "Đang xóa..." : "Xóa Gói Dịch Vụ"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
