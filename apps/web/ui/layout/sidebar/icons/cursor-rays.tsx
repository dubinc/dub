import { cn } from "@dub/utils";
import { SVGProps, useEffect, useRef } from "react";

export function CursorRays({
  isActive,
  className,
  ...rest
}: { isActive?: boolean } & SVGProps<SVGSVGElement>) {
  const cursorRef = useRef<SVGGElement>(null);
  const raysRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!raysRef.current || !cursorRef.current) return;

    if (isActive) {
      raysRef.current.animate(
        [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(1.15)", opacity: 1 },
          { transform: "scale(1.3)", opacity: 0 },
          { transform: "scale(1)", opacity: 0 },
          { transform: "scale(1)", opacity: 1 },
        ],
        {
          duration: 500,
        },
      );

      cursorRef.current.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: "translate(1px, 1px)" },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 500,
        },
      );
    }
  }, [isActive]);

  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("overflow-visible", className)}
      {...rest}
    >
      <g fill="currentColor">
        <g ref={cursorRef}>
          <path
            d="M8.095,7.778l7.314,2.51c.222,.076,.226,.388,.007,.47l-3.279,1.233c-.067,.025-.121,.079-.146,.146l-1.233,3.279c-.083,.219-.394,.215-.47-.007l-2.51-7.314c-.068-.197,.121-.385,.318-.318Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="12.031"
            x2="16.243"
            y1="12.031"
            y2="16.243"
          />
        </g>
        <g
          ref={raysRef}
          className="[transform-box:fill-box] [transform-origin:center] [&_*]:[vector-effect:non-scaling-stroke]"
        >
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="7.75"
            x2="7.75"
            y1="1.75"
            y2="3.75"
          />
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="11.993"
            x2="10.578"
            y1="3.507"
            y2="4.922"
          />
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="3.507"
            x2="4.922"
            y1="11.993"
            y2="10.578"
          />
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="1.75"
            x2="3.75"
            y1="7.75"
            y2="7.75"
          />
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="3.507"
            x2="4.922"
            y1="3.507"
            y2="4.922"
          />
        </g>
      </g>
    </svg>
  );
}
