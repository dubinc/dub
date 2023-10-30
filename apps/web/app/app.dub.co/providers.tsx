"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import ModalProvider from "@/ui/modals/provider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ModalProvider>{children}</ModalProvider>
    </SessionProvider>
  );
}
