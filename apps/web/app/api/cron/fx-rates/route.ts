import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { redis } from "@/lib/upstash";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cron to update the Foreign Exchange Rates in Redis
// Runs once every day at 08:00 AM UTC (0 8 * * *)
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const res = await fetch("https://api.currencyapi.com/v3/latest", {
      headers: {
        apikey: process.env.CURRENCY_API_KEY || "",
      },
    });

    const { data } = (await res.json()) as {
      data: Record<string, { value: number }>;
    };

    if (!data) {
      return NextResponse.json({
        message: "Failed to fetch FX rates",
      });
    }

    const transformedRates: Record<string, number> = {};

    for (const [ticker, details] of Object.entries(data)) {
      transformedRates[ticker] = details.value;
    }

    // // Store FX rates in Redis (with USD as the base currency)
    await redis.hset("fxRates:usd", transformedRates);

    return NextResponse.json(transformedRates);
  } catch (error) {
    await log({
      message: `Error updating FX rates: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
