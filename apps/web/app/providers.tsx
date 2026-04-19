"use client";

import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { KeyboardShortcutProvider, TooltipProvider } from "@dub/ui";
import PlausibleProvider from "next-plausible";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { useOnboardingTrialVariant } from "./app.dub.co/(onboarding)/onboarding/use-onboarding-trial-variant";

export default function RootProviders({ children }: { children: ReactNode }) {
  const { isTrialVariant } = useOnboardingTrialVariant();

  return (
    <TooltipProvider>
      <PlausibleProvider
        enabled
        init={{
          captureOnLocalhost: true,
          customProperties: {
            trialVariant: isTrialVariant ? "Trial" : "Control",
          },
        }}
      >
        <KeyboardShortcutProvider>
          <Toaster className="pointer-events-auto" closeButton />
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
      </PlausibleProvider>
    </TooltipProvider>
  );
}
