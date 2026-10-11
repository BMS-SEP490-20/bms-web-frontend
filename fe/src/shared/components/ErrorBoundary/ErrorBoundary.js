/**
 * Error Boundary Component
 * 
 * Error boundary component for the Blood Laboratory Management System.
 * Catches JavaScript errors anywhere in the component tree and displays
 * a fallback UI instead of crashing the entire application.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';

/**
 * Error Boundary Class Component
 * 
 * Catches JavaScript errors in child components and displays error UI.
 * Provides error logging and recovery options for better user experience.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Cập nhật state để render UI lỗi
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log lỗi
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="py-5">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle fa-5x text-warning mb-4"></i>
            <h2 className="mb-3">Đã xảy ra lỗi</h2>
            <p className="text-muted mb-4">
              Rất xin lỗi, đã có lỗi xảy ra trong ứng dụng. Vui lòng thử lại sau.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <Alert variant="danger" className="text-start">
                <Alert.Heading>Chi tiết lỗi (Development):</Alert.Heading>
                <pre className="mb-0" style={{ fontSize: '12px' }}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </Alert>
            )}
            
            <div className="mt-4">
              <Button variant="primary" onClick={this.handleReload} className="me-2">
                <i className="fas fa-refresh me-1"></i>
                Tải lại trang
              </Button>
              <Button variant="outline-secondary" onClick={() => window.history.back()}>
                <i className="fas fa-arrow-left me-1"></i>
                Quay lại
              </Button>
            </div>
          </div>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
