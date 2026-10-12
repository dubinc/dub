import { SVGProps } from "react";

export function LinkChain(props: SVGProps<SVGSVGElement>) {
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
          d="M8.368 6.893C8.065 7.054 7.781 7.262 7.527 7.517L7.517 7.527C6.136 8.908 6.136 11.146 7.517 12.527L9.692 14.702C11.073 16.083 13.311 16.083 14.692 14.702L14.702 14.692C16.083 13.311 16.083 11.073 14.702 9.692L13.939 8.929"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M9.632 11.106C9.934 10.946 10.218 10.738 10.473 10.483L10.483 10.473C11.864 9.092 11.864 6.854 10.483 5.473L8.308 3.298C6.927 1.917 4.689 1.917 3.308 3.298L3.298 3.308C1.917 4.689 1.917 6.927 3.298 8.308L4.06 9.07"
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
