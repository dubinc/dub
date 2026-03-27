"use client";

import {
  forwardRef,
  MutableRefObject,
  PropsWithChildren,
  RefCallback,
  useCallback,
  useRef,
} from "react";
import { useScrollProgress } from "../hooks/use-scroll-progress";

export const FilterScroll = forwardRef<
  HTMLDivElement | null,
  PropsWithChildren
>(({ children }, forwardedRef) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(ref);

  const setRef: RefCallback<HTMLDivElement> = useCallback(
    (node) => {
      ref.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
    },
    [forwardedRef],
  );

  return (
    <>
      <div
        className="scrollbar-hide max-h-[50vh] w-screen overflow-y-scroll sm:w-auto"
        ref={setRef}
        onScroll={updateScrollProgress}
      >
        {children}
      </div>
      <div
        className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </>
  );
});

FilterScroll.displayName = "FilterScroll";
