import { SVGProps } from "react";

export function Brush(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="10.75"
          x2="10.75"
          y1="1.75"
          y2="5.25"
        />
        <path
          d="M3.75,8.75V3.75c0-1.105,.895-2,2-2H14.25v7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M3.75,8.75v1.5c0,1.104,.895,2,2,2h2l-.25,3.5c0,.828,.672,1.5,1.5,1.5s1.5-.672,1.5-1.5l-.25-3.5h2c1.105,0,2-.896,2-2v-1.5H3.75Z"
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
