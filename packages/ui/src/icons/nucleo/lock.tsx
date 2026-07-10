import { SVGProps } from "react";

export function Lock({
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
              d="M12.25,9c-.414,0-.75-.336-.75-.75v-3.25c0-1.378-1.122-2.5-2.5-2.5s-2.5,1.122-2.5,2.5v3.25c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75v-3.25c0-2.206,1.794-4,4-4s4,1.794,4,4v3.25c0,.414-.336,.75-.75,.75Z"
              fill="currentColor"
            />
            <path
              d="M12.75,7.5H5.25c-1.517,0-2.75,1.233-2.75,2.75v4c0,1.517,1.233,2.75,2.75,2.75h7.5c1.517,0,2.75-1.233,2.75-2.75v-4c0-1.517-1.233-2.75-2.75-2.75Zm-3,5.25c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75v-1c0-.414,.336-.75,.75-.75s.75,.336,.75,.75v1Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <path
              d="M5.75,8.25v-3.25c0-1.795,1.455-3.25,3.25-3.25h0c1.795,0,3.25,1.455,3.25,3.25v3.25"
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
              y1="11.75"
              y2="12.75"
            />
            <rect
              height="8"
              width="11.5"
              fill="none"
              rx="2"
              ry="2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x="3.25"
              y="8.25"
            />
          </>
        )}
      </g>
    </svg>
  );
}
