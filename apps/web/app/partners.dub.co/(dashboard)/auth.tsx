"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useRefreshSession from "@/lib/swr/use-refresh-session";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export function PartnerProfileAuth({ children }: { children: ReactNode }) {
  const { loading: sessionLoading } = useRefreshSession("defaultPartnerId");

  const { loading: partnerLoading, error } = usePartnerProfile();

  const loading = sessionLoading || partnerLoading;

  if (loading) {
    return <LayoutLoader />;
  }

  if (!loading && error && error.status === 404) {
    redirect("/onboarding");
  }

  return children;
}
