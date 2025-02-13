import { SVGProps } from "react";

export function FolderBookmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <g clipPath="url(#clip0_430_4502)">
        <g
          stroke="#166534"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        >
          <path d="M2 7.778V4.222c0-.982.796-1.778 1.778-1.778h1.734c.54 0 1.049.245 1.387.665l.536.669h4.787c.982 0 1.778.795 1.778 1.778v1.777"></path>
          <path d="M13.937 7.333A1.773 1.773 0 0012.222 6H3.778C2.796 6 2 6.796 2 7.778v4c0 .981.796 1.778 1.778 1.778H9.11"></path>
          <path d="M15.333 15.333l-2-2-2 2v-4.889a.89.89 0 01.89-.888h2.221a.89.89 0 01.89.888v4.89z"></path>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_430_4502">
          <path fill="#fff" d="M0 0H16V16H0z"></path>
        </clipPath>
      </defs>
    </svg>
  );
}
