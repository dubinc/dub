import { SVGProps } from "react";

export function Webhook(props: SVGProps<SVGSVGElement>) {
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
          d="M3.804,13.278l3.721-6.444c-.91-.515-1.524-1.492-1.524-2.613,0-1.657,1.343-3,3-3s3,1.343,3,3c0,.08-.003,.159-.009,.237"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M14.246,13.25H6.805c.009,1.046-.53,2.065-1.5,2.626-1.435,.828-3.27,.337-4.098-1.098s-.337-3.27,1.098-4.098c.069-.04,.139-.077,.21-.11"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M9,4.222l3.72,6.444c.901-.531,2.054-.574,3.025-.014,1.435,.828,1.927,2.663,1.098,4.098s-2.663,1.927-4.098,1.098c-.069-.04-.136-.082-.2-.126"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          cx="3.804"
          cy="13.278"
          fill="currentColor"
          r="1.25"
          stroke="none"
        />
        <circle cx="9" cy="4.222" fill="currentColor" r="1.25" stroke="none" />
        <circle
          cx="14.248"
          cy="13.252"
          fill="currentColor"
          r="1.25"
          stroke="none"
        />
      </g>
    </svg>
  );
}
