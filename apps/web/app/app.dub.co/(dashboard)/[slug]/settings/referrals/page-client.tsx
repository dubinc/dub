"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default function ReferralsPageClient({
  children,
}: {
  children: ReactNode;
}) {
  const { slug, flags } = useWorkspace();

  if (!flags?.referrals) {
    redirect(`/${slug}/settings`);
  }

  return <>{children}</>;
}
