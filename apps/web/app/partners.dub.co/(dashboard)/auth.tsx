"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import LayoutLoader from "@/ui/layout/layout-loader";
import { useSession } from "next-auth/react";
import { notFound } from "next/navigation";
import { ReactNode, useEffect } from "react";

export function PartnerProfileAuth({ children }: { children: ReactNode }) {
  const { data: session, update, status } = useSession();

  // if user has no default partner, refresh to get default partner
  useEffect(() => {
    const refreshSession = async () => {
      if (session?.user && !session.user["defaultPartnerId"]) {
        console.log("no default partner, refreshing");
        await update();
      }
    };
    refreshSession();
  }, [session]);

  const { loading, error } = usePartnerProfile();

  if (status === "loading" || loading) {
    return <LayoutLoader />;
  }

  if (error && error.status === 404) {
    notFound();
  }

  return children;
}
