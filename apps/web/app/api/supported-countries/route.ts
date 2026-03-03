import { PAYOUT_SUPPORTED_COUNTRIES } from "@/lib/constants/payouts-supported-countries";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(PAYOUT_SUPPORTED_COUNTRIES, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      // cache indefinitely till next deployment
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000",
    },
  });
}
