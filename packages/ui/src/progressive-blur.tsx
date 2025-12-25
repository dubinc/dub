import { cn } from "@dub/utils";
import React from "react";

// Progressive blur component inspired by https://github.com/AndrewPrifer/progressive-blur

type Side = "left" | "right" | "top" | "bottom";

const oppositeSide: Record<Side, Side> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

const black = "rgba(0, 0, 0, 1)";
const transparent = "rgba(0, 0, 0, 0)";

export function ProgressiveBlur({
  strength = 32,
  steps = 4,
  side = "top",
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  /** The strongest blur strength. */
  strength?: number;
  /** The number of steps for the blur. More steps is more detailed but computationally expensive. */
  steps?: number;
  /** The percentage of blur at the weakest point. */
  falloffPercentage?: number;
  /** Which side will have the strongest blur. */
  side?: Side;
}) {
  const step = 100 / steps;

  const factor = 0.5;

  const base = Math.pow(strength / factor, 1 / (steps - 1));

  const getBackdropFilter = (i: number) =>
    `blur(${factor * base ** (steps - i - 1)}px)`;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        transformOrigin: side,
        ...style,
      }}
      {...rest}
    >
      <div
        className="relative z-0 size-full"
        style={{
          background: `linear-gradient(
            to ${oppositeSide[side]},
            rgb(from transparent r g b / alpha) 0%,
            rgb(from transparent r g b / 0%) 100%
          )`,
        }}
      >
        {/* Full blur at 100 - falloffPercentage */}
        <div
          className="z-1 absolute inset-0"
          style={{
            mask: `linear-gradient(
                  to ${oppositeSide[side]},
                  ${black} 0%,
                  ${transparent} ${step}%
                )`,
            backdropFilter: getBackdropFilter(0),
            WebkitBackdropFilter: getBackdropFilter(0),
          }}
        />

        {steps > 1 && (
          <div
            className="absolute inset-0 z-[2]"
            style={{
              mask: `linear-gradient(
                to ${oppositeSide[side]},
                  ${black} 0%,
                  ${black} ${step}%,
                  ${transparent} ${step * 2}%
                )`,
              backdropFilter: getBackdropFilter(1),
              WebkitBackdropFilter: getBackdropFilter(1),
            }}
          />
        )}

        {steps > 2 &&
          [...Array(steps - 2)].map((_, idx) => (
            <div
              key={idx}
              className="absolute inset-0"
              style={{
                zIndex: idx + 2,
                mask: `linear-gradient(
                    to ${oppositeSide[side]},
                    ${transparent} ${idx * step}%,
                    ${black} ${(idx + 1) * step}%,
                    ${black} ${(idx + 2) * step}%,
                    ${transparent} ${(idx + 3) * step}%
                  )`,
                backdropFilter: getBackdropFilter(idx + 2),
                WebkitBackdropFilter: getBackdropFilter(idx + 2),
              }}
            />
          ))}
      </div>
    </div>
  );
}
