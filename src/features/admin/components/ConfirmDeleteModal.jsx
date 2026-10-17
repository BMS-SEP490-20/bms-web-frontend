/**
 * @file ConfirmDeleteModal.jsx
 * @description Destructive action confirmation dialog for deleting service packages (UC15).
 * Prevents accidental removals with explicit package name confirmation.
 * @module features/admin/components/ConfirmDeleteModal
 */

import React, { useState } from "react";
import Modal from "./Modal.jsx";

/**
 * Confirmation dialog for permanently deleting a laboratory service package.
 *
 * @param {object} props - Component properties.
 * @param {object|null} props.item - Target package object to delete.
 * @param {Function} props.onClose - Callback to dismiss the confirmation dialog.
 * @param {Function} props.onConfirm - Async callback executing package deletion.
 * @returns {JSX.Element} The rendered confirmation modal.
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
        <Modal
            open={!!item}
            title="Xóa gói dịch vụ"
            onClose={loading ? () => {} : onClose}
            footer={
                <>
                    <button className="adm-btn adm-btn-ghost" onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button className="adm-btn adm-btn-danger" onClick={handleConfirm} disabled={loading}>
                        {loading ? "Đang xóa..." : "Xóa"}
                    </button>
                </>
            }
        >
            <p style={{ margin: 0 }}>
                Bạn chắc chắn muốn xóa gói <strong>{item?.name}</strong>? Hành động này không thể hoàn tác.
            </p>
            {error && <div className="adm-error">{error}</div>}
        </Modal>
    );
}