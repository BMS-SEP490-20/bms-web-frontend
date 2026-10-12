/**
 * @file OtpInputGroup.jsx
 * @description Component nhập mã xác thực OTP 6 chữ số độc lập (PIN inputs) đạt chuẩn Production.
 * Hỗ trợ tự động nhảy ô tiếp theo, xóa lùi (Backspace), dán mã từ Clipboard (Paste),
 * và hiệu ứng rung lắc (Shake) khi gặp lỗi xác thực.
 * Tuân thủ: AGENTS-DESIGN.md Rule 19 & AGENTS-CODE.md chuẩn React Component.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './OtpInputGroup.css';

/**
 * @typedef {object} OtpInputGroupProps
 * @property {number} [length=6] - Độ dài chuỗi OTP (mặc định 6 ký tự).
 * @property {string} value - Giá trị OTP hiện tại (chuỗi tối đa 6 số).
 * @property {Function} onChange - Callback khi giá trị thay đổi `(otp: string) => void`.
 * @property {Function} [onComplete] - Callback khi đã nhập đủ 6 số `(otp: string) => void`.
 * @property {boolean} [hasError=false] - Trạng thái hiển thị cảnh báo lỗi.
 * @property {boolean} [disabled=false] - Trạng thái vô hiệu hóa các ô nhập.
 * @property {boolean} [autoFocus=true] - Tự động focus vào ô đầu tiên khi render.
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
  // Tạo mảng ref cho từng ô input
  const inputRefs = useRef([]);
  const [isShaking, setIsShaking] = useState(false);

  // Khởi tạo các giá trị mảng ký tự từ chuỗi value truyền vào
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Tự động kích hoạt hiệu ứng rung khi hasError thay đổi thành true
  useEffect(() => {
    if (hasError) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 450);
      return () => clearTimeout(timer);
    }
  }, [hasError]);

  // Tự động focus ô đầu tiên khi mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  /**
   * Cập nhật ký tự tại vị trí index và gọi callback onChange
   */
  const handleDigitChange = useCallback((index, newValue) => {
    const cleanDigit = newValue.replace(/\D/g, '').slice(-1); // Chỉ lấy 1 ký tự số cuối cùng
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const combinedOtp = newDigits.join('');

    onChange?.(combinedOtp);

    // Nếu đã nhập số và chưa phải ô cuối cùng, tự động nhảy sang ô tiếp theo
    if (cleanDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Nếu đã đủ 6 số, kích hoạt callback onComplete
    if (combinedOtp.length === length && !newDigits.includes('')) {
      onComplete?.(combinedOtp);
    }
  }, [digits, length, onChange, onComplete]);

  /**
   * Xử lý các phím điều hướng và Backspace
   */
  const handleKeyDown = (index, e) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Xóa ký tự hiện tại nếu ô đang có giá trị
        handleDigitChange(index, '');
      } else if (index > 0) {
        // Nếu ô hiện tại rỗng, nhảy lùi về ô trước và xóa
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
   * Xử lý sự kiện dán mã từ Clipboard (Paste)
   */
  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    onChange?.(pastedData);

    // Focus vào ô tiếp theo sau chuỗi dán hoặc ô cuối cùng
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
      aria-label="Nhập mã xác thực OTP 6 số"
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
          aria-label={`Chữ số thứ ${index + 1} của mã xác thực`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

export default OtpInputGroup;
