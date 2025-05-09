import { SVGProps } from "react";

export function BracketsCurly(props: SVGProps<SVGSVGElement>) {
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
          d="M6.25,15.25h-1c-1.105,0-2-.895-2-2v-2.625c0-.897-.728-1.625-1.625-1.625,.897,0,1.625-.728,1.625-1.625v-2.625c0-1.105,.895-2,2-2h1"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.75,15.25h1c1.105,0,2-.895,2-2v-2.625c0-.897,.728-1.625,1.625-1.625-.897,0-1.625-.728-1.625-1.625v-2.625c0-1.105-.895-2-2-2h-1"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
