import { SVGProps } from "react";

export function EnvelopeAlert(props: SVGProps<SVGSVGElement>) {
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
          d="M1.75,5.75l6.767,3.733c.301,.166,.665,.166,.966,0l6.767-3.733"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M16.25,9.898V5.25c0-1.104-.895-2-2-2H3.75c-1.105,0-2,.896-2,2v7.5c0,1.104,.895,2,2,2h3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M15.5,16.75h.399c.795,0,1.272-.883,.836-1.548l-2.899-4.425c-.395-.603-1.278-.603-1.673,0l-2.899,4.425c-.436,.665,.041,1.548,.836,1.548h.399"
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
          x1="13"
          x2="13"
          y1="13.25"
          y2="15.25"
        />
        <circle cx="13" cy="17.25" fill="currentColor" r=".75" stroke="none" />
      </g>
    </svg>
  );
}
