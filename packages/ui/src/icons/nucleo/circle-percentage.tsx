import { SVGProps } from "react";

export function CirclePercentage(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="currentColor">
        <circle
          cx="9"
          cy="9"
          fill="none"
          r="7.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          cx="6.75"
          cy="6.75"
          fill="currentColor"
          r="1.25"
          stroke="none"
        />
        <circle
          cx="11.25"
          cy="11.25"
          fill="currentColor"
          r="1.25"
          stroke="none"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="6.25"
          x2="11.75"
          y1="11.75"
          y2="6.25"
        />
      </g>
    </svg>
  );
}
