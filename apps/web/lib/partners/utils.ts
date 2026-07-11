import { DELETABLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { EnrolledPartnerExtendedProps } from "../types";

export function canDeletePartner({
  status,
  totalClicks,
  totalLeads,
  totalSales,
  totalCommissions,
}: Pick<
  EnrolledPartnerExtendedProps,
  "status" | "totalClicks" | "totalLeads" | "totalSales"
> & {
  totalCommissions: number | bigint;
}): boolean {
  if (!DELETABLE_ENROLLMENT_STATUSES.includes(status)) {
    return false;
  }

  // Deletable partners must have no activity
  const hasActivity =
    totalClicks > 0 || totalLeads > 0 || totalSales > 0 || totalCommissions > 0;

  if (hasActivity) {
    return false;
  }

  return true;
}
