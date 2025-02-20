import { useId } from "react";

import { cn } from "@dub/utils";
import { SVGProps } from "react";

export function DubCraftedShield(props: SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 15 15"
      {...props}
      className={cn(
        "overflow-visible drop-shadow-[0_1px_1px_#0004]",
        props.className,
      )}
    >
      <clipPath id={`${id}-b`}>
        <path d="M12.5601 2.05233L7.96637 0.573606C7.661 0.475025 7.33812 0.475905 7.03363 0.573606L2.439 2.05233C1.802 2.25741 1.375 2.84714 1.375 3.51961V9.25846C1.375 12.3462 5.70275 13.993 7.0275 14.4243C7.18238 14.4745 7.34075 14.5 7.5 14.5C7.65925 14.5 7.81675 14.4754 7.97075 14.4252C9.29725 13.9939 13.625 12.3471 13.625 9.25934V3.51961C13.625 2.84714 13.1971 2.25741 12.5601 2.05233Z" />
      </clipPath>
      <foreignObject width="15" height="15" clipPath={`url(#${id}-b)`}>
        <div
          //xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: "100%",
            height: "100%",
            background:
              "conic-gradient(from 133.51deg at 47.16% 50.83%,#cfa165 0deg,#94704c 18.69deg,#684d32 59.15deg,#c28e52 103.09deg,#b68451 134.47deg,#f6deae 209.24deg,#e2b87c 269.62deg,#956d4a 298.95deg,#ac7d53 327.51deg,#cfa165 360deg)",
          }}
        ></div>
      </foreignObject>
      <g filter={`url(#${id}-c)`}>
        <path
          d="M5.3125 7.35417L6.91667 8.8125L10.4167 5.3125"
          stroke="white"
          strokeWidth="1.45833"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <filter
          id={`${id}-c`}
          x="3.70831"
          y="4.14575"
          width="8.31253"
          height="6.7085"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="0.4375" />
          <feGaussianBlur stdDeviation="0.4375" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_10_100"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_10_100"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}
