"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function Providers({
  modal,
  children,
}: {
  modal: ReactNode;
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  return (
    <div>
      {/* Only show stats modal if not on the /stats page */}
      {segment !== "stats" && modal}
      <Toaster />
      {children}
    </div>
  );
}
