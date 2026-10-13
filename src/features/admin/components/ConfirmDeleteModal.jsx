import React, { useState } from "react";
import Modal from "./Modal.jsx";

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