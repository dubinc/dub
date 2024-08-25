import { SVGProps } from "react";

export function CaretUpFill(props: SVGProps<SVGSVGElement>) {
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
          d="M10.478,3.389c-.323-.509-.875-.812-1.478-.812s-1.155,.304-1.478,.812L2.497,11.313c-.341,.539-.362,1.222-.055,1.781s.895,.906,1.533,.906H14.024c.638,0,1.226-.347,1.533-.906s.287-1.242-.055-1.781L10.478,3.389Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
