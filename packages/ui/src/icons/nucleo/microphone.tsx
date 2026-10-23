import { SVGProps } from "react";

export function Microphone({
  variant = "outline",
  ...props
}: SVGProps<SVGSVGElement> & { variant?: "outline" | "fill" }) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        {variant === "fill" ? (
          <>
            <path
              d="M9,12c2.206,0,4-1.794,4-4v-3c0-2.206-1.794-4-4-4s-4,1.794-4,4v3c0,2.206,1.794,4,4,4Z"
              fill="currentColor"
            />
            <path
              d="M15.25,7.25c-.414,0-.75,.336-.75,.75,0,3.033-2.467,5.5-5.5,5.5s-5.5-2.467-5.5-5.5c0-.414-.336-.75-.75-.75s-.75,.336-.75,.75c0,3.606,2.742,6.583,6.25,6.958v1.292c0,.414,.336,.75,.75,.75s.75-.336,.75-.75v-1.292c3.508-.376,6.25-3.352,6.25-6.958,0-.414-.336-.75-.75-.75Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <rect
              height="9.5"
              width="6.5"
              fill="none"
              rx="3.25"
              ry="3.25"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x="5.75"
              y="1.75"
            />
            <path
              d="M15.25,8c0,3.452-2.798,6.25-6.25,6.25h0c-3.452,0-6.25-2.798-6.25-6.25"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="9"
              x2="9"
              y1="14.25"
              y2="16.25"
            />
          </>
        )}
      </g>
    </svg>
  );
}
