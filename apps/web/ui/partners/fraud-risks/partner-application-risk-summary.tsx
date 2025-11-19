"use client";

import { FRAUD_RULES, FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  EnrolledPartnerExtendedProps,
  ExtendedFraudRuleType,
} from "@/lib/types";
import { Button } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import { getHighestSeverity } from "./partner-application-fraud-evaluator";
import { PartnerApplicationFraudSeverityIndicator } from "./partner-application-fraud-severity-indicator";

interface PartnerApplicationRiskSummaryProps {
  partner: EnrolledPartnerExtendedProps;
}

type FraudRisksResponse = Partial<Record<ExtendedFraudRuleType, boolean>>;

// Displays the risk analysis for a partner application
export function PartnerApplicationRiskSummary({
  partner,
}: PartnerApplicationRiskSummaryProps) {
  const { id: workspaceId } = useWorkspace();

  const { data: risks, isLoading } = useSWR<FraudRisksResponse>(
    partner?.id
      ? `/api/partners/${partner.id}/fraud?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const triggeredRules = useMemo(() => {
    if (!risks) return [];

    return FRAUD_RULES.filter((rule) => {
      return risks[rule.type] === true;
    });
  }, [risks]);

  const overallRisk = useMemo(
    () => getHighestSeverity(triggeredRules),
    [triggeredRules],
  );

  if (isLoading) {
    return null;
  }

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
          if (!rule.severity) return null;

          return (
            <li key={rule.type} className="flex items-center gap-2">
              <div
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  FRAUD_SEVERITY_CONFIG[rule.severity].color,
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
