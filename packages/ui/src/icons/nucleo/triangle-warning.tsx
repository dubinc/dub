import { SVGProps } from "react";

export function TriangleWarning({
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
            d="M16.437,12.516L11.011,3.12c-.419-.727-1.171-1.161-2.011-1.161s-1.592,.434-2.011,1.161L1.563,12.516c-.42,.728-.42,1.596,0,2.323s1.172,1.161,2.011,1.161H14.425c.839,0,1.591-.434,2.011-1.161s.42-1.595,0-2.323ZM8.25,6.5c0-.414,.336-.75,.75-.75s.75,.336,.75,.75v3.5c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75V6.5ZM9,13.569c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z"
            fill="currentColor"
          />
        ) : (
          <>
            <path
              d="M7.638,3.495L2.213,12.891c-.605,1.048,.151,2.359,1.362,2.359H14.425c1.211,0,1.967-1.31,1.362-2.359L10.362,3.495c-.605-1.048-2.119-1.048-2.724,0Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M9,13.569c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z"
              fill="currentColor"
              stroke="none"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="9"
              x2="9"
              y1="6.5"
              y2="10"
            />
          </>
        )}
      </g>
    </svg>
  );
}
