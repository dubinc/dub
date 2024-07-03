import { SVGProps } from "react";

export function Code(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="currentColor">
        <polyline
          fill="none"
          points="5.25 12.5 1.75 9 5.25 5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          fill="none"
          points="12.75 12.5 16.25 9 12.75 5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="7.5"
          x2="10.5"
          y1="15.25"
          y2="2.75"
        />
      </g>
    </svg>
  );
}
