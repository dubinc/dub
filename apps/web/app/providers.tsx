"use client";

import { Analytics } from "@vercel/analytics/react";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import ModalProvider from "./ui/modal-provider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ModalProvider>
        <Toaster closeButton />
        {children}
        <Analytics />
      </ModalProvider>
    </SessionProvider>
  );
}
