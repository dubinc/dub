import { cn } from "@dub/utils";
import { SVGProps } from "react";
import { clearStyles, pulse, useIconAnimation } from "./use-icon-animation";

// Each circle pulses for PULSE ms; the next one starts STAGGER ms after the
// previous, clockwise from the top.
const PULSE = 380;
const STAGGER = 90;
const DURATION = PULSE + STAGGER * 3;

const GROW = 0.3;
const STROKE_WIDTH = 1.5;

const dots = (svg: SVGSVGElement) =>
  svg.querySelectorAll<SVGCircleElement>("[data-dot]");

function frame(svg: SVGSVGElement, t: number) {
  const elapsed = t * DURATION;
  dots(svg).forEach((dot, i) => {
    const scale = 1 + GROW * pulse((elapsed - i * STAGGER) / PULSE);
    dot.style.transform = `scale(${scale})`;
    // Keep the stroke visually constant while the circle scales.
    dot.style.strokeWidth = String(STROKE_WIDTH / scale);
  });
}

function reset(svg: SVGSVGElement) {
  clearStyles(dots(svg), ["transform", "strokeWidth"]);
}

export function ConnectedDots4({
  "data-hovered": hovered,
  className,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const play = useIconAnimation(DURATION, frame, reset);

  return (
    <svg
      aria-hidden="true"
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      ref={hovered ? play : null}
      className={cn("overflow-visible", className)}
      {...rest}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE_WIDTH}
      >
        <line x1="4.664" x2="7.586" y1="7.586" y2="4.664" />
        <line x1="10.414" x2="13.336" y1="4.664" y2="7.586" />
        <line x1="13.336" x2="10.414" y1="10.414" y2="13.336" />
        <line x1="7.586" x2="4.664" y1="13.336" y2="10.414" />
        {/* Each circle scales from the point nearest the icon's center. */}
        <circle
          data-dot
          cx="9"
          cy="3.25"
          r="2"
          className="[transform-box:fill-box] [transform-origin:50%_100%]"
        />
        <circle
          data-dot
          cx="14.75"
          cy="9"
          r="2"
          className="[transform-box:fill-box] [transform-origin:0%_50%]"
        />
        <circle
          data-dot
          cx="9"
          cy="14.75"
          r="2"
          className="[transform-box:fill-box] [transform-origin:50%_0%]"
        />
        <circle
          data-dot
          cx="3.25"
          cy="9"
          r="2"
          className="[transform-box:fill-box] [transform-origin:100%_50%]"
        />
      </g>
    </svg>
  );
}
