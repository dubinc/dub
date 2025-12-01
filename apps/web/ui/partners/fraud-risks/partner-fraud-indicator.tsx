import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { useFraudGroupCount } from "@/lib/swr/use-fraud-group-count";
import { FraudGroupCountByPartner } from "@/lib/types";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { DynamicTooltipWrapper, Flag } from "@dub/ui";
import { cn } from "@dub/utils";
import { useParams, usePathname } from "next/navigation";

interface PartnerFraudIndicatorProps {
  partnerId: string;
}

export function PartnerFraudIndicator({
  partnerId,
}: PartnerFraudIndicatorProps) {
  const { slug } = useParams();
  const pathname = usePathname();

  const { fraudGroupsCount, loading } = useFraudGroupCount<
    FraudGroupCountByPartner[]
  >({
    query: {
      groupBy: "partnerId",
      status: "pending",
    },
    enabled: !!partnerId,
  });

  if (loading) {
    return null;
  }

  const currentPartnerFraudEvents = fraudGroupsCount?.find(
    (event) => event.partnerId === partnerId,
  );

  if (!currentPartnerFraudEvents || currentPartnerFraudEvents._count === 0) {
    return null;
  }

  const source = pathname?.includes("/applications")
    ? "applications"
    : "partners";

  const tooltipContent = (
    <>
      {source === "applications" ? (
        <div className="grid max-w-44 gap-2 rounded-2xl p-3 text-center">
          <span className="text-xs font-medium leading-4 text-neutral-600">
            This partner has been flagged for potential risk.
          </span>
        </div>
      ) : (
        <div className="grid max-w-xs gap-2 rounded-2xl p-4">
          <span className="text-sm leading-4 text-neutral-600">
            Fraud and risk event to review.
          </span>

          <ButtonLink
            variant="secondary"
            className="h-6 w-full items-center justify-center rounded-md px-1.5 py-2 text-sm font-medium"
            href={`/${slug}/program/fraud?partnerId=${partnerId}`}
            target="_blank"
          >
            Review events
          </ButtonLink>
        </div>
      )}
    </>
  );

  return (
    <DynamicTooltipWrapper
      tooltipProps={{
        content: tooltipContent,
      }}
    >
      <Flag
        className={cn(
          "size-3.5 cursor-pointer",
          FRAUD_SEVERITY_CONFIG["high"].fg,
        )}
      />
    </DynamicTooltipWrapper>
  );
}
