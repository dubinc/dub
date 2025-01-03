import { cn } from "@dub/utils";

export function Figma({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-full w-full", className)}
      viewBox="0 0 222 222"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="111" cy="111" r="111" fill="url(#paint0_radial_8328_50)" />
      <g clipPath="url(#clip0_8328_50)">
        <path
          d="M85.0053 196C99.3544 196 111 184.352 111 170V144H85.0053C70.6562 144 59.0105 155.648 59.0105 170C59.0105 184.352 70.6562 196 85.0053 196Z"
          fill="#0ACF83"
        />
        <path
          d="M59.0105 118C59.0105 103.648 70.6562 92 85.0053 92H111V144H85.0053C70.6562 144 59.0105 132.352 59.0105 118Z"
          fill="#A259FF"
        />
        <path
          d="M59.0103 66C59.0103 51.648 70.6559 40 85.0051 40H111V92H85.0051C70.6559 92 59.0103 80.352 59.0103 66Z"
          fill="#F24E1E"
        />
        <path
          d="M111 40H136.995C151.344 40 162.99 51.648 162.99 66C162.99 80.352 151.344 92 136.995 92H111V40Z"
          fill="#FF7262"
        />
        <path
          d="M162.99 118C162.99 132.352 151.344 144 136.995 144C122.646 144 111 132.352 111 118C111 103.648 122.646 92 136.995 92C151.344 92 162.99 103.648 162.99 118Z"
          fill="#1ABCFE"
        />
      </g>
      <defs>
        <radialGradient
          id="paint0_radial_8328_50"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(226.5 207.5) rotate(-140.591) scale(286.681)"
        >
          <stop stopColor="white" />
          <stop offset="0.5" stopColor="white" />
          <stop offset="1" stopColor="#E8E8E8" />
        </radialGradient>
        <clipPath id="clip0_8328_50">
          <rect
            width="104"
            height="156"
            fill="white"
            transform="translate(59 40)"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
