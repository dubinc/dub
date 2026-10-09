import { SVGProps } from "react";

export function DropdownSelect(props: SVGProps<SVGSVGElement>) {
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
          d="M14.582 7.5H12.082C11.924 7.5 11.78 7.59 11.709 7.731C11.639 7.872 11.654 8.041 11.75 8.167L13 9.834C13.077 9.939 13.2 10 13.331 10C13.462 10 13.586 9.939 13.664 9.834L14.914 8.167C15.009 8.041 15.024 7.872 14.953 7.731C14.882 7.59 14.738 7.5 14.58 7.5H14.582Z"
          fill="currentColor"
        />
        <path
          d="M6.125 10.769L12.065 12.939C12.315 13.03 12.308 13.387 12.054 13.468L9.335 14.338L8.465 17.057C8.384 17.311 8.027 17.318 7.936 17.068L5.766 11.128C5.684 10.905 5.901 10.688 6.125 10.769Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M9.75 4.75V8.899"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M15.095 12.216C16.034 12.051 16.75 11.237 16.75 10.25V6.75C16.75 5.647 15.854 4.75 14.75 4.75H3.25C2.144 4.75 1.25 5.647 1.25 6.75V10.25C1.25 11.26 2 12.087 2.973 12.223"
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
