import { SVGProps } from "react";

export function Blog(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="currentColor">
        <path
          d="M14.25,12.25v2c0,1.105-.895,2-2,2H3.75c-1.105,0-2-.895-2-2V3.75c0-1.105,.895-2,2-2H12.25c1.105,0,2,.895,2,2v1.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M12.375,10.625c.444-.444,2.948-2.948,4.216-4.216,.483-.483,.478-1.261-.005-1.745h0c-.483-.483-1.261-.489-1.745-.005-1.268,1.268-3.772,3.772-4.216,4.216-.625,.625-1.125,2.875-1.125,2.875,0,0,2.25-.5,2.875-1.125Z"
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
          x1="4.75"
          x2="9.25"
          y1="5.75"
          y2="5.75"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="4.75"
          x2="7"
          y1="8.75"
          y2="8.75"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="4.75"
          x2="6.25"
          y1="11.75"
          y2="11.75"
        />
      </g>
    </svg>
  );
}
