/**
 * @file usePageTransition.js
 * @description Smooth directional slide and crossfade page transition system.
 * Delivers an elegant feathered horizontal glide matching physical navbar tab order
 * with zero DOM cloning overhead and zero animation jitter.
 */

import { useState, useLayoutEffect } from 'react';
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

// Persistent module-level record of previous navbar tab index across component mounts
let previousNavOrder = typeof window !== 'undefined' ? getNavOrder(window.location.pathname) : 0;

export default function usePageTransition() {
  const location = useLocation();

  // Compute direction ONCE on mount so the animation runs uninterrupted from start to finish
  const [animClass] = useState(() => {
    const currentOrder = getNavOrder(location.pathname);
    const prevOrder = previousNavOrder;

    // Record current order for the subsequent navigation
    previousNavOrder = currentOrder;

    if (prevOrder !== -1 && currentOrder !== -1 && prevOrder !== currentOrder) {
      return currentOrder > prevOrder ? 'bms-glide-fade-right' : 'bms-glide-fade-left';
    }
    return 'bms-glide-fade-up';
  });

  useLayoutEffect(() => {
    // Scroll window smoothly to top upon navigation
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return animClass;
}
