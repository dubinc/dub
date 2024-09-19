import { SVGProps } from "react";

export function CircleWarning(
  props: SVGProps<SVGSVGElement> & { invert?: boolean },
) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        {props.invert ? (
          <path
            d="M9,1.5C4.86,1.5,1.5,4.86,1.5,9s3.36,7.5,7.5,7.5,7.5-3.36,7.5-7.5S13.14,1.5,9,1.5Zm0,11.917c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Zm.75-4.348c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75V5.431c0-.414,.336-.75,.75-.75s.75,.336,.75,.75v3.638Z"
            fill="currentColor"
          />
        ) : (
          <>
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
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="9"
              x2="9"
              y1="5.431"
              y2="9.569"
            />
            <path
              d="M9,13.417c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z"
              fill="currentColor"
              stroke="none"
            />
          </>
        )}
      </g>
    </svg>
  );
}
