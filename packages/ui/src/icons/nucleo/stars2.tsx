import { SVGProps } from "react";

export function Stars2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="currentColor">
        <polyline
          fill="none"
          points="10.852 3.842 12.323 3.628 13.25 1.75 14.177 3.628 16.25 3.93 14.75 5.392 15.025 6.995"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          fill="none"
          points="7.148 3.842 5.677 3.628 4.75 1.75 3.823 3.628 1.75 3.93 3.25 5.392 2.975 6.995"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polygon
          fill="none"
          points="9 5.739 10.545 8.87 14 9.372 11.5 11.809 12.09 15.25 9 13.625 5.91 15.25 6.5 11.809 4 9.372 7.455 8.87 9 5.739"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
