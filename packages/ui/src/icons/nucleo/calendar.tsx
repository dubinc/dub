import { SVGProps } from "react";

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <line x1="5.75" y1="3.25" x2="5.75" y2="1.25" />
        <line x1="12.25" y1="3.25" x2="12.25" y2="1.25" />
        <rect x="2.25" y="3.25" width="13.5" height="12.5" rx="2" ry="2" />
        <line x1="2.25" y1="6.75" x2="15.75" y2="6.75" />
      </g>
    </svg>
  );
}
