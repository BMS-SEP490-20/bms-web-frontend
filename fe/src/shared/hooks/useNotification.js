/**
 * Notification Hook
 * 
 * Custom hook for managing notification state and functionality.
 * Provides methods for showing, removing, and managing notifications.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import { useState, useCallback } from 'react';

/**
 * useNotification Hook
 * 
 * Custom hook that manages notification state and provides methods
 * for displaying and removing notifications throughout the application.
 * 
 * @returns {Object} Notification management object with state and methods
 */
export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  /**
   * Remove Notification
   * 
   * Removes a notification from the notifications array by ID.
   * 
   * @param {string|number} id - Notification ID to remove
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  /**
   * Show Notification
   * 
   * Adds a new notification to the notifications array.
   * 
   * @param {string} type - Notification type (success, error, warning, info)
   * @param {string} message - Notification message
   * @param {number} duration - Auto-remove duration in milliseconds (default: 10000)
   */
  const showNotification = useCallback((type, message, duration = 6000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      type,
      message,
      duration,
      show: true
    };

    setNotifications(prev => [...prev, notification]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  const showSuccess = useCallback((message, duration = 6000) => {
    return showNotification('success', message, duration);
  }, [showNotification]);

  const showError = useCallback((message, duration = 6000) => {
    return showNotification('error', message, duration);
  }, [showNotification]);

  const showWarning = useCallback((message, duration = 6000) => {
    return showNotification('warning', message, duration);
  }, [showNotification]);

  const showInfo = useCallback((message, duration = 6000) => {
    return showNotification('info', message, duration);
  }, [showNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAll
  };
};
