"use client";

import { PosthogPageview } from "@/ui/layout/posthog-pageview";
import ModalProvider from "@/ui/modals/provider";
import { KeyboardShortcutProvider } from "@dub/ui";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SessionProvider } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { ReactNode } from "react";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/_proxy/ingest",
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true, // Enable pageleave capture
  });
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider client={posthog}>
      <SessionProvider>
        <ModalProvider>
          <KeyboardShortcutProvider>
            <PosthogPageview />
            {children}
          </KeyboardShortcutProvider>
        </ModalProvider>
        <VercelAnalytics />
      </SessionProvider>
    </PostHogProvider>
  );
}
