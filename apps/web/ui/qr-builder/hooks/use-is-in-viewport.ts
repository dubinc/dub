import { RefObject, useEffect, useState } from "react";

export const useIsInViewport = (
  ref: RefObject<HTMLElement> | null,
  threshold: number = 0.8,
  parentRef: RefObject<HTMLElement> | null,
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  const checkIsInViewport = () => {
    if (!ref?.current) return;

    const { top, bottom } = ref.current.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // Get the sticky element if it exists
    const stickyElement = document.querySelector(
      "header",
    ) as HTMLDivElement | null;
    const stickyOffset = stickyElement ? stickyElement.offsetHeight : 0;

    // Calculate the visible portion of the target element within the viewport
    const visiblePortion = Math.max(
      0,
      Math.min(bottom, windowHeight) - Math.max(top, stickyOffset),
    );
    const elementHeight = bottom - top;

    // Calculate the visible percentage
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

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);
    checkIsInViewport();

    const resizeObserver = new ResizeObserver(handleResize);
    if (ref?.current) {
      resizeObserver.observe(ref.current);
    }

    if (parentRef?.current) {
      resizeObserver.observe(parentRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [ref, threshold]);

  return isIntersecting;
};
