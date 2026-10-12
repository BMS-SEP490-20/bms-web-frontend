/**
 * @file useCountdown.js
 * @description Custom React Hook managing countdown timers for OTP resend cooldown (60 seconds)
 * and total OTP expiration lifecycle (300 seconds / 5 minutes).
 * Conforms to: RFC 6238 TOTP Guidelines & Production Engineering Standards.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Countdown timer hook with formatted time string and status callbacks.
 * 
 * @param {number} initialSeconds - Starting seconds (default 60).
 * @param {Function} [onExpire] - Optional callback triggered when timer hits 0.
 * @returns {object} { seconds, formattedTime, isActive, isExpired, start, reset, stop }
 */
export const useCountdown = (initialSeconds = 60, onExpire = null) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Start the countdown timer with optional custom duration
  const start = useCallback((customSeconds = null) => {
    if (customSeconds !== null && !isNaN(customSeconds)) {
      setSeconds(customSeconds);
    }
    setIsActive(true);
  }, []);

  // Pause the countdown timer
  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  // Reset timer to specified seconds with optional auto-start
  const reset = useCallback((newSeconds = initialSeconds, autoStart = true) => {
    setSeconds(newSeconds);
    setIsActive(autoStart);
  }, [initialSeconds]);

  // 1-second interval loop
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

  // Format as mm:ss string (e.g. "01:00", "00:45")
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
