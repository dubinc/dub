"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

export default function PartnerAuth({ children }: { children: ReactNode }) {
  const { loading, error } = usePartnerProfile();

  if (loading) {
    return <LayoutLoader />;
  }

  if (error && error.status === 404) {
    notFound();
  }

  return children;
}
