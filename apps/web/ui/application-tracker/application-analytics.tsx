"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { trackApplicationEvent } from "./track-application-event";

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
