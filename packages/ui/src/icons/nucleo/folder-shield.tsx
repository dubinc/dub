import { SVGProps } from "react";

export function FolderShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 18 18"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path d="M2.25 8.75V4.75C2.25 3.645 3.145 2.75 4.25 2.75H6.20099C6.80799 2.75 7.38099 3.02499 7.76099 3.49799L8.36401 4.25H13.75C14.855 4.25 15.75 5.145 15.75 6.25V8.56299"></path>
        <path d="M15.731 8.56299C15.636 7.54699 14.791 6.75 13.75 6.75H4.25C3.145 6.75 2.25 7.646 2.25 8.75V13.25C2.25 14.354 3.145 15.25 4.25 15.25H8.26221"></path>
        <path
          d="M14 10.75L11.25 12V14.94C11.25 16.48 14 17.25 14 17.25V10.75Z"
          fill="currentColor"
          stroke="none"
        ></path>
        <path d="M14 10.75L16.75 12V14.94C16.75 16.48 14 17.25 14 17.25C14 17.25 11.25 16.48 11.25 14.94V12L14 10.75Z"></path>
      </g>
    </svg>
  );
}
