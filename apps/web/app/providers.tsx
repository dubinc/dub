"use client";

import { KeyboardShortcutProvider, TooltipProvider } from "@dub/ui";
import PlausibleProvider from "next-plausible";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function RootProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <PlausibleProvider enabled>
        <KeyboardShortcutProvider>
          <Toaster className="pointer-events-auto" closeButton />
          {children}
        </KeyboardShortcutProvider>
      </PlausibleProvider>
    </TooltipProvider>
  );
}
