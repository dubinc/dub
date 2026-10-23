import { SVGProps } from "react";

export function Toggle2({
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
          <path
            d="m11.5,3h-5C3.1914,3,.5,5.6914.5,9s2.6914,6,6,6h5c3.3086,0,6-2.6914,6-6s-2.6914-6-6-6Zm-5,9c-1.6543,0-3-1.3457-3-3s1.3457-3,3-3,3,1.3457,3,3-1.3457,3-3,3Z"
            fill="currentColor"
            strokeWidth="0"
          />
        ) : (
          <>
            <path
              d="m6.5,3.75h5c2.8995,0,5.25,2.3505,5.25,5.25h0c0,2.8995-2.3505,5.25-5.25,5.25h-5c-2.8995,0-5.25-2.3505-5.25-5.25h0c0-2.8995,2.3505-5.25,5.25-5.25Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <circle
              cx="6.5"
              cy="9"
              fill="currentColor"
              r="1.75"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </>
        )}
      </g>
    </svg>
  );
}
