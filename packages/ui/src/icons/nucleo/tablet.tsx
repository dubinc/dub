import { SVGProps } from "react";

export function Tablet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="M7,14.25h-2.25c-1.105,0-2-.895-2-2V3.75c0-1.105,.895-2,2-2h6.5c1.105,0,2,.895,2,2v1.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <rect
          height="5.5"
          width="8.5"
          fill="none"
          rx="1.5"
          ry="1.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(24.5 -.5) rotate(90)"
          x="8.25"
          y="9.25"
        />
      </g>
    </svg>
  );
}
