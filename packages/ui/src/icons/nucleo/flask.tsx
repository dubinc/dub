import { SVGProps } from "react";

export function Flask(props: SVGProps<SVGSVGElement>) {
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
          x1="5.068"
          x2="12.932"
          y1="11.25"
          y2="11.25"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="5.75"
          x2="12.25"
          y1="1.75"
          y2="1.75"
        />
        <path
          d="M7.25,1.75V7l-3.628,7.065c-.513,.998,.212,2.185,1.334,2.185H13.044c1.122,0,1.847-1.187,1.334-2.185l-3.628-7.065V1.75"
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
