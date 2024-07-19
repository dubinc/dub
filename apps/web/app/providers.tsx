"use client";

import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { PosthogPageview } from "@dub/ui";
import { TooltipProvider } from "@dub/ui/src/tooltip";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { Toaster } from "sonner";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/_proxy/ingest",
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true, // Enable pageleave capture
  });
}

export default function RootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PostHogProvider client={posthog}>
      <TooltipProvider>
        <Toaster closeButton className="pointer-events-auto" />
        <PosthogPageview />
        {children}
        <DubAnalytics
          cookieOptions={{
            domain: process.env.NEXT_PUBLIC_VERCEL_ENV
              ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
              : undefined,
          }}
        />
        <VercelAnalytics />
      </TooltipProvider>
    </PostHogProvider>
  );
}
