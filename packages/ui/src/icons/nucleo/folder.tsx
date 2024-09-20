import { SVGProps } from "react";

export function Folder(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      {...props}
    >
      <g>
        <g
          stroke="#374151"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        >
          <path d="M2 7.778V4.222c0-.982.796-1.778 1.778-1.778h1.734c.54 0 1.049.245 1.387.665l.536.669h4.787c.982 0 1.778.795 1.778 1.778v2.528"></path>
          <path d="M3.778 6h8.444C13.204 6 14 6.796 14 7.778v4c0 .982-.796 1.778-1.778 1.778H3.778A1.777 1.777 0 012 11.778v-4C2 6.796 2.796 6 3.778 6z"></path>
        </g>
      </g>
    </svg>
  );
}
