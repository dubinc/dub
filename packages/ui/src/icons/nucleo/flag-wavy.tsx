import { SVGProps } from "react";

export function FlagWavy(props: SVGProps<SVGSVGElement>) {
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
          d="M3.75,3.25h7.5c.552,0,1,.448,1,1v5H3.75"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M12.25,5.75h2c.552,0,1,.448,1,1v4c0,.552-.448,1-1,1h-3.5c-.552,0-1-.448-1-1v-1.5"
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
          x1="10.043"
          x2="12.25"
          y1="11.457"
          y2="9.25"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="3.75"
          x2="3.75"
          y1="1.75"
          y2="16.25"
        />
      </g>
    </svg>
  );
}
