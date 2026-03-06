/**
 * Fetch per-page pageview counts from Plausible for the last 12 months.
 * Returns a map of pathname → pageview count.
 */
export async function fetchPlausiblePageviews(): Promise<Map<string, number>> {
  const apiKey = process.env.PLAUSIBLE_API_KEY;
  if (!apiKey) {
    console.warn("PLAUSIBLE_API_KEY not set - pageviews will be stored as 0");
    return new Map();
  }

  try {
    const res = await fetch("https://plausible.io/api/v2/query", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site_id: "dub.co",
        metrics: ["pageviews"],
        date_range: "12mo",
        dimensions: ["event:page"],
        filters: [
          [
            "or",
            [
              ["contains", "event:page", ["/docs"]],
              ["contains", "event:page", ["/help"]],
            ],
          ],
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`Plausible API error ${res.status}: ${await res.text()}`);
      return new Map();
    }

    const data = await res.json();
    const map = new Map<string, number>();

    for (const row of data.results ?? []) {
      const page: string = row.dimensions?.[0];
      const pageviews: number = row.metrics?.[0];

      if (typeof page === "string" && typeof pageviews === "number") {
        map.set(page, pageviews);
      }
    }

    return map;
  } catch (err) {
    console.warn("Failed to fetch Plausible pageviews:", err);
    return new Map();
  }
}
