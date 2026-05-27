import { getPartners } from "@/lib/api/partners/get-partners";
import { partnersExportQuerySchema } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";

type PartnerFilters = Omit<
  z.infer<typeof partnersExportQuerySchema>,
  "columns"
> & {
  programId: string;
};

export async function* fetchPartnersBatch({
  filters,
  columns,
  pageSize = 1000,
}: {
  filters: PartnerFilters;
  columns: string[];
  pageSize?: number;
}) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const partners = await getPartners({
      ...filters,
      page,
      pageSize,
      includeGroup: columns.includes("group"),
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
