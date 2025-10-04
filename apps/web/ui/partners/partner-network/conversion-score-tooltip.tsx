import {
  PARTNER_CONVERSION_SCORES,
  PARTNER_CONVERSION_SCORE_RATES,
} from "@/lib/zod/schemas/partner-network";
import { DynamicTooltipWrapper } from "@dub/ui";
import { capitalize } from "@dub/utils";
import { PropsWithChildren } from "react";
import { ConversionScoreIcon } from "../conversion-score-icon";

export function ConversionScoreTooltip({
  enabled = true,
  children,
}: PropsWithChildren<{ enabled?: boolean }>) {
  return (
    <DynamicTooltipWrapper
      tooltipProps={
        enabled
          ? {
              content: (
                <div className="max-w-60 p-2.5 text-xs">
                  <div className="flex flex-col gap-2.5">
                    {PARTNER_CONVERSION_SCORES.map((score, idx) => (
                      <div key={score} className="flex items-center gap-1.5">
                        <ConversionScoreIcon
                          score={score}
                          className="size-3.5 shrink-0"
                        />
                        <span className="text-content-default font-semibold">
                          {capitalize(score)}{" "}
                          <span className="text-content-subtle font-medium">
                            (
                            {idx < PARTNER_CONVERSION_SCORES.length - 1 ? (
                              <>
                                {PARTNER_CONVERSION_SCORE_RATES[score] * 100}-
                                {PARTNER_CONVERSION_SCORE_RATES[
                                  PARTNER_CONVERSION_SCORES[idx + 1]
                                ] * 100}
                              </>
                            ) : (
                              <>
                                &gt;
                                {PARTNER_CONVERSION_SCORE_RATES[score] * 100}
                              </>
                            )}
                            %)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-content-subtle mt-4 font-medium">
                    This score is an average for all Dub programs the partner is
                    enrolled in.
                  </p>
                </div>
              ),
              side: "right",
              align: "end",
            }
          : undefined
      }
    >
      {children}
    </DynamicTooltipWrapper>
  );
}
