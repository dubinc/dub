import { cn } from "@dub/utils";
import { useId } from "react";

export function DotsPattern({
  dotSize = 2,
  gapSize = 10,
  patternOffset = [0, 0],
  className,
}: {
  dotSize?: number;
  gapSize?: number;
  patternOffset?: [number, number];
  className?: string;
}) {
  const id = useId();

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 text-black/10",
        className,
      )}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={`dots-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={dotSize + gapSize}
          height={dotSize + gapSize}
          patternUnits="userSpaceOnUse"
        >
          <rect
            x={1}
            y={1}
            width={dotSize}
            height={dotSize}
            fill="currentColor"
          />
        </pattern>
      </defs>
      <rect fill={`url(#dots-${id})`} width="100%" height="100%" />
    </svg>
  );
}
