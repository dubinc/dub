import { SVGProps } from "react";

export function GridLayoutRows(props: SVGProps<SVGSVGElement>) {
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
          height="4.5"
          width="12.5"
          fill="none"
          rx="1"
          ry="1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(18 10) rotate(-180)"
          x="2.75"
          y="2.75"
        />
        <rect
          height="4.5"
          width="12.5"
          fill="none"
          rx="1"
          ry="1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(18 26) rotate(-180)"
          x="2.75"
          y="10.75"
        />
      </g>
    </svg>
  );
}
