import { SVGProps, useEffect, useRef } from "react";

export function PaymentsIcon({
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
      <path
        d="M15.9375 3.75H4.0625C2.85438 3.75 1.875 4.72938 1.875 5.9375V14.0625C1.875 15.2706 2.85438 16.25 4.0625 16.25H15.9375C17.1456 16.25 18.125 15.2706 18.125 14.0625V5.9375C18.125 4.72938 17.1456 3.75 15.9375 3.75Z"
        stroke="#6E7275"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M1.875 7.5H18.125M5 11.7188H6.875V12.5H5V11.7188Z"
        stroke="#6E7275"
        stroke-width="2.34375"
        stroke-linejoin="round"
      />
    </svg>
  );
}
