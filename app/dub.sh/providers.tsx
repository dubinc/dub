"use client";

import { SessionProvider } from "next-auth/react";
import { useSelectedLayoutSegment } from "next/navigation";
import { ReactNode } from "react";

export default function MarketingProviders({
  modal,
  children,
}: {
  modal: ReactNode;
  children: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  return (
    <SessionProvider>
      {/* Only show stats modal if it's on the home page */}
      {!segment && modal}
      {children}
    </SessionProvider>
  );
}
