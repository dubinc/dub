import { getPayouts } from "@/lib/api/payouts/get-payouts";
import { PayoutsQueryFilters } from "@/lib/types";

export async function* fetchPayoutsBatch({
  workspaceId,
  programId,
  filters,
}: {
  workspaceId: string;
  programId: string;
  filters: PayoutsQueryFilters;
}) {
  const pageSize = filters.pageSize ?? 1000;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const payouts = await getPayouts({
      workspaceId,
      programId,
      filters: {
        ...filters,
        page,
        pageSize,
      },
    });

    if (payouts.length > 0) {
      yield { payouts };
      page++;
      hasMore = payouts.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}
