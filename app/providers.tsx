"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Toaster closeButton />
      {children}
      <Analytics />
    </SessionProvider>
  );
}
