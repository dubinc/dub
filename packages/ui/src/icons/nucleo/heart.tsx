import { SVGProps } from "react";

export function Heart(props: SVGProps<SVGSVGElement>) {
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
          d="M8.529,15.222c.297,.155,.644,.155,.941,0,1.57-.819,6.529-3.787,6.529-8.613,.008-2.12-1.704-3.846-3.826-3.859-1.277,.016-2.464,.66-3.173,1.72-.71-1.06-1.897-1.704-3.173-1.72-2.123,.013-3.834,1.739-3.826,3.859,0,4.826,4.959,7.794,6.529,8.613Z"
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
