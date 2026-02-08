import { SVGProps } from "react";

export function DubLinksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11"
      height="10"
      fill="none"
      viewBox="0 0 11 10"
      {...props}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.333"
        d="M5.5 5.667v-4M5.5 5.667l-3.333 2M5.5 5.667l3.333 2"
      />
    </svg>
  );
}
