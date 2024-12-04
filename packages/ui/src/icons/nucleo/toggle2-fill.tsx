import { SVGProps } from "react";

export function Toggle2Fill(props: SVGProps<SVGSVGElement>) {
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
          d="m11.5,3h-5C3.1914,3,.5,5.6914.5,9s2.6914,6,6,6h5c3.3086,0,6-2.6914,6-6s-2.6914-6-6-6Zm-5,9c-1.6543,0-3-1.3457-3-3s1.3457-3,3-3,3,1.3457,3,3-1.3457,3-3,3Z"
          fill="currentColor"
          strokeWidth="0"
        />
      </g>
    </svg>
  );
}
