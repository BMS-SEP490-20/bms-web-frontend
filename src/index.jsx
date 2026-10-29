/**
 * @file index.js
 * @description Alternative application entry point for CRA / fallback bundler environments.
 * Mounts the root component with Bootstrap styles and custom application themes.
 * Conforms to: Production Engineering Standards & AGENTS-CODE.md.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
