"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackApplicationEvent } from "./use-application-tracking";

export function ApplicationAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const via = searchParams.get("via");

  useEffect(() => {
    trackApplicationEvent({
      eventName: "visit",
      referrerUsername: via,
    });
  }, [pathname, via]);

  return <></>;
}
