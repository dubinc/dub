"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useRefreshSession from "@/lib/swr/use-refresh-session";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

export function PartnerProfileAuth({ children }: { children: ReactNode }) {
  const { loading: sessionLoading } = useRefreshSession("defaultPartnerId");

  const { loading, error } = usePartnerProfile();

  if (sessionLoading || loading) {
    return <LayoutLoader />;
  }

  if (error && error.status === 404) {
    notFound();
  }

  return children;
}
