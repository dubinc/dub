import { SVGProps } from "react";

export function TextBold(props: SVGProps<SVGSVGElement>) {
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
          d="M6.75 2.25H10C11.795 2.25 13.25 3.71 13.25 5.5C13.25 7.29 11.795 8.75 10 8.75H6.75"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M6.75 8.75H10.75C12.683 8.75 14.25 10.3199 14.25 12.25C14.25 14.1801 12.683 15.75 10.75 15.75H6.75"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M6.75 15.75H4.75C4.198 15.75 3.75 15.3 3.75 14.75V3.25C3.75 2.7 4.198 2.25 4.75 2.25H6.75V15.75Z"
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
