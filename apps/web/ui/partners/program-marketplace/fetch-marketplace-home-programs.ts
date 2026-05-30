import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import { MARKETPLACE_HOME_ROWS } from "./marketplace-home-sections";

export async function fetchMarketplaceHomePrograms() {
  const [featuredPrograms, ...rowPrograms] = await Promise.all([
    getPublicNetworkPrograms({
      featured: true,
      pageSize: 6,
    }),
    ...MARKETPLACE_HOME_ROWS.map((row) =>
      getPublicNetworkPrograms(row.fetchParams),
    ),
  ]);

  return {
    featuredPrograms,
    rowPrograms,
  };
}
