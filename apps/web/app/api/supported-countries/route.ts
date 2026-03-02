import {
  CONNECT_SUPPORTED_COUNTRIES,
  COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
  STABLECOIN_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const supported = [
    ...new Set([
      ...STABLECOIN_SUPPORTED_COUNTRIES,
      ...CONNECT_SUPPORTED_COUNTRIES,
      ...PAYPAL_SUPPORTED_COUNTRIES,
    ]),
  ];
  const sorted = supported
    .sort((a, b) => COUNTRIES[a].localeCompare(COUNTRIES[b]))
    .map((code) => ({ code, name: COUNTRIES[code] }));

  return NextResponse.json(sorted, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      // cache indefinitely till next deployment
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000",
    },
  });
}
