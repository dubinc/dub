import { cn } from "@dub/utils";
import { SVGProps } from "react";
import {
  clearStyles,
  easeInOut,
  easeOutBack,
  useIconAnimation,
} from "./use-icon-animation";

const DURATION = 900;

// Trace the hook of the question mark (0 → TRACE_END), then the dot lands
// with a little bounce, carrying the momentum of the stroke (→ 1).
const TRACE_END = 0.5;

function frame(svg: SVGSVGElement, t: number) {
  const hook = svg.querySelector<SVGPathElement>("[data-hook]")!;
  const dot = svg.querySelector<SVGPathElement>("[data-dot]")!;

  // pathLength="1" on the hook makes a dash of 1 cover it exactly, so the
  // offset is the fraction still hidden. The dash is only applied while
  // animating: leaving it on at rest nicks the end of the stroke.
  hook.style.strokeDasharray = "1";

  if (t < TRACE_END) {
    hook.style.strokeDashoffset = String(1 - easeInOut(t / TRACE_END));
    dot.style.opacity = "0";
    dot.style.transform = "scale(0)";
  } else {
    hook.style.strokeDashoffset = "0";
    const k = easeOutBack((t - TRACE_END) / (1 - TRACE_END));
    // Overshoots past 1 on the way in, then settles: pushed down by the
    // stroke arriving from above, scaled up past full size, and back.
    dot.style.opacity = "1";
    dot.style.transform = `translateY(${(k - 1) * 1.25}px) scale(${k})`;
  }
}

function reset(svg: SVGSVGElement) {
  clearStyles(svg.querySelectorAll("[data-hook]"), [
    "strokeDasharray",
    "strokeDashoffset",
  ]);
  clearStyles(svg.querySelectorAll("[data-dot]"), ["opacity", "transform"]);
}

export function CircleQuestion({
  "data-hovered": hovered,
  className,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const play = useIconAnimation(DURATION, frame, reset);

  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      ref={hovered ? play : null}
      className={cn("overflow-visible", className)}
      {...rest}
    >
      <g fill="currentColor">
        <circle
          cx="9"
          cy="9"
          fill="none"
          r="7.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          data-hook
          d="M6.925,6.619c.388-1.057,1.294-1.492,2.18-1.492,.895,0,1.818,.638,1.818,1.808,0,1.784-1.816,1.468-2.096,3.065"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          data-dot
          d="M8.791,13.567c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z"
          fill="currentColor"
          stroke="none"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
      </g>
    </svg>
  );
}
