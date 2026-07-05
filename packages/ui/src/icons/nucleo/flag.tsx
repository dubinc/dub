import { SVGProps } from "react";

export function Flag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3.75,10.239c.783-.172,1.975-.337,3.375-.114,1.313,.209,1.823,.604,2.91,.784,.943,.156,2.349,.156,4.215-.67V3.25c-1.79,.962-3.136,1.009-4.031,.875-1.165-.174-1.681-.669-3.094-.938-1.393-.265-2.594-.106-3.375,.062"
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
        x1="3.75"
        x2="3.75"
        y1="1.75"
        y2="16.25"
      />
    </svg>
  );
}
