"use client";

import { PosthogPageview } from "@/ui/layout/posthog-pageview";
import { Analytics as DubAnalytics } from "@dub/analytics/react";
import {
  KeyboardShortcutProvider,
  TooltipProvider,
  useRemoveGAParams,
} from "@dub/ui";
import PlausibleProvider from "next-plausible";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/_proxy/posthog/ingest",
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true, // Enable pageleave capture
  });
}

export default function RootProviders({ children }: { children: ReactNode }) {
  useRemoveGAParams();

  return (
    <PostHogProvider client={posthog}>
      <PlausibleProvider
        domain="dub.co"
        revenue
        scriptProps={{
          src: "/_proxy/plausible/script.js",
          // @ts-ignore
          "data-api": "/_proxy/plausible/event",
        }}
      />
      <TooltipProvider>
        <KeyboardShortcutProvider>
          <Toaster className="pointer-events-auto" closeButton />
          <PosthogPageview />
          {children}
          <DubAnalytics
            apiHost="/_proxy/dub"
            cookieOptions={{
              domain: process.env.VERCEL === "1" ? ".dub.co" : "localhost",
            }}
            domainsConfig={{
              refer: "refer.dub.co",
            }}
          />
        </KeyboardShortcutProvider>
      </TooltipProvider>
    </PostHogProvider>
  );
}
