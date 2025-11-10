"use client";

import { partnerCanViewMarketplace } from "@/lib/partners/get-discoverability-requirements";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

export default function MarketplaceLayout({ children }: PropsWithChildren) {
  const { programEnrollments } = useProgramEnrollments();

  if (!partnerCanViewMarketplace(programEnrollments || []))
    redirect("/programs");

  return children;
}
