"use client";

import { useCallback, useEffect, useState } from "react";
import { trackApplicationEvent } from "./track-application";

function getViaParam(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  return params.get("via");
}

interface UseApplicationTrackingParams {
  programIdOrSlug?: string | null;
}

export function useApplicationTracking({
  programIdOrSlug,
}: UseApplicationTrackingParams = {}) {
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null);

  useEffect(() => {
    const via = getViaParam();

    trackApplicationEvent({
      eventName: "visit",
      referrerUsername: via ?? undefined,
      programIdOrSlug: programIdOrSlug ?? undefined,
    }).then((id) => {
      setApplicationId(id);
      setReferrerUsername(via);
    });
  }, [programIdOrSlug]);

  const trackStarted = useCallback(() => {
    trackApplicationEvent({
      eventName: "start",
      applicationId: applicationId ?? undefined,
      referrerUsername: referrerUsername ?? undefined,
      programIdOrSlug: programIdOrSlug ?? undefined,
    });
  }, [applicationId, referrerUsername, programIdOrSlug]);

  return { applicationId, referrerUsername, trackStarted };
}
