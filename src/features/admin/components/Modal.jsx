import React, { useEffect } from "react";

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