import { cn } from "@dub/utils";
import { SVGProps } from "react";
import { clearStyles, easeInOut, useIconAnimation } from "./use-icon-animation";

const DURATION = 850;

// Lift to open (0 → LIFT_END), hold still (→ HOLD_END), then close (→ 1).
const LIFT_END = 0.42;
const HOLD_END = 0.66;

// How far open (0..1) the gift is at a given point in the timeline.
function openAmount(t: number) {
  if (t < LIFT_END) return easeInOut(t / LIFT_END);
  if (t < HOLD_END) return 1;
  return 1 - easeInOut((t - HOLD_END) / (1 - HOLD_END));
}

// Lid (bow + ribbon band) lifts and tilts; box tilts the opposite way so the
// two halves read as separating.
const lidTransform = (k: number) =>
  `translate(${-0.5 * k}px, ${-3.75 * k}px) rotate(${-16 * k}deg)`;
const boxTransform = (k: number) =>
  `translate(${0.5 * k}px, ${0.75 * k}px) rotate(${6 * k}deg)`;

function frame(svg: SVGSVGElement, t: number) {
  const k = openAmount(t);
  svg.querySelector<SVGGElement>("[data-lid]")!.style.transform =
    lidTransform(k);
  svg.querySelector<SVGGElement>("[data-box]")!.style.transform =
    boxTransform(k);
}

function reset(svg: SVGSVGElement) {
  clearStyles(svg.querySelectorAll("[data-lid],[data-box]"), ["transform"]);
}

export function Gift({
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
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <g
          data-box
          className="[transform-box:fill-box] [transform-origin:0%_100%]"
        >
          <path d="M9 8.25V16.25" />
          <path d="M14.25 14.25V8.25H3.75V14.25C3.75 15.355 4.645 16.25 5.75 16.25H12.25C13.355 16.25 14.25 15.355 14.25 14.25Z" />
        </g>
        <g
          data-lid
          className="[transform-box:fill-box] [transform-origin:100%_100%]"
        >
          <path d="M9 5.25V8.25" />
          <path d="M3.75 3.5C3.75 2.534 4.534 1.75 5.5 1.75C8.089 1.75 9 5.25 9 5.25H5.5C4.534 5.25 3.75 4.466 3.75 3.5Z" />
          <path d="M12.5 5.25H9C9 5.25 9.911 1.75 12.5 1.75C13.466 1.75 14.25 2.534 14.25 3.5C14.25 4.466 13.466 5.25 12.5 5.25Z" />
          <path d="M15.25 5.25H2.75C2.19772 5.25 1.75 5.69772 1.75 6.25V7.25C1.75 7.80228 2.19772 8.25 2.75 8.25H15.25C15.8023 8.25 16.25 7.80228 16.25 7.25V6.25C16.25 5.69772 15.8023 5.25 15.25 5.25Z" />
        </g>
      </g>
    </svg>
  );
}
