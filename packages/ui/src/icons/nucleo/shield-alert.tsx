import { SVGProps } from "react";

export function ShieldAlert(props: SVGProps<SVGSVGElement>) {
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
          d="M9.305,1.848l5.25,1.68c.414,.133,.695,.518,.695,.952v6.52c0,3.03-4.684,4.748-5.942,5.155-.203,.066-.413,.066-.616,0-1.258-.407-5.942-2.125-5.942-5.155V4.48c0-.435,.281-.82,.695-.952l5.25-1.68c.198-.063,.411-.063,.61,0Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M9,13c-.551,0-1-.449-1-1s.449-1,1-1,1,.449,1,1-.449,1-1,1Z"
          fill="currentColor"
          stroke="none"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="9"
          x2="9"
          y1="5.75"
          y2="9.25"
        />
      </g>
    </svg>
  );
}
