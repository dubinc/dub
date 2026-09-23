import { cn } from "@dub/utils";
import { SVGProps } from "react";
import { clearStyles, useIconAnimation } from "./use-icon-animation";

const DURATION = 600;

// Each bubble wags around its pointed corner: a decaying sine, a couple of
// cycles, the right bubble trailing the left slightly.
const AMPLITUDE_DEG = 7;
const CYCLES = 2;
const RIGHT_DELAY = 0.12;

function wag(t: number) {
  if (t <= 0 || t >= 1) return 0;
  const decay = (1 - t) ** 2;
  return AMPLITUDE_DEG * decay * Math.sin(t * CYCLES * 2 * Math.PI);
}

function frame(svg: SVGSVGElement, t: number) {
  const left = svg.querySelector<SVGPathElement>("[data-left]")!;
  const right = svg.querySelector<SVGPathElement>("[data-right]")!;

  left.style.transform = `rotate(${wag(t)}deg)`;
  right.style.transform = `rotate(${-wag(t - RIGHT_DELAY)}deg)`;
}

function reset(svg: SVGSVGElement) {
  clearStyles(svg.querySelectorAll("[data-left],[data-right]"), ["transform"]);
}

export function Msgs({
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
        {/* Left bubble: its tail points to the bottom-left. */}
        <path
          data-left
          d="M12.337,4.767c-1.095-1.806-3.074-3.017-5.34-3.017C3.547,1.75,.75,4.547,.75,7.998c0,1.136,.308,2.199,.839,3.117,.37,.695-.045,2.337-.839,3.13,1.077,.058,2.497-.428,3.13-.839,.421,.243,1.09,.566,1.964,.731,.112,.021,.232,.017,.346,.032"
          className="[transform-box:fill-box] [transform-origin:0%_100%]"
        />
        {/* Right bubble: its tail points to the bottom-right. */}
        <path
          data-right
          d="M12.75,7.246c2.485,0,4.5,2.015,4.5,4.5,0,.819-.222,1.584-.604,2.246-.267,.5,.033,1.683,.604,2.255-.776,.042-1.798-.309-2.255-.604-.303,.175-.785,.407-1.415,.527-.269,.051-.547,.078-.831,.078-2.486,0-4.5-2.015-4.5-4.5,0-2.486,2.015-4.5,4.5-4.5Z"
          className="[transform-box:fill-box] [transform-origin:100%_100%]"
        />
      </g>
    </svg>
  );
}
