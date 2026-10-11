/**
 * Loading Component
 * 
 * Reusable loading component for the Blood Laboratory Management System.
 * Provides customizable loading spinner with message and size options.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

/**
 * Loading Component
 * 
 * Displays loading spinner with customizable message and size.
 * Supports both inline and full-screen loading modes.
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {string} props.size - Spinner size (sm, lg, etc.)
 * @param {boolean} props.fullScreen - Whether to display full-screen loading
 * @returns {React.ReactNode} Loading component
 */
const Loading = ({ message = 'Đang tải...', size = 'lg', fullScreen = false }) => {
  const content = (
    <div className="text-center">
      <Spinner animation="border" size={size} variant="primary" />
      <div className="mt-3">
        <p className="text-muted mb-0">{message}</p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        {content}
      </div>
    );
  }

  return (
    <Container className="py-4">
      {content}
    </Container>
  );
};

export default Loading;
