"use client";

import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { usePartnerApplicationRisks } from "@/lib/swr/use-partner-application-risks";
import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { PartnerApplicationFraudSeverityIndicator } from "./partner-application-fraud-severity-indicator";
import { usePartnerApplicationRiskSummaryModal } from "./partner-application-risk-summary-modal";

interface PartnerApplicationRiskSummaryProps {
  partner: EnrolledPartnerExtendedProps;
}

// Displays the risk analysis for a partner application
export function PartnerApplicationRiskSummary({
  partner,
}: PartnerApplicationRiskSummaryProps) {
  const { triggeredFraudRules, severity, isLoading } =
    usePartnerApplicationRisks({
      filters: { partnerId: partner?.id },
      enabled: !!partner?.id,
    });

  const { setShowModal, PartnerApplicationRiskSummaryModal } =
    usePartnerApplicationRiskSummaryModal({
      triggeredRules: triggeredFraudRules,
      severity,
    });

  if (isLoading) {
    return null;
  }

  if (triggeredFraudRules.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-content-emphasis text-sm font-semibold">
            Risk analysis
          </h3>

          <Button
            type="button"
            text="View"
            variant="secondary"
            onClick={() => setShowModal(true)}
            className="h-6 w-fit px-1.5 py-2"
          />
        </div>

        <PartnerApplicationFraudSeverityIndicator severity={severity} />

        <ul className="space-y-2">
          {triggeredFraudRules.map((rule) => {
            if (!rule.severity) return null;

            return (
              <li key={rule.type} className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    FRAUD_SEVERITY_CONFIG[rule.severity].bg,
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

      <PartnerApplicationRiskSummaryModal />
    </>
  );
}
