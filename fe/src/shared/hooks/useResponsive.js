/**
 * useResponsive Hook
 * 
 * Custom hook for responsive design using react-responsive
 * Provides breakpoint detection for mobile, tablet, and desktop
 * 
 * @returns {Object} Object containing boolean flags for different screen sizes
 */

import { useMediaQuery } from 'react-responsive';

const useResponsive = () => {
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isSmallMobile = useMediaQuery({ maxWidth: 575 });
  const isLargeDesktop = useMediaQuery({ minWidth: 1440 });

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isLargeDesktop,
    // Helper for responsive column sizes
    getColSize: (xs = 12, sm = xs, md = sm, lg = md, xl = lg) => ({
      xs, sm, md, lg, xl
    })
  };
};

export default useResponsive;

