"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import {
  PROGRAM_NETWORK_PARTNER_MIN_PAYOUTS,
  PROGRAM_NETWORK_PARTNER_MIN_PROGRAMS,
} from "@/lib/zod/schemas/program-network";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

export default function MarketplaceLayout({ children }: PropsWithChildren) {
  const { payoutsCount } = usePartnerPayoutsCount<number>(
    {},
    { includeParams: [] },
  );
  const { count: enrolledProgramsCount } = useProgramEnrollmentsCount({
    status: "approved",
  });

  if (
    (payoutsCount && payoutsCount < PROGRAM_NETWORK_PARTNER_MIN_PAYOUTS) ||
    (enrolledProgramsCount &&
      enrolledProgramsCount < PROGRAM_NETWORK_PARTNER_MIN_PROGRAMS)
  )
    redirect("/programs");

  return children;
}
