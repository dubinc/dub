import { SVGProps } from "react";

export function MoneyBill2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <circle
          cx="9"
          cy="9"
          fill="none"
          r="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M1.75,13.75V4.25c2.396,1.074,4.568,1.221,7.25,0s4.854-1.25,7.25,0V13.75c-2.396-1.25-4.568-1.221-7.25,0s-4.854,1.074-7.25,0Z"
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
