"use client";

import { BlurImage } from "@dub/ui";
import { useId } from "react";

export function HeroBackground({
  logo,
  color,
}: {
  logo?: string | null;
  color?: string | null;
}) {
  const id = useId();

  const backgroundColor = color || "#737373";

  return (
    <div className="absolute inset-0 -z-[1]" style={{ color: backgroundColor }}>
      <div className="absolute inset-0 -z-[1] bg-current opacity-10" />

      <div className="absolute right-4 top-4 block size-6 min-[300px]:size-10 md:hidden">
        <BlurImage
          src={logo || ""}
          alt="Program Logo"
          fill
          className="absolute object-cover object-center"
        />
      </div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="718"
        height="258"
        fill="none"
        viewBox="0 0 718 258"
        className="absolute right-0 top-0 hidden h-full w-auto md:block"
      >
        <mask
          id={`${id}-grid-mask`}
          width="100%"
          height="100%"
          x="0"
          y="0"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "alpha" }}
        >
          <rect width="100%" height="100%" fill={`url(#${id}-c)`} />
        </mask>
        <rect
          fill={`url(#${id}-grid)`}
          mask={`url(#${id}-grid-mask)`}
          width="100%"
          height="100%"
        />
        <g clipPath={`url(#${id}-a)`}>
          <g filter={`url(#${id}-b)`} opacity="0.1">
            <circle
              cx="450"
              cy="450"
              r="450"
              fill="currentColor"
              opacity="0.5"
              transform="matrix(-1 0 0 1 1228 -445)"
            />
          </g>
          <g filter={`url(#${id}-d)`}>
            <path
              fill={`url(#${id}-e)`}
              d="M478 65c0-8.837 7.163-16 16-16h128c8.837 0 16 7.163 16 16v128c0 8.837-7.163 16-16 16H494c-8.837 0-16-7.163-16-16z"
            />
          </g>
          <path
            stroke="#000"
            strokeOpacity="0.06"
            strokeWidth="0.75"
            d="M478 65c0-8.837 7.163-16 16-16h128c8.837 0 16 7.163 16 16v128c0 8.837-7.163 16-16 16H494c-8.837 0-16-7.163-16-16z"
          />
          <g filter={`url(#${id}-f)`}>
            <rect
              width="80"
              height="80"
              x="518"
              y="87"
              fill={`url(#${id}-logo)`}
              rx="40"
            />
          </g>
          <mask
            id={`${id}-h`}
            width="319"
            height="319"
            x="398"
            y="-30"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "alpha" }}
          >
            <circle cx="557.5" cy="129.5" r="159.5" fill={`url(#${id}-g)`} />
          </mask>
          <g mask={`url(#${id}-h)`}>
            <g filter={`url(#${id}-i)`}>
              <rect
                width="40"
                height="40"
                x="418"
                y="29"
                fill={`url(#${id}-j)`}
                rx="8"
              />
              <rect
                width="40"
                height="40"
                x="418"
                y="29"
                stroke="#000"
                strokeOpacity="0.06"
                strokeWidth="0.75"
                rx="8"
              />
              <g
                stroke="#737373"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                opacity="0.2"
              >
                <path d="M438 51.222a2.222 2.222 0 1 0 0-4.444 2.222 2.222 0 0 0 0 4.444" />
                <path d="M429.944 54.278V43.722c2.663 1.194 5.076 1.357 8.056 0s5.393-1.389 8.056 0v10.556c-2.663-1.39-5.076-1.357-8.056 0s-5.393 1.193-8.056 0" />
              </g>
            </g>
            <g filter={`url(#${id}-k)`}>
              <rect
                width="40"
                height="40"
                x="658"
                y="189"
                fill={`url(#${id}-l)`}
                rx="8"
              />
              <rect
                width="40"
                height="40"
                x="658"
                y="189"
                stroke="#000"
                strokeOpacity="0.06"
                strokeWidth="0.75"
                rx="8"
              />
              <g
                stroke="#737373"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                opacity="0.2"
              >
                <path d="M678 209.917a2.445 2.445 0 1 0-.001-4.89 2.445 2.445 0 0 0 .001 4.89M673.265 216.639a4.89 4.89 0 0 1 4.735-3.667 4.89 4.89 0 0 1 4.735 3.667" />
                <path d="M685.639 208.389v5.805a2.444 2.444 0 0 1-2.445 2.445h-10.388a2.444 2.444 0 0 1-2.445-2.445v-10.388a2.444 2.444 0 0 1 2.445-2.445h5.805M685.028 198.917v6.111M688.083 201.972h-6.111" />
              </g>
            </g>
          </g>
        </g>
        <defs>
          <filter
            id={`${id}-b`}
            width="1140"
            height="1140"
            x="208"
            y="-565"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              result="effect1_foregroundBlur_21_5513"
              stdDeviation="60"
            />
          </filter>
          <filter
            id={`${id}-d`}
            width="160.75"
            height="160.75"
            x="477.625"
            y="48.625"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="6" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
            <feBlend in2="shape" result="effect1_innerShadow_21_5513" />
          </filter>
          <filter
            id={`${id}-f`}
            width="100"
            height="100"
            x="508"
            y="77"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="5" />
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend
              in2="BackgroundImageFix"
              result="effect1_dropShadow_21_5513"
            />
            <feBlend
              in="SourceGraphic"
              in2="effect1_dropShadow_21_5513"
              result="shape"
            />
          </filter>
          <filter
            id={`${id}-i`}
            width="40.75"
            height="40.75"
            x="417.625"
            y="28.625"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="6" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
            <feBlend in2="shape" result="effect1_innerShadow_21_5513" />
          </filter>
          <filter
            id={`${id}-k`}
            width="40.75"
            height="40.75"
            x="657.625"
            y="188.625"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="6" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
            <feBlend in2="shape" result="effect1_innerShadow_21_5513" />
          </filter>
          <linearGradient id={`${id}-c`} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="1" />
          </linearGradient>
          <linearGradient
            id={`${id}-e`}
            x1="558"
            x2="558"
            y1="209"
            y2="49"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" stopOpacity="0.23" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient
            id={`${id}-j`}
            x1="438"
            x2="438"
            y1="69"
            y2="29"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" stopOpacity="0.23" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient
            id={`${id}-l`}
            x1="678"
            x2="678"
            y1="229"
            y2="189"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" stopOpacity="0.23" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient
            id={`${id}-g`}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="rotate(90 214 343.5)scale(159.5)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.73" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-a`}>
            <path fill="#fff" d="M0 0h718v258H0z" />
          </clipPath>
          <pattern
            id={`${id}-grid`}
            x={-2.25}
            y={9}
            width={20}
            height={20}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 20 0 L 0 0 0 20`}
              fill="transparent"
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id={`${id}-logo`}
            patternContentUnits="objectBoundingBox"
            width="1"
            height="1"
          >
            <use xlinkHref={`#${id}-logo-image`} transform="scale(0.0025)" />
          </pattern>
          <image
            id={`${id}-logo-image`}
            width="400"
            height="400"
            xlinkHref={logo || ""}
          />
        </defs>
      </svg>
    </div>
  );
}
