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
      {/* Only show stats modal if it's on the home page */}
      {!segment && modal}
      <Toaster />
      {children}
    </div>
  );
}
