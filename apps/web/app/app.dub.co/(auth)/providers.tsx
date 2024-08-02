"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <VercelAnalytics />
    </SessionProvider>
  );
}
