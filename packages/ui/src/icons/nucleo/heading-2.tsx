import { SVGProps } from "react";

export function Heading2(props: SVGProps<SVGSVGElement>) {
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
          x1="1.25"
          x2="1.25"
          y1="4.75"
          y2="13.25"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="7.25"
          x2="7.25"
          y1="4.75"
          y2="13.25"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="1.25"
          x2="7.25"
          y1="9"
          y2="9"
        />
        <path
          d="M10.5,6.931c.384-1.424,1.707-2.203,3.137-2.181,1.43,.022,2.774,.69,2.86,2.181s-1.43,2.492-2.998,3.16c-1.569,.668-2.87,1.291-2.998,3.16h6"
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
