/**
 * Web Vitals Reporting Utility
 * 
 * Performance monitoring utility for the Blood Laboratory Management System.
 * Measures and reports Core Web Vitals metrics including CLS, FID, FCP, LCP, and TTFB
 * to help optimize application performance and user experience.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

/**
 * Report Web Vitals Function
 * 
 * Measures and reports Core Web Vitals metrics for performance monitoring.
 * Uses dynamic import to load web-vitals library only when needed.
 * 
 * @param {Function} onPerfEntry - Callback function to handle performance entries
 */
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
