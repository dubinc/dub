import { getPartners } from "@/lib/api/partners/get-partners";

type PartnerFilters = Omit<
  Parameters<typeof getPartners>[0],
  "page" | "pageSize"
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
