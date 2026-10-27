import { PartnerConversionScore } from "@/lib/types";
import { PARTNER_CONVERSION_SCORES } from "@/lib/zod/schemas/partner-network";
import { cn } from "@dub/utils";
import { SVGProps } from "react";

export function ConversionScoreIcon({
  score,
  className,
  ...rest
}: { score: PartnerConversionScore | null } & SVGProps<SVGSVGElement>) {
  const scoreIndex = PARTNER_CONVERSION_SCORES.indexOf(score || "low");

  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        score
          ? {
              low: "text-red-600",
              average: "text-orange-600",
              good: "text-green-600",
              high: "text-blue-600",
              excellent: "text-violet-600",
            }[score]
          : "text-neutral-500",
        className,
      )}
      {...rest}
    >
      <g fill="currentColor">
        <path
          d="M16.135,7.75c-.522-3-2.885-5.363-5.885-5.885"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          opacity={scoreIndex > 0 ? 1 : 0.5}
        />
        <path
          d="M10.25,16.135c3-.522,5.363-2.885,5.885-5.885"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          opacity={scoreIndex > 1 ? 1 : 0.5}
        />
        <path
          d="M1.865,10.25c.522,3,2.885,5.363,5.885,5.885"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          opacity={scoreIndex > 2 ? 1 : 0.5}
        />
        <path
          d="M7.75,1.865c-3,.522-5.363,2.885-5.885,5.885"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          opacity={scoreIndex > 3 ? 1 : 0.5}
        />
        <circle
          cx="9"
          cy="9"
          fill="none"
          r="2.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
