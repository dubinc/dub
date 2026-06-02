import { differenceInDays, min } from "date-fns";

type RevenueGranularity = "day" | "month";

type StripeMetricQueryResponse = {
  data?: {
    timestamp: string;
    results: {
      name?: string;
      value: string;
    }[];
  }[];
};

type StripeErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export const getBucketKey = (
  timestamp: string | Date,
  granularity: RevenueGranularity,
) => {
  const iso =
    typeof timestamp === "string"
      ? new Date(timestamp).toISOString()
      : timestamp.toISOString();

  return granularity === "month" ? iso.slice(0, 7) : iso.slice(0, 10);
};

const getStripeGranularity = ({
  granularity,
  startDate,
  endDate,
}: {
  granularity: RevenueGranularity;
  startDate: Date;
  endDate: Date;
}) => {
  if (granularity === "month") {
    return "month";
  }

  const totalDays = differenceInDays(endDate, startDate);
  return totalDays > 92 ? "month" : "day";
};

export async function getMrrByBucket({
  startDate,
  endDate,
  granularity,
}: {
  startDate: Date;
  endDate: Date;
  granularity: RevenueGranularity;
}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  const response = await fetch(
    "https://api.stripe.com/v2/data/analytics/metric_query",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Stripe-Version": "2026-04-22.preview",
      },
      body: JSON.stringify({
        metrics: [{ name: "revenue.mrr" }],
        starts_at: startDate,
        // make sure end date is not in the future
        ends_at: min([endDate, new Date()]),
        granularity: getStripeGranularity({ granularity, startDate, endDate }),
        currency: "usd",
        timezone: "UTC",
      }),
    },
  );

  const responseBody = (await response.json().catch(() => ({}))) as
    | StripeMetricQueryResponse
    | StripeErrorResponse;

  if (response.ok) {
    const lookup = new Map<string, number>();
    (responseBody as StripeMetricQueryResponse).data?.forEach((row) => {
      const key = getBucketKey(row.timestamp, granularity);
      const mrr = parseInt(
        row.results.find((result) => result.name === "revenue.mrr")?.value ??
          "0",
      );
      lookup.set(key, (lookup.get(key) ?? 0) + mrr);
    });
    return lookup;
  }

  const stripeError = (responseBody as StripeErrorResponse).error;
  const stripeMessage =
    stripeError?.message ??
    `Stripe MRR metric query failed with status ${response.status}.`;
  const stripeCode = stripeError?.code ? ` [${stripeError.code}]` : "";

  throw new Error(`${stripeMessage}${stripeCode}`);
}
