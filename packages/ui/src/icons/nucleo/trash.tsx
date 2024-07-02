import { SVGProps } from "react";

export function Trash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="currentColor">
        <path
          d="m13.474,7.25l-.374,7.105c-.056,1.062-.934,1.895-1.997,1.895h-4.205c-1.064,0-1.941-.833-1.997-1.895l-.374-7.105"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="m6.75,4.75v-2c0-.552.448-1,1-1h2.5c.552,0,1,.448,1,1v2"
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
          x1="2.75"
          x2="15.25"
          y1="4.75"
          y2="4.75"
        />
      </g>
    </svg>
  );
}
