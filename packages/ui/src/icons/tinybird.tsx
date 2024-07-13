import { SVGProps } from "react";

export function Tinybird(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 26"
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        d="M25 2.64 17.195.5 14.45 6.635 25 2.64Zm-7.465 15.13-7.145-2.555L6.195 25.5l11.34-7.73Z"
        opacity={0.6}
      />
      <path
        fill="currentColor"
        d="m0 11.495 17.535 6.275L20.41 4.36 0 11.495Z"
      />
    </svg>
  );
}
