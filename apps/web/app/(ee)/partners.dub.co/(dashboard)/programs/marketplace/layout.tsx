"use client";

import { partnerCanViewMarketplace } from "@/lib/network/get-discoverability-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

export default function MarketplaceLayout({ children }: PropsWithChildren) {
  const { partner } = usePartnerProfile();
  const { programEnrollments, isLoading } = useProgramEnrollments();
  if (
    !isLoading &&
    programEnrollments &&
    !partnerCanViewMarketplace({ partner, programEnrollments })
  )
    redirect("/programs");

  return children;
}
