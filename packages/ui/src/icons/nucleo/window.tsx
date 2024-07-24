import { SVGProps } from "react";

export function Window(props: SVGProps<SVGSVGElement>) {
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
          height="12.5"
          width="14.5"
          fill="none"
          rx="2"
          ry="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(18 18) rotate(180)"
          x="1.75"
          y="2.75"
        />
        <circle cx="4.25" cy="5.25" fill="currentColor" r=".75" stroke="none" />
        <circle cx="6.75" cy="5.25" fill="currentColor" r=".75" stroke="none" />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="1.75"
          x2="16.25"
          y1="7.75"
          y2="7.75"
        />
      </g>
    </svg>
  );
}
