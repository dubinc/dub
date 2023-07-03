"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { ReactNode } from "react";

export default function MarketingProviders({
  modal,
  children,
}: {
  modal: ReactNode;
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  return (
    <>
      {/* Only show stats modal if it's on the home page */}
      {!segment && modal}
      {children}
    </>
  );
}
