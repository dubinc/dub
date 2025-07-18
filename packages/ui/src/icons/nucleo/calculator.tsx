import { SVGProps } from "react";

export function Calculator(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <rect
          height="14.5"
          width="10.5"
          fill="none"
          rx="2"
          ry="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x="3.75"
          y="1.75"
        />
        <rect
          height="1"
          width="5.5"
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x="6.25"
          y="4.25"
        />
        <circle cx="6.25" cy="11" fill="currentColor" r=".75" stroke="none" />
        <circle cx="6.25" cy="8.25" fill="currentColor" r=".75" stroke="none" />
        <circle cx="9" cy="8.25" fill="currentColor" r=".75" stroke="none" />
        <circle
          cx="11.75"
          cy="8.25"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle cx="9" cy="11" fill="currentColor" r=".75" stroke="none" />
        <circle
          cx="6.25"
          cy="13.75"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle cx="9" cy="13.75" fill="currentColor" r=".75" stroke="none" />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="11.75"
          x2="11.75"
          y1="11"
          y2="13.75"
        />
      </g>
    </svg>
  );
}
