"use client";

import { PosthogPageview } from "@/ui/layout/posthog-pageview";
import { ModalProvider } from "@/ui/modals/modal-provider";
import { SessionProvider } from "next-auth/react";
import PlausibleProvider from "next-plausible";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { ReactNode } from "react";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/_proxy/posthog/ingest",
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true, // Enable pageleave capture
  });
}

export default function Providers({ children }: { children: ReactNode }) {
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
      <SessionProvider>
        <ModalProvider>
          <PosthogPageview />
          {children}
        </ModalProvider>
      </SessionProvider>
    </PostHogProvider>
  );
}
