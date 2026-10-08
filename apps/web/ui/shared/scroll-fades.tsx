"use client";

import { useCallback, useState } from "react";

const FADE_SCROLL_DISTANCE = 40;

// Fades at the top and bottom of a scroll container that show there is more content
export function useScrollFades() {
  const [fades, setFades] = useState({ top: 0, bottom: 0 });

  const updateFades = useCallback((el: HTMLElement) => {
    const maxScrollTop = el.scrollHeight - el.clientHeight;
    const top = Math.min(el.scrollTop / FADE_SCROLL_DISTANCE, 1);
    const bottom =
      maxScrollTop <= 0
        ? 0
        : Math.min((maxScrollTop - el.scrollTop) / FADE_SCROLL_DISTANCE, 1);

    setFades((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, []);

  // Callback ref (rather than an effect): measures once the container mounts and
  // whenever it or its rows resize, e.g. when the skeleton is replaced by rows
  const scrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;

      const observer = new ResizeObserver(() => updateFades(el));
      observer.observe(el);
      if (el.firstElementChild) observer.observe(el.firstElementChild);

      return () => observer.disconnect();
    },
    [updateFades],
  );

  return {
    fades,
    scrollRef,
    onScroll: (e: React.UIEvent<HTMLElement>) => updateFades(e.currentTarget),
  };
}

// Place inside a relative parent of the scroll container
export function ScrollFades({
  fades,
}: {
  fades: ReturnType<typeof useScrollFades>["fades"];
}) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent"
        style={{ opacity: fades.top }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent"
        style={{ opacity: fades.bottom }}
      />
    </>
  );
}
