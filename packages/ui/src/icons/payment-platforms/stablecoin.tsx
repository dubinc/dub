import { cn } from "@dub/utils";

export function Stablecoin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 74 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
    >
      <g filter="url(#filter0_dii_46872_4505)">
        <circle cx={37} cy={35} r={35} fill="#155DFC" />
      </g>
      <path
        d="M46.5449 11.2051C55.9734 14.9909 62.6308 24.2182 62.6308 35.0001C62.6308 45.7819 55.9734 55.0091 46.545 58.7949M27.4541 11.2051C18.0256 14.9909 11.3682 24.2182 11.3682 35.0001C11.3682 45.7819 18.0255 55.0091 27.454 58.7949"
        stroke="white"
        strokeWidth={4.77273}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M43.1873 25.2782H34.7901C32.1057 25.2782 29.9297 27.4543 29.9297 30.1387C29.9297 32.823 32.1057 35.0005 34.7901 35.0005H39.2103C41.8947 35.0005 44.0707 37.1765 44.0707 39.8608C44.0707 42.5452 41.8947 44.7216 39.2103 44.7216H30.8132M37 21.7422V25.2782M37 48.2573V44.722"
        stroke="white"
        strokeWidth={4.77273}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <filter
          id="filter0_dii_46872_4505"
          x={0}
          y={-3}
          width={74}
          height={77}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={2} />
          <feGaussianBlur stdDeviation={1} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_46872_4505"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_46872_4505"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={-3} />
          <feGaussianBlur stdDeviation={5} />
          <feComposite in2="hardAlpha" operator="arithmetic" k2={-1} k3={1} />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect2_innerShadow_46872_4505"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={4} />
          <feGaussianBlur stdDeviation={3} />
          <feComposite in2="hardAlpha" operator="arithmetic" k2={-1} k3={1} />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="effect2_innerShadow_46872_4505"
            result="effect3_innerShadow_46872_4505"
          />
        </filter>
      </defs>
    </svg>
  );
}
