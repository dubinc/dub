import { SVGProps } from "react";

export function Pyramid(props: SVGProps<SVGSVGElement>) {
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
          x1="9"
          x2="9"
          y1="1.751"
          y2="15.999"
        />
        <path
          d="M9.802,2.151l5.857,7.838c.327,.438,.239,1.057-.198,1.387l-5.857,4.422c-.357,.27-.851,.27-1.209,0L2.539,11.376c-.437-.33-.525-.949-.198-1.387L8.198,2.151c.4-.535,1.205-.535,1.605,0Z"
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
