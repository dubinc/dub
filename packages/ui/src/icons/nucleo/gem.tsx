import { SVGProps } from "react";

export function Gem(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2.053"
          x2="15.951"
          y1="6.75"
          y2="6.75"
        />
        <polyline
          fill="none"
          points="7.88 3.25 6.057 6.75 8.765 15.723"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          fill="none"
          points="10.12 3.25 11.943 6.75 9.235 15.723"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M2.269,6.123l2.404-2.556c.191-.203,.458-.318,.738-.318h7.178c.28,0,.547,.115,.738,.318l2.404,2.556c.33,.351,.36,.885,.07,1.27l-5.993,7.956c-.403,.535-1.214,.535-1.616,0L2.199,7.393c-.29-.385-.26-.918,.07-1.27Z"
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
