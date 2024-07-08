import { SVGProps } from "react";

export function PenWriting(props: SVGProps<SVGSVGElement>) {
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
          d="M2.75,15.25s3.599-.568,4.546-1.515,7.327-7.327,7.327-7.327c.837-.837,.837-2.194,0-3.03-.837-.837-2.194-.837-3.03,0,0,0-6.38,6.38-7.327,7.327-.947,.947-1.515,4.546-1.515,4.546h0Z"
          fill="none"
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
          x1="9"
          x2="15.25"
          y1="15.25"
          y2="15.25"
        />
      </g>
    </svg>
  );
}
