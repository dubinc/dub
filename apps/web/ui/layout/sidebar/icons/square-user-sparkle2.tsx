import { cn } from "@dub/utils";
import { SVGProps } from "react";
import {
  clearStyles,
  easeOut,
  easeOutBack,
  segment,
  useIconAnimation,
} from "./use-icon-animation";

const DURATION = 900;

// Timeline (fractions of DURATION): the body rises in, the head drops in
// with a small bounce, and the sparkle pops in last.
const BODY = [0, 0.38] as const;
const HEAD = [0.18, 0.62] as const;
const STAR = [0.62, 1] as const;

function frame(svg: SVGSVGElement, t: number) {
  const body = svg.querySelector<SVGPathElement>("[data-body]")!;
  const head = svg.querySelector<SVGCircleElement>("[data-head]")!;
  const star = svg.querySelector<SVGPathElement>("[data-star]")!;

  const b = easeOut(segment(t, ...BODY));
  body.style.opacity = String(b);
  body.style.transform = `scaleY(${b})`;

  // Overshoots past 1, so the head lands slightly low and springs back up.
  const h = easeOutBack(segment(t, ...HEAD));
  head.style.opacity = h > 0 ? "1" : "0";
  head.style.transform = `translateY(${(h - 1) * 1.5}px) scale(${h})`;

  const s = easeOutBack(segment(t, ...STAR));
  star.style.transform = `scale(${s})`;
}

function reset(svg: SVGSVGElement) {
  clearStyles(svg.querySelectorAll("[data-body],[data-head],[data-star]"), [
    "opacity",
    "transform",
  ]);
}

export function SquareUserSparkle2({
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
          d="M10.266,2.75H4.75c-1.105,0-2,.896-2,2V13.25c0,1.104,.895,2,2,2H13.25c1.105,0,2-.896,2-2V7.688"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          data-body
          d="M5.126,15.25c.444-1.725,2.01-3,3.874-3s3.43,1.275,3.874,3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:50%_100%]"
        />
        <circle
          data-head
          cx="9"
          cy="7.75"
          fill="none"
          r="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
        <path
          data-star
          d="M17.589,2.388l-1.515-.506-.505-1.515c-.164-.49-.975-.49-1.139,0l-.505,1.515-1.515,.506c-.245,.081-.41,.311-.41,.569s.165,.488,.41,.569l1.515,.506,.505,1.515c.082,.245,.312,.41,.57,.41s.487-.165,.57-.41l.505-1.515,1.515-.506c.245-.081,.41-.311,.41-.569s-.165-.487-.41-.569h0Z"
          fill="currentColor"
          stroke="none"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
      </g>
    </svg>
  );
}
