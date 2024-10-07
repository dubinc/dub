import { cn } from "@dub/utils";
import { SVGProps, useEffect, useRef } from "react";

const SCALES = [0.3, 1.5, 1.75, 0.75];

export function LinesY({
  isActive,
  className,
  ...rest
}: { isActive: boolean } & SVGProps<SVGSVGElement>) {
  const line1Ref = useRef<SVGLineElement>(null);
  const line2Ref = useRef<SVGLineElement>(null);
  const line3Ref = useRef<SVGLineElement>(null);
  const line4Ref = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (!isActive) return;

    [line1Ref, line2Ref, line3Ref, line4Ref].forEach((ref, idx) => {
      if (!ref.current) return;

      ref.current.animate(
        [
          { transform: "scaleY(1)" },
          { transform: `scaleY(${SCALES[idx]})` },
          { transform: "scaleY(1)" },
        ],
        {
          delay: idx * 50,
          duration: 400,
        },
      );
    });
  }, [isActive]);

  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "[&_line]:origin-bottom [&_line]:[transform-box:stroke-box]",
        className,
      )}
      {...rest}
    >
      <g fill="currentColor">
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2.75"
          x2="2.75"
          y1="2.75"
          y2="15.25"
          ref={line1Ref}
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="7"
          x2="7"
          y1="7.75"
          y2="15.25"
          ref={line2Ref}
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="11"
          x2="11"
          y1="11.75"
          y2="15.25"
          ref={line3Ref}
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="15.25"
          x2="15.25"
          y1="4.75"
          y2="15.25"
          ref={line4Ref}
        />
      </g>
    </svg>
  );
}
