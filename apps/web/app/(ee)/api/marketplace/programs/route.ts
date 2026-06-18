import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import { parsePublicMarketplaceQuery } from "@/lib/marketplace/parse-public-marketplace-query";
import { NextResponse } from "next/server";

// GET /api/marketplace/programs - public marketplace program list
export async function GET(req: Request) {
  const searchParams = Object.fromEntries(new URL(req.url).searchParams);
  const params = parsePublicMarketplaceQuery(searchParams);

  const programs = await getPublicNetworkPrograms(params);

  return NextResponse.json(programs);
}
