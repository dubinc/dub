import { SVGProps } from "react";

export function FlaskSmall(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="12"
      width="12"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="m4.25.75v5.25l-2.464,3.695c-.443.665.033,1.555.832,1.555h6.763c.799,0,1.275-.89.832-1.555l-2.464-3.695V.75"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="3.25"
          x2="8.75"
          y1=".75"
          y2=".75"
        />
      </g>
    </svg>
  );
}
