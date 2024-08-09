"use client";

import { RefObject, useCallback, useEffect, useState } from "react";
import { useResizeObserver } from "./use-resize-observer";

export function useScrollProgress(ref: RefObject<HTMLElement>) {
  const [scrollProgress, setScrollProgress] = useState(1);

  const updateScrollProgress = useCallback(() => {
    if (!ref.current) return;
    const { scrollTop, scrollHeight, clientHeight } = ref.current;

    setScrollProgress(
      scrollHeight === clientHeight
        ? 1
        : Math.min(scrollTop / (scrollHeight - clientHeight), 1),
    );
  }, []);

  const resizeObserverEntry = useResizeObserver(ref);

  useEffect(updateScrollProgress, [resizeObserverEntry]);

  return { scrollProgress, updateScrollProgress };
}
