"use client";

import { APPLICATION_FRAUD_SEVERITY_CONFIG } from "@/lib/fraud/constants";
import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo } from "react";
import {
  assessPartnerApplicationRisk,
  getHighestSeverity,
} from "./partner-application-fraud-evaluator";
import { PartnerApplicationFraudSeverityIndicator } from "./partner-application-fraud-severity-indicator";

interface PartnerApplicationRiskSummaryProps {
  partner: EnrolledPartnerExtendedProps;
}

// Displays the risk analysis for a partner application
export function PartnerApplicationRiskSummary({
  partner,
}: PartnerApplicationRiskSummaryProps) {
  const triggeredRules = useMemo(
    () => assessPartnerApplicationRisk(partner),
    [partner],
  );

  const overallRisk = useMemo(
    () => getHighestSeverity(triggeredRules),
    [triggeredRules],
  );

  if (triggeredRules.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-content-emphasis text-sm font-semibold">
          Risk analysis
        </h3>

        <Button
          type="button"
          text="View"
          variant="secondary"
          onClick={() => {}} // TODO (Fraud)
          className="h-6 w-fit px-1.5 py-2"
        />
      </div>

      <PartnerApplicationFraudSeverityIndicator severity={overallRisk} />

      <ul className="space-y-2">
        {triggeredRules.map((rule) => {
          return (
            <li key={rule.type} className="flex items-center gap-2">
              <div
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  APPLICATION_FRAUD_SEVERITY_CONFIG[rule.severity].color,
                )}
              />
              <span className="text-xs font-medium leading-4 text-neutral-700">
                {rule.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
