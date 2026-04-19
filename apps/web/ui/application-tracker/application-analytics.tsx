"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { trackApplicationEvent } from "./track-application-event";

export function ApplicationAnalytics({ programSlug }: { programSlug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const via = searchParams.get("via");

  useEffect(() => {
    if (!programSlug) {
      return;
    }

    trackApplicationEvent({
      eventName: "visit",
      programSlug,
      referrerUsername: via,
    });
  }, [pathname, programSlug, via]);

  return <></>;
}

export function useTrackApplyStart({
  programSlug,
  preview = false,
}: {
  programSlug: string;
  preview?: boolean;
}) {
  const searchParams = useSearchParams();
  const via = searchParams.get("via");
  const hasTrackedApplicationStart = useRef(false);

  return useCallback(() => {
    if (preview || hasTrackedApplicationStart.current) {
      return;
    }

    hasTrackedApplicationStart.current = true;

    void trackApplicationEvent({
      eventName: "start",
      programSlug,
      referrerUsername: via,
    });
  }, [preview, programSlug, via]);
}
