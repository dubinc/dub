import { SVGProps } from "react";

export function Framer(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="28"
      height="40"
      viewBox="0 0 28 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clip-path="url(#clip0_18024_111660)">
        <path
          d="M0.667969 0H27.3346V13.3333H14.0013L0.667969 0ZM0.667969 13.3333H14.0013L27.3346 26.6667H14.0013V40L0.667969 26.6667V13.3333Z"
          fill="black"
        />
      </g>
      <defs>
        <clipPath id="clip0_18024_111660">
          <rect
            width="26.6667"
            height="40"
            fill="white"
            transform="translate(0.666992)"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
