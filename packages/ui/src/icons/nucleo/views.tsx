import { SVGProps } from "react";

export function Views(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <rect
          height="10.5"
          width="13.5"
          fill="none"
          rx="2"
          ry="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x="2.25"
          y="2.75"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="4.75"
          x2="13.25"
          y1="16.25"
          y2="16.25"
        />
        <path
          d="M12.691,7.108c-.54-.694-1.736-1.858-3.691-1.858s-3.151,1.164-3.691,1.859c-.413,.533-.413,1.249,0,1.782,0,0,0,0,0,0,.54,.694,1.736,1.858,3.691,1.858s3.151-1.164,3.691-1.859c.413-.533,.413-1.249,0-1.783Zm-3.691,2.392c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5,.672,1.5,1.5-.672,1.5-1.5,1.5Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  );
}
