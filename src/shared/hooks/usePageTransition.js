/**
 * @file usePageTransition.js
 * @description Dual-Pane Horizontal Carousel Roll Page Transition System.
 * Creates an authentic continuous carousel / film-roll momentum along the physical
 * axis of navigation tabs (left-to-right / right-to-left).
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

// Module-level persistent cache across route transitions
let lastNavOrder = typeof window !== 'undefined' ? getNavOrder(window.location.pathname) : 0;
let lastNavPath = typeof window !== 'undefined' ? window.location.pathname : '/';
let lastOutgoingClone = null;

export default function usePageTransition() {
  const location = useLocation();

  const [animClass, setAnimClass] = useState(() => {
    const currentOrder = getNavOrder(location.pathname);
    const prevOrder = lastNavOrder;

    if (prevOrder !== -1 && currentOrder !== -1 && prevOrder !== currentOrder) {
      return currentOrder > prevOrder ? 'bms-roll-in-right' : 'bms-roll-in-left';
    }
    return 'bms-roll-in-up';
  });

  useLayoutEffect(() => {
    // Scroll window immediately to top for incoming content
    window.scrollTo({ top: 0, behavior: 'instant' });

    const currentOrder = getNavOrder(location.pathname);
    const prevOrder = lastNavOrder;

    let nextAnim = 'bms-roll-in-up';
    if (prevOrder !== -1 && currentOrder !== -1 && prevOrder !== currentOrder) {
      nextAnim = currentOrder > prevOrder ? 'bms-roll-in-right' : 'bms-roll-in-left';
    }
    setAnimClass(nextAnim);

    // Launch the dual-pane horizontal carousel roll if an outgoing snapshot exists
    if (lastOutgoingClone) {
      const { node, scrollY, order } = lastOutgoingClone;
      const isForward = currentOrder > order;

      // Clean up any stale ghost overlay from rapid clicks
      const existingGhost = document.getElementById('bms-page-roll-ghost');
      if (existingGhost) existingGhost.remove();

      // Create ghost viewport pinned directly beneath the sticky navbar (54px)
      const ghost = document.createElement('div');
      ghost.id = 'bms-page-roll-ghost';
      ghost.style.position = 'fixed';
      ghost.style.top = '54px';
      ghost.style.left = '0';
      ghost.style.width = '100vw';
      ghost.style.height = 'calc(100vh - 54px)';
      ghost.style.overflow = 'hidden';
      ghost.style.zIndex = '990';
      ghost.style.pointerEvents = 'none';
      ghost.style.backgroundColor = '#F8FAFC';
      ghost.style.willChange = 'transform';
      ghost.style.backfaceVisibility = 'hidden';

      // Position snapshot content precisely matching the previous scroll offset
      node.style.transform = 'none';
      node.style.animation = 'none';
      node.style.marginTop = `-${scrollY}px`;
      node.style.pointerEvents = 'none';
      ghost.appendChild(node);

      // Trigger the slide-out roll in lockstep with the incoming slide-in
      ghost.className = isForward ? 'bms-roll-out-left' : 'bms-roll-out-right';
      document.body.appendChild(ghost);

      // Cleanly dismantle ghost once animation finishes
      setTimeout(() => {
        if (ghost && ghost.parentNode) {
          ghost.parentNode.removeChild(ghost);
        }
      }, 460);

      lastOutgoingClone = null;
    }

    // Clear incoming animation class after completion to release GPU composite layer and reset transform
    const resetTimer = setTimeout(() => {
      setAnimClass('');
    }, 460);

    lastNavOrder = currentOrder;
    lastNavPath = location.pathname;

    return () => {
      clearTimeout(resetTimer);

      // Synchronously capture a static DOM clone of the outgoing page before unmount
      const contentEl = document.querySelector('.bms-page-directional-content');
      if (contentEl) {
        try {
          const clone = contentEl.cloneNode(true);
          // Strip any active animation classes from the clone
          clone.classList.remove(
            'bms-roll-in-right',
            'bms-roll-in-left',
            'bms-roll-in-up',
            'bms-slide-fade-right',
            'bms-slide-fade-left',
            'bms-slide-fade-up'
          );
          lastOutgoingClone = {
            node: clone,
            scrollY: window.scrollY || window.pageYOffset || 0,
            order: currentOrder,
            path: location.pathname
          };
        } catch (e) {
          lastOutgoingClone = null;
        }
      }
    };
  }, [location.pathname]);

  return animClass;
}
