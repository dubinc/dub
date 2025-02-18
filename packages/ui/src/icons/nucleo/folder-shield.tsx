import { SVGProps } from "react";

export function FolderShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="16"
      fill="none"
      viewBox="0 0 17 16"
      {...props}
    >
      <g clipPath="url(#clip0_563_3026)">
        <g
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        >
          <path d="M2.667 7.778V4.222c0-.982.795-1.778 1.777-1.778H6.18c.54 0 1.049.245 1.386.665l.536.669h4.788c.982 0 1.778.795 1.778 1.778v2.056"></path>
          <path d="M14.65 7.612A1.77 1.77 0 0012.889 6H4.444c-.982 0-1.777.796-1.777 1.778v4c0 .981.795 1.778 1.777 1.778h4.477"></path>
          <path d="M13.556 9.556L16 10.666v2.614c0 1.369-2.444 2.053-2.444 2.053s-2.445-.684-2.445-2.053v-2.613l2.444-1.111z"></path>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_563_3026">
          <path
            fill="#fff"
            d="M0 0H16V16H0z"
            transform="translate(.667)"
          ></path>
        </clipPath>
      </defs>
    </svg>
  );
}
