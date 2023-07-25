import { useState, useEffect, useMemo } from "react";

// Hook
export default function useWindowSize(): {
  width: number;
  height: number;
  isMobile: boolean;
  isDesktop: boolean;
} {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState<{
    width: number;
    height: number;
  }>({
    width: 0,
    height: 0,
  });
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    // Add event listener
    window.addEventListener("resize", handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  // Memoize the result of the calculations using useMemo
  const memoizedWindowSize = useMemo(() => {
    return {
      ...windowSize,
      isMobile:
        typeof windowSize?.width === "number" && windowSize?.width < 768,
      isDesktop:
        typeof windowSize?.width === "number" && windowSize?.width >= 768,
    };
  }, [windowSize]);

  return memoizedWindowSize;
}
