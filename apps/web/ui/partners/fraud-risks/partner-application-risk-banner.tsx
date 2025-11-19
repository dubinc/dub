"use client";

import usePartnerApplicationRisks from "@/lib/swr/use-partner-application-risks";
import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { ShieldKeyhole } from "@dub/ui";

interface PartnerApplicationRiskBannerProps {
  partner: EnrolledPartnerExtendedProps;
}

export function PartnerApplicationRiskBanner({
  partner,
}: PartnerApplicationRiskBannerProps) {
  const { severity, isLoading } = usePartnerApplicationRisks({
    partnerId: partner?.id,
  });

  if (isLoading || severity !== "high") {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-red-200 bg-red-100 px-4 py-2">
      <ShieldKeyhole className="size-4 text-red-700" />
      <h3 className="text-sm font-semibold leading-5 text-red-700">
        Potential risk detected
      </h3>
    </div>
  );
}
