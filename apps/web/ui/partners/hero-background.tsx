"use client";

import { BlurImage } from "@dub/ui";
import { cn } from "@dub/utils";
import { CSSProperties, useId } from "react";

const BG_INVERTED = "rgb(var(--bg-inverted))";

export function HeroBackground({
  logo,
  color,
  embed = false,
}: {
  logo?: string | null;
  color?: string | null;
  embed?: boolean;
}) {
  const id = useId();

  return (
    <div
      className="bg-bg-muted absolute inset-0 isolate -z-[1] overflow-hidden [container-type:size]"
      style={
        {
          color: color || "#737373",
          "--brand": color || "#737373",
          "--brand-dark": "oklch(from var(--brand) 0.38 min(c, 0.17) h)",
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 [mask-image:linear-gradient(90deg,transparent_40%,black)]">
        {color ? (
          <div className="absolute inset-0 bg-current opacity-10" />
        ) : (
          <RainbowGradient className="opacity-15" />
        )}
      </div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="718"
        height="258"
        fill="none"
        viewBox="0 0 718 258"
        className={cn(
          "pointer-events-none absolute right-0 top-0 hidden h-full w-auto",
          embed ? "md:block" : "lg:block",
        )}
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
          <g filter={`url(#${id}-d)`}>
            <path
              fill={`url(#${id}-e)`}
              className="dark:opacity-30"
              d="M478 65c0-8.837 7.163-16 16-16h128c8.837 0 16 7.163 16 16v128c0 8.837-7.163 16-16 16H494c-8.837 0-16-7.163-16-16z"
            />
          </g>
          <path
            stroke={BG_INVERTED}
            strokeOpacity="0.06"
            strokeWidth="0.75"
            d="M478 65c0-8.837 7.163-16 16-16h128c8.837 0 16 7.163 16 16v128c0 8.837-7.163 16-16 16H494c-8.837 0-16-7.163-16-16z"
          />
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
                stroke={BG_INVERTED}
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
                stroke={BG_INVERTED}
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
            <stop offset="0" stopColor={BG_INVERTED} stopOpacity="0" />
            <stop offset="1" stopColor={BG_INVERTED} stopOpacity="1" />
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
            <stop
              stopColor="#fff"
              className="[stop-opacity:0.23] dark:[stop-opacity:0.1]"
            />
            <stop
              offset="1"
              stopColor="#fff"
              className="[stop-opacity:0.3] dark:[stop-opacity:0.17]"
            />
          </linearGradient>
          <linearGradient
            id={`${id}-l`}
            x1="678"
            x2="678"
            y1="229"
            y2="189"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              stopColor="#fff"
              className="[stop-opacity:0.23] dark:[stop-opacity:0.1]"
            />
            <stop
              offset="1"
              stopColor="#fff"
              className="[stop-opacity:0.3] dark:[stop-opacity:0.17]"
            />
          </linearGradient>
          <radialGradient
            id={`${id}-g`}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="rotate(90 214 343.5) scale(159.5)"
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
              className="text-border-emphasis"
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={1}
            />
          </pattern>
        </defs>
      </svg>

      <div className="absolute inset-0 mix-blend-soft-light [mask-image:linear-gradient(90deg,transparent_40%,black)]">
        {color ? (
          <div className="absolute inset-0 bg-current" />
        ) : (
          <RainbowGradient className="dark:opacity-50" />
        )}
      </div>

      <div
        className={cn(
          "absolute right-4 top-4 block size-6 min-[300px]:size-8",

          // Position based on cqh to adjust for container height
          "",
          embed
            ? "md:right-[62cqh] md:top-1/2 md:size-[32cqh] md:-translate-y-1/2 md:translate-x-1/2"
            : "lg:right-[62cqh] lg:top-1/2 lg:size-[32cqh] lg:-translate-y-1/2 lg:translate-x-1/2",

          "drop-shadow-[0_0_15px_rgb(from_var(--brand-dark,#000)_r_g_b/0.4)]",
        )}
      >
        {logo && (
          <BlurImage
            src={logo}
            alt="Program Logo"
            fill
            className="absolute rounded-full border border-white/20 object-cover object-center"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}

function RainbowGradient({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 saturate-[1.5]", className)}>
      <div className="absolute right-[62cqh] top-1/2 aspect-square h-[200%] -translate-y-1/2 translate-x-1/2 rounded-full bg-[conic-gradient(from_-66deg_at_50%_50%,#855AFC_-32deg,#f00_63deg,#EAB308_158deg,#5CFF80_240deg,#855AFC_328deg,#f00_423deg)] blur-[50px]" />
    </div>
  );
}
