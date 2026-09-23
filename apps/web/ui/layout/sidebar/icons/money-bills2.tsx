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

// Timeline (fractions of DURATION): the bill fades in while sliding down
// into place, then the center circle, the two small dots, and finally the
// top line pop in, each with a slight overshoot.
const BILL = [0, 0.35] as const;
const CIRCLE = [0.28, 0.58] as const;
const DOTS: [number, number][] = [
  [0.44, 0.7],
  [0.52, 0.78],
];
const LINE = [0.66, 1] as const;

const BILL_DROP = 2;

function frame(svg: SVGSVGElement, t: number) {
  const bill = svg.querySelector<SVGRectElement>("[data-bill]")!;
  const circle = svg.querySelector<SVGCircleElement>("[data-circle]")!;
  const dots = svg.querySelectorAll<SVGCircleElement>("[data-dot]");
  const line = svg.querySelector<SVGLineElement>("[data-line]")!;

  const b = easeOut(segment(t, ...BILL));
  bill.style.opacity = String(b);
  bill.style.transform = `translateY(${(b - 1) * BILL_DROP}px)`;

  circle.style.transform = `scale(${easeOutBack(segment(t, ...CIRCLE))})`;

  dots.forEach((dot, i) => {
    dot.style.transform = `scale(${easeOutBack(segment(t, DOTS[i][0], DOTS[i][1]))})`;
  });

  line.style.transform = `scale(${easeOutBack(segment(t, ...LINE))})`;
}

function reset(svg: SVGSVGElement) {
  clearStyles(svg.querySelectorAll("[data-bill]"), ["opacity", "transform"]);
  clearStyles(svg.querySelectorAll("[data-circle],[data-dot],[data-line]"), [
    "transform",
  ]);
}

export function MoneyBills2({
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
      className={cn(
        "overflow-visible [&_*]:[transform-box:fill-box] [&_*]:[transform-origin:center]",
        className,
      )}
      {...rest}
    >
      <g fill="currentColor">
        <rect
          data-bill
          height="10.5"
          width="14.5"
          fill="none"
          rx="2"
          ry="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x="1.75"
          y="4.75"
        />
        <circle
          data-circle
          cx="9"
          cy="10"
          fill="none"
          r="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          data-dot
          cx="4.25"
          cy="10"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle
          data-dot
          cx="13.75"
          cy="10"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <line
          data-line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="3.75"
          x2="14.25"
          y1="1.75"
          y2="1.75"
        />
      </g>
    </svg>
  );
}
