/**
 * @file Modal.jsx
 * @description Accessible generic modal backdrop dialog with Escape key listener and backdrop click dismiss.
 * @module features/admin/components/Modal
 */

import React, { useEffect } from "react";

/**
 * Generic administrative modal dialog wrapper.
 *
 * @param {object} props - Component properties.
 * @param {boolean} props.open - Whether the modal is currently visible.
 * @param {string} props.title - Modal title text.
 * @param {Function} props.onClose - Callback to dismiss the modal.
 * @param {React.ReactNode} props.children - Modal content body.
 * @param {React.ReactNode} [props.footer] - Optional modal footer action buttons.
 * @param {boolean} [props.wide] - Whether to apply wider modal container layout.
 * @returns {JSX.Element|null} The rendered modal or null if closed.
 */
export default function Modal({
    open,
    title,
    onClose,
    children,
    footer,
    wide,
}) {
    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="adm-overlay"
            onMouseDown={onClose}
        >
            <div
                className={`adm-modal ${
                    wide ? "adm-modal-wide" : ""
                }`}
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="adm-modal-head">
                    <h3>{title}</h3>

                    <button
                        type="button"
                        className="adm-icon-btn"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="adm-modal-body">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="adm-modal-foot">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}