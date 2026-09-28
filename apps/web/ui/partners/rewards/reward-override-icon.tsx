import { cn } from "@dub/utils";

export function RewardOverrideIcon({
  ringClassName = "stroke-white",
}: {
  /** Ring color around the dot; should match the background the icon sits on */
  ringClassName?: string;
}) {
  return (
    <span aria-hidden className="absolute right-0 top-0 size-1">
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        className="absolute inset-[-50%] overflow-visible"
      >
        <circle
          cx="4"
          cy="4"
          r="3"
          fill="#155DFC"
          strokeWidth="2"
          className={cn("transition-colors", ringClassName)}
        />
      </svg>
    </span>
  );
}
