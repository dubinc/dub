import { SVGProps } from "react";

export function CrownSmall(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="14"
      fill="none"
      viewBox="0 0 13 14"
      {...props}
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.03"
        d="m9.748 9.402.396-4.275-1.91 1.933-1.73-3.146-1.73 3.146-2.18-1.933.667 4.275a.63.63 0 0 0 .617.512H9.13a.63.63 0 0 0 .619-.512"
      />
    </svg>
  );
}
