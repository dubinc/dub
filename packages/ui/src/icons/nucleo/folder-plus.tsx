import { SVGProps } from "react";

export function FolderPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <g clipPath="url(#clip0_791_85)">
        <g
          stroke="#1F2937"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        >
          <path d="M2 7.778V4.222c0-.982.796-1.778 1.778-1.778h1.734c.54 0 1.049.245 1.387.665l.536.669h4.787c.982 0 1.778.795 1.778 1.777v2.528"></path>
          <path d="M13.111 10.889v4.444"></path>
          <path d="M14 8.854V7.778C14 6.796 13.204 6 12.222 6H3.778C2.796 6 2 6.796 2 7.778v4c0 .981.796 1.778 1.778 1.778H8.71"></path>
          <path d="M15.333 13.111H10.89"></path>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_791_85">
          <path fill="#fff" d="M0 0H16V16H0z"></path>
        </clipPath>
      </defs>
    </svg>
  );
}
