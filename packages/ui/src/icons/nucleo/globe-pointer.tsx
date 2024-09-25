import { SVGProps } from "react";

export function GlobePointer(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="M9.926,16.11c-.461,.092-.938,.14-1.426,.14-4.004,0-7.25-3.246-7.25-7.25S4.496,1.75,8.5,1.75s7.25,3.246,7.25,7.25c0,.264-.014,.524-.041,.78"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.126,10.768l5.94,2.17c.25,.091,.243,.448-.011,.529l-2.719,.87-.87,2.719c-.081,.254-.438,.261-.529,.011l-2.17-5.94c-.082-.223,.135-.44,.359-.359Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M15.75,9c0-1.657-3.246-3-7.25-3S1.25,7.343,1.25,9c0,1.646,3.205,2.983,7.175,3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.486,8.293c-.147-3.672-1.428-6.543-2.986-6.543-1.657,0-3,3.246-3,7.25s1.343,7.25,3,7.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
