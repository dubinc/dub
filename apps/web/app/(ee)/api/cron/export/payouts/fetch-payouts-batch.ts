import { getPayouts } from "@/lib/api/payouts/get-payouts";
import { payoutsQuerySchema } from "@/lib/zod/schemas/payouts";
import * as z from "zod/v4";

type PayoutFilters = Omit<
  z.infer<typeof payoutsQuerySchema>,
  "page" | "pageSize"
>;

export async function* fetchPayoutsBatch({
  workspaceId,
  programId,
  filters,
  pageSize = 1000,
}: {
  workspaceId: string;
  programId: string;
  filters: PayoutFilters;
  pageSize?: number;
}) {
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
