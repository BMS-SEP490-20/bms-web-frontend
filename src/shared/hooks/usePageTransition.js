/**
 * @file usePageTransition.js
 * @description Physics-based directional page transitions matching navbar tab order.
 * Calculates forward/backward motion along the real-world physical axis of navigation.
 */

import { useState, useEffect } from 'react';
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

export function getNavOrder(pathname) {
  if (!pathname) return -1;
  for (const item of NAVBAR_ROUTES) {
    if (item.match(pathname)) return item.order;
  }
  return -1;
}

let lastNavOrder = typeof window !== 'undefined' ? getNavOrder(window.location.pathname) : 0;
let lastNavPath = typeof window !== 'undefined' ? window.location.pathname : '/';

export default function usePageTransition() {
  const location = useLocation();

  const [animClass, setAnimClass] = useState(() => {
    const currentOrder = getNavOrder(location.pathname);
    const prevOrder = lastNavOrder;

    // Update global state for next navigation
    lastNavOrder = currentOrder;
    lastNavPath = location.pathname;

    if (prevOrder !== -1 && currentOrder !== -1 && prevOrder !== currentOrder) {
      return currentOrder > prevOrder ? 'bms-slide-fade-right' : 'bms-slide-fade-left';
    }
    return 'bms-slide-fade-up';
  });

  useEffect(() => {
    // Scroll to top immediately on navigation
    window.scrollTo({ top: 0, behavior: 'instant' });

    const currentOrder = getNavOrder(location.pathname);
    const prevOrder = lastNavOrder;

    if (prevOrder !== -1 && currentOrder !== -1 && prevOrder !== currentOrder) {
      setAnimClass(currentOrder > prevOrder ? 'bms-slide-fade-right' : 'bms-slide-fade-left');
    } else {
      setAnimClass('bms-slide-fade-up');
    }

    lastNavOrder = currentOrder;
    lastNavPath = location.pathname;
  }, [location.pathname]);

  return animClass;
}
