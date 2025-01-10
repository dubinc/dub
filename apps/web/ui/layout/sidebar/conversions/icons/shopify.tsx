import { SVGProps, useId } from "react";

export function Shopify(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="48"
      fill="none"
      viewBox="0 0 40 48"
      {...props}
    >
      <mask
        id={`${id}-mask`}
        width="40"
        height="46"
        x="0"
        y="1"
        maskUnits="userSpaceOnUse"
        style={{ maskType: "luminance" }}
      >
        <path fill="#fff" d="M0 1.203h40v45.62H0z"></path>
      </mask>
      <g mask={`url(#${id}-mask)`}>
        <path
          fill="#95BF46"
          d="M34.965 10.162a.44.44 0 0 0-.397-.368c-.165-.014-3.653-.273-3.653-.273l-2.69-2.671c-.265-.267-.785-.186-.987-.126-.03.008-.53.163-1.356.418-.81-2.329-2.238-4.469-4.75-4.469q-.105 0-.213.007c-.714-.945-1.6-1.356-2.364-1.356-5.854 0-8.651 7.318-9.528 11.037L4.93 13.63c-1.27.399-1.31.439-1.476 1.635-.126.906-3.448 26.598-3.448 26.598l25.887 4.85L39.92 43.68s-4.925-33.29-4.955-33.518M24.45 7.585l-2.19.678.002-.472c0-1.448-.201-2.613-.524-3.537 1.295.162 2.157 1.636 2.712 3.331m-4.318-3.044c.36.902.594 2.196.594 3.943 0 .09 0 .171-.002.254l-4.523 1.4c.87-3.361 2.503-4.985 3.931-5.597m-1.74-1.647c.253 0 .508.086.752.254-1.876.883-3.887 3.106-4.737 7.546l-3.576 1.108c.995-3.387 3.357-8.908 7.562-8.908"
        ></path>
        <path
          fill="#5E8E3E"
          d="M34.568 9.794c-.165-.014-3.654-.273-3.654-.273s-2.423-2.405-2.689-2.672a.66.66 0 0 0-.374-.171l-1.957 40.036 14.025-3.034s-4.924-33.29-4.955-33.518a.44.44 0 0 0-.396-.368"
        ></path>
        <path
          fill="#fff"
          d="m21.131 17.544-1.73 5.145s-1.515-.81-3.372-.81c-2.723 0-2.86 1.71-2.86 2.14 0 2.35 6.125 3.25 6.125 8.754 0 4.33-2.747 7.118-6.45 7.118-4.444 0-6.716-2.765-6.716-2.765l1.19-3.931S9.654 35.2 11.625 35.2c1.288 0 1.812-1.014 1.812-1.755 0-3.065-5.025-3.202-5.025-8.238 0-4.239 3.042-8.341 9.184-8.341 2.366 0 3.535.678 3.535.678"
        ></path>
      </g>
    </svg>
  );
}