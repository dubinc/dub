import { cn } from "@dub/utils";

export function GoogleEnhanced({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-full w-full", className)}
      viewBox="0 0 222 222"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="111" cy="111" r="111" fill="url(#paint0_radial_8357_120)" />
      <path
        d="M182.248 111.875C182.248 105.853 181.76 101.458 180.702 96.9003H111.931V124.083H152.298C151.484 130.838 147.089 141.011 137.323 147.848L137.186 148.758L158.93 165.603L160.437 165.753C174.272 152.975 182.248 134.175 182.248 111.875Z"
        fill="url(#paint1_linear_8357_120)"
      />
      <path
        d="M111.931 183.495C131.707 183.495 148.31 176.984 160.437 165.753L137.323 147.848C131.138 152.161 122.836 155.172 111.931 155.172C92.561 155.172 76.1211 142.395 70.2607 124.734L69.4017 124.807L46.7918 142.305L46.4961 143.127C58.5411 167.055 83.2826 183.495 111.931 183.495Z"
        fill="url(#paint2_linear_8357_120)"
      />
      <path
        d="M70.2606 124.734C68.7143 120.177 67.8194 115.293 67.8194 110.248C67.8194 105.201 68.7143 100.318 70.1793 95.7607L70.1383 94.7901L47.245 77.0109L46.496 77.3672C41.5317 87.2964 38.6831 98.4466 38.6831 110.248C38.6831 122.048 41.5317 133.198 46.496 143.127L70.2606 124.734Z"
        fill="url(#paint3_linear_8357_120)"
      />
      <path
        d="M111.931 65.3222C125.685 65.3222 134.963 71.2633 140.253 76.2282L160.925 56.0444C148.229 44.2434 131.707 37 111.931 37C83.2826 37 58.5411 53.4399 46.4961 77.3672L70.1794 95.7607C76.1211 78.1 92.561 65.3222 111.931 65.3222Z"
        fill="url(#paint4_linear_8357_120)"
      />
      <defs>
        <radialGradient
          id="paint0_radial_8357_120"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(226.5 207.5) rotate(-140.591) scale(286.681)"
        >
          <stop stop-color="white" />
          <stop offset="0.5" stop-color="white" />
          <stop offset="1" stop-color="#E8E8E8" />
        </radialGradient>
        <linearGradient
          id="paint1_linear_8357_120"
          x1="176.5"
          y1="148.5"
          x2="112"
          y2="97"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#76A7F9" />
          <stop offset="1" stop-color="#4285F4" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_8357_120"
          x1="38.5"
          y1="164.5"
          x2="160"
          y2="175"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#34A853" />
          <stop offset="1" stop-color="#8DFBAA" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_8357_120"
          x1="81"
          y1="115"
          x2="35.9999"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FFE28F" />
          <stop offset="1" stop-color="#FBBC05" />
        </linearGradient>
        <linearGradient
          id="paint4_linear_8357_120"
          x1="117.5"
          y1="84"
          x2="78"
          y2="45.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FF968D" />
          <stop offset="1" stop-color="#EB4335" />
        </linearGradient>
      </defs>
    </svg>
  );
}
