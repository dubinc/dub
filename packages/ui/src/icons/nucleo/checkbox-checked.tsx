import { SVGProps } from "react";

export function CheckboxChecked(props: SVGProps<SVGSVGElement>) {
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
          d="M5.75 9.25L8 11.75L12.25 6.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M13.25 2.75H4.75C3.646 2.75 2.75 3.646 2.75 4.75V13.25C2.75 14.356 3.646 15.25 4.75 15.25H13.25C14.356 15.25 15.25 14.356 15.25 13.25V4.75C15.25 3.646 14.356 2.75 13.25 2.75Z"
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
