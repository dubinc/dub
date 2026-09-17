import { SVGProps } from "react";

export function DiscountCode(props: SVGProps<SVGSVGElement>) {
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
          d="M14.25,3.75h-10.5c-.966,0-1.75,.784-1.75,1.75v1.25c1.105,0,2,.895,2,2s-.895,2-2,2v1.25c0,.966,.784,1.75,1.75,1.75h10.5c.966,0,1.75-.784,1.75-1.75v-1.25c-1.105,0-2-.895-2-2s.895-2,2-2v-1.25c0-.966-.784-1.75-1.75-1.75Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="7" cy="7" fill="currentColor" r="1" stroke="none" />
        <circle cx="11" cy="11" fill="currentColor" r="1" stroke="none" />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="6.75"
          x2="11.25"
          y1="11.25"
          y2="6.75"
        />
      </g>
    </svg>
  );
}
