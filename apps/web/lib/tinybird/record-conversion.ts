import { ConversionEvent } from "../zod/schemas/conversions";

// Record conversion event in Tinybird
export async function recordConversion(event: ConversionEvent) {
  return await Promise.allSettled([
    fetch(
      `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_conversion_events&wait=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        },
        body: JSON.stringify({
          ...event,
          timestamp: new Date(Date.now()).toISOString(),
        }),
      },
    ),
  ]);
}
