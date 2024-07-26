import { SVGProps } from "react";

export function ArrowsOppositeDirectionY(props: SVGProps<SVGSVGElement>) {
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
          points="8.5 12.5 11.75 15.75 15 12.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          fill="none"
          points="3 5.5 6.25 2.25 9.5 5.5"
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
          x1="11.75"
          x2="11.75"
          y1="15.75"
          y2="7.75"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="6.25"
          x2="6.25"
          y1="2.25"
          y2="10.25"
        />
      </g>
    </svg>
  );
}
