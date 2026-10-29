/**
 * @file NotificationContext.jsx
 * @description Shared toast-notification state for the BMS web client.
 *
 * WHY this file exists: App.jsx, ValidateSample, LabRoomManagement and other
 * Iteration 3 modules import `shared/contexts/NotificationContext`, which was never
 * committed. This rebuilds the small API they call (`showSuccess`, `showError`,
 * `showInfo`, `showWarning`) on top of React state; rendering lives in
 * `shared/components/Notification/NotificationProvider.jsx`.
 *
 * UI-DESIGN §4.5: toasts are only for non-critical feedback; success/info toasts
 * auto-hide after 5s, error toasts stay until dismissed. Never use a toast for panic
 * values or failed result saves, and never put PII in a toast message.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/** Auto-hide delay for non-error toasts (UI-DESIGN §4.5). */
export const TOAST_AUTO_HIDE_MS = 5000;

/**
 * @typedef {"success"|"danger"|"warning"|"info"} ToastVariant
 * @typedef {object} ToastItem
 * @property {number} id - Stable key for list rendering.
 * @property {ToastVariant} variant - Bootstrap contextual variant.
 * @property {string} message - Vietnamese, PII-free message.
 * @property {boolean} autoHide - False for errors so they cannot be missed.
 */

const NotificationContext = createContext(null);

/**
 * Holds the toast queue and exposes helpers to push/dismiss toasts.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Application subtree.
 * @returns {JSX.Element} Context provider.
 */
export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState(/** @type {ToastItem[]} */ ([]));
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant, message) => {
    const id = nextId.current++;
    const text = typeof message === "string" ? message : String(message ?? "");
    setToasts((prev) => [...prev, { id, variant, message: text, autoHide: variant !== "danger" }]);
    return id;
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      showSuccess: (message) => push("success", message),
      showError: (message) => push("danger", message),
      showWarning: (message) => push("warning", message),
      showInfo: (message) => push("info", message),
    }),
    [toasts, dismiss, push]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

/**
 * Returns toast helpers.
 *
 * @returns {{toasts: ToastItem[], dismiss: (id:number)=>void, showSuccess: (m:string)=>number,
 *   showError: (m:string)=>number, showWarning: (m:string)=>number, showInfo: (m:string)=>number}}
 * @throws {Error} When used outside {@link NotificationProvider}.
 */
export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationContext must be used inside <NotificationProvider>.");
  }
  return ctx;
}

export default NotificationContext;
