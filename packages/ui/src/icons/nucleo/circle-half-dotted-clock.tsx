import { SVGProps } from "react";

export function CircleHalfDottedClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <polyline
          fill="none"
          points="9 4.75 9 9 12.25 11.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M9,1.75c4.004,0,7.25,3.246,7.25,7.25s-3.246,7.25-7.25,7.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          cx="3.873"
          cy="14.127"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle cx="1.75" cy="9" fill="currentColor" r=".75" stroke="none" />
        <circle
          cx="3.873"
          cy="3.873"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle
          cx="6.226"
          cy="15.698"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle
          cx="2.302"
          cy="11.774"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle
          cx="2.302"
          cy="6.226"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle
          cx="6.226"
          cy="2.302"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
      </g>
    </svg>
  );
}
