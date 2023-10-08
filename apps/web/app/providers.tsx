"use client";

import { Analytics } from "@vercel/analytics/react";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Toaster closeButton />
      {children}
      <Analytics />
    </SessionProvider>
  );
}
