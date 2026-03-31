import { SVGProps } from "react";

export function TextItalic(props: SVGProps<SVGSVGElement>) {
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
          points="8.25 14.25 10.75 5.75 8.25 5.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="2" fill="currentColor" r="1" stroke="none" />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="5.75"
          x2="10.75"
          y1="14.25"
          y2="14.25"
        />
      </g>
    </svg>
  );
}
