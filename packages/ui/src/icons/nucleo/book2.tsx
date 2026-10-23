import { SVGProps } from "react";

export function Book2({
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
              d="M15.923,13.069c.006-.013,.015-.023,.02-.036,.034-.083,.049-.169,.052-.258,0-.009,.005-.016,.005-.025V1.75c0-.414-.336-.75-.75-.75H4.75c-1.517,0-2.75,1.233-2.75,2.75V14.5c0,1.378,1.121,2.5,2.5,2.5H15.25c.286,0,.547-.163,.673-.419s.096-.562-.079-.789c-.522-.679-.434-2.013,.004-2.589,.032-.042,.053-.088,.075-.135ZM8.75,4.5h3.5c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75h-3.5c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75Zm0,3h3.5c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75h-3.5c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75ZM3.5,3.75c0-.689,.561-1.25,1.25-1.25h.25V12h-.5c-.356,0-.693,.077-1,.212V3.75ZM14.092,15.5H4.5c-.552,0-1-.449-1-1s.448-1,1-1H14.105c-.155,.629-.174,1.339-.014,2Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="5.75"
              x2="5.75"
              y1="1.75"
              y2="12.75"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="8.75"
              x2="12.25"
              y1="5.25"
              y2="5.25"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="8.75"
              x2="12.25"
              y1="8.25"
              y2="8.25"
            />
            <path
              d="M2.75,14.5V3.75c0-1.105,.895-2,2-2H15.25V12.75"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M5.25,16.25h-.75c-.966,0-1.75-.783-1.75-1.75s.784-1.75,1.75-1.75H15.25c-.641,.844-.734,2.547,0,3.5H5.25Z"
              fill="none"
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
