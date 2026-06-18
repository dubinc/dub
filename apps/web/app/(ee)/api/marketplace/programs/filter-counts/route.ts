import { getPublicNetworkProgramFilterCounts } from "@/lib/fetchers/get-public-network-program-filter-counts";
import { parsePublicMarketplaceQuery } from "@/lib/marketplace/parse-public-marketplace-query";
import { NextResponse } from "next/server";

// GET /api/marketplace/programs/filter-counts - public marketplace filter counts
export async function GET(req: Request) {
  const searchParams = Object.fromEntries(new URL(req.url).searchParams);
  const { category, rewardType } = parsePublicMarketplaceQuery(searchParams);

  const filterCounts = await getPublicNetworkProgramFilterCounts({
    category,
    rewardType,
  });

  return NextResponse.json(filterCounts);
}
