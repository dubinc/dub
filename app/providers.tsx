"use client";

import { ReactNode } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster />
      {children}
      <Analytics />
    </>
  );
}
