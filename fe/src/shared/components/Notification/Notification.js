/**
 * Notification Component
 * 
 * Individual notification component for the Blood Laboratory Management System.
 * Displays toast notifications with different types and auto-dismiss functionality.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Toast } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Notification Component
 * 
 * Individual notification toast with type-based styling and auto-dismiss.
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Notification type (success, error, warning, info)
 * @param {string} props.message - Notification message
 * @param {boolean} props.show - Whether to show the notification
 * @param {Function} props.onClose - Function to call when notification closes
 * @param {number} props.duration - Auto-dismiss duration in milliseconds
 * @returns {React.ReactNode} Notification component
 */
const Notification = ({ type, message, show, onClose, duration = 6000 }) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);


  const getIcon = () => {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-bell';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'success': return 'Thành công';
      case 'error': return 'Lỗi';
      case 'warning': return 'Cảnh báo';
      case 'info': return 'Thông báo';
      default: return 'Thông báo';
    }
  };

  if (!visible) return null;

  const getNotificationStyle = () => {
    const baseStyle = {
      minWidth: 'clamp(250px, 85vw, 380px)',
      maxWidth: 'clamp(280px, 90vw, 420px)',
      width: 'clamp(250px, 85vw, 380px)',
      borderRadius: 'clamp(12px, 1.5vw, 16px)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      border: 'none',
      overflow: 'hidden',
      position: 'relative'
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          color: 'white'
        };
      case 'error':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)',
          color: 'white'
        };
      case 'warning':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #ffc107 0%, #f39c12 100%)',
          color: '#333'
        };
      case 'info':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #17a2b8 0%, #3498db 100%)',
          color: 'white'
        };
      default:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
          color: 'white'
        };
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.3 
          }}
        >
      <Toast 
        show={visible} 
        onClose={() => {
          setVisible(false);
          onClose();
        }}
        delay={duration}
        autohide={duration > 0}
            style={getNotificationStyle()}
            className="border-0"
          >
              {/* Progress Bar */}
              {duration > 0 && (
                <motion.div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: 'clamp(4px, 1vw, 6px)',
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '0 0 clamp(15px, 2vw, 20px) clamp(15px, 2vw, 20px)'
                  }}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: duration / 1000, ease: "linear" }}
                />
              )}

              <Toast.Header 
                closeButton={false}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 'clamp(0.75rem, 2.5vw, 1rem) clamp(0.75rem, 3vw, 1.25rem) clamp(0.4rem, 1.5vw, 0.75rem) clamp(0.75rem, 3vw, 1.25rem)'
                }}
              >
                <motion.div
                  className="d-flex align-items-center w-100"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.div
                    className="me-2"
                    style={{
                      width: 'clamp(30px, 7vw, 40px)',
                      height: 'clamp(30px, 7vw, 40px)',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
                      flexShrink: 0
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <i className={getIcon()}></i>
                  </motion.div>
                  
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <strong className="fs-6" style={{ 
                      fontSize: 'clamp(0.85rem, 2.2vw, 1.05rem)',
                      fontWeight: '600',
                      lineHeight: '1.2',
                      wordBreak: 'break-word'
                    }}>
                      {getTitle()}
                    </strong>
                  </div>
                  
                  <motion.button 
            type="button" 
            className="btn-close btn-close-white" 
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      width: 'clamp(26px, 5vw, 32px)',
                      height: 'clamp(26px, 5vw, 32px)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
            onClick={() => {
              setVisible(false);
              onClose();
            }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <i className="fas fa-times" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.7rem)' }}></i>
                  </motion.button>
                </motion.div>
        </Toast.Header>
              
              <Toast.Body 
                style={{
                  padding: 'clamp(0.4rem, 1.5vw, 0.75rem) clamp(0.75rem, 3vw, 1.25rem) clamp(0.75rem, 2.5vw, 1.25rem) clamp(0.75rem, 3vw, 1.25rem)',
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)',
                  lineHeight: '1.5',
                  wordBreak: 'break-word'
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
          {message}
                </motion.div>
        </Toast.Body>
      </Toast>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
