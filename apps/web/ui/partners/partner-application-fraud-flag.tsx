import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { usePartnerApplicationRisks } from "@/lib/swr/use-partner-application-risks";
import { Flag } from "@dub/ui";
import { cn } from "@dub/utils";

export function PartnerApplicationFraudFlag({
  partnerId,
}: {
  partnerId: string;
}) {
  const { severity, isLoading } = usePartnerApplicationRisks({
    partnerId,
  });

  if (isLoading || !severity) {
    return null;
  }

  return (
    <Flag
      className={cn(
        "size-3.5 cursor-pointer",
        FRAUD_SEVERITY_CONFIG[severity].fg,
      )}
    />
  );
}
