"use client";

import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { usePartnerApplicationRisks } from "@/lib/swr/use-partner-application-risks";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerExtendedProps, FraudSeverity } from "@/lib/types";
import { Button, ShieldKeyhole } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { usePartnersUpgradeModal } from "../partners-upgrade-modal";
import { FraudDisclaimerBanner } from "./fraud-disclaimer-banner";
import { PartnerApplicationFraudSeverityIndicator } from "./partner-application-fraud-severity-indicator";
import { usePartnerApplicationRiskSummaryModal } from "./partner-application-risk-summary-modal";
import { PartnerCrossProgramSummary } from "./partner-cross-program-summary";

interface PartnerApplicationRiskSummaryProps {
  partner: EnrolledPartnerExtendedProps;
}

// Displays the risk analysis for a partner application
export function PartnerApplicationRiskSummary({
  partner,
}: PartnerApplicationRiskSummaryProps) {
  const { plan } = useWorkspace();

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

  const { canManageFraudEvents } = getPlanCapabilities(plan);

  if (!canManageFraudEvents && !isLoading) {
    return <PartnerApplicationRiskSummaryUpsell />;
  }

  if (isLoading || triggeredFraudRules.length === 0) {
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

      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-content-emphasis text-sm font-semibold">
          Program owner activity
        </h3>
        <PartnerCrossProgramSummary partnerId={partner.id} />

        {severity === "high" && (
          <FraudDisclaimerBanner className="gap-2 px-3 py-2" />
        )}
      </div>

      <PartnerApplicationRiskSummaryModal />
    </>
  );
}

const APPLICATION_RISK_CONFIG = {
  high: {
    bg: "bg-red-100",
    border: "border-red-200",
    icon: "text-red-600",
  },
  medium: {
    bg: "bg-orange-100",
    border: "border-orange-200",
    icon: "text-orange-600",
  },
  low: {
    bg: "bg-neutral-100",
    border: "border-neutral-200",
    icon: "text-neutral-600",
  },
};

export function PartnerApplicationRiskSummaryUpsell() {
  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal();

  // Dummy risk items for blur effect
  const dummyRisks: Array<{ severity: FraudSeverity; text: string }> = [
    { severity: "high", text: "High risk reason to unlock" },
    { severity: "medium", text: "Medium risk reason to unlock" },
    { severity: "low", text: "Low risk reason to unlock" },
  ];

  const severity: FraudSeverity = "high";
  const severityConfig = APPLICATION_RISK_CONFIG[severity];

  return (
    <>
      {partnersUpgradeModal}
      <div className="relative flex flex-col gap-4 p-4">
        {/* Blurred dummy risk list */}
        <div className="pointer-events-none flex select-none flex-col gap-4 blur-[3px]">
          <h3 className="text-content-emphasis text-sm font-semibold">
            Risk analysis
          </h3>

          <PartnerApplicationFraudSeverityIndicator severity={severity} />

          <ul className="space-y-2">
            {dummyRisks.map((risk) => (
              <li key={risk.severity} className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    FRAUD_SEVERITY_CONFIG[risk.severity].bg,
                  )}
                />
                <span className="text-xs font-medium leading-4 text-neutral-700">
                  {risk.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Upsell overlay */}
        <div className="absolute inset-0 flex flex-col rounded-xl bg-white/60 p-4 backdrop-blur-[2px]">
          <h3 className="text-content-emphasis mb-4 text-sm font-semibold">
            Unlock risk analysis
          </h3>

          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-lg border",
                severityConfig.border,
                severityConfig.bg,
              )}
            >
              <ShieldKeyhole className={cn("size-4", severityConfig.icon)} />
            </div>

            <p className="text-content-default max-w-72 text-center text-xs font-medium">
              Application risk review and event detection are available on the
              Advanced plan{" "}
              <Link
                href="https://dub.co/help/article/fraud-detection"
                target="_blank"
                className="underline underline-offset-2 hover:text-neutral-800"
              >
                Learn more
              </Link>
            </p>

            <Button
              text="Upgrade to Advanced"
              variant="secondary"
              className="h-7 w-full rounded-lg font-medium"
              onClick={() => setShowPartnersUpgradeModal(true)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
