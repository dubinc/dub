"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq: (action: string, event: string, params?: Record<string, any>) => void;
  }
}

export function PixelConversion() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");

  useEffect(() => {
    if (applicationId && typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "application submitted");
    }
  }, [applicationId]);

  return <></>;
}
