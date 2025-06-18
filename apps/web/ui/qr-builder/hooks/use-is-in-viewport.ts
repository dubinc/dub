import { RefObject, useEffect, useState } from "react";

export const useIsInViewport = (
  ref: RefObject<HTMLElement> | null,
  threshold: number = 0.8,
  parentRef: RefObject<HTMLElement> | null,
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref?.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.intersectionRatio >= threshold);
      },
      {
        threshold: [threshold],
        root: parentRef?.current || null,
        rootMargin: "0px",
      },
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, parentRef, threshold]);

  return isIntersecting;
};
