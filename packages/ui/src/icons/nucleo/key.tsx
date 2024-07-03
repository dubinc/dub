import { SVGProps } from "react";

export function Key(props: SVGProps<SVGSVGElement>) {
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
          d="M15.747,2.076l-2.847,.177-5.891,5.891c-.324-.084-.658-.144-1.009-.144-2.209,0-4,1.791-4,4s1.791,4,4,4,4-1.791,4-4c0-.362-.064-.707-.154-1.041l1.904-1.959v-2.25h2.25l1.753-1.645-.006-3.029Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="5.5" cy="12.5" fill="currentColor" r="1" stroke="none" />
      </g>
    </svg>
  );
}
