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
      <g filter="url(#verifiedBadgeInnerShadow)">
        <g clipPath="url(#verifiedBadgeClipPath)" data-figma-skip-parse="true">
          <g transform="matrix(0.0135198 0.0146667 -0.0128333 0.0119706 15.2046 16.2667)">
            <foreignObject
              x={-1505.78}
              y={-1505.78}
              width={3011.57}
              height={3011.57}
            >
              <div
                style={{
                  background:
                    "conic-gradient(from 90deg, rgba(207, 161, 101, 1) 0deg, rgba(148, 112, 76, 1) 18.6875deg, rgba(104, 77, 50, 1) 59.1532deg, rgba(194, 142, 82, 1) 103.091deg, rgba(182, 132, 81, 1) 134.471deg, rgba(246, 222, 174, 1) 209.245deg, rgba(226, 184, 124, 1) 269.623deg, rgba(149, 109, 74, 1) 298.947deg, rgba(172, 125, 83, 1) 327.513deg, rgba(207, 161, 101, 1) 360deg)",
                  height: "100%",
                  width: "100%",
                  opacity: 1,
                }}
              />
            </foreignObject>
          </g>
        </g>
        <path d="M27.566 3.54818L17.066 0.168243C16.368 -0.0570859 15.63 -0.055074 14.934 0.168243L4.432 3.54818C2.976 4.01694 2 5.3649 2 6.90196V20.0193C2 27.077 11.892 30.8412 14.92 31.827C15.274 31.9417 15.636 32 16 32C16.364 32 16.724 31.9437 17.076 31.829C20.108 30.8432 30 27.079 30 20.0213V6.90196C30 5.3649 29.022 4.01694 27.566 3.54818Z" />
      </g>
      <path
        d="M15.2393 1.11914C15.7381 0.959123 16.2621 0.959777 16.7588 1.12012H16.7598L27.2598 4.5C28.2994 4.83479 29 5.79642 29 6.90234V20.0215C28.9999 23.042 26.8803 25.4861 24.1113 27.376C21.3747 29.2437 18.2479 30.3963 16.7666 30.8779C16.5152 30.9598 16.2594 31 16 31C15.7441 31 15.486 30.9593 15.2285 30.876H15.2295C13.75 30.3943 10.6247 29.2416 7.88867 27.374C5.1201 25.4842 3.00009 23.0401 3 20.0195V6.90234L3.00781 6.69629C3.08845 5.67749 3.76444 4.8136 4.73828 4.5L15.2402 1.12012L15.2393 1.11914Z"
        stroke="url(#verifiedBadgeStroke)"
        strokeWidth={2}
      />
      <g filter="url(#verifiedBadgeCheckShadow)">
        <path
          d="M21.4868 9.82015C22.1377 9.16932 23.193 9.16933 23.8439 9.82015C24.4947 10.471 24.4947 11.5264 23.8439 12.1773L15.8438 20.1773C15.2148 20.8063 14.2025 20.8304 13.5442 20.232L9.87761 16.8986C9.19653 16.2794 9.14627 15.2253 9.76544 14.5442C10.3846 13.8631 11.4387 13.813 12.1198 14.4322L14.6104 16.6964L21.4868 9.82015Z"
          fill="white"
        />
      </g>
      <defs>
        <filter
          id="verifiedBadgeInnerShadow"
          x={2}
          y={0}
          width={28}
          height={32}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation={3.5} />
          <feComposite in2="hardAlpha" operator="arithmetic" k2={-1} k3={1} />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0"
          />
          <feBlend mode="normal" in2="shape" result="effect1InnerShadow" />
        </filter>
        <clipPath id="verifiedBadgeClipPath">
          <path d="M27.566 3.54818L17.066 0.168243C16.368 -0.0570859 15.63 -0.055074 14.934 0.168243L4.432 3.54818C2.976 4.01694 2 5.3649 2 6.90196V20.0193C2 27.077 11.892 30.8412 14.92 31.827C15.274 31.9417 15.636 32 16 32C16.364 32 16.724 31.9437 17.076 31.829C20.108 30.8432 30 27.079 30 20.0213V6.90196C30 5.3649 29.022 4.01694 27.566 3.54818Z" />
        </clipPath>
        <filter
          id="verifiedBadgeCheckShadow"
          x={7.33203}
          y={8.33203}
          width={19}
          height={15.333}
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
          <feOffset dy={1} />
          <feGaussianBlur stdDeviation={1} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
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
        </filter>
        <linearGradient
          id="verifiedBadgeStroke"
          x1={16.5}
          y1={0}
          x2={16.5}
          y2={32}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E7D0A2" />
          <stop offset={1} stopColor="#E1BA6C" />
        </linearGradient>
      </defs>
    </svg>
  );
}
