import { SVGProps } from "react";

export function CirclePlayFill(props: SVGProps<SVGSVGElement>) {
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
          d="M9,1C4.589,1,1,4.589,1,9s3.589,8,8,8,8-3.589,8-8S13.411,1,9,1Zm2.778,8.648l-3.65,2.129c-.118,.069-.248,.104-.378,.104-.128,0-.256-.034-.374-.101-.236-.135-.376-.378-.376-.65V6.871c0-.272,.141-.515,.376-.65,.236-.136,.517-.134,.751,.002l3.65,2.129c.233,.136,.373,.378,.373,.648s-.139,.512-.373,.648Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
