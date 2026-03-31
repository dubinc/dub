import { SVGProps, useId } from "react";

export function AuthJs(props: SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="35"
      height="39"
      fill="none"
      viewBox="0 0 35 39"
      {...props}
    >
      <g clipPath={`url(#${id}-a)`}>
        <path
          fill={`url(#${id}-b)`}
          fillRule="evenodd"
          d="M33.941 5.553 4.926 27.6C1.363 21.148.13 13.364.037 8.696V5.838c0-.416.452-.658.677-.727A6523 6523 0 0 1 15.77.59a5.2 5.2 0 0 1 1.25-.208h.016c.174 0 .667.041 1.25.208.584.166 10.28 3.082 15.056 4.52.168.051.46.199.6.442"
          clipRule="evenodd"
        ></path>
        <path
          fill={`url(#${id}-c)`}
          fillRule="evenodd"
          d="M4.926 27.63 33.941 5.582a.57.57 0 0 1 .078.285v2.858c-.156 7.915-3.595 24.783-16.098 28.939-.173.07-.583.208-.833.208h-.12c-.25 0-.66-.139-.834-.208-5.127-1.705-8.73-5.547-11.208-10.034"
          clipRule="evenodd"
        ></path>
        <path
          fill={`url(#${id}-d)`}
          fillOpacity="0.21"
          d="M18.19.591a5.2 5.2 0 0 0-1.25-.208l-.052 37.534h.104c.25 0 .66-.139.834-.208C30.335 33.544 33.775 16.642 33.93 8.712V5.85c0-.416-.451-.66-.677-.729A6483 6483 0 0 0 18.19.591"
        ></path>
        <path
          fill="#E3E2FA"
          d="M17.08 26.62c4.29 0 7.766-3.45 7.766-7.704 0-4.256-3.477-7.705-7.766-7.705s-7.766 3.45-7.766 7.705 3.477 7.704 7.766 7.704"
        ></path>
        <path
          fill={`url(#${id}-e)`}
          fillRule="evenodd"
          d="M15.673 20.583c-.59.052-2.084-.209-2.814-.833-.784-.671-1.199-1.562-1.199-2.864 0-1.614 1.46-3.331 3.492-3.28 1.93.05 3.233 1.137 3.492 2.864.136.901-.002 1.334-.11 1.67l-.046.152c-.052.173-.125.552 0 .677s2.033 1.96 2.97 2.863c.088.104.262.364.262.572v.99c0 .156-.042.208-.209.208h-2.085c-.121-.018-.365-.135-.365-.469 0-.355-.038-.407-.113-.512q-.02-.026-.043-.06c-.104-.157-.313-.157-.521-.157q-.313 0-.47-.156c-.104-.104-.104-.26-.051-.468.052-.208 0-.417-.105-.469l-.057-.031c-.114-.065-.297-.169-.516-.125-.26.052-.625 0-.834-.208s-.47-.377-.678-.364m-1.407-3.957a.781.781 0 1 0 0-1.563.781.781 0 0 0 0 1.563"
          clipRule="evenodd"
        ></path>
      </g>
      <defs>
        <linearGradient
          id={`${id}-b`}
          x1="3.216"
          x2="15.866"
          y1="16.052"
          y2="2.815"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#45FFC8"></stop>
          <stop offset="1" stopColor="#1DBBF1"></stop>
        </linearGradient>
        <linearGradient
          id={`${id}-c`}
          x1="12.025"
          x2="27.758"
          y1="23.698"
          y2="31.366"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D14AE8"></stop>
          <stop offset="0.552" stopColor="#B628E3"></stop>
          <stop offset="1" stopColor="#8315FD"></stop>
        </linearGradient>
        <linearGradient
          id={`${id}-d`}
          x1="25.368"
          x2="25.368"
          y1="3.923"
          y2="30.004"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#20ABF5"></stop>
          <stop offset="0.398" stopColor="#2A8CC3"></stop>
          <stop offset="1" stopColor="#A104DC"></stop>
        </linearGradient>
        <linearGradient
          id={`${id}-e`}
          x1="14.683"
          x2="21.034"
          y1="16.522"
          y2="22.933"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FE5B01"></stop>
          <stop offset="1" stopColor="#FFB200"></stop>
        </linearGradient>
        <clipPath id={`${id}-a`}>
          <path fill="#fff" d="M.037.383h34.118V38.03H.037z"></path>
        </clipPath>
      </defs>
    </svg>
  );
}
