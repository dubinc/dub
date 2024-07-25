"use client";

import ModalProvider from "@/ui/modals/provider";
import { KeyboardShortcutProvider } from "@dub/ui";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ModalProvider>
        <KeyboardShortcutProvider>{children}</KeyboardShortcutProvider>
      </ModalProvider>
    </SessionProvider>
  );
}
