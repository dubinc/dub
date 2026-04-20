"use client";

import { TrackApplicationEventBody } from "@/lib/application-events/schema";
import { prettyPrint } from "@dub/utils";

export async function trackApplicationEvent({
  eventName,
  url,
  referrer,
}: TrackApplicationEventBody) {
  const response = await fetch("/api/track/application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      url,
      referrer,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(`[trackApplicationEvent] ${prettyPrint(result)}`);
    return;
  }

  return result;
}
