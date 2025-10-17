import { SVGProps } from "react";

export function EnvelopeOpen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.36133 5.25012C1.36133 4.6839 1.66933 4.19156 2.16555 3.91778L6.62455 1.45767C6.85866 1.32856 7.14177 1.32856 7.37588 1.45767L11.8349 3.91778C12.3311 4.19156 12.6391 4.68312 12.6391 5.25012"
        stroke="#737373"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6391 5.25311V10.3056C12.6391 11.165 11.943 11.8611 11.0836 11.8611H2.91688C2.05744 11.8611 1.36133 11.165 1.36133 10.3056V5.25L6.66188 7.80889C6.87577 7.91233 7.12466 7.91233 7.33777 7.80889L12.6383 5.25L12.6391 5.25311Z"
        stroke="#737373"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
