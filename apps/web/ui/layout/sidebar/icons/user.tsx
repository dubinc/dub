import { SVGProps, useEffect, useRef } from "react";

export function User({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const headRef = useRef<SVGCircleElement>(null);
  const bodyRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!headRef.current || !bodyRef.current) return;

    if (hovered) {
      headRef.current.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-10%)" },
          { transform: "translateY(0)" },
        ],
        {
          duration: 300,
        },
      );

      bodyRef.current.animate(
        [
          { transform: "scaleX(1)" },
          { transform: "scaleX(1.15)" },
          { transform: "scaleX(1)" },
        ],
        {
          duration: 300,
        },
      );
    }
  }, [hovered]);

  return (
    <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <g fill="currentColor">
        <circle
          ref={headRef}
          cx="9"
          cy="4.5"
          fill="none"
          r="2.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center] [&_*]:[vector-effect:non-scaling-stroke]"
        />
        <path
          ref={bodyRef}
          d="M13.762,15.516c.86-.271,1.312-1.221,.947-2.045-.97-2.191-3.159-3.721-5.709-3.721s-4.739,1.53-5.709,3.721c-.365,.825,.087,1.774,.947,2.045,1.225,.386,2.846,.734,4.762,.734s3.537-.348,4.762-.734Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center] [&_*]:[vector-effect:non-scaling-stroke]"
        />
      </g>
    </svg>
  );
}
