/**
 * @file NotificationProvider.jsx
 * @description Renders the toast queue held by `shared/contexts/NotificationContext`.
 * Mounted once at the root (App.jsx). The container is an aria-live region so screen
 * readers announce feedback without stealing focus (UI-DESIGN §4.5, WCAG 4.1.3).
 */

import { Toast, ToastContainer } from "react-bootstrap";
import { TOAST_AUTO_HIDE_MS, useNotificationContext } from "../../contexts/NotificationContext";

const TITLES = {
  success: "Thành công",
  danger: "Lỗi",
  warning: "Cảnh báo",
  info: "Thông báo",
};

/**
 * Toast outlet for the whole app.
 *
 * @returns {JSX.Element} Toast stack in the top-right corner.
 */
export default function NotificationProvider() {
  const { toasts, dismiss } = useNotificationContext();

  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1080 }} role="status" aria-live="polite">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          bg={t.variant}
          onClose={() => dismiss(t.id)}
          autohide={t.autoHide}
          delay={TOAST_AUTO_HIDE_MS}
        >
          <Toast.Header closeLabel="Đóng thông báo">
            <strong className="me-auto">{TITLES[t.variant] || TITLES.info}</strong>
          </Toast.Header>
          <Toast.Body className={t.variant === "warning" || t.variant === "info" ? "text-dark" : "text-white"}>
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
