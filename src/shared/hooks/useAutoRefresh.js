import { useEffect } from 'react';

export function useAutoRefresh(callback, intervalMs = 15000) {
  useEffect(() => {
    if (!callback) return;
    const timer = setInterval(() => {
      callback();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [callback, intervalMs]);
}

export function dispatchRefreshEvent(eventName = 'bms-refresh') {
  window.dispatchEvent(new CustomEvent(eventName));
}

export function setRefreshFlag(key = 'bms-refreshed') {
  sessionStorage.setItem(key, String(Date.now()));
}

