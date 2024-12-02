import { SVGProps } from "react";

export function ColorPalette2(props: SVGProps<SVGSVGElement>) {
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
          d="M6.591,14.591l6.541-6.541c.391-.391,.391-1.024,0-1.414l-1.768-1.768c-.391-.391-1.024-.391-1.414,0l-.2,.2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M5,15.25H14.25c.552,0,1-.448,1-1v-2.5c0-.552-.448-1-1-1h-.283"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M5,2.75h0c1.242,0,2.25,1.008,2.25,2.25V14.25c0,.552-.448,1-1,1H3.75c-.552,0-1-.448-1-1V5c0-1.242,1.008-2.25,2.25-2.25Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(10 18) rotate(180)"
        />
        <circle cx="5" cy="13" fill="currentColor" r=".75" stroke="none" />
      </g>
    </svg>
  );
}
