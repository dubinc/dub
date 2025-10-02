import React, { useEffect, useState } from "react";

export const useIsInViewport = (
  ref: React.RefObject<HTMLElement> | null,
  threshold: number = 0.8,
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  const checkIsInViewport = () => {
    if (!ref?.current) return;

    const { top, bottom } = ref.current.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;

    const stickyElement = document.querySelector(
      "header",
    ) as HTMLElement | null;
    const stickyOffset = stickyElement ? stickyElement.offsetHeight : 0;

    const visiblePortion = Math.max(
      0,
      Math.min(bottom, windowHeight) - Math.max(top, stickyOffset),
    );
    const elementHeight = bottom - top;

    const visiblePercentage = visiblePortion / elementHeight;

    setIsIntersecting(visiblePercentage >= threshold);
  };

  useEffect(() => {
    const handleScroll = () => {
      checkIsInViewport();
    };

    const handleResize = () => {
      checkIsInViewport();
    };

    window.addEventListener("scroll", handleScroll);
    checkIsInViewport();

    const resizeObserver = new ResizeObserver(handleResize);
    if (ref?.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [ref, threshold]);

  return isIntersecting;
};
