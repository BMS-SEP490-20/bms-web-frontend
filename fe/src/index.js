/**
 * Blood Laboratory Management System - Entry Point
 * 
 * This is the main entry point of the Blood Laboratory Management System.
 * It initializes the React application and renders the root App component.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Optionally silence console across the app by setting `REACT_APP_SILENCE_LOGS=true`
import './utils/silenceConsole';
import reportWebVitals from './reportWebVitals';

// Try to load animate.css from local package if installed. This is a safe dynamic import
// — if the package is not installed the import will fail silently and not break the app.
(async () => {
  try { await import('animate.css/animate.min.css'); } catch (e) { /* animate.css not installed — skip */ }
})();

// Create React root and render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitoring
// If you want to start measuring performance in your app, pass a function
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
