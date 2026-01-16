import { SVGProps } from "react";

export function TextStrike(props: SVGProps<SVGSVGElement>) {
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
          x1="2.25"
          x2="15.75"
          y1="9"
          y2="9"
        />
        <path
          d="M6.75 3.75C6.75 2.92 7.42 2.25 8.25 2.25H10.5C11.88 2.25 13 3.37 13 4.75C13 5.16 12.91 5.56 12.75 5.92"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.25 14.25C11.25 15.08 10.58 15.75 9.75 15.75H7.5C6.12 15.75 5 14.63 5 13.25C5 12.84 5.09 12.44 5.25 12.08"
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
