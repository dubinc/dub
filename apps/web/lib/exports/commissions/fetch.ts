import { getCommissions } from "@/lib/api/commissions/get-commissions";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import * as z from "zod/v4";

type CommissionFilters = Omit<
  z.infer<typeof getCommissionsQuerySchema>,
  "page" | "pageSize" | "startingAfter" | "endingBefore"
> & {
  programId: string;
};

export async function* fetchCommissionsBatch(
  filters: CommissionFilters,
  pageSize: number = 1000,
) {
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const commissions = await getCommissions({
      ...filters,
      pageSize,
      ...(cursor
        ? { startingAfter: cursor }
        : { page: 1 }),
    });

    if (commissions.length > 0) {
      yield { commissions };
      cursor = commissions[commissions.length - 1].id;
      hasMore = commissions.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}
