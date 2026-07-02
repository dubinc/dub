"use client";

import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { SessionProvider } from "next-auth/react";
import { ReactNode, Suspense } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <DubAnalytics
        apiHost="/_proxy/dub"
        cookieOptions={{
          domain: process.env.VERCEL === "1" ? ".dub.co" : "localhost",
        }}
        domainsConfig={{
          refer: "refer.dub.co",
        }}
      />
      <Suspense>{children}</Suspense>
    </SessionProvider>
  );
}
