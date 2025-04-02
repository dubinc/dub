import { SVGProps } from "react";

export function FolderLock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="16"
      fill="none"
      viewBox="0 0 17 16"
      {...props}
    >
      <g clipPath="url(#clip0_714_1369)">
        <g
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        >
          <path d="M2.333 7.778V4.222c0-.982.796-1.778 1.778-1.778h1.734c.54 0 1.05.245 1.387.665l.536.669h4.788c.982 0 1.777.795 1.777 1.778v2.032"></path>
          <path d="M14.778 12.222h-3.556a.889.889 0 00-.889.89v1.332c0 .491.398.89.89.89h3.555c.49 0 .889-.399.889-.89v-1.333a.889.889 0 00-.89-.889z"></path>
          <path d="M14.315 7.588A1.772 1.772 0 0012.555 6H4.112c-.982 0-1.778.796-1.778 1.778v4c0 .981.796 1.778 1.778 1.778h4"></path>
          <path d="M11.667 12.222V10.89a1.334 1.334 0 012.666 0v1.333"></path>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_714_1369">
          <path
            fill="#fff"
            d="M0 0H16V16H0z"
            transform="translate(.333)"
          ></path>
        </clipPath>
      </defs>
    </svg>
  );
}
