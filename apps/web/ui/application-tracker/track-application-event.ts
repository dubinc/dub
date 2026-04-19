"use client";

import { ApplicationEventInput } from "@/lib/application-events/schema";
import { prettyPrint } from "@dub/utils";

export async function trackApplicationEvent({
  eventName,
  programSlug,
  referrerUsername,
}: ApplicationEventInput) {
  const response = await fetch("/api/track/application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      programSlug,
      referrerUsername,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(`[trackApplicationEvent] ${prettyPrint(result)}`);
    return;
  }

  console.debug(`[trackApplicationEvent] ${prettyPrint(result)}`);

  return result;
}
