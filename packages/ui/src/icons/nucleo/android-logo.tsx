import { SVGProps } from "react";

export function AndroidLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="24"
      width="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        fill="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      >
        <path
          d="M20.5 3.5L18.5 7L18.722 6.61155"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M3.5 3.5L5.50001 7L5.27804 6.61155"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M2 19L22 19L22 15C22 9.47715 17.5228 5 12 5C6.47715 5 2 9.47715 2 15L2 19Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M7.25 15.25C7.94036 15.25 8.5 14.6904 8.5 14C8.5 13.3096 7.94036 12.75 7.25 12.75C6.55964 12.75 6 13.3096 6 14C6 14.6904 6.55964 15.25 7.25 15.25Z"
          fill="currentColor"
          stroke="none"
        />
        <path
          d="M16.75 15.25C17.4404 15.25 18 14.6904 18 14C18 13.3096 17.4404 12.75 16.75 12.75C16.0596 12.75 15.5 13.3096 15.5 14C15.5 14.6904 16.0596 15.25 16.75 15.25Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  );
}
