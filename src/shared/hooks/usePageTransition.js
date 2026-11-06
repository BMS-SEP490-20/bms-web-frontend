/**
 * @file usePageTransition.js
 * @description Directional slide-fade page transition hook.
 * Slides incoming content from the physically correct horizontal direction
 * based on navbar tab order. Uses useRef to guarantee the direction is
 * computed exactly once per pathname change, even if React re-renders.
 */

import { useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const NAVBAR_ROUTES = [
  { match: (p) => p === '/' || p === '/home' || p === '/guest', order: 0 },
  { match: (p) => p === '/services' || (p.startsWith('/services/') && !p.startsWith('/services/pricing')), order: 1 },
  { match: (p) => p === '/pricing' || p === '/catalog', order: 2 },
  { match: (p) => p.startsWith('/tracking') || p.startsWith('/patient/track-progress'), order: 3 },
  { match: (p) => p === '/iso-process', order: 4 },
  { match: (p) => p.startsWith('/patient/test-history'), order: 5 },
  { match: (p) => p.startsWith('/patient/payment-history'), order: 6 },
];

function getNavOrder(pathname) {
  if (!pathname) return -1;
  for (const r of NAVBAR_ROUTES) {
    if (r.match(pathname)) return r.order;
  }
  return -1;
}

// Module-level: remembers the previous page's tab index across navigations
let prevNavOrder = typeof window !== 'undefined' ? getNavOrder(window.location.pathname) : -1;

export default function usePageTransition() {
  const location = useLocation();
  const computedPathRef = useRef(null);
  const animClassRef = useRef('bms-fade-up');

  // Only compute direction ONCE per unique pathname, even if React re-renders
  if (computedPathRef.current !== location.pathname) {
    const curr = getNavOrder(location.pathname);
    const prev = prevNavOrder;
    prevNavOrder = curr;
    computedPathRef.current = location.pathname;

    if (prev !== -1 && curr !== -1 && prev !== curr) {
      animClassRef.current = curr > prev ? 'bms-slide-right' : 'bms-slide-left';
    } else {
      animClassRef.current = 'bms-fade-up';
    }
  }

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return animClassRef.current;
}
