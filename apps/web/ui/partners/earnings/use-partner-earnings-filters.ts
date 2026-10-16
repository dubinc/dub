import { usePartnerDateRange } from "@/lib/analytics/use-partner-date-range";
import { PartnerProfileEarningsFilters } from "@/lib/swr/use-partner-profile-earnings";
import { useRouterStuff } from "@dub/ui";
import { useParams } from "next/navigation";
import { useMemo } from "react";

// the program, filters and date range of the partner Earnings pages, from the URL
export function usePartnerEarningsFilters() {
  const { programSlug } = useParams<{ programSlug?: string }>();
  const { searchParamsObj } = useRouterStuff();
  const dateRange = usePartnerDateRange();

  const { programId, type, linkId, customerId, status, payoutId } =
    searchParamsObj as Omit<
      PartnerProfileEarningsFilters,
      "programIdOrSlug"
    > & {
      programId?: string;
    };

  return useMemo(
    () => ({
      ...dateRange,
      // on the All programs page, the Program filter sets programId
      programIdOrSlug: programSlug ?? programId,
      type,
      linkId,
      // the All programs page has no Customer filter
      customerId: programSlug ? customerId : undefined,
      status,
      payoutId,
    }),
    [
      dateRange,
      programSlug,
      programId,
      type,
      linkId,
      customerId,
      status,
      payoutId,
    ],
  );
}
