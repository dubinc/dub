import { SVGProps } from "react";

export function Filter2(props: SVGProps<SVGSVGElement>) {
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
          d="M10.5,16.25h-3v-7.25L3.106,5.3c-.226-.19-.356-.47-.356-.765v-1.785H15.25v1.785c0,.295-.13,.575-.356,.765l-4.394,3.7v7.25Z"
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
