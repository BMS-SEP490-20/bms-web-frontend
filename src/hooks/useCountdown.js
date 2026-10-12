/**
 * @file useCountdown.js
 * @description Custom Hook quản lý bộ đếm ngược thời gian (Countdown timer).
 * Ứng dụng kiểm soát thời gian chờ gửi lại mã OTP (Resend Cooldown 60s) 
 * và thời gian hết hạn toàn phần của mã xác thực (TTL 300s = 5 phút).
 * Tuân thủ: RFC 6238 & AGENTS-CODE.md chuẩn React Hook.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook đếm ngược thời gian theo giây.
 * 
 * @param {number} initialSeconds - Số giây ban đầu (mặc định 60 giây).
 * @param {Function} [onExpire] - Callback tùy chọn được kích hoạt khi đếm về 0.
 * @returns {object} { seconds, formattedTime, isActive, isExpired, start, reset, stop }
 */
export const useCountdown = (initialSeconds = 60, onExpire = null) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Khởi động đếm ngược
  const start = useCallback((customSeconds = null) => {
    if (customSeconds !== null && !isNaN(customSeconds)) {
      setSeconds(customSeconds);
    }
    setIsActive(true);
  }, []);

  // Tạm dừng bộ đếm
  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  // Thiết lập lại thời gian và tự động bắt đầu nếu autoStart = true
  const reset = useCallback((newSeconds = initialSeconds, autoStart = true) => {
    setSeconds(newSeconds);
    setIsActive(autoStart);
  }, [initialSeconds]);

  // Vòng lặp đếm ngược mỗi 1 giây
  useEffect(() => {
    let intervalId = null;

    if (isActive && seconds > 0) {
      intervalId = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            setIsActive(false);
            if (typeof onExpireRef.current === 'function') {
              onExpireRef.current();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, seconds]);

  // Định dạng chuỗi mm:ss (Ví dụ: "01:00", "00:45")
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;

  return {
    seconds,
    formattedTime,
    isActive,
    isExpired: seconds === 0,
    start,
    reset,
    stop,
  };
};

export default useCountdown;
