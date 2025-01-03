import { SVGProps } from "react";

export function Tags(props: SVGProps<SVGSVGElement>) {
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
          d="M1.75,4.25H7.336c.265,0,.52,.105,.707,.293l5.793,5.793c.781,.781,.781,2.047,0,2.828l-3.172,3.172c-.781,.781-2.047,.781-2.828,0L2.043,10.543c-.188-.188-.293-.442-.293-.707V4.25Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M3.25,1.75v-.5h5.586c.265,0,.52,.105,.707,.293l5.793,5.793c.432,.432,.625,1.012,.579,1.577"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          cx="5.25"
          cy="7.75"
          fill="currentColor"
          r="1.25"
          stroke="none"
        />
      </g>
    </svg>
  );
}
