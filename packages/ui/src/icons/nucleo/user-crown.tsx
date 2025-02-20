import { SVGProps } from "react";

export function UserCrown(props: SVGProps<SVGSVGElement>) {
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
          d="M5.25,5.75v.75c0,2.071,1.679,3.75,3.75,3.75s3.75-1.679,3.75-3.75v-.75"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M2.953,16c1.298-1.958,3.522-3.25,6.047-3.25s4.749,1.291,6.047,3.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M13,1l-1.341,1.174c-.377,.33-.94,.33-1.317,0l-1.341-1.174-1.341,1.174c-.377,.33-.94,.33-1.317,0l-1.341-1.174,.25,4.75c.754-.314,2.067-.75,3.75-.75,.817,0,2.196,.103,3.75,.75l.25-4.75Z"
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
