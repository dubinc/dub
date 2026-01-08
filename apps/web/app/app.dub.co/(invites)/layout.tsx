"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export default function InvitesLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <div className="bg-bg-emphasis min-h-screen w-full sm:p-2">
      <div className="bg-bg-default relative sm:rounded-xl">{children}</div>
    </div>
  );
}
