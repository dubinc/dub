"use client";

import { CircleDollar3 } from "@dub/ui";
import { cn } from "@dub/utils";

/**
 * Simplified layered icon matching the stablecoin payout modal hero:
 * outer card → middle ring → inner blue circle with dollar icon.
 * Scaled for card/banner use (no ShimmerDots, lighter shadows).
 */
export function StablecoinPayoutIcon({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl",
        className,
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(238, 221, 238, 0.04) 0%, rgba(74, 0, 74, 0.04) 100%), #FFFFFF",
        boxShadow:
          "0px 4px 12px rgba(0, 0, 0, 0.06), 0px 2px 4px rgba(0, 0, 0, 0.08), inset 0px -1px 1px rgba(255, 255, 255, 0.8)",
      }}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(180deg, #F0F0F0 0%, #F0F0F0 100%)",
          boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "#155DFC",
            boxShadow:
              "0px 1px 1px rgba(0, 0, 0, 0.08), inset 0px 2px 3px rgba(255, 255, 255, 0.25), inset 0px -1px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          <CircleDollar3
            className={cn("size-3.5 text-white", iconClassName)}
            strokeWidth={2.5}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
