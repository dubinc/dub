import { cubicBezier } from "motion";
import { useCallback, useRef } from "react";

export const easeInOut = cubicBezier(0.645, 0.045, 0.355, 1);
export const easeOut = cubicBezier(0.215, 0.61, 0.355, 1);
export const easeOutBack = cubicBezier(0.34, 1.56, 0.64, 1);

/** 0 → 1 → 0 over [0, 1], eased both ways. 0 outside the window. */
export function pulse(t: number) {
  if (t <= 0 || t >= 1) return 0;
  return t < 0.5 ? easeInOut(t * 2) : easeInOut((1 - t) * 2);
}

/** Progress of a sub-window [from, to] of the timeline, clamped to [0, 1]. */
export function segment(t: number, from: number, to: number) {
  return Math.min(Math.max((t - from) / (to - from), 0), 1);
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Drives a hover animation for a sidebar icon with requestAnimationFrame.
 *
 * Returns a ref callback: attach it to the `<svg>` only while hovered
 * (`ref={hovered ? play : null}`) so React invokes it on each hover start.
 * A hover that lands while a run is in progress is ignored, so quickly
 * hovering out and back in doesn't restart the animation midway.
 *
 * Styles are set directly per frame rather than via the Web Animations API,
 * which promotes the animated elements to a compositor layer and softens
 * their strokes. `frame` receives progress in [0, 1); `reset` runs once the
 * animation finishes and must clear every inline style `frame` set, so the
 * rest state renders exactly like the static icon.
 */
export function useIconAnimation(
  duration: number,
  frame: (svg: SVGSVGElement, t: number) => void,
  reset: (svg: SVGSVGElement) => void,
) {
  const frameRef = useRef<number | null>(null);

  return useCallback(
    (svg: SVGSVGElement | null) => {
      if (!svg || prefersReducedMotion()) return;
      if (frameRef.current !== null) return;

      const start = performance.now();

      const tick = (now: number) => {
        const t = (now - start) / duration;

        if (t >= 1 || !svg.isConnected) {
          reset(svg);
          frameRef.current = null;
          return;
        }

        frame(svg, t);
        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [duration, frame, reset],
  );
}

/** Clears every inline style previously set on the given elements. */
export function clearStyles(
  elements: Iterable<SVGElement>,
  props: (keyof CSSStyleDeclaration & string)[],
) {
  for (const el of elements) {
    for (const prop of props) el.style[prop as any] = "";
  }
}
