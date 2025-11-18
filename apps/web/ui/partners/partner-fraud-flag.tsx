import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { DynamicTooltipWrapper, Flag } from "@dub/ui";
import { useParams } from "next/navigation";

interface FraudEventGroupByPartner {
  partnerId: string;
  _count: number;
}

export function PartnerFraudFlag({ partnerId }: { partnerId: string }) {
  const { slug } = useParams();

  const { fraudEventsCount, loading } = useFraudEventsCount<
    FraudEventGroupByPartner[]
  >({
    groupBy: "partnerId",
    status: "pending",
  });

  if (loading) {
    return null;
  }

  const currentPartnerFraudEvents = fraudEventsCount?.find(
    (event) => event.partnerId === partnerId,
  );

  if (!currentPartnerFraudEvents || currentPartnerFraudEvents._count === 0) {
    return null;
  }

  return (
    <DynamicTooltipWrapper
      tooltipProps={{
        content: (
          <div className="grid max-w-xs gap-2 rounded-2xl p-4">
            <span className="text-sm leading-4 text-neutral-600">
              Fraud and risk event to review.
            </span>

            <ButtonLink
              variant="secondary"
              className="h-6 w-full items-center justify-center rounded-md px-1.5 py-2 text-sm font-medium"
              href={`/${slug}/program/frauds?partnerId=${partnerId}`}
              target="_blank"
            >
              Review events
            </ButtonLink>
          </div>
        ),
      }}
    >
      <Flag className="size-3.5 cursor-pointer" />
    </DynamicTooltipWrapper>
  );
}
