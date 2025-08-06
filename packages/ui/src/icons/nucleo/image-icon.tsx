import { SVGProps } from "react";

export function ImageIcon(props: SVGProps<SVGSVGElement>) {
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
          d="M3.762,14.989l6.074-6.075c.781-.781,2.047-.781,2.828,0l2.586,2.586"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <rect
          height="12.5"
          width="12.5"
          fill="none"
          rx="2"
          ry="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x="2.75"
          y="2.75"
        />
        <circle
          cx="6.25"
          cy="7.25"
          fill="currentColor"
          r="1.25"
          stroke="none"
        />
      </g>
    </svg>
  );
}
