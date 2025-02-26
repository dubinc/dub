import { SVGProps } from "react";

export function ChartArea2(props: SVGProps<SVGSVGElement>) {
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
          d="M14.25,14.25H3.75c-1.105,0-2-.895-2-2v-2.793c0-.133,.053-.26,.146-.354l2.809-2.809c.17-.17,.438-.195,.637-.058l3.36,2.31c.178,.122,.414,.117,.585-.014L15.448,3.859c.329-.25,.802-.015,.802,.398v7.993c0,1.105-.895,2-2,2Z"
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
