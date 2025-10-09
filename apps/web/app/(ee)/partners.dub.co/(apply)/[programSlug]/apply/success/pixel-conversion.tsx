"use client";

import { ClientOnly } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, any>) => void;
    lintrk?: (
      action: string,
      event: string | Record<string, any>,
      params?: Record<string, any>,
    ) => void;
  }
}

export function PixelConversion() {
  return (
    <ClientOnly>
      <Suspense>
        <PixelConversionHelper />
      </Suspense>
    </ClientOnly>
  );
}

function PixelConversionHelper() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");

  useEffect(() => {
    if (applicationId && typeof window !== "undefined") {
      // Meta conversion tracking
      if (window.fbq) {
        window.fbq("track", "application submitted");
      }
      // LinkedIn conversion tracking
      if (window.lintrk) {
        window.lintrk("track", { conversion_id: 24025098 });
      }
    }
  }, [applicationId]);

  return <></>;
}
