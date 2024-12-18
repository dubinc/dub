import { SVGProps } from "react";

export function Venmo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <path
        fill="#008CFF"
        stroke="#008CFF"
        strokeWidth="0.64"
        d="M14.097.588c.54.887.783 1.802.783 2.958 0 3.686-3.158 8.472-5.72 11.833H3.306L.96 1.395 6.086.91l1.247 9.95C8.49 8.977 9.924 6.02 9.924 4.004c0-1.105-.19-1.855-.487-2.474z"
      ></path>
    </svg>
  );
}
