import { getPublicNetworkProgramsCount } from "@/lib/fetchers/get-public-network-programs";
import { parsePublicMarketplaceQuery } from "@/lib/marketplace/parse-public-marketplace-query";
import { NextResponse } from "next/server";

// GET /api/marketplace/programs/count - public marketplace program count
export async function GET(req: Request) {
  const searchParams = Object.fromEntries(new URL(req.url).searchParams);
  const { category, rewardType, search } =
    parsePublicMarketplaceQuery(searchParams);

  const count = await getPublicNetworkProgramsCount({
    category,
    rewardType,
    search,
  });

  return NextResponse.json(count);
}
