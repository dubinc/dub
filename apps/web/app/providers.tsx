"use client";

import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { KeyboardShortcutProvider, TooltipProvider } from "@dub/ui";
import PlausibleProvider from "next-plausible";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function RootProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <PlausibleProvider domain="dub.co" revenue />
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
    </TooltipProvider>
  );
}
