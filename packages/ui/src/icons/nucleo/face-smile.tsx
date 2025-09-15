import { SVGProps } from "react";

export function FaceSmile(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <circle
          cx="9"
          cy="9"
          fill="none"
          r="7.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="7" cy="8" fill="currentColor" r="1" stroke="none" />
        <circle cx="11" cy="8" fill="currentColor" r="1" stroke="none" />
        <path
          d="M12.749,11c-.717,1.338-2.128,2.25-3.749,2.25s-3.033-.912-3.749-2.25"
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
