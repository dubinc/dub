import { getPartners } from "@/lib/api/partners/get-partners";
import { partnersExportQuerySchema } from "@/lib/zod/schemas/partners";
import { z } from "zod";

type PartnerFilters = Omit<
  z.infer<typeof partnersExportQuerySchema>,
  "columns"
> & {
  programId: string;
};

export async function* fetchPartnersBatch(
  filters: PartnerFilters,
  batchSize: number = 1000,
) {
  let page = 1;
  let hasMore = true;
  let totalFetched = 0;

  while (hasMore) {
    const partners = await getPartners({
      ...filters,
      page,
      pageSize: batchSize,
    });

    if (partners.length > 0) {
      totalFetched += partners.length;
      yield { partners, totalFetched };
      page++;
      hasMore = partners.length === batchSize;
    } else {
      hasMore = false;
    }
  }
}
