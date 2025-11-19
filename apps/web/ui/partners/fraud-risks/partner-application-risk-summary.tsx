"use client";

import { FRAUD_RULES, FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { getHighestSeverity } from "@/lib/api/fraud/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  EnrolledPartnerExtendedProps,
  ExtendedFraudRuleType,
} from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
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
  const [showRiskModal, setShowRiskModal] = useState(false);

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
          onClick={() => setShowRiskModal(true)}
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

      <Modal
        showModal={showRiskModal}
        setShowModal={setShowRiskModal}
      >
        <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-200 p-4 sm:p-6">
          <div className="flex w-full items-center justify-between">
            <h3 className="text-content-emphasis text-lg font-semibold">
              Risk analysis
            </h3>
            <button
              type="button"
              onClick={() => setShowRiskModal(false)}
              className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-neutral-50 p-4 sm:p-6">
          <PartnerApplicationFraudSeverityIndicator severity={overallRisk} />

          <ul className="space-y-4">
            {triggeredRules.map((rule, index) => {
              if (!rule.severity) return null;

              const severityColor = FRAUD_SEVERITY_CONFIG[rule.severity].color;
              const isHighSeverity = rule.severity === "high";

              return (
                <li key={rule.type} className="flex gap-3">
                  <div className="flex shrink-0 items-start gap-2">
                    <span className="text-content-subtle text-sm font-medium">
                      {index + 1}.
                    </span>
                    <div
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        isHighSeverity ? severityColor : "bg-neutral-400",
                      )}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-medium leading-4 text-neutral-700">
                      {rule.name}
                    </span>
                    <span className="text-content-subtle text-sm leading-5">
                      {rule.description}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
