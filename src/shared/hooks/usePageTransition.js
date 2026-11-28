/**
 * @file usePageTransition.js
 * @description Minimal page transition hook. Returns a stable CSS class
 * that simply fades the content in on mount via a CSS animation.
 * Directional logic is handled purely by the navbar pill slider.
 */

import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function usePageTransition() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return 'bms-page-enter';
}
