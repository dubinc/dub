import { SVGProps } from "react";

export function BetterAuth(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="41"
      height="40"
      fill="none"
      viewBox="0 0 40 40"
      {...props}
    >
      <rect x="5.52" y="9.68" width="6.96" height="20.72" fill="black" />
      <rect x="27.01" y="9.68" width="7.39" height="20.72" fill="black" />
      <rect
        x="34.18"
        y="9.68"
        width="6.68"
        height="13.96"
        transform="rotate(90 34.18 9.68)"
        fill="black"
      />
      <rect
        x="34.4"
        y="23.72"
        width="6.68"
        height="14.18"
        transform="rotate(90 34.4 23.72)"
        fill="black"
      />
      <rect
        x="20.22"
        y="16.36"
        width="7.37"
        height="7.74"
        transform="rotate(90 20.22 16.36)"
        fill="black"
      />
    </svg>
  );
}
