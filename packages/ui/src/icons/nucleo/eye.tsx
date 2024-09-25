import { SVGProps } from "react";

export function Eye(props: SVGProps<SVGSVGElement>) {
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
          d="M2.088,10.132c-.45-.683-.45-1.582,0-2.265,1.018-1.543,3.262-4.118,6.912-4.118s5.895,2.574,6.912,4.118c.45,.683,.45,1.582,0,2.265-1.018,1.543-3.262,4.118-6.912,4.118s-5.895-2.574-6.912-4.118Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          cx="9"
          cy="9"
          fill="none"
          r="2.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
