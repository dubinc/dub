"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Toaster />
      {children}
    </div>
  );
}
