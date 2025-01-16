import { SVGProps, useId } from "react";

export function Supabase(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="41"
      height="40"
      fill="none"
      viewBox="0 0 41 40"
      {...props}
    >
      <path
        fill={`url(#${id}-a)`}
        d="M23.028 37.723c-.939 1.18-2.842.534-2.864-.973l-.331-22.031h14.843c2.688 0 4.188 3.099 2.516 5.2z"
      ></path>
      <path
        fill={`url(#${id}-b)`}
        fillOpacity="0.2"
        d="M23.028 37.723c-.939 1.18-2.842.534-2.864-.973l-.331-22.031h14.843c2.688 0 4.188 3.099 2.516 5.2z"
      ></path>
      <path
        fill="#3ECF8E"
        d="M16.991 2.277c.939-1.18 2.842-.533 2.864.973L20 25.282H5.343c-2.688 0-4.188-3.1-2.516-5.2z"
      ></path>
      <defs>
        <linearGradient
          id={`${id}-a`}
          x1="19.833"
          x2="33.017"
          y1="19.604"
          y2="25.144"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#249361"></stop>
          <stop offset="1" stopColor="#3ECF8E"></stop>
        </linearGradient>
        <linearGradient
          id={`${id}-b`}
          x1="13.985"
          x2="19.983"
          y1="11.611"
          y2="22.924"
          gradientUnits="userSpaceOnUse"
        >
          <stop></stop>
          <stop offset="1" stopOpacity="0"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
