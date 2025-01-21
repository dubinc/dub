import { SVGProps } from "react";

export function Versions2(props: SVGProps<SVGSVGElement>) {
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
          d="M5.25,11.25h-1.5c-1.105,0-2-.895-2-2V3.75c0-1.105,.895-2,2-2h3.5c1.105,0,2,.895,2,2v.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M8.75,13.75h-1.5c-1.105,0-2-.895-2-2V6.25c0-1.105,.895-2,2-2h3.5c1.105,0,2,.895,2,2v.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <rect
          height="9.5"
          width="7.5"
          fill="none"
          rx="2"
          ry="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(25 23) rotate(180)"
          x="8.75"
          y="6.75"
        />
      </g>
    </svg>
  );
}
