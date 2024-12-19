import { cn, GOOGLE_FAVICON_URL } from "@dub/utils";
import { SVGProps, useId } from "react";

export function LinksGraphic(props: SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="336"
      height="336"
      fill="none"
      viewBox="0 0 336 336"
      {...props}
      className={cn(
        "pointer-events-none text-[var(--fg)] [--bg:white] [--fg:#222] [--grid:#e5e5e5] dark:[--bg:black] dark:[--fg:#fffa] dark:[--grid:#fff2]",
        props.className,
      )}
    >
      <g clipPath={`url(#${id}-a)`}>
        <path
          className="text-[var(--grid)]"
          stroke="currentColor"
          strokeWidth="0.5"
          d="M0 0h48v48H0zM48 0h48v48H48zM96 0h48v48H96zM144 0h48v48h-48zM192 0h48v48h-48zM240 0h48v48h-48zM288 0h48v48h-48zM0 48h48v48H0zM48 48h48v48H48zM96 48h48v48H96zM144 48h48v48h-48zM192 48h48v48h-48zM240 48h48v48h-48zM288 48h48v48h-48zM0 96h48v48H0zM48 96h48v48H48zM96 96h48v48H96zM144 96h48v48h-48zM192 96h48v48h-48zM240 96h48v48h-48zM288 96h48v48h-48zM0 144h48v48H0zM48 144h48v48H48zM96 144h48v48H96zM144 144h48v48h-48zM192 144h48v48h-48zM240 144h48v48h-48zM288 144h48v48h-48zM0 192h48v48H0zM48 192h48v48H48zM96 192h48v48H96zM144 192h48v48h-48zM192 192h48v48h-48zM240 192h48v48h-48zM288 192h48v48h-48zM0 240h48v48H0zM48 240h48v48H48zM96 240h48v48H96zM144 240h48v48h-48zM192 240h48v48h-48zM240 240h48v48h-48zM288 240h48v48h-48zM0 288h48v48H0zM48 288h48v48H48zM96 288h48v48H96zM144 288h48v48h-48zM192 288h48v48h-48zM240 288h48v48h-48zM288 288h48v48h-48z"
        />
        <circle cx="192" cy="144" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="192" cy="108" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="192" cy="108" r="2" fill="#EA580C" />
        <circle cx="192" cy="144" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-b)`} d="M192 144v-35" />
        <circle cx="192" cy="228" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="192" cy="192" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="192" cy="192" r="2" fill="#EA580C" />
        <circle cx="192" cy="228" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-c)`} d="M192 228v-35" />
        <circle cx="144" cy="144" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="144" cy="108" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="144" cy="108" r="2" fill="#EA580C" />
        <circle cx="144" cy="144" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-d)`} d="M144 144v-35" />
        <circle cx="144" cy="228" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="144" cy="192" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="144" cy="192" r="2" fill="#EA580C" />
        <circle cx="144" cy="228" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-e)`} d="M144 228v-35" />
        <circle cx="96" cy="144" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="96" cy="108" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="96" cy="108" r="2" fill="#EA580C" />
        <circle cx="96" cy="144" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-f)`} d="M96 144v-35" />
        <circle cx="96" cy="228" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="96" cy="192" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="96" cy="192" r="2" fill="#EA580C" />
        <circle cx="96" cy="228" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-g)`} d="M96 228v-35" />
        <circle cx="240" cy="144" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="240" cy="108" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="240" cy="108" r="2" fill="#EA580C" />
        <circle cx="240" cy="144" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-h)`} d="M240 144v-35" />
        <circle cx="240" cy="228" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="240" cy="192" r="4" fill="#EA580C" opacity="0.1" />
        <circle cx="240" cy="192" r="2" fill="#EA580C" />
        <circle cx="240" cy="228" r="2" fill="#EA580C" />
        <path stroke={`url(#${id}-i)`} d="M240 228v-35" />
        <circle cx="48" cy="168" r="4" fill="#EAB308" opacity="0.1" />
        <circle cx="48" cy="168" r="2" fill="#EAB308" />
        <path stroke={`url(#${id}-j)`} d="M13 168h34" />
        <circle
          cx="4"
          cy="4"
          r="4"
          fill="#EAB308"
          opacity="0.1"
          transform="matrix(-1 0 0 1 292 164)"
        />
        <circle
          cx="2"
          cy="2"
          r="2"
          fill="#EAB308"
          transform="matrix(-1 0 0 1 290 166)"
        />
        <path stroke={`url(#${id}-k)`} d="M323 168h-34" />
        <g>
          <rect
            width="24"
            height="24"
            x="228"
            y="84"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="228.5"
            y="84.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M240 92.222V96l2.889 2"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M240 89.555a6.444 6.444 0 0 1 0 12.889"
          />
          <path
            fill="currentColor"
            fillOpacity="0.5"
            d="M235.276 100.891a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M233.389 96.333a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M235.276 91.776a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M237.367 102.288a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M233.879 98.8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M233.879 93.868a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M237.368 90.38a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"
          />
        </g>
        <g>
          <rect
            width="24"
            height="24"
            x="228"
            y="228"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="228.5"
            y="228.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M238.889 243.778h-3.556a1.777 1.777 0 0 1-1.777-1.778v-4c0-.982.795-1.778 1.777-1.778h9.334c.982 0 1.777.796 1.777 1.778v.222"
          />
          <path
            fill="currentColor"
            fillOpacity="0.5"
            d="M236.889 240.889a.889.889 0 1 0 0-1.778.889.889 0 0 0 0 1.778M240 240.889a.889.889 0 1 0 0-1.778.889.889 0 0 0 0 1.778"
          />
          <path
            fill="currentColor"
            fillOpacity="0.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M246 242.889h-3.556a.89.89 0 0 0-.888.889v1.777c0 .491.398.889.888.889H246a.89.89 0 0 0 .889-.889v-1.777a.89.89 0 0 0-.889-.889"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M242.889 242.889v-1.778a1.333 1.333 0 0 1 2.667 0v1.778"
          />
        </g>
        <g>
          <rect
            width="24"
            height="24"
            x="180"
            y="84"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="180.5"
            y="84.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M188.667 90h-2a.666.666 0 0 0-.667.667v2c0 .368.298.666.667.666h2a.666.666 0 0 0 .666-.666v-2a.666.666 0 0 0-.666-.667M197.333 90h-2a.666.666 0 0 0-.666.667v2c0 .368.298.666.666.666h2a.667.667 0 0 0 .667-.666v-2a.667.667 0 0 0-.667-.667M188.667 98.667h-2a.666.666 0 0 0-.667.666v2c0 .368.298.667.667.667h2a.667.667 0 0 0 .666-.667v-2a.666.666 0 0 0-.666-.666M198 98.667h-2a1.333 1.333 0 0 0-1.333 1.333v2M198 102v.01M192 92.667v2A1.334 1.334 0 0 1 190.667 96h-2M186 96h.01M192 90h.01M192 98.667v.01M194.667 96h.666M198 96v.01M192 102v-.667"
          />
        </g>
        <g>
          <rect
            width="24"
            height="24"
            x="180"
            y="228"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="180.5"
            y="228.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M192 246.445a6.445 6.445 0 1 0-.002-12.89 6.445 6.445 0 0 0 .002 12.89M192 238.222v-2M193.778 240h2M192 241.778v2M190.222 240h-2"
          />
        </g>
        <g>
          <rect
            width="24"
            height="24"
            x="132"
            y="84"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="132.5"
            y="84.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M148.667 90h-9.334c-.736 0-1.333.597-1.333 1.333v9.334c0 .736.597 1.333 1.333 1.333h9.334c.736 0 1.333-.597 1.333-1.333v-9.334c0-.736-.597-1.333-1.333-1.333"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M142 95.333a1.333 1.333 0 1 0 0-2.666 1.333 1.333 0 0 0 0 2.666M150 98l-2.057-2.057a1.334 1.334 0 0 0-1.886 0L140 102"
          />
        </g>
        <g>
          <rect
            width="24"
            height="24"
            x="132"
            y="228"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="132.5"
            y="228.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M138.889 234h4.375c.471 0 .924.188 1.257.521l5.111 5.111c.694.694.694 1.82 0 2.514l-3.486 3.486a1.78 1.78 0 0 1-2.514 0l-5.111-5.111a1.78 1.78 0 0 1-.521-1.257v-4.375c0-.491.398-.889.889-.889"
          />
          <path
            fill="currentColor"
            fillOpacity="0.5"
            d="M141.556 238.667a1.112 1.112 0 1 0-.002-2.224 1.112 1.112 0 0 0 .002 2.224"
          />
        </g>
        <g>
          <rect
            width="24"
            height="24"
            x="84"
            y="84"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="84.5"
            y="84.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m96.889 93.778 2 2-2 2"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M98.889 95.778h-3.111c-.982 0-1.778.795-1.778 1.778V98"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m97.258 101.854 4.596-4.597a1.777 1.777 0 0 0 0-2.514l-4.596-4.597a1.78 1.78 0 0 0-2.514 0l-4.597 4.597a1.78 1.78 0 0 0 0 2.514l4.597 4.597c.694.694 1.82.694 2.514 0"
          />
        </g>
        <g>
          <rect
            width="24"
            height="24"
            x="84"
            y="228"
            fill="currentColor"
            className="text-[var(--bg)]"
            rx="8"
          />
          <rect
            width="23"
            height="23"
            x="84.5"
            y="228.5"
            stroke="currentColor"
            className="text-[var(--grid)]"
            rx="7.5"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M92.667 246.444a2.222 2.222 0 1 0 .001-4.443 2.222 2.222 0 0 0-.001 4.443M99.333 246.444a2.222 2.222 0 1 0 .002-4.443 2.222 2.222 0 0 0-.002 4.443M98.563 233.556h-5.126a.89.89 0 0 0-.88.763l-.335 2.348-2.666 2.666h12.888l-2.666-2.666-.335-2.348a.89.89 0 0 0-.88-.763M92.222 236.667h7.556"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M94.738 243.415a1.775 1.775 0 0 1 2.524 0"
          />
        </g>
        <g filter={`url(#${id}-t)`} opacity="0.16">
          <ellipse cx="62" cy="168" fill="#EAB308" rx="33" ry="8" />
        </g>
        <g filter={`url(#${id}-u)`} opacity="0.16">
          <ellipse cx="276" cy="168" fill="#EAB308" rx="33" ry="8" />
        </g>
        <rect
          width="240"
          height="48"
          x="48"
          y="144"
          fill="currentColor"
          className="text-[var(--bg)]"
          rx="8"
        />
        <rect
          width="240"
          height="48"
          x="48"
          y="144"
          stroke="currentColor"
          className="text-[var(--grid)]"
          strokeOpacity="0.5"
          strokeWidth="0.5"
          rx="8"
        />
        <g>
          <rect
            width="24"
            height="24"
            x="61"
            y="156"
            fill={`url(#${id}-w)`}
            rx="12"
          />
          <rect
            width="25"
            height="25"
            x="60.5"
            y="155.5"
            stroke="#030712"
            strokeOpacity="0.1"
            rx="12.5"
          />
          <circle cx="73" cy="168" r="6" fill={`url(#${id}-x)`} />
        </g>
        <text
          xmlSpace="preserve"
          fill="currentColor"
          className="text-[var(--fg)]"
          fontSize="12"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="97" y="165.364">
            d.to/try
          </tspan>
        </text>
        <path
          stroke="#A3A3A3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M104.931 176.792h-4.084a.78.78 0 0 1-.778-.778v-1.556"
        />
        <path
          stroke="#A3A3A3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m103.278 175.139 1.653 1.653-1.653 1.653"
        />
        <text
          xmlSpace="preserve"
          fill="#A3A3A3"
          fontSize="9"
          letterSpacing="-.02em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="110" y="179.773">
            app.dub.co/register
          </tspan>
        </text>
        <path
          className="text-[var(--fg)]"
          fill="currentColor"
          fillOpacity="0.04"
          d="M229.25 164.6c0-1.684 0-2.932.081-3.92.08-.985.24-1.69.546-2.29a5.75 5.75 0 0 1 2.513-2.513c.6-.306 1.305-.466 2.29-.546.988-.081 2.236-.081 3.92-.081h26.8c1.684 0 2.932 0 3.92.081.985.08 1.69.24 2.29.546a5.75 5.75 0 0 1 2.513 2.513c.306.6.466 1.305.546 2.29.081.988.081 2.236.081 3.92v6.8c0 1.684 0 2.932-.081 3.92-.08.985-.24 1.69-.546 2.29a5.75 5.75 0 0 1-2.513 2.513c-.6.306-1.305.466-2.29.546-.988.081-2.236.081-3.92.081h-26.8c-1.684 0-2.932 0-3.92-.081-.985-.08-1.69-.24-2.29-.546a5.75 5.75 0 0 1-2.513-2.513c-.306-.6-.466-1.305-.546-2.29-.081-.988-.081-2.236-.081-3.92z"
        />
        <path
          className="text-[var(--grid)]"
          stroke="currentColor"
          strokeWidth="0.5"
          d="M229.25 164.6c0-1.684 0-2.932.081-3.92.08-.985.24-1.69.546-2.29a5.75 5.75 0 0 1 2.513-2.513c.6-.306 1.305-.466 2.29-.546.988-.081 2.236-.081 3.92-.081h26.8c1.684 0 2.932 0 3.92.081.985.08 1.69.24 2.29.546a5.75 5.75 0 0 1 2.513 2.513c.306.6.466 1.305.546 2.29.081.988.081 2.236.081 3.92v6.8c0 1.684 0 2.932-.081 3.92-.08.985-.24 1.69-.546 2.29a5.75 5.75 0 0 1-2.513 2.513c-.6.306-1.305.466-2.29.546-.988.081-2.236.081-3.92.081h-26.8c-1.684 0-2.932 0-3.92-.081-.985-.08-1.69-.24-2.29-.546a5.75 5.75 0 0 1-2.513-2.513c-.306-.6-.466-1.305-.546-2.29-.081-.988-.081-2.236-.081-3.92z"
        />
        <g
          stroke="currentColor"
          strokeOpacity="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${id}-y)`}
        >
          <path d="m240.395 167.185 4.876 1.673c.148.051.15.259.004.313l-2.186.822a.17.17 0 0 0-.097.098l-.822 2.186a.166.166 0 0 1-.313-.005l-1.674-4.876a.167.167 0 0 1 .212-.212zM243.019 170.021l2.808 2.808M240.165 163.167v1.333M242.995 164.338l-.943.943M237.338 169.995l.943-.943M236.166 167.166h1.333M237.338 164.338l.943.943" />
        </g>
        <text
          xmlSpace="preserve"
          fill="currentColor"
          className="text-[var(--fg)]"
          fontSize="10"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="251" y="171.636">
            51K
          </tspan>
        </text>
      </g>
      <defs>
        <linearGradient
          id={`${id}-b`}
          x1="192.5"
          x2="192.5"
          y1="109"
          y2="144"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-c`}
          x1="192.5"
          x2="192.5"
          y1="193"
          y2="228"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-d`}
          x1="144.5"
          x2="144.5"
          y1="109"
          y2="144"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-e`}
          x1="144.5"
          x2="144.5"
          y1="193"
          y2="228"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-f`}
          x1="96.5"
          x2="96.5"
          y1="109"
          y2="144"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-g`}
          x1="96.5"
          x2="96.5"
          y1="193"
          y2="228"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-h`}
          x1="240.5"
          x2="240.5"
          y1="109"
          y2="144"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-i`}
          x1="240.5"
          x2="240.5"
          y1="193"
          y2="228"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EA580C" />
          <stop offset="0.625" stopColor="#EA580C" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={`${id}-j`}
          x1="13"
          x2="47"
          y1="168.5"
          y2="168.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EAB308" stopOpacity="0" />
          <stop offset="1" stopColor="#EAB308" />
        </linearGradient>
        <linearGradient
          id={`${id}-k`}
          x1="323"
          x2="289"
          y1="168.5"
          y2="168.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EAB308" stopOpacity="0" />
          <stop offset="1" stopColor="#EAB308" />
        </linearGradient>
        <linearGradient
          id={`${id}-w`}
          x1="73"
          x2="73"
          y1="156"
          y2="180"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#030712" stopOpacity="0" />
          <stop offset="1" stopColor="#030712" stopOpacity="0.05" />
        </linearGradient>
        <filter
          id={`${id}-t`}
          width="96"
          height="46"
          x="14"
          y="145"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_5_744"
            stdDeviation="7.5"
          />
        </filter>
        <filter
          id={`${id}-u`}
          width="96"
          height="46"
          x="228"
          y="145"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_5_744"
            stdDeviation="7.5"
          />
        </filter>
        <clipPath id={`${id}-a`}>
          <path
            fill="currentColor"
            className="text-[var(--bg)]"
            d="M0 0h336v336H0z"
          />
        </clipPath>
        <clipPath id={`${id}-y`}>
          <path
            fill="currentColor"
            className="text-[var(--bg)]"
            d="M235 162h12v12h-12z"
          />
        </clipPath>
        <pattern
          id={`${id}-x`}
          width="1"
          height="1"
          patternContentUnits="objectBoundingBox"
        >
          <use xlinkHref={`#${id}-z`} transform="scale(.01563)" />
        </pattern>
        <image
          href={`${GOOGLE_FAVICON_URL}dub.co`}
          id={`${id}-z`}
          width="64"
          height="64"
        />
      </defs>
    </svg>
  );
}
