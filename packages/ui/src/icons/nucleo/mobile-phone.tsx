import { SVGProps } from "react";

export function MobilePhone(props: SVGProps<SVGSVGElement>) {
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
        <polyline
          fill="none"
          points="7.75 1.75 7.75 2.75 10.25 2.75 10.25 1.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="9" cy="13" fill="currentColor" r="1" stroke="none" />
      </g>
    </svg>
  );
}
