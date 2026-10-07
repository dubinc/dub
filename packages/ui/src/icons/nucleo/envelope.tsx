import { SVGProps } from "react";

export function Envelope({
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
              d="M8.88,8.827c.074,.042,.166,.042,.24,0l7.777-4.283c-.314-1.173-1.376-2.044-2.647-2.044H3.75c-1.267,0-2.326,.865-2.643,2.033l7.773,4.293Z"
              fill="currentColor"
            />
            <path
              d="M9.845,10.14c-.264,.146-.554,.219-.844,.219s-.582-.073-.846-.22L1,6.188v6.562c0,1.517,1.233,2.75,2.75,2.75H14.25c1.517,0,2.75-1.233,2.75-2.75V6.2l-7.155,3.94Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <path
              d="M1.75,5.75l6.767,3.733c.301,.166,.665,.166,.966,0l6.767-3.733"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <rect
              height="11.5"
              width="14.5"
              fill="none"
              rx="2"
              ry="2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              transform="translate(18 18) rotate(180)"
              x="1.75"
              y="3.25"
            />
          </>
        )}
      </g>
    </svg>
  );
}
