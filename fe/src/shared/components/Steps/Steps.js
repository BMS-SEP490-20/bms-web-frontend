/**
 * Steps Component
 * 
 * Step indicator component for the Blood Laboratory Management System.
 * Displays progress through multi-step processes with visual indicators
 * and progress tracking functionality.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { ProgressBar } from 'react-bootstrap';

/**
 * Steps Component
 * 
 * Displays step-by-step progress indicator with visual feedback.
 * Shows current step, completed steps, and remaining steps.
 * 
 * @param {Object} props - Component props
 * @param {number} props.currentStep - Current active step (1-based)
 * @param {Array} props.steps - Array of step objects with title property
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactNode} Steps component
 */
const Steps = ({ currentStep, steps, className = '' }) => {
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className={`steps-container ${className}`}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className={`step-item ${currentStep >= index + 1 ? 'active' : ''}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-title">{step.title}</div>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${currentStep >= index + 2 ? 'active' : ''}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
      <ProgressBar 
        now={progress} 
        variant="primary" 
        style={{ height: '4px' }}
      />
    </div>
  );
};

export default Steps;
