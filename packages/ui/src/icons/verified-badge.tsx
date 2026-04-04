import { SVGProps } from "react";

export function VerifiedBadge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#verifiedBadgeFilter)">
        <path
          d="M26.6745 7.91113L18.7995 5.37618C18.276 5.20719 17.7225 5.20869 17.2005 5.37618L9.324 7.91113C8.232 8.26271 7.5 9.27367 7.5 10.4265V20.2645C7.5 25.5577 14.919 28.3809 17.19 29.1202C17.4555 29.2062 17.727 29.25 18 29.25C18.273 29.25 18.543 29.2078 18.807 29.1217C21.081 28.3824 28.5 25.5592 28.5 20.266V10.4265C28.5 9.27367 27.7665 8.26271 26.6745 7.91113Z"
          fill="url(#verifiedBadgeGradient)"
        />
      </g>
      <defs>
        <linearGradient
          id="verifiedBadgeGradient"
          x1={7.5}
          y1={5.25}
          x2={30.3}
          y2={25.5}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#CFA165" />
          <stop offset="0.18" stopColor="#94704C" />
          <stop offset="0.32" stopColor="#684D32" />
          <stop offset="0.46" stopColor="#C28E52" />
          <stop offset="0.58" stopColor="#F6DEAE" />
          <stop offset="0.74" stopColor="#E2B87C" />
          <stop offset="0.9" stopColor="#956D4A" />
          <stop offset="1" stopColor="#AC7D53" />
        </linearGradient>
        <filter
          id="verifiedBadgeFilter"
          x={0}
          y={0}
          width={36}
          height={39}
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
          <feOffset dy={2.25} />
          <feGaussianBlur stdDeviation={3.75} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1DropShadow"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1DropShadow"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha2"
          />
          <feGaussianBlur stdDeviation={2.625} />
          <feComposite in2="hardAlpha2" operator="arithmetic" k2={-1} k3={1} />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0"
          />
          <feBlend mode="normal" in2="shape" result="effect2InnerShadow" />
        </filter>
      </defs>
    </svg>
  );
}
