"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, Suspense } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Suspense>{children}</Suspense>
    </SessionProvider>
  );
}
