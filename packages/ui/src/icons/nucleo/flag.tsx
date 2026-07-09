import { SVGProps } from "react";

export function Flag({
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
              d="M14.598,2.575c-.247-.129-.545-.11-.776,.049-1,.695-1.928,.984-2.738,.859-.658-.101-1.109-.444-1.631-.841-.598-.455-1.274-.97-2.307-1.128-1.004-.155-2.06,.097-3.146,.705V10.48c.06-.022,.125-.025,.179-.062,.999-.695,1.923-.985,2.738-.859,.656,.101,1.106,.443,1.627,.839,.598,.455,1.276,.971,2.312,1.129,.201,.031,.404,.046,.61,.046,1.029,0,2.107-.388,3.213-1.156,.201-.14,.321-.37,.321-.616V3.24c0-.279-.155-.536-.402-.665Z"
              fill="currentColor"
            />
            <path
              d="M3.75,16.75c-.414,0-.75-.336-.75-.75V2c0-.414,.336-.75,.75-.75s.75,.336,.75,.75v14c0,.414-.336,.75-.75,.75Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <path
              d="M3.75,3.24c1.161-.808,2.256-1.142,3.281-.984,1.69,.259,2.245,1.709,3.938,1.969,1.013,.155,2.106-.167,3.281-.984v6.563c-1.175,.818-2.268,1.14-3.281,.984-1.692-.26-2.248-1.71-3.938-1.969-1.026-.157-2.12,.177-3.281,.984"
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
              x1="3.75"
              x2="3.75"
              y1="2"
              y2="16"
            />
          </>
        )}
      </g>
    </svg>
  );
}
