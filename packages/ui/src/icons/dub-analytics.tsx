import { SVGProps } from "react";

export function DubAnalyticsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      fill="none"
      viewBox="0 0 10 10"
      {...props}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.333"
        d="M2.333 6.333v2M7.667 1.667v6.666"
      />
    </svg>
  );
}
