"use client";

// Mirrors the marketing site's infinity icon (dub.co ui/shared/icons/infinity.tsx)

import { motion, useReducedMotion } from "motion/react";
import { SVGProps } from "react";

const PATH =
  "M6.907 6.8364C6.1229 6.1881 5.2887 5.75 4.35 5.75C2.6378 5.75 1.25 7.205 1.25 9C1.25 10.795 2.6378 12.25 4.35 12.25C7.9667 12.25 10.0333 5.75 13.65 5.75C15.3622 5.75 16.75 7.205 16.75 9C16.75 10.795 15.3622 12.25 13.65 12.25C12.7113 12.25 11.877 11.8119 11.093 11.1636";

export function DrawnInfinityIcon({
  draw = false,
  ...props
}: SVGProps<SVGSVGElement> & {
  // Draws the line in when the icon mounts
  draw?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {draw && !shouldReduceMotion ? (
        <motion.path
          d={PATH}
          // Fading in hides the round cap's dot before the line starts drawing
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.7, ease: [0.65, 0, 0.35, 1] },
            opacity: { duration: 0.1 },
          }}
        />
      ) : (
        <path d={PATH} />
      )}
    </svg>
  );
}
