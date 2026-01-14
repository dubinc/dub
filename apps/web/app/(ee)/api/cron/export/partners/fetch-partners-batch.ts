import { getPartners } from "@/lib/api/partners/get-partners";
import { partnersExportQuerySchema } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";

type PartnerFilters = Omit<
  z.infer<typeof partnersExportQuerySchema>,
  "columns"
> & {
  programId: string;
};

export async function* fetchPartnersBatch(
  filters: PartnerFilters,
  pageSize: number = 1000,
) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const partners = await getPartners({
      ...filters,
      page,
      pageSize,
    });

    if (partners.length > 0) {
      yield { partners };
      page++;
      hasMore = partners.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}
