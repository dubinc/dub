import { SVGProps } from "react";

export function Directions(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="9"
          x2="9"
          y1="1.75"
          y2="16.25"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="5.75"
          x2="12.25"
          y1="16.25"
          y2="16.25"
        />
        <path
          d="M9,6.25H3.884c-.247,0-.485-.091-.669-.257l-1.389-1.25c-.441-.397-.441-1.089,0-1.487l1.389-1.25c.184-.165,.422-.257,.669-.257h5.116"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.495,10.75h2.616c.247,0,.485-.091,.669-.257l1.389-1.25c.441-.397,.441-1.089,0-1.487l-1.389-1.25c-.184-.165-.422-.257-.669-.257h-2.616"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
