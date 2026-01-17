"use client";

import { useFraudGroupCount } from "@/lib/swr/use-fraud-groups-count";
import { usePartnerApplicationRisks } from "@/lib/swr/use-partner-application-risks";
import {
  EnrolledPartnerExtendedProps,
  FraudGroupCountByPartner,
} from "@/lib/types";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { ShieldKeyhole } from "@dub/ui";
import { useParams } from "next/navigation";

export function PartnerApplicationFraudBanner({
  partner,
}: {
  partner: EnrolledPartnerExtendedProps;
}) {
  const { severity, isLoading } = usePartnerApplicationRisks({
    filters: { partnerId: partner?.id },
    enabled: partner.status === "pending",
  });

  // Only show for pending partners with high severity risk
  if (isLoading || severity !== "high") {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-t-xl border border-b-0 border-red-200 bg-red-100 px-4 py-2">
      <div className="flex items-center gap-2">
        <ShieldKeyhole className="size-4 text-red-700" />
        <h3 className="text-sm font-semibold leading-5 text-red-700">
          Potential risk detected
        </h3>
      </div>
    </div>
  );
}

export function PartnerFraudBanner({
  partner,
}: {
  partner: EnrolledPartnerExtendedProps;
}) {
  const { slug } = useParams();

  const { fraudGroupCount, loading } = useFraudGroupCount<
    FraudGroupCountByPartner[]
  >({
    query: {
      groupBy: "partnerId",
      status: "pending",
    },
    enabled: partner.status !== "pending",
    ignoreParams: true,
  });

  if (loading) {
    return null;
  }

  const partnerFraudGroup = fraudGroupCount?.find(
    (event) => event.partnerId === partner.id,
  );

  if (!partnerFraudGroup || partnerFraudGroup._count === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-t-xl border border-b-0 border-red-200 bg-red-100 px-4 py-2">
      <div className="flex items-center gap-2">
        <ShieldKeyhole className="size-4 text-red-700" />
        <h3 className="text-sm font-semibold leading-5 text-red-700">
          Potential risk detected
        </h3>
      </div>

      <ButtonLink
        variant="outline"
        className="text-content-inverted hover:none h-7 w-fit rounded-lg bg-red-700 px-2.5 py-2 text-sm font-medium hover:bg-red-800"
        href={`/${slug}/program/fraud?partnerId=${partner.id}`}
        target="_blank"
      >
        Review event
      </ButtonLink>
    </div>
  );
}
