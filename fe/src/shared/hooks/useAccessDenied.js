/**
 * useAccessDenied Hook
 * 
 * Custom hook to check and display access denied messages from sessionStorage.
 * Used when users try to access routes they don't have permission for.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import { useState, useEffect } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';

/**
 * useAccessDenied Hook
 * 
 * Checks sessionStorage for access denied messages and displays them.
 * Automatically clears the message after displaying.
 * 
 * @returns {Object} Object containing accessDeniedMessage state and setter
 */
export const useAccessDenied = () => {
  const { showError } = useNotificationContext();
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null);

  useEffect(() => {
    // Check for access denied message from sessionStorage
    const accessDenied = sessionStorage.getItem('accessDenied');
    if (accessDenied) {
      try {
        const data = JSON.parse(accessDenied);
        // Only show if message is recent (within last 5 seconds)
        if (Date.now() - data.timestamp < 5000) {
          setAccessDeniedMessage(data.message);
          showError(data.message);
        }
        // Clear the message
        sessionStorage.removeItem('accessDenied');
      } catch (e) {
        sessionStorage.removeItem('accessDenied');
      }
    }
  }, [showError]);

  return { accessDeniedMessage, setAccessDeniedMessage };
};

