/**
 * Notification Context
 * 
 * This context provides notification management throughout the application.
 * It manages notification state, display, and removal functionality.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { createContext, useContext } from 'react';
import { useNotification } from '../hooks/useNotification';

// Create notification context
const NotificationContext = createContext();

/**
 * Notification Provider Component
 * 
 * Provides notification functionality to child components.
 * Wraps the application with notification context.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactNode} Provider component with notification context
 */
export const NotificationProvider = ({ children }) => {
  const notification = useNotification();

  return (
    <NotificationContext.Provider value={notification}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Custom hook to use notification context
 * 
 * @returns {Object} Notification context value
 * @throws {Error} If used outside of NotificationProvider
 */
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
