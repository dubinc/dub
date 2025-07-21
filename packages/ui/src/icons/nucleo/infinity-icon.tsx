import { SVGProps } from "react";

export function InfinityIcon(props: SVGProps<SVGSVGElement>) {
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
          d="m7.2831,7.1659c-.8935-.8252-1.8429-1.4159-2.9331-1.4159-1.7122,0-3.1,1.4549-3.1,3.25s1.3878,3.25,3.1,3.25c3.6167,0,5.6833-6.5,9.3-6.5,1.7122,0,3.1,1.4549,3.1,3.25s-1.3878,3.25-3.1,3.25c-1.0903,0-2.0397-.5907-2.9332-1.416"
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
