import { SVGProps } from "react";

export function CaretUp({
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
            d="M10.478,3.389c-.323-.509-.875-.812-1.478-.812s-1.155,.304-1.478,.812L2.497,11.313c-.341,.539-.362,1.222-.055,1.781s.895,.906,1.533,.906H14.024c.638,0,1.226-.347,1.533-.906s.287-1.242-.055-1.781L10.478,3.389Z"
            fill="currentColor"
          />
        ) : (
          <polyline
            fill="none"
            points="2.75 11.5 9 5.25 15.25 11.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        )}
      </g>
    </svg>
  );
}
