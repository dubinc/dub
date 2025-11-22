import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { usePartnerApplicationRisks } from "@/lib/swr/use-partner-application-risks";
import { Flag } from "@dub/ui";
import { cn } from "@dub/utils";

export function PartnerApplicationRiskFlag({
  partnerId,
}: {
  partnerId: string;
}) {
  const { severity, isLoading } = usePartnerApplicationRisks({
    filters: { partnerId },
  });

  if (isLoading || !severity) {
    return null;
  }

  return (
    <Flag className={cn("size-3.5", FRAUD_SEVERITY_CONFIG[severity].fg)} />
  );
}
