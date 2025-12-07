"use client";

import { partnerCanViewMarketplace } from "@/lib/network/get-discoverability-requirements";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

export default function MarketplaceLayout({ children }: PropsWithChildren) {
  const { programEnrollments, isLoading } = useProgramEnrollments();

  if (
    !isLoading &&
    programEnrollments &&
    !partnerCanViewMarketplace(programEnrollments)
  )
    redirect("/programs");

  return children;
}
