import { cn } from "@dub/utils";

export function GoogleEnhanced({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-full w-full", className)}
      viewBox="0 0 222 222"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="111" cy="111" r="111" fill="url(#paint0_radial_8328_50)" />
      <path
        d="M182.248 111.875C182.248 105.853 181.76 101.458 180.702 96.9003H111.931V124.083H152.298C151.484 130.838 147.089 141.011 137.323 147.848L137.186 148.758L158.93 165.603L160.437 165.753C174.272 152.975 182.248 134.175 182.248 111.875Z"
        fill="url(#paint1_linear_8328_50)"
      />
      <path
        d="M111.931 183.495C131.707 183.495 148.31 176.984 160.437 165.753L137.323 147.848C131.138 152.161 122.836 155.172 111.931 155.172C92.561 155.172 76.1211 142.395 70.2607 124.734L69.4017 124.807L46.7918 142.305L46.4961 143.127C58.5411 167.055 83.2826 183.495 111.931 183.495Z"
        fill="url(#paint2_linear_8328_50)"
      />
      <path
        d="M70.2607 124.734C68.7144 120.177 67.8195 115.293 67.8195 110.248C67.8195 105.201 68.7144 100.318 70.1794 95.7607L70.1384 94.7901L47.2451 77.0109L46.4961 77.3672C41.5318 87.2964 38.6832 98.4466 38.6832 110.248C38.6832 122.048 41.5318 133.198 46.4961 143.127L70.2607 124.734Z"
        fill="url(#paint3_linear_8328_50)"
      />
      <path
        d="M111.931 65.3222C125.685 65.3222 134.963 71.2633 140.253 76.2282L160.925 56.0444C148.229 44.2434 131.707 37 111.931 37C83.2826 37 58.5411 53.4399 46.4961 77.3672L70.1794 95.7607C76.1211 78.1 92.561 65.3222 111.931 65.3222Z"
        fill="url(#paint4_linear_8328_50)"
      />
      <defs>
        <radialGradient
          id="paint0_radial_8328_50"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(-26 -7.31473e-06) rotate(38.1183) scale(289.169)"
        >
          <stop stop-color="white" />
          <stop offset="0.5" stop-color="white" />
          <stop offset="1" stop-color="#ECECEC" />
        </radialGradient>
        <linearGradient
          id="paint1_linear_8328_50"
          x1="176.5"
          y1="148.5"
          x2="112"
          y2="97"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#4285F4" />
          <stop offset="1" stop-color="#76A7F9" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_8328_50"
          x1="38.5"
          y1="164.5"
          x2="110.5"
          y2="154"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#8DFBAA" />
          <stop offset="1" stop-color="#34A853" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_8328_50"
          x1="66.5"
          y1="119"
          x2="36"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FBBC05" />
          <stop offset="1" stop-color="#FFE28F" />
        </linearGradient>
        <linearGradient
          id="paint4_linear_8328_50"
          x1="92.5"
          y1="66"
          x2="78"
          y2="45.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#EB4335" />
          <stop offset="1" stop-color="#FF968D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
