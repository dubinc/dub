"use client";

import { ReactNode, Suspense } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
