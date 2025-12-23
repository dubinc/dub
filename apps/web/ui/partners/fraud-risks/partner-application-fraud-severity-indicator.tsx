"use client";

import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { FraudSeverity } from "@/lib/types";
import { cn } from "@dub/utils";

export function PartnerApplicationFraudSeverityIndicator({
  severity,
  className,
}: {
  severity: FraudSeverity | null | undefined;
  className?: string;
}) {
  const entries = Object.entries(FRAUD_SEVERITY_CONFIG);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex w-full gap-2">
        {entries.map(([key, cfg]) => (
          <div
            key={key}
            className={cn(
              "h-2 flex-1 rounded-lg transition-colors",
              severity === key ? cfg.bg : "bg-neutral-200",
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
