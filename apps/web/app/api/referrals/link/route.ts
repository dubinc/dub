import { withAuth } from "@/lib/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/referrals/link - get the link for the given affiliate
export const GET = withAuth(async ({ link }) => {
  const { id, url, shortLink, clicks, leads, sales, saleAmount } = link;

  return NextResponse.json({
    id,
    url,
    shortLink,
    clicks,
    leads,
    sales,
    saleAmount,
  });
});
