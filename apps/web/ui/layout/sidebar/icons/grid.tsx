import { cn } from "@dub/utils";
import { SVGProps } from "react";
import { clearStyles, pulse, useIconAnimation } from "./use-icon-animation";

// Each square pulses for PULSE ms; the next starts STAGGER ms after the
// previous, clockwise from the top-left.
const PULSE = 380;
const STAGGER = 90;
const DURATION = PULSE + STAGGER * 3;

const GROW = 0.2;
const STROKE_WIDTH = 1.5;

const squares = (svg: SVGSVGElement) =>
  svg.querySelectorAll<SVGRectElement>("[data-square]");

function frame(svg: SVGSVGElement, t: number) {
  const elapsed = t * DURATION;
  squares(svg).forEach((square, i) => {
    const scale = 1 + GROW * pulse((elapsed - i * STAGGER) / PULSE);
    square.style.transform = `scale(${scale})`;
    // Keep the stroke visually constant while the square scales.
    square.style.strokeWidth = String(STROKE_WIDTH / scale);
  });
}

function reset(svg: SVGSVGElement) {
  clearStyles(squares(svg), ["transform", "strokeWidth"]);
}

export function GridIcon({
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
      className={cn(
        "overflow-visible [&_rect]:[transform-box:fill-box] [&_rect]:[transform-origin:center]",
        className,
      )}
      {...rest}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE_WIDTH}
      >
        {/* DOM order is clockwise from the top-left. */}
        <rect
          data-square
          height="4.5"
          width="4.5"
          rx="1"
          ry="1"
          x="2.75"
          y="2.75"
        />
        <rect
          data-square
          height="4.5"
          width="4.5"
          rx="1"
          ry="1"
          x="10.75"
          y="2.75"
        />
        <rect
          data-square
          height="4.5"
          width="4.5"
          rx="1"
          ry="1"
          x="10.75"
          y="10.75"
        />
        <rect
          data-square
          height="4.5"
          width="4.5"
          rx="1"
          ry="1"
          x="2.75"
          y="10.75"
        />
      </g>
    </svg>
  );
}
