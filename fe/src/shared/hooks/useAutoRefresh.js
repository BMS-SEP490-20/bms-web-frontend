/**
 * useAutoRefresh Hook
 * 
 * Custom hook to handle automatic data refresh after CRUD operations.
 * Provides consistent refresh logic across all roles and components.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * useAutoRefresh Hook
 * 
 * Automatically refreshes data when:
 * 1. Component mounts and there's a refresh flag in sessionStorage
 * 2. Location changes (navigation)
 * 3. Custom events are dispatched (e.g., dataCreated, dataUpdated, dataDeleted)
 * 
 * @param {Function} loadData - Function to load/refresh data (should accept forceFresh parameter)
 * @param {Object} options - Configuration options
 * @param {string} options.eventName - Custom event name to listen for (default: 'dataChanged')
 * @param {string} options.flagKey - SessionStorage flag key (default: 'shouldRefreshData')
 * @param {boolean} options.enabled - Whether auto-refresh is enabled (default: true)
 * @param {number} options.delay - Delay in ms before refreshing (default: 300)
 * @param {any} options.dependencies - Additional dependencies to trigger refresh check
 * 
 * @returns {Object} Refresh utilities
 */
export const useAutoRefresh = (loadData, options = {}) => {
  const {
    eventName = 'dataChanged',
    flagKey = 'shouldRefreshData',
    enabled = true,
    delay = 300,
    dependencies = []
  } = options;

  const location = useLocation();
  const refreshCheckedRef = useRef(false);
  const loadDataRef = useRef(loadData);

  // Update ref when loadData changes
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  // Check for refresh flag when component mounts or location changes
  useEffect(() => {
    if (!enabled || !loadDataRef.current) return;

    const shouldRefresh = sessionStorage.getItem(flagKey) === 'true';
    
    if (shouldRefresh && !refreshCheckedRef.current) {
      refreshCheckedRef.current = true;
      sessionStorage.removeItem(flagKey);
      
      setTimeout(() => {
        loadDataRef.current(true); // Force fresh fetch
      }, delay);
    }
  }, [location.pathname, flagKey, enabled, ...dependencies]);

  // Additional check when component is rendered (for tab switching, etc.)
  useEffect(() => {
    if (!enabled || !loadDataRef.current) return;

    refreshCheckedRef.current = false;
    
    const checkTimer = setTimeout(() => {
      const shouldRefresh = sessionStorage.getItem(flagKey) === 'true';
      if (shouldRefresh) {
        sessionStorage.removeItem(flagKey);
        loadDataRef.current(true);
      }
    }, 100);
    
    return () => clearTimeout(checkTimer);
  }, [flagKey, enabled]);

  // Listen for custom events
  useEffect(() => {
    if (!enabled || !loadDataRef.current) return;

    const handleDataChanged = () => {
      setTimeout(() => {
        loadDataRef.current(true);
      }, delay);
    };

    window.addEventListener(eventName, handleDataChanged);
    
    return () => {
      window.removeEventListener(eventName, handleDataChanged);
    };
  }, [eventName, enabled, delay]);

  /**
   * Trigger refresh manually
   * @param {boolean} forceFresh - Whether to force fresh fetch (bypass cache)
   */
  const triggerRefresh = (forceFresh = true) => {
    if (loadDataRef.current) {
      loadDataRef.current(forceFresh);
    }
  };

  /**
   * Set refresh flag in sessionStorage
   * Useful when you want to trigger refresh after navigation
   */
  const setRefreshFlag = () => {
    sessionStorage.setItem(flagKey, 'true');
  };

  /**
   * Dispatch custom event to trigger refresh
   * @param {Object} detail - Additional data to pass with event
   */
  const dispatchRefreshEvent = (detail = {}) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  return {
    triggerRefresh,
    setRefreshFlag,
    dispatchRefreshEvent
  };
};

/**
 * Helper function to set refresh flag for a specific data type
 * @param {string} dataType - Type of data (e.g., 'appointments', 'patients', 'accounts')
 */
export const setRefreshFlag = (dataType) => {
  sessionStorage.setItem(`shouldRefresh${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`, 'true');
};

/**
 * Helper function to dispatch refresh event for a specific data type
 * @param {string} dataType - Type of data (e.g., 'appointments', 'patients', 'accounts')
 * @param {string} action - Action performed (e.g., 'created', 'updated', 'deleted')
 * @param {Object} detail - Additional data to pass with event
 */
export const dispatchRefreshEvent = (dataType, action, detail = {}) => {
  const eventName = `${dataType}${action.charAt(0).toUpperCase() + action.slice(1)}`;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
  
  // Also set flag for navigation-based refresh
  setRefreshFlag(dataType);
};

export default useAutoRefresh;

