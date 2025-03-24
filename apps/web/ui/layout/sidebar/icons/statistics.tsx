import { SVGProps, useEffect, useRef } from "react";

export function StatisticsIcon({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (hovered) {
      ref.current.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(10deg)" },
          { transform: "rotate(-10deg)" },
          { transform: "rotate(0deg)" },
        ],
        {
          duration: 300,
        },
      );
    }
  }, [hovered]);

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      ref={ref}
      {...rest}
    >
      <g clip-path="url(#clip0_518_10430)">
        <path
          d="M0.714355 0.714233V19.2857H19.2858"
          stroke="#6E7275"
          stroke-width="1.46"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M4.99951 9.28564L8.57094 12.8571L14.2852 4.28564L19.2852 7.85707"
          stroke="#6E7275"
          stroke-width="1.46"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_518_10430">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
