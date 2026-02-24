import { SVGProps } from "react";

export function SquareCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="16"
      width="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="M4.88867 8.00114C5.65578 8.77181 6.25489 9.66158 6.75534 10.634C7.91712 8.41981 9.36867 6.66425 11.1109 5.36914"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.7777 2.44531H4.22211C3.24027 2.44531 2.44434 3.24125 2.44434 4.22309V11.7786C2.44434 12.7605 3.24027 13.5564 4.22211 13.5564H11.7777C12.7595 13.5564 13.5554 12.7605 13.5554 11.7786V4.22309C13.5554 3.24125 12.7595 2.44531 11.7777 2.44531Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
