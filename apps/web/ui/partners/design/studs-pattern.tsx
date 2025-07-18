import { useId } from "react";

export function StudsPattern() {
  const id = useId();

  const cellSize = 42;
  const circleRadius = 8;

  // An SVG pattern of circles
  return (
    <svg
      className="pointer-events-none absolute inset-0 text-neutral-100"
      width="100%"
      height="100%"
    >
      <defs>
        <linearGradient
          id={`gradient-${id}`}
          x1="0"
          y1="1"
          x2="1"
          y2="0"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="currentColor" offset="0.5" />
          <stop stopColor="white" offset="1" />
        </linearGradient>
        <pattern
          id={`pattern-${id}`}
          x={6}
          y={6}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={cellSize / 2}
            cy={cellSize / 2}
            r={circleRadius}
            fill={`url(#gradient-${id})`}
          />
        </pattern>
      </defs>
      <rect
        fill={`url(#pattern-${id})`}
        width="100%"
        height="100%"
        className="[filter:drop-shadow(0_1px_2px_#0002)_drop-shadow(0_4px_8px_#0002)]"
      />
    </svg>
  );
}
