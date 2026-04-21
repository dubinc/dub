"use client";

import { TrackApplicationEventBody } from "@/lib/application-events/schema";
import { prettyPrint } from "@dub/utils";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

async function trackApplicationEvent({
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

// Track application visit event
export function ApplicationAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    trackApplicationEvent({
      eventName: "visit",
      url: window.location.href,
      referrer: window.document.referrer,
    });
  }, [pathname]);

  return <></>;
}

export function useTrackApplyStart({
  preview = false,
}: { preview?: boolean } = {}) {
  const hasTrackedApplicationStart = useRef(false);

  return useCallback(() => {
    if (preview || hasTrackedApplicationStart.current) {
      return;
    }

    hasTrackedApplicationStart.current = true;

    void trackApplicationEvent({
      eventName: "start",
      url: window.location.href,
      referrer: window.document.referrer,
    });
  }, [preview]);
}
