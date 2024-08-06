import { SVGProps } from "react";

export function Robot(props: SVGProps<SVGSVGElement>) {
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
          d="M15.25 6.75V14.25C15.25 15.355 14.355 16.25 13.25 16.25H3.75C2.645 16.25 1.75 15.355 1.75 14.25V8.75C1.75 7.645 2.645 6.75 3.75 6.75H15.25Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M7.5,12h2c.276,0,.5,.224,.5,.5h0c0,.828-.672,1.5-1.5,1.5h0c-.828,0-1.5-.672-1.5-1.5h0c0-.276,.224-.5,.5-.5Z"
          fill="currentColor"
          stroke="none"
        />
        <circle cx="5.5" cy="11" fill="currentColor" r="1" stroke="none" />
        <circle cx="11.5" cy="11" fill="currentColor" r="1" stroke="none" />
        <circle cx="5.25" cy="2.5" fill="currentColor" r="1.5" stroke="none" />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="5.25"
          x2="5.25"
          y1="3.75"
          y2="6.75"
        />
      </g>
    </svg>
  );
}
