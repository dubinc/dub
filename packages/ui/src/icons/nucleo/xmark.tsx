import { SVGProps } from "react";

export function Xmark(props: SVGProps<SVGSVGElement>) {
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
          x1="14"
          x2="4"
          y1="4"
          y2="14"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="4"
          x2="14"
          y1="4"
          y2="14"
        />
      </g>
    </svg>
  );
}
