/**
 * @file ErrorBoundary.jsx
 * @description Root error boundary so a render crash shows a recovery screen instead of
 * a blank page (CHECKLIST §6.3). Error details are never rendered to the user, because
 * stack traces can leak internals or PII (OWASP A10).
 */

import React from "react";
import { Button, Container } from "react-bootstrap";

/**
 * Catches render-time errors anywhere below it.
 */
export default class ErrorBoundary extends React.Component {
  /**
   * @param {{children: React.ReactNode}} props
   */
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * @returns {{hasError: boolean}} State update that switches to the fallback UI.
   */
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  /**
   * Logs only in development; production builds must not dump stacks to the console.
   *
   * @param {Error} error - Thrown error.
   * @param {React.ErrorInfo} info - Component stack.
   */
  componentDidCatch(error, info) {
    if (import.meta.env?.DEV) {
      console.error("[BMS ErrorBoundary]", error, info?.componentStack);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <Container className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-center" role="alert">
        <h1 className="h4 fw-bold mb-2">Đã xảy ra lỗi không mong muốn</h1>
        <p className="text-secondary mb-4">Vui lòng tải lại trang. Nếu lỗi lặp lại, hãy báo cho quản trị viên.</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
      </Container>
    );
  }
}
