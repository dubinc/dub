"use client";

import { APPLICATION_FRAUD_SEVERITY_CONFIG } from "@/lib/fraud/constants";
import { ApplicationFraudSeverity } from "@/lib/fraud/types";
import { cn } from "@dub/utils";

export function PartnerApplicationFraudSeverityIndicator({
  severity,
  className,
}: {
  severity: ApplicationFraudSeverity | null;
  className?: string;
}) {
  const entries = Object.entries(APPLICATION_FRAUD_SEVERITY_CONFIG) as [
    ApplicationFraudSeverity,
    { label: string; color: string; rank: number },
  ][];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex w-full gap-2">
        {entries.map(([key, cfg]) => (
          <div
            key={key}
            className={cn(
              "h-2 flex-1 rounded-lg transition-colors",
              severity === key ? cfg.color : "bg-neutral-200",
            )}
          />
        ))}
      </div>

      <div className="flex w-full gap-2">
        {entries.map(([key, cfg]) => (
          <div
            key={key}
            className="text-content-default flex-1 text-start text-xs font-medium"
          >
            {cfg.label}
          </div>
        ))}
      </div>
    </div>
  );
}
