import { withCron } from "@/lib/cron/with-cron";
import { currencyApiClient } from "@/lib/currencyapi/client";
import { redis } from "@/lib/upstash";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// Cron to update the Foreign Exchange Rates in Redis
// Runs once every day at 08:00 AM UTC (0 8 * * *)
// POST /api/cron/fx-rates
export const POST = withCron(async () => {
  const { data } = await currencyApiClient.getLatest();

  const transformedRates: Record<string, number> = {};

  for (const [ticker, details] of Object.entries(data)) {
    transformedRates[ticker] = details.value;
  }

  // Store FX rates in Redis (with USD as the base currency)
  await redis.hset("fxRates:usd", transformedRates);

  return logAndRespond(
    `Updated ${Object.keys(transformedRates).length} FX rates.`,
  );
});
