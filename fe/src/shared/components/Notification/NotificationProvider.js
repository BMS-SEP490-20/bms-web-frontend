/**
 * Notification Provider Component
 * 
 * Provider component for managing multiple notifications in the Blood Laboratory Management System.
 * Renders a list of notifications and handles their removal.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Notification from './Notification';

/**
 * Notification Provider Component
 * 
 * Renders multiple notification components and manages their lifecycle.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.notifications - Array of notification objects
 * @param {Function} props.removeNotification - Function to remove a notification
 * @returns {React.ReactNode} Notification provider component
 */
const NotificationProvider = ({ notifications, removeNotification }) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 'clamp(70px, 12vw, 90px)', 
      right: 'clamp(10px, 3vw, 20px)', 
      left: 'clamp(10px, 3vw, auto)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(8px, 1.5vw, 12px)',
      maxWidth: 'calc(100vw - 20px)',
      pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3,
              delay: index * 0.1
            }}
            style={{
              marginBottom: 'clamp(5px, 1vw, 10px)',
              pointerEvents: 'auto',
              width: '100%'
            }}
          >
            <Notification
              type={notification.type}
              message={notification.message}
              show={notification.show}
              duration={notification.duration}
              onClose={() => removeNotification(notification.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationProvider;
