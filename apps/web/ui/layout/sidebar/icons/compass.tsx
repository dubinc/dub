import { cn } from "@dub/utils";
import { SVGProps } from "react";
import {
  clearStyles,
  easeInOut,
  easeOut,
  useIconAnimation,
} from "./use-icon-animation";

const DURATION = 550;

// Needle swings wide one way, back past center, then settles. Each segment
// is [end offset (0..1), target angle in degrees, easing].
const SWING: [number, number, (t: number) => number][] = [
  [0.45, 48, easeInOut],
  [0.8, -18, easeInOut],
  [1, 0, easeOut],
];

function needleAngle(t: number) {
  let from = 0;
  let segStart = 0;
  for (const [end, to, ease] of SWING) {
    if (t < end)
      return from + (to - from) * ease((t - segStart) / (end - segStart));
    from = to;
    segStart = end;
  }
  return 0;
}

function frame(svg: SVGSVGElement, t: number) {
  svg.querySelector<SVGPathElement>("[data-needle]")!.style.transform =
    `rotate(${needleAngle(t)}deg)`;
}

function reset(svg: SVGSVGElement) {
  clearStyles(svg.querySelectorAll("[data-needle]"), ["transform"]);
}

export function Compass({
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
        <path
          data-needle
          d="M12.536,5.464l-1.806,4.214c-.202,.472-.578,.848-1.05,1.05l-4.214,1.806,1.806-4.214c.202-.472,.578-.848,1.05-1.05l4.214-1.806Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
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
      </g>
    </svg>
  );
}
