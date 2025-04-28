import { SVGProps } from "react";

export function DubPartnersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      fill="none"
      viewBox="0 0 32 32"
      {...props}
    >
      <circle cx="27" cy="16" r="5" fill="currentColor" />
      <circle cx="5" cy="16" r="5" fill="currentColor" />
      <circle cx="16" cy="27" r="5" fill="currentColor" />
      <circle cx="16" cy="5" r="5" fill="currentColor" />
    </svg>
  );
}
