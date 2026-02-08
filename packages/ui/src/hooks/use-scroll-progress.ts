"use client";

import { RefObject, useCallback, useEffect, useState } from "react";
import { useResizeObserver } from "./use-resize-observer";

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  { direction = "vertical" }: { direction?: "vertical" | "horizontal" } = {},
) {
  const [scrollProgress, setScrollProgress] = useState(1);

  const updateScrollProgress = useCallback(() => {
    if (!ref.current) return;
    const scroll =
      direction === "vertical" ? ref.current.scrollTop : ref.current.scrollLeft;
    const scrollSize =
      direction === "vertical"
        ? ref.current.scrollHeight
        : ref.current.scrollWidth;
    const clientSize =
      direction === "vertical"
        ? ref.current.clientHeight
        : ref.current.clientWidth;

    setScrollProgress(
      scrollSize === clientSize
        ? 1
        : Math.min(scroll / (scrollSize - clientSize), 1),
    );
  }, [direction]);

  const resizeObserverEntry = useResizeObserver(ref);

  useEffect(updateScrollProgress, [resizeObserverEntry]);

  return { scrollProgress, updateScrollProgress };
}
