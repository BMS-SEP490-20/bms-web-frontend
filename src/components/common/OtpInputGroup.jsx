/**
 * @file OtpInputGroup.jsx
 * @description Production-grade 6-digit independent PIN input component.
 * Features: auto-advancing focus, backspace backward jump, clipboard paste distribution,
 * and shake micro-animation upon verification failure.
 * Conforms to: AGENTS-DESIGN.md Rule 19 (Touch Target) & Production Standards.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './OtpInputGroup.css';

/**
 * @typedef {object} OtpInputGroupProps
 * @property {number} [length=6] - OTP length (default: 6 digits).
 * @property {string} value - Current OTP value string.
 * @property {Function} onChange - Value change callback `(otp: string) => void`.
 * @property {Function} [onComplete] - Triggered when all digits are entered `(otp: string) => void`.
 * @property {boolean} [hasError=false] - Error state triggering shake and danger borders.
 * @property {boolean} [disabled=false] - Disables all input fields.
 * @property {boolean} [autoFocus=true] - Automatically focuses first field on mount.
 */

export const OtpInputGroup = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  hasError = false,
  disabled = false,
  autoFocus = true,
}) => {
  // Input elements refs array
  const inputRefs = useRef([]);
  const [isShaking, setIsShaking] = useState(false);

  // Initialize array of digits from incoming value string
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Trigger shake animation whenever hasError changes to true
  useEffect(() => {
    if (hasError) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 450);
      return () => clearTimeout(timer);
    }
  }, [hasError]);

  // Focus first input box on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  /**
   * Updates digit at specified index and invokes onChange callback.
   */
  const handleDigitChange = useCallback((index, newValue) => {
    const cleanDigit = newValue.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const combinedOtp = newDigits.join('');

    onChange?.(combinedOtp);

    // Auto-advance to next input field
    if (cleanDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger onComplete when all digits are filled
    if (combinedOtp.length === length && !newDigits.includes('')) {
      onComplete?.(combinedOtp);
    }
  }, [digits, length, onChange, onComplete]);

  /**
   * Handles keyboard navigation and Backspace key.
   */
  const handleKeyDown = (index, e) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current box if it has a value
        handleDigitChange(index, '');
      } else if (index > 0) {
        // Move backward and clear preceding box
        inputRefs.current[index - 1]?.focus();
        handleDigitChange(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handles clipboard paste events.
   */
  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    onChange?.(pastedData);

    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === length) {
      onComplete?.(pastedData);
    }
  };

  return (
    <div
      className={`bms-otp-container ${hasError ? 'has-error' : ''} ${isShaking ? 'is-shaking' : ''}`}
      onPaste={handlePaste}
      role="group"
      aria-label="6-digit OTP verification code input"
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleDigitChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className={`bms-otp-input ${digits[index] ? 'is-filled' : ''}`}
          aria-label={`Digit ${index + 1} of verification code`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

export default OtpInputGroup;
