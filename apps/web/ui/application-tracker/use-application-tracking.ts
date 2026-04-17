"use client";

import { ApplicationEventInput } from "@/lib/application-events/schema";
import { prettyPrint } from "@dub/utils";

export async function trackApplicationEvent({
  eventName,
  referrerUsername,
}: {
  eventName: ApplicationEventInput["eventName"];
  referrerUsername?: string | null;
}) {
  const response = await fetch("/api/track/application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      pathname: window.location.pathname,
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
