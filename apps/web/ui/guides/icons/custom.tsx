import { SVGProps } from "react";

export function Custom(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="41"
      height="40"
      fill="none"
      viewBox="0 0 41 40"
      {...props}
    >
      <rect width="40" height="40" x="0.333" fill="#FED7AA" rx="20"></rect>
      <path
        stroke="#9A3412"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.728"
        d="M15.533 24.48 11.053 20l4.48-4.48M25.133 24.48l4.48-4.48-4.48-4.48M18.413 28l3.84-16"
      ></path>
    </svg>
  );
}
