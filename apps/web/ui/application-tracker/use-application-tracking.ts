"use client";

import { APPLICATION_ID_COOKIE } from "@/lib/application-tracker/constants";
import { TrackApplicationEventName } from "@/lib/application-tracker/schema";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface TrackEventParams {
  eventName: TrackApplicationEventName;
  pathname: string;
}

function getCookie(name: string) {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1] ?? null
  );
}

async function trackEvent({ eventName, pathname }: TrackEventParams) {
  const applicationId = getCookie(APPLICATION_ID_COOKIE);

  const payload = {
    eventName,
    pathname,
    ...(applicationId && { applicationId }),
  };

  const response = await fetch("/api/track/application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(result.error.message);
    return;
  }

  return result;
}

export function useApplicationTracking() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent({
      eventName: "visit",
      pathname,
    });
  }, [pathname]);
}
