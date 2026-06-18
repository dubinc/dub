import { getNetworkProgramCounts } from "@/lib/fetchers/get-network-program-counts";
import { parsePublicMarketplaceQuery } from "@/lib/marketplace/parse-public-marketplace-query";
import { NextResponse } from "next/server";

// cache filtered/searched count responses at the edge (public, not partner-scoped)
export const revalidate = 3600;

// GET /api/marketplace/programs/counts - public marketplace total + filter counts
export async function GET(req: Request) {
  const searchParams = Object.fromEntries(new URL(req.url).searchParams);
  const { category, rewardType, search } =
    parsePublicMarketplaceQuery(searchParams);

  const counts = await getNetworkProgramCounts({
    category,
    rewardType,
    search,
  });

  return NextResponse.json(counts);
}
