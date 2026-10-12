import { DELETABLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { EnrolledPartnerExtendedProps } from "../types";

type DeletePartnerEligibility = Pick<
  EnrolledPartnerExtendedProps,
  "status" | "totalClicks" | "totalLeads" | "totalSales"
> & {
  totalCommissions: number | bigint;
};

function hasPartnerActivity({
  totalClicks,
  totalLeads,
  totalSales,
  totalCommissions,
}: DeletePartnerEligibility) {
  return (
    totalClicks > 0 || totalLeads > 0 || totalSales > 0 || totalCommissions > 0
  );
}

export function canDeletePartner(partner: DeletePartnerEligibility) {
  return (
    DELETABLE_ENROLLMENT_STATUSES.includes(partner.status) &&
    !hasPartnerActivity(partner)
  );
}

export function getDeletePartnerDisabledTooltip(
  partner: DeletePartnerEligibility,
) {
  if (hasPartnerActivity(partner)) {
    return "Partners with clicks, leads, sales, or commissions cannot be permanently deleted.";
  }

  if (!DELETABLE_ENROLLMENT_STATUSES.includes(partner.status)) {
    return "Partner must be banned or deactivated before they can be permanently deleted.";
  }
}
