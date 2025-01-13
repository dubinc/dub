import { SVGProps } from "react";

export function Book2Small(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="12"
      width="12"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="m1.75,9.75h0c0,.828.672,1.5,1.5,1.5h7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="m1.75,9.75V2.25c0-.828.672-1.5,1.5-1.5h5.5c.828,0,1.5.672,1.5,1.5v6H3.25c-.828,0-1.5.672-1.5,1.5Z"
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
          x1="7.25"
          x2="4.75"
          y1="4.25"
          y2="4.25"
        />
      </g>
    </svg>
  );
}
