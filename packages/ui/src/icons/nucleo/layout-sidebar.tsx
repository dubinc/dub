import { SVGProps } from "react";

export function LayoutSidebar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 12H21"
        stroke="#2C3345"
        stroke-width="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 18H21"
        stroke="#2C3345"
        stroke-width="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 6H21"
        stroke="#2C3345"
        stroke-width="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    // <svg
    //   height="18"
    //   width="18"
    //   viewBox="0 0 18 18"
    //   xmlns="http://www.w3.org/2000/svg"
    //   {...props}
    // >
    //   <g fill="currentColor">
    //     <path
    //       d="M4,2.75H14.25c1.105,0,2,.895,2,2V13.25c0,1.105-.895,2-2,2H4"
    //       fill="none"
    //       stroke="currentColor"
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //       strokeWidth="1.5"
    //     />
    //     <rect
    //       height="12.5"
    //       width="4.5"
    //       fill="none"
    //       rx="2"
    //       ry="2"
    //       stroke="currentColor"
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //       strokeWidth="1.5"
    //       x="1.75"
    //       y="2.75"
    //     />
    //   </g>
    // </svg>
  );
}
