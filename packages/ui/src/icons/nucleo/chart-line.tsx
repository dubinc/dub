import { SVGProps } from "react";

export function ChartLine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" {...props}>
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path d="M2.75 10.75L6.396 7.10401C6.591 6.90901 6.908 6.90901 7.103 7.10401L10.396 10.397C10.591 10.592 10.908 10.592 11.103 10.397L15.249 6.25101"></path>{" "}
        <path d="M2.75 2.75V12.75C2.75 13.855 3.645 14.75 4.75 14.75H15.25"></path>
      </g>
    </svg>
  );
}
