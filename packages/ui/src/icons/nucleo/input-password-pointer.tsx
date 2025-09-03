import { SVGProps } from "react";

export function InputPasswordPointer(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <circle cx="5" cy="9" fill="currentColor" r="1" stroke="none" />
        <circle cx="8.5" cy="9" fill="currentColor" r="1" stroke="none" />
        <path
          d="M15.75,9.795v-3.045c0-1.104-.895-2-2-2H3.25c-1.105,0-2,.896-2,2v4.5c0,1.104,.895,2,2,2h5.632"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.126,10.768l5.94,2.17c.25,.091,.243,.448-.011,.529l-2.719,.87-.87,2.719c-.081,.254-.438,.261-.529,.011l-2.17-5.94c-.082-.223,.135-.44,.359-.359Z"
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
