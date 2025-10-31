import { SVGProps } from "react";

export function MediaPlay(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.1619 2.55825L13.5992 7.23025C14.2081 7.56714 14.2081 8.43292 13.5992 8.7698L5.1619 13.4418C4.56723 13.7716 3.83301 13.3458 3.83301 12.672V3.32803C3.83301 2.65425 4.56634 2.22847 5.1619 2.55825Z"
        stroke="#171717"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
